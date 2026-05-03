import fs from "fs";
import path from "path";
import {
  ACTIVE_CAPABILITY_IDS,
  type AriCapabilityId,
} from "./capabilities";

export const ARI_MODEL_ID = "claude-sonnet-4-6";

// Re-export the shared single source of truth so existing imports keep working.
export const ACTIVE_CAPABILITIES = ACTIVE_CAPABILITY_IDS;
export type AriCapability = AriCapabilityId;

export interface AriMcpServer {
  name: string;
  type: "url";
  url: string;
}

const CONFIG_PATH = path.resolve(process.cwd(), "attached_assets/ari-agent.json");

function loadAgentJson(): { system: string; mcp_servers: AriMcpServer[] } {
  let raw: string;
  try {
    raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  } catch (err: any) {
    throw new Error(
      `Ari config missing: failed to read ${CONFIG_PATH}. ` +
        `Ari clinical workflows cannot start without this file. Original error: ${err?.message || err}`
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(
      `Ari config malformed: ${CONFIG_PATH} is not valid JSON. Original error: ${err?.message || err}`
    );
  }

  if (typeof parsed?.system !== "string" || parsed.system.length === 0) {
    throw new Error(`Ari config malformed: 'system' field is missing or not a non-empty string.`);
  }
  if (!Array.isArray(parsed?.mcp_servers)) {
    throw new Error(`Ari config malformed: 'mcp_servers' must be an array.`);
  }
  for (const s of parsed.mcp_servers) {
    if (!s || typeof s.name !== "string" || s.type !== "url" || typeof s.url !== "string") {
      throw new Error(
        `Ari config malformed: every entry in 'mcp_servers' must be { name: string, type: "url", url: string }.`
      );
    }
  }

  return { system: parsed.system, mcp_servers: parsed.mcp_servers };
}

const agentJson = loadAgentJson();

export const ARI_SYSTEM_PROMPT: string = agentJson.system;
export const MCP_SERVERS: AriMcpServer[] = agentJson.mcp_servers;
