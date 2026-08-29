import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDemoAuth } from "./demo-auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const configuredBasePath = process.env.BASE_PATH || "/ari-emr/";
const basePath = `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;

// The EMR is hosted below /ari-emr/ while its original server contract uses
// /api/*. Rewrite only this artifact's API requests before route matching so
// they cannot collide with the workspace-wide /api service.
app.use((req, _res, next) => {
  const artifactApiPrefix = `${basePath}/api`;
  if (req.url === artifactApiPrefix || req.url.startsWith(`${artifactApiPrefix}/`) || req.url.startsWith(`${artifactApiPrefix}?`)) {
    req.url = req.url.slice(basePath.length);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log metadata only — never response bodies (they can contain PHI)
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", service: "ari-emr" });
});

setupDemoAuth(app, process.env.NODE_ENV === "production");

(async () => {
  const server = await registerRoutes(app);

  // Seed EMR clinical data (no-op when already seeded)
  try {
    const { seedEmrData } = await import("./seed-emr");
    await seedEmrData();
    const { seedBillingData } = await import("./seed-billing");
    await seedBillingData();
    const { seedCrmData } = await import("./seed-crm");
    await seedCrmData();
  } catch (err) {
    console.error("[seed] EMR seeding failed:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("[ari-emr]", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
