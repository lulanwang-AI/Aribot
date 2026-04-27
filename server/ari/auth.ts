import type { Request, Response, NextFunction } from "express";

/**
 * Strict authentication gate for Ari clinical endpoints.
 *
 * Per spec: "Require an authenticated session (use existing Passport
 * middleware — reject 401 if not logged in)". This middleware fails closed:
 * the only way to pass is `req.isAuthenticated()` returning true AND `req.user`
 * being present, which is what Passport sets on a valid session.
 *
 * NOTE TO MAINTAINERS: this project has `passport` and `passport-local` in
 * package.json but does not currently call `passport.initialize()` /
 * `passport.session()` or wire up a LocalStrategy + login route. Until that
 * is done, this endpoint will return 401 for every caller — which is the
 * correct fail-closed behavior for a clinical tool. Wire up Passport (or
 * swap in your real auth middleware here) before exposing Ari to clinicians.
 */
export function requireAriAuth(req: Request, res: Response, next: NextFunction) {
  const r = req as Request & {
    isAuthenticated?: () => boolean;
    user?: unknown;
  };
  if (typeof r.isAuthenticated === "function" && r.isAuthenticated() && r.user) {
    return next();
  }
  return res.status(401).json({
    message: "Authentication required for Ari clinical workflows.",
  });
}
