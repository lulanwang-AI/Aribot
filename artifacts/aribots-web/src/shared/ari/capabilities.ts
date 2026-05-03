// Single source of truth for the active capability list. Declared as a
// `const` tuple so consumers (server Zod enum + client UI) preserve the exact
// literal-string union — DON'T change this to a plain array.
export const ACTIVE_CAPABILITY_IDS = [
  "antibiotic_stewardship",
  "wound_skin",
  "pharmacy",
  "ventilator",
  "calculators",
  "clinical_protocols",
  "er_triage",
  "cms_billing",
  "rad_onc_imaging",
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
    id: "antibiotic_stewardship",
    displayName: "Antibiotic Stewardship",
    shortDescription:
      "Empiric coverage, de-escalation, and duration grounded in local resistance patterns.",
    inputHint:
      "Describe suspected source, organism if known, allergies, renal function, and patient location or facility.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: {
      type: "location",
      uiHint:
        "Include patient location or treating facility — local resistance patterns required",
    },
    exampleQueries: [
      "Empiric coverage for hospital-acquired pneumonia in our ICU.",
      "Step-down options for MSSA bacteremia after 72 hours of cefazolin.",
      "Outpatient parenteral antibiotic therapy for cellulitis at our facility.",
    ],
  },
  {
    id: "wound_skin",
    displayName: "Wound & Skin",
    shortDescription:
      "Wound staging, dressing selection, and infection assessment from a measurable photo.",
    inputHint:
      "Describe wound location, duration, exudate, and patient comorbidities. Photo with size reference required.",
    acceptsImages: true,
    acceptsPdfs: false,
    gateRequirement: {
      type: "measurement_image",
      uiHint: "Upload a photo with a ruler or known-size reference object visible",
    },
    exampleQueries: [
      "Stage and dressing for a sacral pressure ulcer in a bedbound patient.",
      "Is this lower-leg redness cellulitis or stasis dermatitis?",
      "DFU classification and offloading recommendation.",
    ],
  },
  {
    id: "pharmacy",
    displayName: "Pharmacy",
    shortDescription:
      "Dosing, interactions, and renal/hepatic adjustments with primary-source citations.",
    inputHint:
      "Drug name, indication, patient weight, renal/hepatic function, and concomitant medications.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Vancomycin loading and maintenance for a 78-year-old with CrCl 35.",
      "Apixaban dosing in CrCl 22 — preferred alternative?",
      "Tacrolimus interaction risk when starting clarithromycin.",
    ],
  },
  {
    id: "ventilator",
    displayName: "Ventilator",
    shortDescription:
      "Initial settings, mode selection, and troubleshooting for invasive ventilation.",
    inputHint:
      "Indication for intubation, ABG values, plateau pressure, PEEP, and patient ideal body weight.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Initial vent settings for ARDS in a 70 kg IBW patient.",
      "Rising plateau pressure on volume control — next steps.",
      "Weaning protocol after four days on AC/VC for COPD exacerbation.",
    ],
  },
  {
    id: "calculators",
    displayName: "Calculators",
    shortDescription: "Validated clinical scoring tools with explicit input requirements.",
    inputHint:
      "Name the score and provide the inputs (age, vitals, labs, comorbidities).",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "CHA2DS2-VASc for a 72-year-old woman with HTN and prior TIA.",
      "Wells score for PE in this presenting patient.",
      "MELD-Na with these labs.",
    ],
  },
  {
    id: "clinical_protocols",
    displayName: "Clinical Protocols",
    shortDescription:
      "Step-by-step pathways for common admissions and bedside procedures.",
    inputHint:
      "Name the protocol or procedure and the patient context driving the question.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "DKA management protocol for an adult with K 3.2 on presentation.",
      "Rapid sequence intubation drug selection for elevated ICP.",
      "Massive transfusion protocol activation thresholds.",
    ],
  },
  {
    id: "er_triage",
    displayName: "ER Triage",
    shortDescription: "Acuity assessment grounded in ESI v4 with explicit reasoning.",
    inputHint:
      "Chief complaint, vitals, key history, and current level of distress.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "ESI level for a 56-year-old with chest pain, BP 150/90, HR 88.",
      "Triage acuity for a febrile post-chemo patient with ANC unknown.",
      "Reassessment criteria for a Level 3 patient awaiting workup.",
    ],
  },
  {
    id: "cms_billing",
    displayName: "CMS Billing",
    shortDescription:
      "Coverage policy, codes, and modifier selection from CMS coverage data.",
    inputHint:
      "Service or procedure, the patient's payer or region if known, and the documentation you have.",
    acceptsImages: false,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Is continuous glucose monitoring covered for this Type 2 diabetic on insulin?",
      "Modifier guidance for billing critical care alongside an ED E/M.",
      "LCD for outpatient cardiac rehab in our jurisdiction.",
    ],
  },
  {
    id: "rad_onc_imaging",
    displayName: "Rad/Onc Imaging",
    shortDescription:
      "Modality selection and follow-up imaging recommendations for oncology workups.",
    inputHint:
      "Suspected diagnosis, organ system, and any prior imaging or pathology results.",
    acceptsImages: true,
    acceptsPdfs: true,
    gateRequirement: { type: "none", uiHint: "" },
    exampleQueries: [
      "Best modality to evaluate a new solid liver lesion in a Hep C patient.",
      "Surveillance imaging interval after stage I melanoma resection.",
      "MRI vs CT for staging a newly diagnosed glioblastoma.",
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
