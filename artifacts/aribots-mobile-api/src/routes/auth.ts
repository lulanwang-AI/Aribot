import { Router } from "express";
import { mobileStorage } from "../storage";
import { signToken, requireAuth } from "../jwt";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Email and password required" }); return;
  }
  const { email } = parsed.data;
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    res.status(401).json({ message: "Auth not configured for production" }); return;
  }
  const user = mobileStorage.getUser("u1") || mobileStorage.getAllUsers()[0];
  if (!user) { res.status(401).json({ message: "User not found" }); return; }

  const { password: _, ...safe } = user;
  const token = signToken({ userId: user.id, username: user.username ?? email });
  res.json({ token, user: safe }); return;
});

router.get("/me", requireAuth, async (req: any, res) => {
  const user = mobileStorage.getUser(req.jwtUser.userId);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const { password: _, ...safe } = user;
  res.json(safe);
});

router.patch("/me", requireAuth, async (req: any, res) => {
  const { password: _pw, ...updates } = req.body;
  const user = mobileStorage.getUser(req.jwtUser.userId);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  const { password: _, ...safe } = { ...user, ...updates };
  res.json(safe);
});

export default router;
