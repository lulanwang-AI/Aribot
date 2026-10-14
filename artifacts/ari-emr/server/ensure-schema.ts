import { pool } from "./db";

/**
 * Guarantees the tables the EMR server writes to at runtime without a schema
 * push. Statements are idempotent and mirror shared/schema.ts exactly, so a
 * later `drizzle-kit push` finds nothing to change. The advisory lock keeps
 * concurrent autoscale instances from racing on the same CREATE.
 */
const LOCK_KEY = 74712204;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "emr_demo_sessions" (
    "token" varchar PRIMARY KEY,
    "expires_at" timestamp with time zone NOT NULL
  )`,
];

export async function ensureSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
    for (const statement of STATEMENTS) {
      await client.query(statement);
    }
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
    } catch {
      // Released with the connection in any case.
    }
    client.release();
  }
}
