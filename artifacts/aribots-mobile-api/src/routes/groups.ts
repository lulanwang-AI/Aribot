import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth } from "../jwt";

const router = Router();

router.get("/", (req, res) => {
  const groups = mobileStorage.getGroups();
  res.json(groups);
});

router.get("/:id", (req, res) => {
  const group = mobileStorage.getGroup(req.params.id);
  if (!group) { res.status(404).json({ message: "Not found" }); return; }
  res.json(group);
});

router.post("/:id/join", requireAuth, (req: any, res) => {
  const group = mobileStorage.joinGroup(req.params.id, req.jwtUser.userId);
  if (!group) { res.status(404).json({ message: "Not found" }); return; }
  res.json(group);
});

export default router;
