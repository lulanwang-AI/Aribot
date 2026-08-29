import { randomBytes } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";

export const DEMO_EMAIL = "demo@aribots.local";
export const DEMO_PASSWORD = "demo";

const DEMO_COOKIE = "ari_emr_demo";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();

function readCookie(req: Request, name: string): string | undefined {
  const header = req.header("cookie");
  if (!header) return undefined;
  const prefix = `${name}=`;
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function hasValidSession(req: Request): boolean {
  const token = readCookie(req, DEMO_COOKIE);
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function setDemoCookie(res: Response, token: string, isProduction: boolean) {
  const secure = isProduction ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${DEMO_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  );
}

function clearDemoCookie(res: Response, isProduction: boolean) {
  const secure = isProduction ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

export function setupDemoAuth(app: Express, isProduction: boolean) {
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return res.status(401).json({ message: "Invalid demo credentials." });
    }

    const token = randomBytes(24).toString("hex");
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    setDemoCookie(res, token, isProduction);
    res.json({
      demo: true,
      user: {
        id: "demo-clinician",
        name: "Demo Clinician",
        role: "clinician",
      },
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!hasValidSession(req)) {
      return res.status(401).json({ message: "Demo sign-in required." });
    }
    res.json({
      demo: true,
      user: {
        id: "demo-clinician",
        name: "Demo Clinician",
        role: "clinician",
      },
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = readCookie(req, DEMO_COOKIE);
    if (token) sessions.delete(token);
    clearDemoCookie(res, isProduction);
    res.json({ ok: true });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) return next();
    if (
      req.path === "/api/healthz" ||
      req.path === "/api/auth/login" ||
      req.path === "/api/auth/me" ||
      req.path === "/api/auth/logout"
    ) {
      return next();
    }
    if (!hasValidSession(req)) {
      return res.status(401).json({ message: "Demo sign-in required." });
    }
    next();
  });
}