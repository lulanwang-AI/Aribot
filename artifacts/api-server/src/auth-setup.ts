import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { getAuth } from "@clerk/express";
import type { Express, NextFunction, Request, Response } from "express";
import { storage } from "./storage";
import type { User } from "@workspace/db";

type SafeUser = Omit<User, "password">;

export const DEMO_EMAIL = "demo@aribots.local";
export const DEMO_PASSWORD = "demo";

function claimString(
  claims: Record<string, unknown> | null | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = claims?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function resolveAuthenticatedUser(
  req: Request,
): Promise<SafeUser | undefined> {
  let clerkUserId: string | null = null;
  let claims: Record<string, unknown> | null | undefined;
  try {
    const auth = getAuth(req as never) as {
      userId?: string | null;
      sessionClaims?: unknown;
    };
    clerkUserId = auth.userId || null;
    claims = auth.sessionClaims as Record<string, unknown> | null | undefined;
  } catch {
    return undefined;
  }
  if (clerkUserId) {
    const username = `clerk:${clerkUserId}`;
    let user = await storage.getUserByUsername(username);
    if (!user) {
      const email = claimString(claims, "email", "email_address");
      const name =
        claimString(claims, "name", "full_name") ||
        [claimString(claims, "first_name"), claimString(claims, "last_name")]
          .filter(Boolean)
          .join(" ") ||
        email ||
        "ARIbots member";
      user = await storage.createUser({
        username,
        password: "managed-by-clerk",
        name,
        specialty: "",
        subspecialty: "",
        interests: [],
        hospital: "",
        city: "",
        state: "",
        role: "member",
        verified: false,
        phiSafeMode: true,
        yearsExperience: 0,
        rankingScore: 50,
        badges: [],
        bio: "",
        avatarUrl: "",
        credential: "",
      });
      if (email) {
        user = (await storage.updateUser(user.id, { email })) || user;
      }
    }

    const { password: _password, ...safe } = user;
    return safe;
  }

  if (req.isAuthenticated?.() && req.user) return req.user;
  return undefined;
}

export async function requireAuthenticatedWebApi(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method === "POST" && req.path === "/demo-requests") {
    return next();
  }
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) return res.status(401).json({ message: "Sign-in required." });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

/**
 * Wires express-session + Passport (LocalStrategy) onto the Express app.
 *
 * The public demo account resolves to seed user "u1" and creates a real
 * authenticated session that the strict requireAriAuth gate recognizes.
 * Replace the demo verifier with a real credential store before production
 * clinician accounts are enabled.
 */
export function setupAuth(app: Express) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is required in production. Refusing to start with a default secret."
    );
  }
  const secret = process.env.SESSION_SECRET || "ari-dev-session-secret-not-for-prod";
  if (!process.env.SESSION_SECRET) {
    console.warn(
      "[auth] SESSION_SECRET is not set — using dev fallback. Set SESSION_SECRET in production."
    );
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          if (!email || !password) {
            return done(null, false, { message: "Email and password required." });
          }
          if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
            return done(null, false, { message: "Invalid demo credentials." });
          }
          const seed = await storage.getUser("u1");
          if (!seed) return done(null, false, { message: "Default user not found." });
          const { password: _pw, ...safe } = seed;
          return done(null, safe as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as SafeUser).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const u = await storage.getUser(id);
      if (!u) return done(null, false);
      const { password: _pw, ...safe } = u;
      done(null, safe as Express.User);
    } catch (err) {
      done(err as Error);
    }
  });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: Error | null, user: Express.User | false, info: { message?: string } | undefined) => {
        if (err) return next(err);
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json({ user });
        });
      }
    )(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session?.destroy?.(() => {
        const cookieOptions = {
          path: "/",
          httpOnly: true,
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
        };
        res.clearCookie("connect.sid", cookieOptions);
        res.clearCookie("ari_emr_demo", cookieOptions);
        res.json({ ok: true });
      });
    });
  });

  app.get("/api/auth/me", async (req, res, next) => {
    try {
      const user = await resolveAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Sign-in required." });
      }
      return res.json({
        demo: Boolean(
          req.isAuthenticated?.() &&
            req.user &&
            !String(user.username).startsWith("clerk:"),
        ),
        user,
      });
    } catch (error) {
      return next(error);
    }
  });
}
