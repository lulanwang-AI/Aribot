import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./lib/logger";
import {
  setupAuth,
  registerAuthRoutes,
  requireAuthenticatedWebApi,
  detachMobileBearer,
} from "./auth-setup";
import { registerRoutes } from "./routes/routes";
import ariRouter from "./ari/routes";
import healthRouter from "./routes/health";
import statusRouter from "./routes/status";
import mobileRouter from "./routes/mobile-router";
import amrRouter from "./amr/routes";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import "./ari/client";

const app: Express = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
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
app.use(detachMobileBearer);
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) || "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })) as unknown as RequestHandler,
);

// Serve static assets (e.g. generated avatars)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/api/assets", express.static(path.join(__dirname, "../public")));

setupAuth(app);
registerAuthRoutes(app);
app.use("/api", healthRouter);
app.use("/api/mobile", mobileRouter);
app.use("/api", requireAuthenticatedWebApi);
app.use("/api", statusRouter);
app.use("/api/amr", amrRouter);

let routesRegistered = false;
export async function initRoutes() {
  if (routesRegistered) return;
  routesRegistered = true;
  const { createServer } = await import("http");
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use("/api/ari", ariRouter);

  // Final handler for rejected async routes (Express 5 forwards them here).
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, url: req.url?.split("?")[0] }, "Unhandled route error");
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  });
}

export default app;
