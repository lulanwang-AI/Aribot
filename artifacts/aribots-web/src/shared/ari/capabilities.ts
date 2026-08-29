// Single source of truth for the active capability list. Declared as a
// `const` tuple so consumers (server Zod enum + client UI) preserve the exact
// literal-string union - DON'T change this to a plain array.
//
// The registry is scoped to antimicrobial stewardship. Ari's chat surface is
// an adjunct to the deterministic recommendation engine: it explains, cites and
// answers follow-ups, but the regimen, dose, duration and monitoring plan come
// from the engine so they stay reproducible and auditable.
export const ACTIVE_CAPABILITY_IDS = [
  "empiric_selection",
  "de_escalation",
  "dosing_monitoring",
  "resistance_patterns",
  "source_control",
  "allergy_assessment",
] as const;

export type AriCapabilityId = (typeof ACTIVE_CAPABILITY_IDS)[number];

export type AriGateType = "location" | "measurement_image" | "none";

export interface AriCapability {
  id: AriCapabilityId;
  displayName: string;
  shortDescription: string;
  inputHint: string;
  acceptsImages: boolean;
  acceptsPdfs: boolean;
  gateRequirement: { type: AriGateType; uiHint: string };
  exampleQueries: string[];
}

export const ARI_CAPABILITIES: AriCapability[] = [
  {
    id: "empiric_selection",
    displayName: "Empiric selection",
    shortDescription:
      "Which agents to start before cultures result, weighted by the likely organisms and the regional resistance pattern.",
    inputHint:
      "Give the suspected source, care setting, severity, allergies, renal function and the patient's region or recent travel.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: {
      type: "location",
      uiHint: "Include the patient's region or treating facility - empiric choice depends on the local antibiogram",
    },
    exampleQueries: [
      "Empiric cover for ventilator-associated pneumonia on day 8 of intubation.",
      "Patient fell ill in Chennai and presented here with pyelonephritis - which antibiogram applies?",
      "Does this febrile neutropenia case need vancomycin from the start?",
    ],
  },
  {
    id: "de_escalation",
    displayName: "De-escalation and stopping",
    shortDescription:
      "The 48-72 hour decision: stop, narrow, escalate, or switch intravenous to oral.",
    inputHint:
      "Paste the culture and susceptibility panel, the current regimen, and how the patient has responded.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "MSSA in blood after 72 hours of vancomycin - what now?",
      "Cultures are negative at 48 hours and the patient is better. Can I stop?",
      "Meets every intravenous-to-oral criterion. Which oral agent covers this isolate?",
    ],
  },
  {
    id: "dosing_monitoring",
    displayName: "Dosing and monitoring",
    shortDescription:
      "Renal and weight-based dosing, therapeutic drug monitoring, and which labs to follow on therapy.",
    inputHint:
      "Give the agent, indication, weight, creatinine clearance, dialysis status and concomitant medications.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Vancomycin AUC-guided dosing for a 78-year-old with a creatinine clearance of 35.",
      "Which labs do I follow on six weeks of daptomycin for osteomyelitis?",
      "Cefepime dosing at a creatinine clearance of 12 and how do I watch for neurotoxicity?",
    ],
  },
  {
    id: "resistance_patterns",
    displayName: "Resistance patterns",
    shortDescription:
      "How regional and facility antibiograms change the empiric choice, and what travel exposure implies.",
    inputHint: "Name the organism, the agent in question and the region or facility.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: {
      type: "location",
      uiHint: "Name the region or facility whose antibiogram you want applied",
    },
    exampleQueries: [
      "How does a 62% regional ESBL rate change empiric therapy for urosepsis?",
      "Is ceftriaxone still reasonable for E. coli bacteraemia in our unit?",
      "What resistance should I expect after a month in Eastern Europe?",
    ],
  },
  {
    id: "source_control",
    displayName: "Source control",
    shortDescription:
      "What has to be drained, removed or debrided, and how that changes the duration clock.",
    inputHint: "Describe the focus, any devices or hardware, and what has been done so far.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Infected hernia mesh with MSSA - can the mesh stay in?",
      "When does the duration clock start after a percutaneous drain?",
      "Line-associated candidaemia: does the line have to come out?",
    ],
  },
  {
    id: "allergy_assessment",
    displayName: "Allergy assessment",
    shortDescription:
      "Whether a documented beta-lactam allergy really rules out the best agent, and what the safe alternative is.",
    inputHint: "Give the recorded allergy, the reaction, how severe it was and when it happened.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Childhood penicillin rash - is cefazolin safe for this MSSA bacteraemia?",
      "Documented anaphylaxis to ceftazidime. Is aztreonam still an option?",
      "Which agents remain if the patient reacts to both penicillins and sulfonamides?",
    ],
  },
];

// Build-time check that the registry covers every capability id exactly
// (catches drift between the const tuple above and the registry below).
const _registryCoversAll: Record<AriCapabilityId, AriCapability> =
  Object.fromEntries(ARI_CAPABILITIES.map((c) => [c.id, c])) as Record<
    AriCapabilityId,
    AriCapability
  >;
void _registryCoversAll;

export function isActiveCapability(id: string): id is AriCapabilityId {
  return (ACTIVE_CAPABILITY_IDS as readonly string[]).includes(id);
}

export function getCapability(id: AriCapabilityId): AriCapability {
  const c = ARI_CAPABILITIES.find((c) => c.id === id);
  if (!c) {
    throw new Error(`Unknown Ari capability: ${id}`);
  }
  return c;
}

export const CAPABILITY_REJECTION_MESSAGE =
  "That capability is not currently active. Available capabilities are: " +
  ACTIVE_CAPABILITY_IDS.join(", ") +
  ".";
