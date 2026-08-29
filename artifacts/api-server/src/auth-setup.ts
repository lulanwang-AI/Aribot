import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express } from "express";
import { storage } from "./storage";
import type { User } from "@workspace/db";

type SafeUser = Omit<User, "password">;

export const DEMO_EMAIL = "demo@aribots.local";
export const DEMO_PASSWORD = "demo";

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
        res.clearCookie("connect.sid");
        res.json({ ok: true });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Demo sign-in required." });
    }
    return res.json({ demo: true, user: req.user });
  });
}
