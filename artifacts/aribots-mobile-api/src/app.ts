import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import authRouter from "./routes/auth";
import triageRouter from "./routes/triage";
import newsRouter from "./routes/news";
import doctorsRouter from "./routes/doctors";
import groupsRouter from "./routes/groups";
import eventsRouter from "./routes/events";
import messagingRouter from "./routes/messaging";
import trainingRouter from "./routes/training";
import telemedRouter from "./routes/telemed";
import ariRouter from "./routes/ari";

const app = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/mobile/healthz", (_req, res) => {
  res.json({ status: "ok", service: "aribots-mobile-api" });
});

app.use("/api/mobile/auth", authRouter);
app.use("/api/mobile/triage", triageRouter);
app.use("/api/mobile/news", newsRouter);
app.use("/api/mobile/doctors", doctorsRouter);
app.use("/api/mobile/groups", groupsRouter);
app.use("/api/mobile/events", eventsRouter);
app.use("/api/mobile/messaging", messagingRouter);
app.use("/api/mobile/training", trainingRouter);
app.use("/api/mobile/telemed", telemedRouter);
app.use("/api/mobile/ari", ariRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
