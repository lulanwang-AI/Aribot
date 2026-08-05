// ── Anthropic Managed Agent sync ───────────────────────────────────────────
// Ask Ari's "brain" is defined as a managed agent in the Anthropic Console.
// At request time we fetch that agent's configuration (model + system prompt
// + MCP servers) and use it for the chat pipeline, so updating the agent in
// the Console updates Ari without a code change.
//
// The agent ID can be overridden with the ARI_AGENT_ID env var. If the fetch
// fails (bad key, network, agent archived), we fall back to the local
// attached_assets/ari-agent.json configuration so Ari keeps working.

import {
  ARI_MODEL_ID,
  ARI_SYSTEM_PROMPT,
  MCP_SERVERS,
  type AriMcpServer,
} from "./config";

export const ARI_AGENT_ID =
  (process.env.ARI_AGENT_ID || "").trim() || "agent_01P34DKitZer6wQanKMYMjLD";

const MANAGED_AGENTS_BETA = "managed-agents-2026-04-01";
const CACHE_TTL_MS = 5 * 60 * 1000; // re-check the Console config every 5 min

export interface AriAgentConfig {
  model: string;
  system: string;
  mcpServers: AriMcpServer[];
  /** Where the config came from — "console" (managed agent) or "local" fallback. */
  source: "console" | "local";
}

const LOCAL_FALLBACK: AriAgentConfig = {
  model: ARI_MODEL_ID,
  system: ARI_SYSTEM_PROMPT,
  mcpServers: MCP_SERVERS,
  source: "local",
};

let cached: AriAgentConfig | null = null;
let cachedAt = 0;
let inflight: Promise<AriAgentConfig> | null = null;

function parseAgent(json: any): AriAgentConfig | null {
  if (!json || typeof json !== "object") return null;

  // `model` may be a string or an object like { id: "claude-..." }.
  const model =
    typeof json.model === "string"
      ? json.model
      : typeof json.model?.id === "string"
        ? json.model.id
        : null;
  const system = typeof json.system === "string" && json.system.length > 0 ? json.system : null;
  if (!model && !system) return null;

  // Adopt the agent's MCP servers only when they match the url-server shape
  // the Messages API accepts; otherwise keep the local list.
  let mcpServers = MCP_SERVERS;
  if (Array.isArray(json.mcp_servers)) {
    const urlServers = json.mcp_servers.filter(
      (s: any) => s && s.type === "url" && typeof s.url === "string" && typeof s.name === "string"
    );
    if (urlServers.length > 0) mcpServers = urlServers;
  }

  return {
    model: model || ARI_MODEL_ID,
    system: system || ARI_SYSTEM_PROMPT,
    mcpServers,
    source: "console",
  };
}

async function fetchAgentConfig(): Promise<AriAgentConfig> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ari/agent] ANTHROPIC_API_KEY missing — using local agent config.");
    return LOCAL_FALLBACK;
  }
  try {
    const resp = await fetch(
      `https://api.anthropic.com/v1/agents/${encodeURIComponent(ARI_AGENT_ID)}`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": MANAGED_AGENTS_BETA,
        },
      }
    );
    if (!resp.ok) {
      console.warn(
        `[ari/agent] Failed to fetch managed agent ${ARI_AGENT_ID} (HTTP ${resp.status}) — using local config.`
      );
      return LOCAL_FALLBACK;
    }
    const parsed = parseAgent(await resp.json());
    if (!parsed) {
      console.warn("[ari/agent] Managed agent response had no usable model/system — using local config.");
      return LOCAL_FALLBACK;
    }
    console.log(
      `[ari/agent] Using managed agent ${ARI_AGENT_ID} (model: ${parsed.model}).`
    );
    return parsed;
  } catch (err: any) {
    console.warn(
      `[ari/agent] Error fetching managed agent ${ARI_AGENT_ID}: ${err?.message || err} — using local config.`
    );
    return LOCAL_FALLBACK;
  }
}

/**
 * Get the active Ari agent configuration. Cached for a few minutes; concurrent
 * callers share one in-flight fetch. Never throws — falls back to the local
 * config file when the Console agent cannot be reached.
 */
export async function getAriAgentConfig(): Promise<AriAgentConfig> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;
  if (!inflight) {
    inflight = fetchAgentConfig()
      .then((cfg) => {
        // Only cache successful console fetches for the full TTL; retry local
        // fallbacks sooner (30s) so a fixed key/network picks up quickly.
        cached = cfg;
        cachedAt = cfg.source === "console" ? Date.now() : Date.now() - CACHE_TTL_MS + 30_000;
        return cfg;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
