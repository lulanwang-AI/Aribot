import { Router } from "express";
import { mobileStorage } from "../storage";

const router = Router();

router.get("/", (req, res) => {
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : undefined;
  const items = mobileStorage.getNewsItems(source, specialty);
  res.json(items);
});

router.get("/:id", (req, res) => {
  const item = mobileStorage.getNewsItem(req.params.id);
  if (!item) { res.status(404).json({ message: "Not found" }); return; }
  res.json(item);
});

export default router;
