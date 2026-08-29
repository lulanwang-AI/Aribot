/**
 * Core domain types for the Ari antimicrobial stewardship engine.
 *
 * The engine is deliberately deterministic: given the same intake, the same
 * regional antibiogram and the same knowledge base version it returns the same
 * ranked regimens. Stewardship committees need to be able to audit and defend
 * every recommendation, which rules out free-form generation as the source of
 * truth.
 */

export type CareSetting = "outpatient" | "ed" | "ward" | "icu" | "ltc";

export type Severity = "mild" | "moderate" | "severe" | "septic_shock";

export type Route = "IV" | "PO" | "IM" | "topical" | "inhaled";

/** CLSI/EUCAST interpretive categories. */
export type SusceptibilityCategory = "S" | "I" | "R";

export type SpectrumTier =
  | "narrow"
  | "moderate"
  | "broad"
  | "extended"
  | "reserve";

export type StewardshipAction =
  | "stop"
  | "de_escalate"
  | "continue"
  | "escalate"
  | "switch_iv_to_po"
  /**
   * Fewer agents than before, but a wider spectrum. Honest labelling matters
   * here: counting this as a de-escalation would inflate the programme's
   * headline metric with changes that broadened therapy.
   */
  | "change_for_reliability"
  | "broaden_pending_source_control";

/* ------------------------------------------------------------------ */
/* Knowledge base                                                      */
/* ------------------------------------------------------------------ */

export interface RenalAdjustment {
  /** Inclusive lower bound of creatinine clearance, mL/min. */
  minCrCl: number;
  /** Exclusive upper bound, mL/min. Use Infinity for the top band. */
  maxCrCl: number;
  dose: string;
  note?: string;
}

export interface Antimicrobial {
  id: string;
  name: string;
  /** Short label used inside regimen chips. */
  shortName: string;
  drugClass: string;
  /** Allergy cross-reactivity group used by the allergy checker. */
  allergyClass: string;
  /**
   * R1 side-chain group. Beta-lactam cross-reactivity is driven by side-chain
   * similarity rather than by the shared ring, so agents sharing this string
   * cross-react strongly and agents that do not are largely independent.
   * Ceftazidime and aztreonam share an identical side chain; cefazolin's is
   * unique, which is why it is usually safe after a penicillin reaction.
   */
  sideChainGroup?: string;
  routes: Route[];
  tier: SpectrumTier;
  /** Standard adult dose at normal renal function. */
  adultDose: string;
  /** Dose used for severe infection / sepsis / CNS penetration. */
  severeDose?: string;
  /** Oral step-down dose when the agent has a PO form. */
  oralDose?: string;
  renalAdjustments: RenalAdjustment[];
  /** Labs and levels the stewardship team should follow while on therapy. */
  monitoring: string[];
  /** Free-text caveats surfaced verbatim in the UI. */
  cautions: string[];
  /** Reasonable CNS penetration at meningitic dosing. */
  cnsPenetration: boolean;
  /** Oral bioavailability high enough for IV-to-PO switch. */
  highOralBioavailability: boolean;
  pregnancyUse: "acceptable" | "avoid_if_alternative" | "contraindicated";
  /** Requires stewardship pre-authorisation at most facilities. */
  restricted: boolean;
  /** Relative ecological cost, 1 (narrow) to 5 (last-line). Drives ranking. */
  collateralDamageScore: number;
}

export interface Organism {
  id: string;
  name: string;
  shortName: string;
  gram: "positive" | "negative" | "atypical" | "anaerobe" | "fungal";
  /**
   * Whether an antibacterial regimen can be scored against this organism at
   * all. Viruses and fungi belong on the differential but not in the
   * antibacterial coverage denominator: counting influenza as an uncovered
   * organism would penalise every correct pneumonia regimen for failing to be
   * an antiviral.
   */
  kind?: "bacterial" | "viral" | "fungal";
  /** Agents this organism is intrinsically resistant to, regardless of antibiogram. */
  intrinsicResistance: string[];
  /** Preferred definitive agents once susceptibility is confirmed, best first. */
  preferredDefinitive: string[];
  notes?: string;
}

export interface OrganismLikelihood {
  organismId: string;
  /** Relative weight before normalisation. */
  weight: number;
  /** Why this organism is on the differential for this patient. */
  reason: string;
}

export interface RiskModifier {
  id: string;
  label: string;
  /** Organism weight multipliers applied when the modifier is present. */
  organismMultipliers: Record<string, number>;
  /** Coverage requirements this modifier forces on empiric therapy. */
  requiresCoverage?: CoverageFlag[];
  note?: string;
}

export type CoverageFlag =
  | "mrsa"
  | "pseudomonas"
  | "esbl"
  | "anaerobes"
  | "atypicals"
  | "enterococcus"
  | "candida"
  | "cns"
  | "biofilm";

export interface RegimenTemplate {
  id: string;
  label: string;
  /** Agent ids given together. */
  agentIds: string[];
  /** Only offered when the patient carries at least one of these flags. */
  requiresFlags?: CoverageFlag[];
  /** Suppressed when the patient carries any of these flags. */
  excludeWithFlags?: CoverageFlag[];
  /** Minimum severity at which this regimen is appropriate. */
  minSeverity?: Severity;
  /** Maximum severity at which this regimen is still adequate. */
  maxSeverity?: Severity;
  /** Settings this regimen is intended for. Empty means any. */
  settings?: CareSetting[];
  note?: string;
}

export interface Syndrome {
  id: string;
  name: string;
  /** Body-system grouping shown in the intake picker. */
  category: string;
  description: string;
  /** Baseline organism differential, before risk modifiers. */
  baseOrganisms: OrganismLikelihood[];
  /** Per-setting weight multipliers, e.g. ICU shifts toward resistant GNR. */
  settingMultipliers?: Partial<Record<CareSetting, Record<string, number>>>;
  /**
   * Per-severity weight multipliers. A superficial wound infection and a deep
   * organ-space infection after the same operation carry the same syndrome id
   * but very different differentials.
   */
  severityMultipliers?: Partial<Record<Severity, Record<string, number>>>;
  /** Coverage the syndrome always demands. */
  requiredCoverage: CoverageFlag[];
  regimens: RegimenTemplate[];
  /** Typical total treatment duration once the source is known. */
  durationDays: { min: number; max: number; note: string };
  /** Labs to follow specifically for this syndrome. */
  monitoring: string[];
  /** Source control steps that antibiotics alone will not fix. */
  sourceControl: string[];
  /** Guideline anchor shown next to the recommendation. */
  guideline: string;
}

/* ------------------------------------------------------------------ */
/* Antibiogram                                                         */
/* ------------------------------------------------------------------ */

export interface Region {
  id: string;
  name: string;
  /** Broader grouping used by the region picker. */
  area: string;
  /** Percent of S. aureus isolates that are methicillin resistant. */
  mrsaRate: number;
  /** Percent of E. coli / Klebsiella isolates producing ESBL. */
  esblRate: number;
  /** Percent of Enterobacterales that are carbapenem resistant. */
  creRate: number;
  /** Percent of P. aeruginosa that are multidrug resistant. */
  mdrPseudomonasRate: number;
  /** Percent of Enterococcus faecium that are vancomycin resistant. */
  vreRate: number;
  /** Data provenance shown in the UI. Never present synthetic data as surveillance. */
  source: string;
  updated: string;
}

/** organismId -> agentId -> percent susceptible (0-100). */
export type SusceptibilityTable = Record<string, Record<string, number>>;

export interface Antibiogram {
  regionId: string;
  regionName: string;
  source: string;
  updated: string;
  susceptibility: SusceptibilityTable;
}

/* ------------------------------------------------------------------ */
/* Intake - the 14 screening questions plus dosing parameters          */
/* ------------------------------------------------------------------ */

export interface SymptomHistory {
  /** ISO date the symptoms began. */
  onsetDate: string;
  /** Time of day symptoms started or peak, free text ("early morning"). */
  timeOfDay: string;
  /** Symptom checkboxes plus free text. */
  symptoms: string[];
  exacerbatingFactors: string;
  alleviatingFactors: string;
  /** Fever curve, rigors, night sweats etc. */
  notes: string;
}

export interface TravelEpisode {
  regionId: string;
  departed: string;
  returned: string;
  becameSickWhileTravelling: boolean;
  exposures: string;
}

export interface SickContact {
  who: string;
  where: string;
  illness: string;
  confirmedOrganism?: string;
}

export interface DrugAllergy {
  agentOrClass: string;
  reaction: string;
  severity: "intolerance" | "mild_rash" | "urticaria" | "anaphylaxis" | "sjs_ten" | "dress";
  yearOccurred?: string;
}

export interface Hardware {
  type: string;
  site: string;
  implantedOn: string;
  /** Suspected to be the infected focus. */
  suspectedFocus: boolean;
}

export interface Device {
  present: boolean;
  /** Days in situ, drives device-associated organism weighting. */
  days?: number;
  note?: string;
}

export interface ClinicalParameters {
  ageYears: number;
  sex: "female" | "male" | "other";
  weightKg: number;
  heightCm?: number;
  serumCreatinine?: number;
  /** Measured or calculated creatinine clearance, mL/min. */
  creatinineClearance?: number;
  onDialysis: boolean;
  hepaticImpairment: "none" | "mild" | "moderate" | "severe";
  pregnant: boolean;
  breastfeeding: boolean;
  immunosuppressed: boolean;
  neutropenic: boolean;
  severity: Severity;
  temperatureC?: number;
  heartRate?: number;
  systolicBp?: number;
  respiratoryRate?: number;
  wbc?: number;
  lactate?: number;
}

export interface Intake {
  /** Q1 */
  symptoms: SymptomHistory;
  /** Q2 - drives which antibiogram is applied. */
  residenceRegionId: string;
  residenceDetail: string;
  /** Q3 */
  travel: TravelEpisode[];
  /** Q4 */
  sickContacts: SickContact[];
  /** Q5 */
  suspectedSyndromeId: string;
  knownOrganismId?: string;
  sourceNotes: string;
  /** Q6 */
  comorbidities: string[];
  /** Q7 */
  medications: string[];
  supplements: string[];
  antibioticsLast90Days: string[];
  /** Q8 */
  allergies: DrugAllergy[];
  environmentalAllergies: string[];
  /** Q9 */
  setting: CareSetting;
  admittedOn?: string;
  hospitalDaysBeforeOnset?: number;
  /** Q10 */
  homeEnvironment: {
    carpets: boolean;
    pets: string[];
    waterExposure: boolean;
    notes: string;
  };
  /** Q11 */
  foleyCatheter: Device;
  /** Q12 */
  tracheostomy: Device;
  /** Q13 */
  ventilator: Device;
  /** Q14 */
  hardware: Hardware[];
  /** Dosing and severity parameters. */
  clinical: ClinicalParameters;
}

/* ------------------------------------------------------------------ */
/* Engine output                                                       */
/* ------------------------------------------------------------------ */

export interface DosedAgent {
  agentId: string;
  name: string;
  drugClass: string;
  route: Route;
  dose: string;
  /** Renal band that produced the dose, when adjusted. */
  renalNote?: string;
  monitoring: string[];
  cautions: string[];
  tier: SpectrumTier;
  restricted: boolean;
}

export interface OrganismCoverage {
  organismId: string;
  name: string;
  shortName: string;
  /** Normalised likelihood, 0-1. */
  likelihood: number;
  /** Best expected percent susceptible across the regimen's agents. */
  expectedSusceptibility: number;
  covered: boolean;
  reason: string;
}

export interface AllergyConflict {
  agentId: string;
  agentName: string;
  allergy: string;
  severity: DrugAllergy["severity"];
  kind: "direct" | "cross_reactive";
  /** Cross-reactivity risk expressed as a percentage where published. */
  estimatedRisk?: string;
  verdict: "contraindicated" | "avoid" | "acceptable_with_caution";
  guidance: string;
}

export interface RegimenRecommendation {
  id: string;
  label: string;
  agents: DosedAgent[];
  /** Weighted percent of the differential expected to be covered. */
  expectedCoverage: number;
  /** Sum of collateral damage scores. Lower is better. */
  spectrumCost: number;
  /**
   * The collateral damage score of the broadest single agent in the regimen.
   * Ranked before the sum, because one last-line agent drives more resistance
   * across a unit than two narrow ones do together.
   */
  spectrumBreadth: number;
  rank: number;
  preferred: boolean;
  /**
   * This option prescribes no antimicrobial: the treatment is drainage,
   * debridement or device removal. Coverage arithmetic does not apply, so
   * `expectedCoverage` is 0 and must not be read as inadequacy.
   */
  sourceControlOnly: boolean;
  organismCoverage: OrganismCoverage[];
  allergyConflicts: AllergyConflict[];
  rationale: string[];
  warnings: string[];
  durationDays: { min: number; max: number; note: string };
  monitoring: string[];
  /** Ranking explanation, e.g. "narrowest regimen meeting the 90% target". */
  selectionNote: string;
}

export interface EmpiricRecommendation {
  generatedAt: string;
  knowledgeBaseVersion: string;
  syndrome: { id: string; name: string; guideline: string };
  region: { id: string; name: string; source: string; updated: string };
  coverageTarget: number;
  differential: OrganismCoverage[];
  riskFactors: { id: string; label: string; note?: string }[];
  /** Coverage the syndrome itself mandates. Not negotiable. */
  /**
   * Differential entries an antibacterial regimen cannot address: viruses and
   * fungi. Reported separately so they are neither scored as coverage gaps nor
   * quietly dropped from the clinician's view.
   */
  nonBacterialConsiderations: { organismId: string; name: string; likelihood: number; note: string }[];
  requiredCoverage: CoverageFlag[];
  /**
   * Coverage the patient's risk profile raises for consideration. These unlock
   * broader regimens as options; they do not assert that the patient needs
   * them. The ranking still prefers the narrowest adequate regimen.
   */
  consideredCoverage: CoverageFlag[];
  regimens: RegimenRecommendation[];
  sourceControl: string[];
  /** Cultures and imaging to send before the first dose. */
  workup: string[];
  /** The 48-72 hour checkpoint this app exists to enforce. */
  reassessment: {
    dueAt: string;
    windowHours: [number, number];
    checklist: string[];
  };
  redFlags: string[];
  /**
   * Populated only when every regimen for the syndrome is contraindicated by
   * the recorded allergies. These are the lowest-collateral agents the patient
   * can still receive, offered as a starting point for an allergy discussion
   * rather than as a regimen.
   */
  safeAlternatives: { agentId: string; name: string; drugClass: string; tier: SpectrumTier }[];
  disclaimers: string[];
}

/* ------------------------------------------------------------------ */
/* 48-72 hour reassessment                                             */
/* ------------------------------------------------------------------ */

export interface CultureIsolate {
  organismId: string;
  specimen: string;
  collectedOn: string;
  /** agentId -> S/I/R as reported by the lab. */
  susceptibilities: Record<string, SusceptibilityCategory>;
  /** Lab flagged this as probable contaminant. */
  probableContaminant?: boolean;
}

export interface CultureResult {
  status: "pending" | "no_growth" | "growth" | "contaminant";
  isolates: CultureIsolate[];
  /** Non-culture diagnostics: PCR panels, antigen, MRSA nares, procalcitonin. */
  rapidDiagnostics: { name: string; result: string }[];
  notes: string;
}

export interface ClinicalResponse {
  afebrile24h: boolean;
  hemodynamicallyStable: boolean;
  wbcTrend: "falling" | "flat" | "rising";
  tolueratingOral: boolean;
  /** Source control achieved where it was required. */
  sourceControlDone: boolean;
  improving: boolean;
  notes: string;
}

export interface TargetedRecommendation {
  generatedAt: string;
  knowledgeBaseVersion: string;
  action: StewardshipAction;
  actionLabel: string;
  headline: string;
  confidence: "high" | "moderate" | "low";
  regimen: DosedAgent[];
  /** Agents on the current regimen that should be discontinued now. */
  discontinue: { agentId: string; name: string; reason: string }[];
  totalDuration: { min: number; max: number; note: string };
  /** Calendar day therapy should end, counting from the first dose. */
  stopDate?: string;
  monitoring: string[];
  rationale: string[];
  warnings: string[];
  ivToPo: { eligible: boolean; agent?: DosedAgent; blockers: string[] };
  disclaimers: string[];
}

/* ------------------------------------------------------------------ */
/* Case record                                                         */
/* ------------------------------------------------------------------ */

export type CaseStatus =
  | "intake"
  | "empiric"
  | "awaiting_review"
  | "review_due"
  | "targeted"
  | "completed"
  | "stopped";

export interface StewardshipEvent {
  at: string;
  kind:
    | "intake_completed"
    | "empiric_started"
    | "cultures_resulted"
    | "review_completed"
    | "de_escalated"
    | "escalated"
    | "stopped"
    | "switched_iv_to_po"
    | "completed"
    | "note";
  summary: string;
  actor: string;
  detail?: string;
}

export interface StewardshipCase {
  id: string;
  mrn: string;
  patientLabel: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  setting: CareSetting;
  severity: Severity;
  syndromeId: string;
  syndromeName: string;
  regionId: string;
  intake: Intake;
  empiric?: EmpiricRecommendation;
  /** Regimen the clinician actually started. */
  selectedRegimenId?: string;
  therapyStartedAt?: string;
  cultures?: CultureResult;
  clinicalResponse?: ClinicalResponse;
  targeted?: TargetedRecommendation;
  /** Accepted / overridden / pending for the last recommendation. */
  decision?: {
    outcome: "accepted" | "modified" | "overridden";
    by: string;
    at: string;
    note: string;
  };
  timeline: StewardshipEvent[];
  /** Days of therapy accumulated, used for the DOT metric. */
  daysOfTherapy: number;
  assignedTo: string;
  ward: string;
}
