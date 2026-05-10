import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "aribots-mobile-jwt-dev-secret";

export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  req.jwtUser = payload;
  next();
}

export function optionalAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (payload) req.jwtUser = payload;
  }
  next();
}
