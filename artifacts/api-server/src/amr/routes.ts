import { Router, type IRouter } from "express";
import { ANTIMICROBIALS } from "./data/agents";
import { ORGANISMS } from "./data/organisms";
import { SYNDROMES } from "./data/syndromes";
import { COMORBIDITY_OPTIONS, COVERAGE_FLAG_LABELS, RISK_MODIFIERS } from "./data/risk-factors";
import { getAntibiogram, REGIONS, hasFacilityAntibiogram } from "./data/antibiogram";
import { recommendEmpiric, KNOWLEDGE_BASE_VERSION, deriveRiskFactors, resolveRegion } from "./engine/empiric";
import { computeMetrics } from "./metrics";
import { emptyIntake, hoursToReview, isReviewDue } from "./store";
import * as cases from "./case-repository";
import type { Intake, StewardshipCase } from "./types";

const router: IRouter = Router();

/** Reference data the intake form and antibiogram browser are built from. */
router.get("/reference", (_req, res) => {
  res.json({
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    syndromes: SYNDROMES.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      guideline: s.guideline,
      requiredCoverage: s.requiredCoverage,
      durationDays: s.durationDays,
      sourceControl: s.sourceControl,
    })),
    regions: REGIONS.map((r) => ({ ...r, facilityData: hasFacilityAntibiogram(r.id) })),
    organisms: ORGANISMS.map((o) => ({ id: o.id, name: o.name, shortName: o.shortName, gram: o.gram, notes: o.notes })),
    agents: ANTIMICROBIALS.map((a) => ({
      id: a.id,
      name: a.name,
      shortName: a.shortName,
      drugClass: a.drugClass,
      tier: a.tier,
      routes: a.routes,
      restricted: a.restricted,
      collateralDamageScore: a.collateralDamageScore,
    })),
    comorbidities: COMORBIDITY_OPTIONS,
    riskModifiers: RISK_MODIFIERS.map((r) => ({ id: r.id, label: r.label, note: r.note })),
    coverageFlagLabels: COVERAGE_FLAG_LABELS,
    emptyIntake: emptyIntake(),
  });
});

/** Full agent monograph, used by the formulary drawer. */
router.get("/agents/:id", (req, res) => {
  const agent = ANTIMICROBIALS.find((a) => a.id === req.params.id);
  if (!agent) {
    res.status(404).json({ message: "Unknown antimicrobial" });
    return;
  }
  res.json(agent);
});

/** Full syndrome record including regimen templates. */
router.get("/syndromes/:id", (req, res) => {
  const syndrome = SYNDROMES.find((s) => s.id === req.params.id);
  if (!syndrome) {
    res.status(404).json({ message: "Unknown syndrome" });
    return;
  }
  res.json(syndrome);
});

router.get("/antibiogram/:regionId", (req, res) => {
  try {
    const antibiogram = getAntibiogram(req.params.regionId);
    const region = REGIONS.find((r) => r.id === req.params.regionId);
    res.json({
      ...antibiogram,
      region,
      facilityData: hasFacilityAntibiogram(req.params.regionId),
      organisms: ORGANISMS.map((o) => ({ id: o.id, name: o.name, shortName: o.shortName, gram: o.gram })),
      agents: ANTIMICROBIALS.map((a) => ({ id: a.id, name: a.name, shortName: a.shortName, tier: a.tier })),
    });
  } catch {
    res.status(404).json({ message: "Unknown region" });
  }
});

/** Preview a recommendation without persisting a case. */
router.post("/recommend/empiric", (req, res) => {
  const intake = req.body?.intake as Intake | undefined;
  if (!intake?.suspectedSyndromeId) {
    res.status(400).json({ message: "intake.suspectedSyndromeId is required" });
    return;
  }
  try {
    res.json(recommendEmpiric(intake));
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? "Unable to generate a recommendation" });
  }
});

/** Explain which risk factors and which antibiogram an intake resolves to. */
router.post("/recommend/explain", (req, res) => {
  const intake = req.body?.intake as Intake | undefined;
  if (!intake) {
    res.status(400).json({ message: "intake is required" });
    return;
  }
  try {
    res.json({
      region: resolveRegion(intake),
      riskFactors: deriveRiskFactors(intake).map((r) => ({ id: r.id, label: r.label, note: r.note })),
    });
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? "Unable to explain this intake" });
  }
});

function withDerived(record: StewardshipCase) {
  return { ...record, hoursToReview: hoursToReview(record), reviewDue: isReviewDue(record) };
}

router.get("/cases", async (_req, res) => {
  res.json((await cases.listCases()).map(withDerived));
});

router.get("/cases/:id", async (req, res) => {
  const record = await cases.getCase(req.params.id);
  if (!record) {
    res.status(404).json({ message: "Case not found" });
    return;
  }
  res.json(withDerived(record));
});

router.post("/cases", async (req, res) => {
  const { mrn, patientLabel, ward, assignedTo, intake } = req.body ?? {};
  if (!intake?.suspectedSyndromeId) {
    res.status(400).json({ message: "intake.suspectedSyndromeId is required" });
    return;
  }
  try {
    const record = await cases.createCase({ mrn, patientLabel, ward, assignedTo, intake });
    res.status(201).json(withDerived(record));
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? "Unable to create the case" });
  }
});

router.post("/cases/:id/start", async (req, res) => {
  const { regimenId, actor } = req.body ?? {};
  if (!regimenId) {
    res.status(400).json({ message: "regimenId is required" });
    return;
  }
  const record = await cases.startTherapy(req.params.id, regimenId, actor ?? "Clinician");
  if (!record) {
    res.status(404).json({ message: "Case or regimen not found" });
    return;
  }
  res.json(withDerived(record));
});

router.post("/cases/:id/review", async (req, res) => {
  const { cultures, response, actor } = req.body ?? {};
  if (!cultures || !response) {
    res.status(400).json({ message: "cultures and response are both required" });
    return;
  }
  try {
    const record = await cases.submitReview(req.params.id, { cultures, response, actor: actor ?? "Clinician" });
    if (!record) {
      res.status(404).json({ message: "Case not found" });
      return;
    }
    res.json(withDerived(record));
  } catch (err: any) {
    res.status(400).json({ message: err?.message ?? "Unable to complete the review" });
  }
});

router.post("/cases/:id/decision", async (req, res) => {
  const { outcome, by, note } = req.body ?? {};
  if (!["accepted", "modified", "overridden"].includes(outcome)) {
    res.status(400).json({ message: "outcome must be accepted, modified or overridden" });
    return;
  }
  const record = await cases.recordDecision(req.params.id, { outcome, by: by ?? "Clinician", note: note ?? "" });
  if (!record) {
    res.status(404).json({ message: "Case not found" });
    return;
  }
  res.json(withDerived(record));
});

router.post("/cases/:id/notes", async (req, res) => {
  const { note, actor } = req.body ?? {};
  if (!note) {
    res.status(400).json({ message: "note is required" });
    return;
  }
  const record = await cases.addNote(req.params.id, note, actor ?? "Clinician");
  if (!record) {
    res.status(404).json({ message: "Case not found" });
    return;
  }
  res.json(withDerived(record));
});

router.get("/metrics", async (_req, res) => {
  res.json(computeMetrics(await cases.listCases()));
});

export default router;
