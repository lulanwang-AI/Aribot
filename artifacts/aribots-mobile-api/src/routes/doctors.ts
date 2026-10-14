import { Router } from "express";
import { mobileStorage } from "../storage";

const router = Router();

router.get("/", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : undefined;
  const doctors = mobileStorage.searchDoctors(q, specialty);
  res.json(doctors.slice(0, 50).map(({ password: _, ...d }) => d));
});

router.get("/:id", (req, res) => {
  const user = mobileStorage.getUser(req.params.id);
  if (!user) { res.status(404).json({ message: "Not found" }); return; }
  const { password: _, ...safe } = user;
  res.json(safe);
});

export default router;
