import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth } from "../jwt";

const router = Router();

router.get("/", requireAuth, (req: any, res) => {
  const consultations = mobileStorage.getTelemedConsultations();
  res.json(consultations);
});

router.get("/earnings", requireAuth, (req: any, res) => {
  const earnings = mobileStorage.getTelemedEarnings(req.jwtUser.userId);
  res.json(earnings);
});

router.get("/:id", requireAuth, (req: any, res) => {
  const consult = mobileStorage.getTelemedConsultation(req.params.id);
  if (!consult) { res.status(404).json({ message: "Not found" }); return; }
  res.json(consult);
});

export default router;
