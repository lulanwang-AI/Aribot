import type { Express } from "express";
import { sql } from "drizzle-orm";
import { ARI_MODEL_ID, aiAvailable } from "@workspace/clinical-ai";
import { db } from "./db";
import { demoSeedAllowed } from "./seed-policy";

/** Error class and driver code only; messages can carry hosts or paths. */
function describeError(err: unknown) {
  const e = err as { name?: string; code?: string } | undefined;
  return { name: e?.name ?? "Error", code: typeof e?.code === "string" ? e.code : undefined };
}

/**
 * GET /api/status — integration and data presence for this EMR deployment.
 * Registered after the demo-auth gate, so it needs a sign-in; reports
 * presence and counts only, never a secret value.
 */
export function registerStatusRoute(app: Express) {
  app.get("/api/status", async (_req, res) => {
    const started = Date.now();
    let database:
      | { reachable: true; latencyMs: number; rows: Record<string, number> }
      | { reachable: false; latencyMs: number; error: ReturnType<typeof describeError> };
    try {
      const result = await db.execute(sql`select
        (select count(*) from patients)::int as patients,
        (select count(*) from encounters)::int as encounters,
        (select count(*) from appointments)::int as appointments,
        (select count(*) from charges)::int as charges,
        (select count(*) from emr_demo_sessions)::int as demo_sessions`);
      database = {
        reachable: true,
        latencyMs: Date.now() - started,
        rows: result.rows[0] as Record<string, number>,
      };
    } catch (err) {
      database = { reachable: false, latencyMs: Date.now() - started, error: describeError(err) };
    }

    res.json({
      service: "ari-emr",
      environment: process.env.NODE_ENV ?? "development",
      checkedAt: new Date().toISOString(),
      anthropic: { configured: aiAvailable(), model: ARI_MODEL_ID },
      database,
      demoSeed: { allowed: demoSeedAllowed() },
      clerk: {
        publishableKeyConfigured: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
        secretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
      },
    });
  });
}
