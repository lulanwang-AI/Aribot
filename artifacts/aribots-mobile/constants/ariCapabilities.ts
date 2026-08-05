// Mirrors the web app's Ask Ari capability registry
// (artifacts/aribots-web/src/shared/ari/capabilities.ts) for the
// "What can Ari do" sheet. Keep content in sync with the web version.
import { Feather } from "@expo/vector-icons";

export interface AriCapabilityInfo {
  id: string;
  displayName: string;
  shortDescription: string;
  icon: keyof typeof Feather.glyphMap;
  exampleQueries: string[];
}

export const ARI_CAPABILITIES: AriCapabilityInfo[] = [
  {
    id: "antibiotic_stewardship",
    displayName: "Antibiotic Stewardship",
    shortDescription: "Empiric coverage, de-escalation, and duration grounded in local resistance patterns.",
    icon: "shield",
    exampleQueries: [
      "Empiric coverage for hospital-acquired pneumonia in our ICU.",
      "Step-down options for MSSA bacteremia after 72 hours of cefazolin.",
    ],
  },
  {
    id: "wound_skin",
    displayName: "Wound & Skin",
    shortDescription: "Wound staging, dressing selection, and infection assessment from a measurable photo.",
    icon: "layers",
    exampleQueries: [
      "Stage and dressing for a sacral pressure ulcer in a bedbound patient.",
      "Is this lower-leg redness cellulitis or stasis dermatitis?",
    ],
  },
  {
    id: "pharmacy",
    displayName: "Pharmacy",
    shortDescription: "Dosing, interactions, and renal/hepatic adjustments with primary-source citations.",
    icon: "package",
    exampleQueries: [
      "Vancomycin loading and maintenance for a 78-year-old with CrCl 35.",
      "Apixaban dosing in CrCl 22 — preferred alternative?",
    ],
  },
  {
    id: "ventilator",
    displayName: "Ventilator",
    shortDescription: "Initial settings, mode selection, and troubleshooting for invasive ventilation.",
    icon: "wind",
    exampleQueries: [
      "Initial vent settings for ARDS in a 70 kg IBW patient.",
      "Rising plateau pressure on volume control — next steps.",
    ],
  },
  {
    id: "calculators",
    displayName: "Calculators",
    shortDescription: "Validated clinical scoring tools with explicit input requirements.",
    icon: "hash",
    exampleQueries: [
      "CHA2DS2-VASc for a 72-year-old woman with HTN and prior TIA.",
      "Wells score for PE in this presenting patient.",
    ],
  },
  {
    id: "clinical_protocols",
    displayName: "Clinical Protocols",
    shortDescription: "Step-by-step pathways for common admissions and bedside procedures.",
    icon: "list",
    exampleQueries: [
      "DKA management protocol for an adult with K 3.2 on presentation.",
      "Rapid sequence intubation drug selection for elevated ICP.",
    ],
  },
  {
    id: "er_triage",
    displayName: "ER Triage",
    shortDescription: "Acuity assessment grounded in ESI v4 with explicit reasoning.",
    icon: "activity",
    exampleQueries: [
      "ESI level for a 56-year-old with chest pain, BP 150/90, HR 88.",
      "Triage acuity for a febrile post-chemo patient with ANC unknown.",
    ],
  },
  {
    id: "cms_billing",
    displayName: "CMS Billing",
    shortDescription: "Coverage policy, codes, and modifier selection from CMS coverage data.",
    icon: "file-text",
    exampleQueries: [
      "Is continuous glucose monitoring covered for this Type 2 diabetic on insulin?",
      "Modifier guidance for billing critical care alongside an ED E/M.",
    ],
  },
  {
    id: "rad_onc_imaging",
    displayName: "Rad/Onc Imaging",
    shortDescription: "Modality selection and follow-up imaging recommendations for oncology workups.",
    icon: "crosshair",
    exampleQueries: [
      "Best modality to evaluate a new solid liver lesion in a Hep C patient.",
      "MRI vs CT for staging a newly diagnosed glioblastoma.",
    ],
  },
];
