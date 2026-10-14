import type {
  CareSetting,
  ClinicalParameters,
  CultureResult,
  Intake,
  Severity,
  StewardshipCase,
  StewardshipEvent,
} from "./types";
import { getSyndrome } from "./data/syndromes";
import { recommendEmpiric } from "./engine/empiric";
import { recommendTargeted } from "./engine/targeted";

/**
 * Identifier for a case created at runtime.
 *
 * Uses the Web Crypto API rather than the Node `crypto` module so the engine
 * compiles unchanged for the browser build, where the whole engine runs
 * in-process and there is no server.
 */
function newId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  return `case-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Case construction, seed data and state transitions.
 *
 * Everything here is pure computation over a StewardshipCase record, which is
 * what lets the same source run in two places: behind /api/amr, where
 * case-repository.ts persists records in Postgres, and inside the standalone
 * browser build, where the in-memory store at the bottom of this file stands
 * in for the server. Nothing in this module may import a database driver.
 */

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function emptyClinical(overrides: Partial<ClinicalParameters> = {}): ClinicalParameters {
  return {
    ageYears: 0,
    sex: "other",
    weightKg: 0,
    onDialysis: false,
    hepaticImpairment: "none",
    pregnant: false,
    breastfeeding: false,
    immunosuppressed: false,
    neutropenic: false,
    severity: "moderate",
    ...overrides,
  };
}

export function emptyIntake(overrides: Partial<Intake> = {}): Intake {
  return {
    symptoms: {
      onsetDate: new Date().toISOString().slice(0, 10),
      timeOfDay: "",
      symptoms: [],
      exacerbatingFactors: "",
      alleviatingFactors: "",
      notes: "",
    },
    residenceRegionId: "us_northeast",
    residenceDetail: "",
    travel: [],
    sickContacts: [],
    suspectedSyndromeId: "sepsis_unknown",
    sourceNotes: "",
    comorbidities: [],
    medications: [],
    supplements: [],
    antibioticsLast90Days: [],
    allergies: [],
    environmentalAllergies: [],
    setting: "ward",
    homeEnvironment: { carpets: false, pets: [], waterExposure: false, notes: "" },
    foleyCatheter: { present: false },
    tracheostomy: { present: false },
    ventilator: { present: false },
    hardware: [],
    clinical: emptyClinical(),
    ...overrides,
  };
}

function event(kind: StewardshipEvent["kind"], summary: string, at: string, actor = "Ari"): StewardshipEvent {
  return { at, kind, summary, actor };
}

interface SeedSpec {
  /** Stable id so a bookmarked or shared case link survives a restart. */
  id: string;
  mrn: string;
  patientLabel: string;
  ward: string;
  assignedTo: string;
  createdHoursAgo: number;
  intake: Intake;
  selectedRegimenIndex?: number;
  cultures?: CultureResult;
  clinicalResponse?: StewardshipCase["clinicalResponse"];
  status: StewardshipCase["status"];
  /**
   * Laboratory results are back but the clinician has not run the review yet.
   * The case stays on the worklist with its recommendation ungenerated, which
   * is exactly the state the 48-72 hour checkpoint exists to catch.
   */
  awaitingClinicianReview?: boolean;
}

function buildCase(spec: SeedSpec): StewardshipCase {
  const syndrome = getSyndrome(spec.intake.suspectedSyndromeId);
  const createdAt = hoursAgo(spec.createdHoursAgo);
  const empiric = recommendEmpiric(spec.intake);
  const selected = empiric.regimens[spec.selectedRegimenIndex ?? 0];

  const timeline: StewardshipEvent[] = [
    event("intake_completed", "Screening completed across all 14 questions", createdAt, "Intake"),
    event(
      "empiric_started",
      `Empiric therapy started: ${selected?.label ?? "regimen not recorded"}`,
      createdAt,
    ),
  ];

  const record: StewardshipCase = {
    id: spec.id,
    mrn: spec.mrn,
    patientLabel: spec.patientLabel,
    createdAt,
    updatedAt: createdAt,
    status: spec.status,
    setting: spec.intake.setting,
    severity: spec.intake.clinical.severity,
    syndromeId: syndrome.id,
    syndromeName: syndrome.name,
    regionId: empiric.region.id,
    intake: spec.intake,
    empiric,
    selectedRegimenId: selected?.id,
    therapyStartedAt: createdAt,
    timeline,
    daysOfTherapy: Math.max(1, Math.round(spec.createdHoursAgo / 24)),
    assignedTo: spec.assignedTo,
    ward: spec.ward,
  };

  if (spec.cultures) {
    record.cultures = spec.cultures;
    timeline.push(
      event("cultures_resulted", "Culture and susceptibility results available", hoursAgo(4), "Laboratory"),
    );
  }

  if (spec.cultures && spec.clinicalResponse && selected && !spec.awaitingClinicianReview) {
    record.clinicalResponse = spec.clinicalResponse;
    record.targeted = recommendTargeted({
      intake: spec.intake,
      syndromeId: syndrome.id,
      currentAgentIds: selected.agents.map((a) => a.agentId),
      therapyStartedAt: createdAt,
      cultures: spec.cultures,
      response: spec.clinicalResponse,
    });
    timeline.push(
      event("review_completed", `48-72 hour review: ${record.targeted.actionLabel}`, hoursAgo(3), "Dr. Chea"),
    );
  }

  return record;
}

/** The demonstration caseload, rebuilt relative to the current time. */
export function buildSeedCases(): StewardshipCase[] {
  const specs: SeedSpec[] = [
    {
      id: "case-vap-4471",
      mrn: "MRN-4471",
      patientLabel: "68 y female, ICU bed 4",
      ward: "ICU",
      assignedTo: "Dr. Chea",
      createdHoursAgo: 52,
      status: "review_due",
      awaitingClinicianReview: true,
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Overnight, worse at 03:00",
          symptoms: ["Fever", "Increased sputum", "Rising oxygen requirement"],
          exacerbatingFactors: "Supine positioning",
          alleviatingFactors: "Suctioning gives brief relief",
          notes: "Ventilated for 8 days after emergency laparotomy.",
        },
        residenceRegionId: "us_northeast",
        residenceDetail: "Boston, MA",
        suspectedSyndromeId: "hap_vap",
        sourceNotes: "New right lower lobe infiltrate with purulent secretions.",
        comorbidities: ["diabetes", "ckd", "recent_hospitalisation"],
        medications: ["insulin glargine", "pantoprazole", "noradrenaline"],
        antibioticsLast90Days: ["cefazolin (surgical prophylaxis)"],
        allergies: [
          { agentOrClass: "penicillin", reaction: "urticarial rash at age 20", severity: "urticaria", yearOccurred: "1978" },
        ],
        setting: "icu",
        ventilator: { present: true, days: 8 },
        foleyCatheter: { present: true, days: 9 },
        clinical: emptyClinical({
          ageYears: 68,
          sex: "female",
          weightKg: 74,
          heightCm: 163,
          serumCreatinine: 1.9,
          severity: "severe",
          temperatureC: 38.7,
          heartRate: 112,
          systolicBp: 96,
          wbc: 18.2,
          lactate: 2.4,
        }),
      }),
      cultures: {
        status: "growth",
        isolates: [
          {
            organismId: "pseudomonas",
            specimen: "Bronchoalveolar lavage",
            collectedOn: daysAgo(2),
            susceptibilities: {
              cefepime: "S",
              ceftazidime: "S",
              pip_tazo: "S",
              meropenem: "S",
              ciprofloxacin: "R",
              levofloxacin: "R",
              gentamicin: "S",
              amikacin: "S",
            },
          },
        ],
        rapidDiagnostics: [
          { name: "MRSA nares PCR", result: "Negative" },
          { name: "Procalcitonin", result: "4.2 ng/mL, falling from 9.1" },
        ],
        notes: "Heavy growth, greater than 10^5 CFU/mL.",
      },
      clinicalResponse: {
        afebrile24h: false,
        hemodynamicallyStable: true,
        wbcTrend: "falling",
        tolueratingOral: false,
        sourceControlDone: true,
        improving: true,
        notes: "Oxygen requirement improving, off noradrenaline since yesterday.",
      },
    },
    {
      id: "case-pyelo-2298",
      mrn: "MRN-2298",
      patientLabel: "34 y male, Ward 6",
      ward: "General medicine",
      assignedTo: "Dr. Lindqvist",
      createdHoursAgo: 50,
      status: "review_due",
      awaitingClinicianReview: true,
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Started mid-afternoon",
          symptoms: ["Fever", "Rigors", "Left flank pain", "Dysuria"],
          exacerbatingFactors: "Movement and percussion of the flank",
          alleviatingFactors: "Nothing",
          notes: "Returned from a six-week posting in Chennai nine days ago.",
        },
        residenceRegionId: "us_midwest",
        residenceDetail: "Chicago, IL",
        travel: [
          {
            regionId: "south_asia",
            departed: daysAgo(56),
            returned: daysAgo(9),
            becameSickWhileTravelling: false,
            exposures: "Local food and water, no hospital contact.",
          },
        ],
        suspectedSyndromeId: "pyelonephritis",
        sourceNotes: "Left costovertebral angle tenderness, pyuria with nitrites.",
        comorbidities: [],
        medications: ["none"],
        allergies: [],
        setting: "ward",
        clinical: emptyClinical({
          ageYears: 34,
          sex: "male",
          weightKg: 81,
          heightCm: 178,
          serumCreatinine: 1.1,
          severity: "moderate",
          temperatureC: 39.1,
          heartRate: 104,
          systolicBp: 118,
          wbc: 15.4,
        }),
      }),
      cultures: {
        status: "growth",
        isolates: [
          {
            organismId: "esbl_enterobacterales",
            specimen: "Urine",
            collectedOn: daysAgo(2),
            susceptibilities: {
              ceftriaxone: "R",
              cefepime: "R",
              pip_tazo: "I",
              ertapenem: "S",
              meropenem: "S",
              amikacin: "S",
              gentamicin: "R",
              ciprofloxacin: "R",
              tmp_smx: "R",
              nitrofurantoin: "S",
              fosfomycin: "S",
            },
          },
        ],
        rapidDiagnostics: [{ name: "Blood culture", result: "No growth at 48 hours" }],
        notes: "Greater than 10^5 CFU/mL of a single organism.",
      },
      clinicalResponse: {
        afebrile24h: true,
        hemodynamicallyStable: true,
        wbcTrend: "falling",
        tolueratingOral: true,
        sourceControlDone: true,
        improving: true,
        notes: "Afebrile since yesterday morning, flank pain much improved.",
      },
    },
    {
      id: "case-cap-8830",
      mrn: "MRN-8830",
      patientLabel: "72 y male, Ward 3",
      ward: "General medicine",
      assignedTo: "Dr. Chea",
      createdHoursAgo: 8,
      status: "empiric",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Woke with it in the early morning",
          symptoms: ["Cough", "Fever", "Pleuritic chest pain", "Breathlessness"],
          exacerbatingFactors: "Deep inspiration",
          alleviatingFactors: "Sitting forward",
          notes: "Influenza-like illness in the household last week.",
        },
        residenceRegionId: "us_southeast",
        residenceDetail: "Atlanta, GA",
        suspectedSyndromeId: "cap",
        sourceNotes: "Right lower lobe consolidation on chest radiograph.",
        comorbidities: ["copd", "diabetes", "recent_influenza"],
        medications: ["tiotropium", "metformin", "atorvastatin"],
        supplements: ["vitamin D"],
        allergies: [],
        environmentalAllergies: ["dust mite"],
        setting: "ward",
        homeEnvironment: { carpets: true, pets: ["cat"], waterExposure: false, notes: "Wall-to-wall carpet throughout." },
        clinical: emptyClinical({
          ageYears: 72,
          sex: "male",
          weightKg: 88,
          heightCm: 175,
          serumCreatinine: 1.3,
          severity: "moderate",
          temperatureC: 38.4,
          heartRate: 98,
          systolicBp: 128,
          respiratoryRate: 24,
          wbc: 13.1,
        }),
      }),
    },
    {
      id: "case-ssi-1157",
      mrn: "MRN-1157",
      patientLabel: "56 y female, Ward 9",
      ward: "Surgery",
      assignedTo: "Dr. Haddad",
      createdHoursAgo: 74,
      status: "targeted",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Gradual over an afternoon",
          symptoms: ["Wound discharge", "Fever", "Abdominal pain"],
          exacerbatingFactors: "Coughing and mobilising",
          alleviatingFactors: "Analgesia",
          notes: "Open ventral hernia repair with polypropylene mesh three weeks ago.",
        },
        residenceRegionId: "us_west",
        residenceDetail: "Sacramento, CA",
        suspectedSyndromeId: "surgical_site",
        sourceNotes: "Purulent discharge from the inferior aspect of the midline wound, mesh visible.",
        comorbidities: ["diabetes", "recent_hospitalisation"],
        medications: ["metformin", "apixaban"],
        antibioticsLast90Days: ["cefazolin"],
        allergies: [{ agentOrClass: "sulfa", reaction: "diffuse rash", severity: "mild_rash" }],
        setting: "ward",
        hardware: [
          { type: "Polypropylene hernia mesh", site: "Anterior abdominal wall", implantedOn: daysAgo(21), suspectedFocus: true },
        ],
        clinical: emptyClinical({
          ageYears: 56,
          sex: "female",
          weightKg: 95,
          heightCm: 168,
          serumCreatinine: 0.9,
          severity: "moderate",
          temperatureC: 38.2,
          heartRate: 92,
          systolicBp: 132,
          wbc: 14.8,
        }),
      }),
      cultures: {
        status: "growth",
        isolates: [
          {
            organismId: "mssa",
            specimen: "Operative wound tissue",
            collectedOn: daysAgo(3),
            susceptibilities: {
              cefazolin: "S",
              nafcillin: "S",
              ceftriaxone: "S",
              vancomycin: "S",
              clindamycin: "S",
              tmp_smx: "S",
              doxycycline: "S",
              levofloxacin: "S",
              rifampin: "S",
            },
          },
        ],
        rapidDiagnostics: [{ name: "Blood culture", result: "No growth at 72 hours" }],
        notes: "Moderate growth from deep tissue.",
      },
      clinicalResponse: {
        afebrile24h: true,
        hemodynamicallyStable: true,
        wbcTrend: "falling",
        tolueratingOral: true,
        sourceControlDone: true,
        improving: true,
        notes: "Wound opened and packed, mesh partially excised.",
      },
    },
    {
      id: "case-nstis-6602",
      mrn: "MRN-6602",
      patientLabel: "45 y male, ED bay 2",
      ward: "Emergency",
      assignedTo: "Dr. Bell",
      createdHoursAgo: 3,
      status: "empiric",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Rapid onset since last night",
          symptoms: ["Severe leg pain", "Fever", "Skin discolouration", "Confusion"],
          exacerbatingFactors: "Any movement, pain far exceeds the visible findings",
          alleviatingFactors: "Nothing",
          notes: "Minor lawn injury four days ago.",
        },
        residenceRegionId: "us_southeast",
        residenceDetail: "Tampa, FL",
        suspectedSyndromeId: "necrotizing_fasciitis",
        sourceNotes: "Dusky skin over the right calf with crepitus and pain out of proportion.",
        comorbidities: ["diabetes"],
        medications: ["metformin"],
        allergies: [],
        setting: "ed",
        homeEnvironment: { carpets: false, pets: ["dog"], waterExposure: true, notes: "Frequent lake swimming." },
        clinical: emptyClinical({
          ageYears: 45,
          sex: "male",
          weightKg: 102,
          heightCm: 181,
          serumCreatinine: 1.6,
          severity: "septic_shock",
          temperatureC: 39.4,
          heartRate: 128,
          systolicBp: 84,
          respiratoryRate: 28,
          wbc: 22.6,
          lactate: 4.8,
        }),
      }),
    },
    {
      id: "case-cystitis-3390",
      mrn: "MRN-3390",
      patientLabel: "29 y female, outpatient clinic",
      ward: "Outpatient",
      assignedTo: "Dr. Ferreira",
      createdHoursAgo: 26,
      status: "awaiting_review",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Started in the evening",
          symptoms: ["Dysuria", "Frequency", "Urgency"],
          exacerbatingFactors: "Passing urine",
          alleviatingFactors: "Fluids give partial relief",
          notes: "No fever, no flank pain.",
        },
        residenceRegionId: "eu_west",
        residenceDetail: "Rotterdam",
        suspectedSyndromeId: "cystitis",
        sourceNotes: "Positive leucocyte esterase and nitrites.",
        comorbidities: [],
        medications: ["combined oral contraceptive"],
        allergies: [],
        setting: "outpatient",
        clinical: emptyClinical({
          ageYears: 29,
          sex: "female",
          weightKg: 63,
          heightCm: 170,
          serumCreatinine: 0.7,
          severity: "mild",
          temperatureC: 36.9,
          heartRate: 78,
          systolicBp: 114,
        }),
      }),
    },
    {
      id: "case-neutropenia-7714",
      mrn: "MRN-7714",
      patientLabel: "61 y male, Haematology",
      ward: "Haematology",
      assignedTo: "Dr. Nakamura",
      createdHoursAgo: 30,
      status: "awaiting_review",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Spiked at midnight",
          symptoms: ["Fever", "Rigors", "Mucositis"],
          exacerbatingFactors: "None identified",
          alleviatingFactors: "Paracetamol masks the fever only",
          notes: "Day 9 after induction chemotherapy.",
        },
        residenceRegionId: "us_northeast",
        residenceDetail: "Providence, RI",
        suspectedSyndromeId: "neutropenic_fever",
        sourceNotes: "No localising signs. Tunnelled line in situ.",
        comorbidities: ["malignancy", "central_line", "recent_hospitalisation"],
        medications: ["levofloxacin prophylaxis", "aciclovir", "ondansetron"],
        antibioticsLast90Days: ["levofloxacin"],
        allergies: [
          { agentOrClass: "penicillin", reaction: "anaphylaxis with airway involvement", severity: "anaphylaxis", yearOccurred: "2015" },
        ],
        setting: "ward",
        clinical: emptyClinical({
          ageYears: 61,
          sex: "male",
          weightKg: 70,
          heightCm: 174,
          serumCreatinine: 1.0,
          severity: "severe",
          immunosuppressed: true,
          neutropenic: true,
          temperatureC: 38.9,
          heartRate: 110,
          systolicBp: 104,
          wbc: 0.4,
        }),
      }),
    },
    {
      id: "case-cauti-5023",
      mrn: "MRN-5023",
      patientLabel: "77 y female, Ward 2",
      ward: "Care of the elderly",
      assignedTo: "Dr. Chea",
      createdHoursAgo: 96,
      status: "completed",
      intake: emptyIntake({
        symptoms: {
          onsetDate: new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10),
          timeOfDay: "Noticed at the morning round",
          symptoms: ["Confusion", "Fever", "Offensive urine"],
          exacerbatingFactors: "None identified",
          alleviatingFactors: "None",
          notes: "Nursing home resident with a long-term catheter.",
        },
        residenceRegionId: "us_midwest",
        residenceDetail: "Nursing facility, Ohio",
        suspectedSyndromeId: "cauti",
        sourceNotes: "Catheter in situ for six weeks.",
        comorbidities: ["ckd", "known_esbl", "recent_hospitalisation"],
        medications: ["amlodipine", "donepezil"],
        antibioticsLast90Days: ["ciprofloxacin", "ceftriaxone"],
        allergies: [],
        setting: "ltc",
        foleyCatheter: { present: true, days: 42 },
        clinical: emptyClinical({
          ageYears: 77,
          sex: "female",
          weightKg: 58,
          heightCm: 158,
          serumCreatinine: 1.7,
          severity: "moderate",
          temperatureC: 38.1,
          heartRate: 96,
          systolicBp: 122,
          wbc: 12.9,
        }),
      }),
      cultures: {
        status: "growth",
        isolates: [
          {
            organismId: "e_coli",
            specimen: "Urine from a freshly placed catheter",
            collectedOn: daysAgo(4),
            susceptibilities: {
              ceftriaxone: "S",
              cefepime: "S",
              ertapenem: "S",
              meropenem: "S",
              nitrofurantoin: "S",
              tmp_smx: "S",
              ciprofloxacin: "R",
              gentamicin: "S",
              amikacin: "S",
              cefazolin: "S",
            },
          },
        ],
        rapidDiagnostics: [{ name: "Blood culture", result: "No growth at 72 hours" }],
        notes: "Single organism at greater than 10^5 CFU/mL.",
      },
      clinicalResponse: {
        afebrile24h: true,
        hemodynamicallyStable: true,
        wbcTrend: "falling",
        tolueratingOral: true,
        sourceControlDone: true,
        improving: true,
        notes: "Catheter exchanged, confusion resolved.",
      },
    },
  ];

  return specs.map(buildCase);
}

/* ------------------------------------------------------------------ */
/* Pure transitions                                                    */
/* ------------------------------------------------------------------ */

export interface NewCaseInput {
  mrn: string;
  patientLabel: string;
  ward: string;
  assignedTo: string;
  intake: Intake;
}

/** Builds a new case record from an intake. Does not store it. */
export function newCase(input: NewCaseInput): StewardshipCase {
  const syndrome = getSyndrome(input.intake.suspectedSyndromeId);
  const empiric = recommendEmpiric(input.intake);
  const now = new Date().toISOString();

  const record: StewardshipCase = {
    id: newId(),
    mrn: input.mrn || "Unassigned",
    patientLabel: input.patientLabel || "Unlabelled patient",
    createdAt: now,
    updatedAt: now,
    status: "empiric",
    setting: input.intake.setting,
    severity: input.intake.clinical.severity,
    syndromeId: syndrome.id,
    syndromeName: syndrome.name,
    regionId: empiric.region.id,
    intake: input.intake,
    empiric,
    timeline: [event("intake_completed", "Screening completed across all 14 questions", now, "Intake")],
    daysOfTherapy: 0,
    assignedTo: input.assignedTo || "Unassigned",
    ward: input.ward || "Unassigned",
  };

  return record;
}

/** Records the regimen the clinician started. Returns undefined for an unknown regimen. */
export function applyStartTherapy(record: StewardshipCase, regimenId: string, actor: string): StewardshipCase | undefined {
  const regimen = record.empiric?.regimens.find((r) => r.id === regimenId);
  if (!regimen) return undefined;

  const now = new Date().toISOString();
  record.selectedRegimenId = regimenId;
  record.therapyStartedAt = now;
  record.status = "awaiting_review";
  record.updatedAt = now;
  record.daysOfTherapy = Math.max(record.daysOfTherapy, 1);
  record.decision = {
    outcome: regimen.preferred ? "accepted" : "modified",
    by: actor,
    at: now,
    note: regimen.preferred
      ? "Started the recommended regimen"
      : `Started ${regimen.label} instead of the preferred regimen`,
  };
  record.timeline.push(event("empiric_started", `Empiric therapy started: ${regimen.label}`, now, actor));
  return record;
}

export type ReviewPayload = {
  cultures: CultureResult;
  response: NonNullable<StewardshipCase["clinicalResponse"]>;
  actor: string;
};

/** Runs the 48 to 72 hour review. Returns undefined when the case never had an empiric plan. */
export function applySubmitReview(record: StewardshipCase, payload: ReviewPayload): StewardshipCase | undefined {
  if (!record.empiric) return undefined;

  const selected =
    record.empiric.regimens.find((r) => r.id === record.selectedRegimenId) ?? record.empiric.regimens[0];

  const targeted = recommendTargeted({
    intake: record.intake,
    syndromeId: record.syndromeId,
    currentAgentIds: selected?.agents.map((a) => a.agentId) ?? [],
    therapyStartedAt: record.therapyStartedAt ?? record.createdAt,
    cultures: payload.cultures,
    response: payload.response,
  });

  const now = new Date().toISOString();
  record.cultures = payload.cultures;
  record.clinicalResponse = payload.response;
  record.targeted = targeted;
  record.updatedAt = now;
  record.status = targeted.action === "stop" ? "stopped" : "targeted";
  record.timeline.push(event("cultures_resulted", "Culture and susceptibility results entered", now, payload.actor));
  record.timeline.push(event("review_completed", `48-72 hour review: ${targeted.actionLabel}`, now, payload.actor));
  return record;
}

export type DecisionPayload = { outcome: "accepted" | "modified" | "overridden"; by: string; note: string };

export function applyRecordDecision(record: StewardshipCase, payload: DecisionPayload): StewardshipCase {
  const now = new Date().toISOString();
  record.decision = { ...payload, at: now };
  record.updatedAt = now;

  const action = record.targeted?.action;
  if (payload.outcome === "accepted" && action) {
    if (action === "stop") {
      record.status = "stopped";
      record.timeline.push(event("stopped", "Antimicrobials stopped", now, payload.by));
    } else if (action === "de_escalate") {
      record.status = "targeted";
      record.timeline.push(event("de_escalated", "De-escalated to targeted therapy", now, payload.by));
    } else if (action === "escalate") {
      record.status = "targeted";
      record.timeline.push(event("escalated", "Escalated to cover the isolate", now, payload.by));
    } else if (action === "switch_iv_to_po") {
      record.status = "targeted";
      record.timeline.push(event("switched_iv_to_po", "Switched from intravenous to oral therapy", now, payload.by));
    }
  } else {
    record.timeline.push(event("note", `Recommendation ${payload.outcome}: ${payload.note}`, now, payload.by));
  }
  return record;
}

export function applyAddNote(record: StewardshipCase, note: string, actor: string): StewardshipCase {
  const now = new Date().toISOString();
  record.timeline.push(event("note", note, now, actor));
  record.updatedAt = now;
  return record;
}

/** Hours until (positive) or past (negative) the 48-hour review point. */
export function hoursToReview(record: StewardshipCase): number {
  const start = new Date(record.therapyStartedAt ?? record.createdAt).getTime();
  return Math.round((start + 48 * 3_600_000 - Date.now()) / 3_600_000);
}

export function isReviewDue(record: StewardshipCase): boolean {
  if (["completed", "stopped"].includes(record.status)) return false;
  if (record.targeted) return false;
  return hoursToReview(record) <= 0;
}

/* ------------------------------------------------------------------ */
/* In-memory store                                                     */
/*                                                                     */
/* Used by the standalone browser build and the engine test suite. The  */
/* server uses case-repository.ts, which persists the same records in   */
/* Postgres. The seed caseload is built on first use so importing this  */
/* module for its pure functions costs nothing.                         */
/* ------------------------------------------------------------------ */

let memoryCases: Map<string, StewardshipCase> | null = null;

function cases(): Map<string, StewardshipCase> {
  if (!memoryCases) {
    memoryCases = new Map(buildSeedCases().map((record) => [record.id, record]));
  }
  return memoryCases;
}

export function listCases(): StewardshipCase[] {
  return [...cases().values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getCase(id: string): StewardshipCase | undefined {
  return cases().get(id);
}

export function createCase(input: NewCaseInput): StewardshipCase {
  const record = newCase(input);
  cases().set(record.id, record);
  return record;
}

export function startTherapy(id: string, regimenId: string, actor: string): StewardshipCase | undefined {
  const record = cases().get(id);
  return record ? applyStartTherapy(record, regimenId, actor) : undefined;
}

export function submitReview(id: string, payload: ReviewPayload): StewardshipCase | undefined {
  const record = cases().get(id);
  return record ? applySubmitReview(record, payload) : undefined;
}

export function recordDecision(id: string, payload: DecisionPayload): StewardshipCase | undefined {
  const record = cases().get(id);
  return record ? applyRecordDecision(record, payload) : undefined;
}

export function addNote(id: string, note: string, actor: string): StewardshipCase | undefined {
  const record = cases().get(id);
  return record ? applyAddNote(record, note, actor) : undefined;
}
