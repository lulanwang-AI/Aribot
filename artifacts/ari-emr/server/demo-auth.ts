import { randomBytes } from "node:crypto";
import { getAuth } from "@clerk/express";
import { eq, lt } from "drizzle-orm";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { emrDemoSessions } from "@shared/schema";

export const DEMO_EMAIL = "demo@aribots.local";
export const DEMO_PASSWORD = "demo";

const DEMO_COOKIE = "ari_emr_demo";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

/**
 * Demo sessions live in the emr_demo_sessions table so a sign-in survives a
 * redeploy and is honoured by every autoscale instance, not only the one that
 * issued the cookie.
 */
async function hasValidSession(req: Request): Promise<boolean> {
  const token = readCookie(req, DEMO_COOKIE);
  if (!token) return false;
  const [row] = await db
    .select({ expiresAt: emrDemoSessions.expiresAt })
    .from(emrDemoSessions)
    .where(eq(emrDemoSessions.token, token));
  if (!row) return false;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(emrDemoSessions).where(eq(emrDemoSessions.token, token));
    return false;
  }
  return true;
}

function pruneExpiredSessions(): void {
  void db
    .delete(emrDemoSessions)
    .where(lt(emrDemoSessions.expiresAt, new Date()))
    .catch((err: unknown) => {
      console.warn("[demo-auth] prune failed:", err instanceof Error ? err.message : err);
    });
}

function clerkUserId(req: Request): string | null {
  try {
    // The EMR is on Express 4 types while @clerk/express declares Express 5;
    // the request object is the same at runtime, as in the API server.
    const auth = getAuth(req as never) as { userId?: string | null };
    return auth.userId || null;
  } catch {
    return null;
  }
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
    [
      `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      `connect.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    ],
  );
}

const DEMO_USER = { id: "demo-clinician", name: "Demo Clinician", role: "clinician" };

export function setupDemoAuth(app: Express, isProduction: boolean) {
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        return res.status(401).json({ message: "Invalid demo credentials." });
      }

      const token = randomBytes(24).toString("hex");
      await db.insert(emrDemoSessions).values({
        token,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      });
      pruneExpiredSessions();
      setDemoCookie(res, token, isProduction);
      return res.json({ demo: true, user: DEMO_USER });
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/auth/me", async (req, res, next) => {
    try {
      const userId = clerkUserId(req);
      if (userId) {
        return res.json({
          demo: false,
          user: { id: userId, name: "Authenticated Clinician", role: "clinician" },
        });
      }

      if (await hasValidSession(req)) {
        return res.json({ demo: true, user: DEMO_USER });
      }

      return res.status(401).json({ message: "Sign-in required." });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      const token = readCookie(req, DEMO_COOKIE);
      if (token) await db.delete(emrDemoSessions).where(eq(emrDemoSessions.token, token));
      clearDemoCookie(res, isProduction);
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) return next();
    if (
      req.path === "/api/healthz" ||
      req.path === "/api/auth/login" ||
      req.path === "/api/auth/me" ||
      req.path === "/api/auth/logout"
    ) {
      return next();
    }
    try {
      if (!(await hasValidSession(req)) && !clerkUserId(req)) {
        return res.status(401).json({ message: "Sign-in required." });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });
}
