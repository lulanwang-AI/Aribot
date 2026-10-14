import type pg from "pg";

/**
 * Creates the tables the API server writes to at runtime if they do not exist.
 *
 * Deployments do not run `drizzle-kit push`, so the server guarantees its own
 * tables on boot. Every statement is idempotent and mirrors the Drizzle
 * definitions in ./schema exactly, which keeps a later `push` a no-op. The run
 * is serialized with an advisory lock because two autoscale instances issuing
 * CREATE TABLE IF NOT EXISTS for the same table at the same moment can still
 * collide on the catalog's unique index.
 */
const LOCK_KEY = 74712203;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "demo_requests" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "email" text NOT NULL,
    "organization" text NOT NULL,
    "role" text NOT NULL,
    "message" text DEFAULT '',
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "amr_cases" (
    "id" varchar PRIMARY KEY,
    "mrn" text NOT NULL,
    "patient_label" text NOT NULL,
    "ward" text NOT NULL,
    "assigned_to" text NOT NULL,
    "status" text NOT NULL,
    "syndrome_id" text NOT NULL,
    "record" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "amr_cases_updated_at_idx" ON "amr_cases" ("updated_at")`,
  `CREATE TABLE IF NOT EXISTS "ari_audit_log" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL,
    "license_type" text NOT NULL,
    "mode" text NOT NULL,
    "capability" text NOT NULL,
    "query_hash" text NOT NULL,
    "attachment_count" integer DEFAULT 0 NOT NULL,
    "latency_ms" integer NOT NULL,
    "success" boolean NOT NULL,
    "error_code" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "ari_audit_log_created_at_idx" ON "ari_audit_log" ("created_at")`,
  `CREATE TABLE IF NOT EXISTS "ari_memory" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "topic" text NOT NULL,
    "slug" text NOT NULL,
    "content_markdown" text NOT NULL,
    "metadata" jsonb,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ari_memory_topic_slug_idx" ON "ari_memory" ("topic", "slug")`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar PRIMARY KEY,
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`,
];

export async function ensureSchema(pool: pg.Pool): Promise<void> {
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
      // The lock is released when the connection closes in any case.
    }
    client.release();
  }
}
