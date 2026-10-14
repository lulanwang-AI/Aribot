import { api } from "./api";
import type {
  Antibiogram,
  Antimicrobial,
  CareSetting,
  CoverageFlag,
  CultureResult,
  ClinicalResponse,
  EmpiricRecommendation,
  Intake,
  Organism,
  Region,
  Severity,
  SpectrumTier,
  StewardshipAction,
  StewardshipCase,
  Syndrome,
} from "../../api-server/src/amr/types";

/**
 * Typed client for the stewardship API at /api/amr, plus the presentation
 * vocabulary the screens share. Types are the engine's own (type-only import,
 * erased at build time), so the phone can never drift from the server.
 */

export type * from "../../api-server/src/amr/types";

export type StewardshipCaseView = StewardshipCase & { hoursToReview: number; reviewDue: boolean };

export interface ReferenceData {
  knowledgeBaseVersion: string;
  syndromes: Pick<
    Syndrome,
    "id" | "name" | "category" | "description" | "guideline" | "requiredCoverage" | "durationDays" | "sourceControl"
  >[];
  regions: (Region & { facilityData: boolean })[];
  organisms: Pick<Organism, "id" | "name" | "shortName" | "gram" | "notes">[];
  agents: Pick<Antimicrobial, "id" | "name" | "shortName" | "drugClass" | "tier" | "routes" | "restricted" | "collateralDamageScore">[];
  comorbidities: { value: string; label: string; modifierId?: string }[];
  riskModifiers: { id: string; label: string; note?: string }[];
  coverageFlagLabels: Record<CoverageFlag, string>;
  emptyIntake: Intake;
}

export interface AntibiogramView extends Antibiogram {
  region: Region;
  facilityData: boolean;
  organisms: Pick<Organism, "id" | "name" | "shortName" | "gram">[];
  agents: Pick<Antimicrobial, "id" | "name" | "shortName" | "tier">[];
}

export interface StewardshipMetrics {
  activeCases: number;
  reviewsDue: number;
  reviewsOverdue: number;
  reviewsCompleted: number;
  deEscalationRate: number;
  stopRate: number;
  ivToPoEligible: number;
  daysOfTherapy: number;
  broadSpectrumDays: number;
  broadSpectrumShare: number;
  restrictedAgentCases: number;
  acceptanceRate: number;
  agentUsage: { agentId: string; name: string; cases: number; tier: string }[];
  syndromeMix: { syndromeId: string; name: string; cases: number }[];
  coverageGapAlerts: { caseId: string; patientLabel: string; message: string; severity: "high" | "medium" }[];
}

export const amrApi = {
  reference: () => api<ReferenceData>("/api/amr/reference"),
  agent: (id: string) => api<Antimicrobial>(`/api/amr/agents/${encodeURIComponent(id)}`),
  syndrome: (id: string) => api<Syndrome>(`/api/amr/syndromes/${encodeURIComponent(id)}`),
  antibiogram: (regionId: string) => api<AntibiogramView>(`/api/amr/antibiogram/${encodeURIComponent(regionId)}`),
  metrics: () => api<StewardshipMetrics>("/api/amr/metrics"),
  cases: () => api<StewardshipCaseView[]>("/api/amr/cases"),
  case: (id: string) => api<StewardshipCaseView>(`/api/amr/cases/${encodeURIComponent(id)}`),
  previewEmpiric: (intake: Intake) => api<EmpiricRecommendation>("/api/amr/recommend/empiric", { method: "POST", body: { intake } }),
  createCase: (payload: { mrn: string; patientLabel: string; ward: string; assignedTo: string; intake: Intake }) =>
    api<StewardshipCaseView>("/api/amr/cases", { method: "POST", body: payload }),
  startTherapy: (id: string, regimenId: string, actor: string) =>
    api<StewardshipCaseView>(`/api/amr/cases/${encodeURIComponent(id)}/start`, { method: "POST", body: { regimenId, actor } }),
  submitReview: (id: string, payload: { cultures: CultureResult; response: ClinicalResponse; actor: string }) =>
    api<StewardshipCaseView>(`/api/amr/cases/${encodeURIComponent(id)}/review`, { method: "POST", body: payload }),
  recordDecision: (id: string, payload: { outcome: "accepted" | "modified" | "overridden"; by: string; note: string }) =>
    api<StewardshipCaseView>(`/api/amr/cases/${encodeURIComponent(id)}/decision`, { method: "POST", body: payload }),
  addNote: (id: string, note: string, actor: string) =>
    api<StewardshipCaseView>(`/api/amr/cases/${encodeURIComponent(id)}/notes`, { method: "POST", body: { note, actor } }),
};

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const SETTING_LABELS: Record<CareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency",
  ward: "Ward",
  icu: "ICU",
  ltc: "Long-term care",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
  septic_shock: "Septic shock",
};

export const SEVERITY_TONE: Record<Severity, "good" | "warn" | "bad"> = {
  mild: "good",
  moderate: "warn",
  severe: "bad",
  septic_shock: "bad",
};

export const TIER_LABELS: Record<SpectrumTier, string> = {
  narrow: "Narrow",
  moderate: "Moderate",
  broad: "Broad",
  extended: "Extended",
  reserve: "Reserve",
};

export const TIER_TONE: Record<SpectrumTier, "good" | "primary" | "warn" | "bad"> = {
  narrow: "good",
  moderate: "primary",
  broad: "warn",
  extended: "bad",
  reserve: "bad",
};

export const STATUS_LABELS: Record<StewardshipCase["status"], string> = {
  intake: "Intake",
  empiric: "Empiric started",
  awaiting_review: "Awaiting review",
  review_due: "Review due",
  targeted: "Targeted therapy",
  completed: "Completed",
  stopped: "Stopped",
};

export const STATUS_TONE: Record<StewardshipCase["status"], "muted" | "primary" | "warn" | "good"> = {
  intake: "muted",
  empiric: "primary",
  awaiting_review: "muted",
  review_due: "warn",
  targeted: "good",
  completed: "muted",
  stopped: "good",
};

export const ACTION_TONE: Record<StewardshipAction, "good" | "primary" | "warn" | "bad"> = {
  stop: "good",
  de_escalate: "good",
  continue: "primary",
  escalate: "bad",
  switch_iv_to_po: "primary",
  change_for_reliability: "warn",
  broaden_pending_source_control: "warn",
};

export const CATEGORY_ORDER = [
  "Respiratory",
  "Urinary",
  "Skin and soft tissue",
  "Abdominal",
  "Bloodstream",
  "Central nervous system",
  "Bone and joint",
  "Surgical",
  "Gastrointestinal",
  "Immunocompromised",
  "Undifferentiated",
];

export function susceptibilityTone(percent: number): "good" | "warn" | "bad" | "muted" {
  if (percent >= 85) return "good";
  if (percent >= 70) return "warn";
  if (percent > 0) return "bad";
  return "muted";
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** "due in 14 h" / "6 h overdue": the phrasing the worklist leans on. */
export function formatReviewClock(hours: number): string {
  if (hours > 0) {
    if (hours < 24) return `due in ${hours} h`;
    return `due in ${Math.round(hours / 24)} d`;
  }
  const overdue = Math.abs(hours);
  if (overdue < 24) return `${overdue} h overdue`;
  return `${Math.round(overdue / 24)} d overdue`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(duration: { min: number; max: number }): string {
  return duration.min === duration.max ? `${duration.min} days` : `${duration.min}-${duration.max} days`;
}

export function regimenSummary(agents: { name: string; route: string; dose: string }[]): string {
  return agents.map((a) => `${a.name} ${a.route} ${a.dose}`).join(" + ");
}

/** The actor recorded on every mutation this app makes. */
export const MOBILE_ACTOR = "Ward round (mobile)";
