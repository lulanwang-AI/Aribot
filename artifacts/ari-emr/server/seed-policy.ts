/**
 * Decides whether demo clinical data may be written to the database.
 *
 * Development always seeds. Production seeds only when EMR_SEED_DEMO=true is
 * set on the EMR service, which the deployment config does for the demo
 * tenant. The seeders stay non-destructive either way: each table is
 * backfilled only while it is empty, so enabling the flag against a database
 * that already holds data changes nothing.
 */
export const EMR_SEED_DEMO_FLAG = "EMR_SEED_DEMO";

export function demoSeedAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV !== "production") return true;
  return (env[EMR_SEED_DEMO_FLAG] ?? "").trim().toLowerCase() === "true";
}

export function demoSeedSkipReason(): string {
  return `[seed] Skipping demo seed: NODE_ENV=production and ${EMR_SEED_DEMO_FLAG} is not "true"`;
}
