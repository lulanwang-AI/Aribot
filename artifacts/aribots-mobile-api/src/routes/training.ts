import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth } from "../jwt";

const router = Router();

router.get("/", (_req, res) => {
  res.json(mobileStorage.getTrainingModules());
});

router.post("/:id/complete", requireAuth, (req: any, res) => {
  const module = mobileStorage.completeTrainingStep(req.params.id, req.jwtUser.userId);
  if (!module) { res.status(404).json({ message: "Not found" }); return; }
  res.json(module);
});

export default router;
