import type {
  Antibiogram,
  Antimicrobial,
  CoverageFlag,
  CultureResult,
  EmpiricRecommendation,
  Intake,
  Organism,
  Region,
  StewardshipCaseView,
  Syndrome,
} from "@shared/amr/types";

/**
 * The stewardship API surface.
 *
 * Two implementations satisfy it: one over HTTP against /api/amr, and one that
 * runs the engine in-process for the standalone build. Holding both to a single
 * interface is what keeps the hosted build honest - it is the same engine, not
 * a reimplementation.
 */
export interface ReferenceData {
  knowledgeBaseVersion: string;
  syndromes: Pick<
    Syndrome,
    "id" | "name" | "category" | "description" | "guideline" | "requiredCoverage" | "durationDays" | "sourceControl"
  >[];
  regions: (Region & { facilityData: boolean })[];
  organisms: Pick<Organism, "id" | "name" | "shortName" | "gram" | "notes">[];
  agents: (Pick<Antimicrobial, "id" | "name" | "shortName" | "drugClass" | "tier" | "routes" | "restricted" | "collateralDamageScore">)[];
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


export interface AmrApi {
  reference(): Promise<ReferenceData>;
  agent(id: string): Promise<Antimicrobial>;
  syndrome(id: string): Promise<Syndrome>;
  antibiogram(regionId: string): Promise<AntibiogramView>;
  metrics(): Promise<StewardshipMetrics>;
  cases(): Promise<StewardshipCaseView[]>;
  case(id: string): Promise<StewardshipCaseView>;
  explain(intake: Intake): Promise<{
    region: { regionId: string; reason: string };
    riskFactors: { id: string; label: string; note?: string }[];
  }>;
  previewEmpiric(intake: Intake): Promise<EmpiricRecommendation>;
  createCase(payload: {
    mrn: string;
    patientLabel: string;
    ward: string;
    assignedTo: string;
    intake: Intake;
  }): Promise<StewardshipCaseView>;
  startTherapy(id: string, regimenId: string, actor: string): Promise<StewardshipCaseView>;
  submitReview(
    id: string,
    payload: {
      cultures: CultureResult;
      response: NonNullable<StewardshipCaseView["clinicalResponse"]>;
      actor: string;
    },
  ): Promise<StewardshipCaseView>;
  recordDecision(
    id: string,
    payload: { outcome: "accepted" | "modified" | "overridden"; by: string; note: string },
  ): Promise<StewardshipCaseView>;
  addNote(id: string, note: string, actor: string): Promise<StewardshipCaseView>;
}
