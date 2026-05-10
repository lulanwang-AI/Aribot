import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth } from "../jwt";

const router = Router();

router.get("/", (_req, res) => {
  res.json(mobileStorage.getEvents());
});

router.post("/:id/rsvp", requireAuth, (req: any, res) => {
  const event = mobileStorage.rsvpEvent(req.params.id, req.jwtUser.userId);
  if (!event) return res.status(404).json({ message: "Not found" });
  res.json(event);
});

export default router;
