import app from "./app";
import { logger } from "./logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "ARIbots Mobile API listening");
});
