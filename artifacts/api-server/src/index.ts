import { ensureSchema, pool } from "@workspace/db";
import app, { initRoutes } from "./app";
import { seedCasesIfEmpty } from "./amr/case-repository";
import { logger } from "./lib/logger";
import { seedAllData } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  // Runtime tables (sessions, stewardship cases, audit log, memory, demo
  // requests) are guaranteed here; a deploy never depends on a manual push.
  await ensureSchema(pool);
  const amrSeed = await seedCasesIfEmpty();
  logger.info({ amrSeed }, "Postgres persistence ready");

  await seedAllData();
  await initRoutes();

  // Make secret wiring explicit at startup so that operators can verify the
  // Ari chat path can reach Anthropic without leaking the key value itself.
  logger.info(
    { configured: Boolean(process.env.ANTHROPIC_API_KEY) },
    "ANTHROPIC_API_KEY status (Ari chat)",
  );
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn("ANTHROPIC_API_KEY missing: clinical documentation uses deterministic fallbacks; Ari AI is unavailable.");
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");
  });
})();
