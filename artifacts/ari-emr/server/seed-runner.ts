import { pool } from "./db";
import { demoSeedAllowed, demoSeedSkipReason } from "./seed-policy";

/**
 * Stable key so every EMR instance competes for the same Postgres advisory
 * lock. Autoscale can start several instances against an empty database at
 * once; without the lock each would pass the "table is empty" checks and the
 * tables without unique constraints (encounters, orders, appointments) would
 * receive duplicate demo rows.
 */
const SEED_LOCK_KEY = 74712201;

export type SeedOutcome = "skipped" | "completed" | "locked" | "failed";

/**
 * Runs the EMR, billing and CRM demo seeders under an advisory lock.
 *
 * Intended to run after the HTTP server is listening so the deployment
 * health check is not held up by a one-time backfill. Each seeder is
 * idempotent per table, so repeated runs are cheap no-ops.
 */
export async function runDemoSeeds(): Promise<SeedOutcome> {
  if (!demoSeedAllowed()) {
    console.log(demoSeedSkipReason());
    return "skipped";
  }

  const client = await pool.connect();
  let locked = false;
  try {
    const { rows } = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1) as locked",
      [SEED_LOCK_KEY],
    );
    locked = rows[0]?.locked === true;
    if (!locked) {
      console.log("[seed] Another instance holds the seed lock; skipping");
      return "locked";
    }

    const { seedEmrData } = await import("./seed-emr");
    await seedEmrData();
    const { seedBillingData } = await import("./seed-billing");
    await seedBillingData();
    const { seedCrmData } = await import("./seed-crm");
    await seedCrmData();
    return "completed";
  } catch (err) {
    console.error("[seed] EMR seeding failed:", err);
    return "failed";
  } finally {
    if (locked) {
      try {
        await client.query("select pg_advisory_unlock($1)", [SEED_LOCK_KEY]);
      } catch (err) {
        console.warn("[seed] Could not release the seed lock:", err);
      }
    }
    client.release();
  }
}
