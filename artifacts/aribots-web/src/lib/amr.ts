import type {
  Antimicrobial,
  CareSetting,
  CultureResult,
  Intake,
  Syndrome,
  Severity,
  SpectrumTier,
  StewardshipAction,
  StewardshipCaseView,
  SusceptibilityCategory,
} from "@shared/amr/types";
import type { AmrApi, AntibiogramView, ReferenceData, StewardshipMetrics } from "./amrApiTypes";
import { localAmrApi } from "./amrLocal";

export type * from "@shared/amr/types";
export type { AmrApi, AntibiogramView, ReferenceData, StewardshipMetrics } from "./amrApiTypes";

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/amr${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body: keep the status-code message.
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const httpAmrApi: AmrApi = {
  reference: () => request<ReferenceData>("/reference"),
  agent: (id: string) => request<Antimicrobial>(`/agents/${id}`),
  syndrome: (id: string) => request<Syndrome>(`/syndromes/${id}`),
  antibiogram: (regionId: string) => request<AntibiogramView>(`/antibiogram/${regionId}`),
  metrics: () => request<StewardshipMetrics>("/metrics"),
  cases: () => request<StewardshipCaseView[]>("/cases"),
  case: (id: string) => request<StewardshipCaseView>(`/cases/${id}`),
  explain: (intake: Intake) =>
    request<{
      region: { regionId: string; reason: string };
      riskFactors: { id: string; label: string; note?: string }[];
    }>("/recommend/explain", { method: "POST", body: JSON.stringify({ intake }) }),
  previewEmpiric: (intake: Intake) =>
    request<import("@shared/amr/types").EmpiricRecommendation>("/recommend/empiric", {
      method: "POST",
      body: JSON.stringify({ intake }),
    }),
  createCase: (payload: {
    mrn: string;
    patientLabel: string;
    ward: string;
    assignedTo: string;
    intake: Intake;
  }) => request<StewardshipCaseView>("/cases", { method: "POST", body: JSON.stringify(payload) }),
  startTherapy: (id: string, regimenId: string, actor: string) =>
    request<StewardshipCaseView>(`/cases/${id}/start`, {
      method: "POST",
      body: JSON.stringify({ regimenId, actor }),
    }),
  submitReview: (
    id: string,
    payload: { cultures: CultureResult; response: NonNullable<StewardshipCaseView["clinicalResponse"]>; actor: string },
  ) => request<StewardshipCaseView>(`/cases/${id}/review`, { method: "POST", body: JSON.stringify(payload) }),
  recordDecision: (id: string, payload: { outcome: "accepted" | "modified" | "overridden"; by: string; note: string }) =>
    request<StewardshipCaseView>(`/cases/${id}/decision`, { method: "POST", body: JSON.stringify(payload) }),
  addNote: (id: string, note: string, actor: string) =>
    request<StewardshipCaseView>(`/cases/${id}/notes`, { method: "POST", body: JSON.stringify({ note, actor }) }),
};

/**
 * Standalone builds run the engine in the browser and have no API server.
 * Everything else talks to /api/amr. The choice is made once, here, so no page
 * has to know which mode it is running in.
 */
export const STANDALONE = import.meta.env.VITE_STANDALONE === "1";

export const amrApi: AmrApi = STANDALONE ? localAmrApi : httpAmrApi;

/* ------------------------------------------------------------------ */
/* Presentation vocabulary                                             */
/*                                                                     */
/* Every label a clinician reads lives here rather than being retyped   */
/* per page, so "septic shock" and "ICU" never drift between screens.  */
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

export const SEVERITY_CLASSES: Record<Severity, string> = {
  mild: "bg-susceptible-soft text-susceptible border-susceptible/25",
  moderate: "bg-intermediate-soft text-intermediate border-intermediate/25",
  severe: "bg-resistant-soft text-resistant border-resistant/30",
  septic_shock: "bg-resistant text-white border-resistant",
};

export const TIER_LABELS: Record<SpectrumTier, string> = {
  narrow: "Narrow",
  moderate: "Moderate",
  broad: "Broad",
  extended: "Extended",
  reserve: "Reserve",
};

export const TIER_CLASSES: Record<SpectrumTier, string> = {
  narrow: "bg-tier-narrow/12 text-tier-narrow border-tier-narrow/30",
  moderate: "bg-tier-moderate/12 text-tier-moderate border-tier-moderate/30",
  broad: "bg-tier-broad/14 text-tier-broad border-tier-broad/35",
  extended: "bg-tier-extended/14 text-tier-extended border-tier-extended/35",
  reserve: "bg-tier-reserve/14 text-tier-reserve border-tier-reserve/35",
};

export const ACTION_CLASSES: Record<StewardshipAction, string> = {
  stop: "bg-action-stop/12 text-action-stop border-action-stop/30",
  de_escalate: "bg-action-narrow/12 text-action-narrow border-action-narrow/30",
  continue: "bg-action-continue/12 text-action-continue border-action-continue/30",
  escalate: "bg-action-escalate/12 text-action-escalate border-action-escalate/35",
  switch_iv_to_po: "bg-action-oral/12 text-action-oral border-action-oral/30",
  change_for_reliability: "bg-intermediate-soft text-intermediate border-intermediate/30",
  broaden_pending_source_control: "bg-intermediate-soft text-intermediate border-intermediate/30",
};

export const STATUS_LABELS: Record<StewardshipCaseView["status"], string> = {
  intake: "Intake",
  empiric: "Empiric started",
  awaiting_review: "Awaiting review",
  review_due: "Review due",
  targeted: "Targeted therapy",
  completed: "Completed",
  stopped: "Stopped",
};

export const STATUS_CLASSES: Record<StewardshipCaseView["status"], string> = {
  intake: "bg-muted text-muted-foreground border-border",
  empiric: "bg-primary/10 text-primary border-primary/25",
  awaiting_review: "bg-muted text-muted-foreground border-border",
  review_due: "bg-intermediate-soft text-intermediate border-intermediate/35",
  targeted: "bg-susceptible-soft text-susceptible border-susceptible/25",
  completed: "bg-muted text-muted-foreground border-border",
  stopped: "bg-susceptible-soft text-susceptible border-susceptible/25",
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

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** Colour class for a susceptibility percentage. Always paired with the number. */
export function susceptibilityClass(percent: number): string {
  if (percent >= 85) return "text-susceptible";
  if (percent >= 70) return "text-intermediate";
  if (percent > 0) return "text-resistant";
  return "text-untested";
}

export function susceptibilityBg(percent: number): string {
  if (percent >= 85) return "bg-susceptible";
  if (percent >= 70) return "bg-intermediate";
  if (percent > 0) return "bg-resistant";
  return "bg-untested";
}

export const CATEGORY_CLASSES: Record<SusceptibilityCategory, string> = {
  S: "bg-susceptible-soft text-susceptible border-susceptible/30",
  I: "bg-intermediate-soft text-intermediate border-intermediate/30",
  R: "bg-resistant-soft text-resistant border-resistant/30",
};

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** "in 14 h" / "6 h overdue" - the phrasing the worklist leans on. */
export function formatReviewClock(hours: number): string {
  if (hours > 0) {
    if (hours < 24) return `due in ${hours} h`;
    return `due in ${Math.round(hours / 24)} d`;
  }
  const overdue = Math.abs(hours);
  if (overdue < 24) return `${overdue} h overdue`;
  return `${Math.round(overdue / 24)} d overdue`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(duration: { min: number; max: number }): string {
  return duration.min === duration.max ? `${duration.min} days` : `${duration.min}-${duration.max} days`;
}
