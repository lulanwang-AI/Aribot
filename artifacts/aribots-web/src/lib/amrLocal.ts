/**
 * In-process implementation of the stewardship API.
 *
 * The engine is pure computation over a versioned knowledge base, and the case
 * store was always in memory, so nothing about a recommendation actually needs
 * a server. In the standalone build the same engine source runs in the
 * browser and this module stands in for the HTTP layer, giving a deployment
 * that needs no backend while remaining byte-for-byte the same logic that runs
 * behind /api/amr.
 *
 * The one capability that genuinely needs a server is the Ari chat, which
 * requires an API key that must never reach the browser. It reports itself as
 * unavailable rather than failing at the point of use.
 */
import { ANTIMICROBIALS } from "@engine/data/agents";
import { ORGANISMS } from "@engine/data/organisms";
import { SYNDROMES } from "@engine/data/syndromes";
import {
  COMORBIDITY_OPTIONS,
  COVERAGE_FLAG_LABELS,
  RISK_MODIFIERS,
} from "@engine/data/risk-factors";
import { REGIONS, getAntibiogram, hasFacilityAntibiogram } from "@engine/data/antibiogram";
import {
  KNOWLEDGE_BASE_VERSION,
  deriveRiskFactors,
  recommendEmpiric,
  resolveRegion,
} from "@engine/engine/empiric";
import { computeMetrics } from "@engine/metrics";
import {
  addNote,
  createCase,
  emptyIntake,
  getCase,
  hoursToReview,
  isReviewDue,
  listCases,
  recordDecision,
  startTherapy,
  submitReview,
} from "@engine/store";
import type { Intake, StewardshipCase } from "@shared/amr/types";
import type { AmrApi, ReferenceData, StewardshipMetrics } from "./amrApiTypes";

function withDerived(record: StewardshipCase) {
  return { ...record, hoursToReview: hoursToReview(record), reviewDue: isReviewDue(record) };
}

function notFound(what: string): never {
  throw new Error(`${what} not found`);
}

export const localAmrApi: AmrApi = {
  async reference(): Promise<ReferenceData> {
    return {
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
      organisms: ORGANISMS.map((o) => ({
        id: o.id,
        name: o.name,
        shortName: o.shortName,
        gram: o.gram,
        notes: o.notes,
      })),
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
    };
  },

  async agent(id) {
    const agent = ANTIMICROBIALS.find((a) => a.id === id);
    if (!agent) notFound("Antimicrobial");
    // JSON has no Infinity, so the HTTP layer delivers the top band's upper
    // bound as null. The standalone build matches that shape rather than
    // handing the UI a value it has never had to render.
    return {
      ...agent,
      renalAdjustments: agent.renalAdjustments.map((band) => ({
        ...band,
        maxCrCl: Number.isFinite(band.maxCrCl) ? band.maxCrCl : (null as unknown as number),
      })),
    };
  },

  async syndrome(id) {
    const syndrome = SYNDROMES.find((s) => s.id === id);
    if (!syndrome) notFound("Syndrome");
    return syndrome;
  },

  async antibiogram(regionId) {
    const region = REGIONS.find((r) => r.id === regionId);
    if (!region) notFound("Region");
    return {
      ...getAntibiogram(regionId),
      region,
      facilityData: hasFacilityAntibiogram(regionId),
      organisms: ORGANISMS.map((o) => ({ id: o.id, name: o.name, shortName: o.shortName, gram: o.gram })),
      agents: ANTIMICROBIALS.map((a) => ({ id: a.id, name: a.name, shortName: a.shortName, tier: a.tier })),
    };
  },

  async metrics(): Promise<StewardshipMetrics> {
    return computeMetrics();
  },

  async cases() {
    return listCases().map(withDerived);
  },

  async case(id) {
    const record = getCase(id);
    if (!record) notFound("Case");
    return withDerived(record);
  },

  async explain(intake: Intake) {
    return {
      region: resolveRegion(intake),
      riskFactors: deriveRiskFactors(intake).map((r) => ({ id: r.id, label: r.label, note: r.note })),
    };
  },

  async previewEmpiric(intake: Intake) {
    return recommendEmpiric(intake);
  },

  async createCase(payload) {
    return withDerived(createCase(payload));
  },

  async startTherapy(id, regimenId, actor) {
    const record = startTherapy(id, regimenId, actor);
    if (!record) notFound("Case or regimen");
    return withDerived(record);
  },

  async submitReview(id, payload) {
    const record = submitReview(id, payload);
    if (!record) notFound("Case");
    return withDerived(record);
  },

  async recordDecision(id, payload) {
    const record = recordDecision(id, payload);
    if (!record) notFound("Case");
    return withDerived(record);
  },

  async addNote(id, note, actor) {
    const record = addNote(id, note, actor);
    if (!record) notFound("Case");
    return withDerived(record);
  },
};

/** Identity and worklist counters, which the sidebar reads from /api/* in the served build. */
export const localSupportApi = {
  me() {
    return {
      id: "u1",
      username: "cchea",
      name: "Dr. Chet Chea",
      specialty: "Infectious Disease",
      subspecialty: "Antimicrobial Stewardship",
      hospital: "Marin Health Medical Center",
      ward: "ICU and General Medicine",
      city: "Kentfield",
      state: "CA",
      regionId: "us_west",
      role: "physician",
      verified: true,
      phiSafeMode: true,
      bio: "Board-certified Infectious Disease specialist with 21 years of clinical experience.",
      avatarUrl: "",
      credential: "MD",
    };
  },
  notifications() {
    const metrics = computeMetrics();
    const cases = listCases();
    return {
      reviewsDue: metrics.reviewsDue,
      reviewsOverdue: metrics.reviewsOverdue,
      alerts: metrics.coverageGapAlerts.filter((a) => a.severity === "high").length,
      activeCases: metrics.activeCases,
      nextReviewHours:
        cases
          .filter((c) => !c.targeted && !["completed", "stopped"].includes(c.status))
          .map(hoursToReview)
          .filter((hours) => hours > 0)
          .sort((a, b) => a - b)[0] ?? null,
    };
  },
};
