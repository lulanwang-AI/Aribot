/**
 * GET /api/status — which integrations and stores this deployment has.
 *
 * Reports presence and reachability only, never a secret value. Mounted
 * behind the sign-in gate so the demo account can read it while anonymous
 * callers still get the plain /api/healthz.
 */
import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "@workspace/db";
import { ARI_MODEL_ID, aiAvailable } from "@workspace/clinical-ai";
import { ARI_AGENT_ID } from "../ari/agentSync";

const router: IRouter = Router();
const connectors = new ReplitConnectors();
const CHECK_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Error class and driver code only; messages can carry hosts or paths. */
function describeError(err: unknown) {
  const e = err as { name?: string; code?: string } | undefined;
  return { name: e?.name ?? "Error", code: typeof e?.code === "string" ? e.code : undefined };
}

async function databaseStatus() {
  const started = Date.now();
  try {
    const result = await withTimeout(
      db.execute(sql`select
        (select count(*) from "session")::int as sessions,
        (select count(*) from amr_cases)::int as amr_cases,
        (select count(*) from demo_requests)::int as demo_requests,
        (select count(*) from ari_audit_log)::int as ari_audit_log,
        (select count(*) from ari_memory)::int as ari_memory`),
      CHECK_TIMEOUT_MS,
    );
    return {
      configured: true,
      reachable: true,
      latencyMs: Date.now() - started,
      rows: result.rows[0] as Record<string, number>,
    };
  } catch (err) {
    return {
      configured: Boolean(process.env.DATABASE_URL),
      reachable: false,
      latencyMs: Date.now() - started,
      error: describeError(err),
    };
  }
}

async function elevenLabsStatus() {
  try {
    const connections = await withTimeout(
      connectors.listConnections({ connector_names: "elevenlabs" }),
      CHECK_TIMEOUT_MS,
    );
    const match = connections.find((c) => c.connector_name === "elevenlabs");
    return { connected: Boolean(match), status: match?.status ?? null };
  } catch (err) {
    // Outside Replit (local runs, tests) the connector service is unreachable.
    return { connected: "unknown" as const, error: describeError(err) };
  }
}

router.get("/status", async (_req, res) => {
  const [database, elevenlabs] = await Promise.all([databaseStatus(), elevenLabsStatus()]);
  res.json({
    service: "api-server",
    environment: process.env.NODE_ENV ?? "development",
    checkedAt: new Date().toISOString(),
    anthropic: {
      configured: aiAvailable(),
      model: ARI_MODEL_ID,
      managedAgentId: ARI_AGENT_ID,
    },
    database,
    sessions: {
      store: "postgres",
      secretConfigured: Boolean(process.env.SESSION_SECRET),
    },
    clerk: {
      publishableKeyConfigured: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
      secretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    },
    elevenlabs,
    ariMemory: { enabled: process.env.ARI_MEMORY_ENABLED === "true" },
    amr: {
      demoSeedEnabled: (process.env.AMR_SEED_DEMO ?? "").trim().toLowerCase() !== "false",
    },
  });
});

export default router;
