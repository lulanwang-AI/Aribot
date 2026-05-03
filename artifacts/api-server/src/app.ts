import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { setupAuth, registerAuthRoutes } from "./auth-setup";
import { registerRoutes } from "./routes/routes";
import ariRouter from "./ari/routes";
import healthRouter from "./routes/health";
import "./ari/client";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

setupAuth(app);
registerAuthRoutes(app);
app.use("/api", healthRouter);

let routesRegistered = false;
export async function initRoutes() {
  if (routesRegistered) return;
  routesRegistered = true;
  const { createServer } = await import("http");
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use("/api/ari", ariRouter);
}

export default app;
