import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth } from "../jwt";
import { z } from "zod";

const router = Router();

router.get("/threads", requireAuth, (req: any, res) => {
  const threads = mobileStorage.getChatThreads(req.jwtUser.userId);
  const users = mobileStorage.getAllUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const enriched = threads.map(t => ({
    ...t,
    participants: (t.participantIds ?? []).map(id => {
      const u = userMap[id];
      return u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, specialty: u.specialty } : null;
    }).filter(Boolean),
  }));
  res.json(enriched);
});

router.get("/threads/:id/messages", requireAuth, (req: any, res) => {
  const messages = mobileStorage.getChatMessages(req.params.id);
  const users = mobileStorage.getAllUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const enriched = messages.map(m => ({
    ...m,
    sender: userMap[m.senderId] ? { id: userMap[m.senderId].id, name: userMap[m.senderId].name, avatarUrl: userMap[m.senderId].avatarUrl } : null,
  }));
  res.json(enriched);
});

router.post("/threads/:id/messages", requireAuth, (req: any, res) => {
  const schema = z.object({ content: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
  const msg = mobileStorage.createChatMessage({
    threadId: req.params.id,
    senderId: req.jwtUser.userId,
    content: parsed.data.content,
    createdAt: Date.now(),
    read: false,
  });
  res.status(201).json(msg);
});

export default router;
