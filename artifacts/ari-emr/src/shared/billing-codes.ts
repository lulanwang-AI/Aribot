// Common CPT code library with default fee schedule (cents) — demo data.
export type CptEntry = { code: string; description: string; priceCents: number; category: string };

export const CPT_LIBRARY: CptEntry[] = [
  { code: "99202", description: "Office visit, new patient, straightforward", priceCents: 12000, category: "E/M" },
  { code: "99203", description: "Office visit, new patient, low complexity", priceCents: 18500, category: "E/M" },
  { code: "99204", description: "Office visit, new patient, moderate complexity", priceCents: 27500, category: "E/M" },
  { code: "99212", description: "Office visit, established patient, straightforward", priceCents: 9500, category: "E/M" },
  { code: "99213", description: "Office visit, established patient, low complexity", priceCents: 15000, category: "E/M" },
  { code: "99214", description: "Office visit, established patient, moderate complexity", priceCents: 22000, category: "E/M" },
  { code: "99215", description: "Office visit, established patient, high complexity", priceCents: 30500, category: "E/M" },
  { code: "99281", description: "Emergency department visit, minor", priceCents: 15500, category: "Emergency" },
  { code: "99284", description: "Emergency department visit, high severity", priceCents: 52500, category: "Emergency" },
  { code: "99285", description: "Emergency department visit, life-threatening", priceCents: 78500, category: "Emergency" },
  { code: "99441", description: "Telehealth visit, 5-10 minutes", priceCents: 7500, category: "Telehealth" },
  { code: "99443", description: "Telehealth visit, 21-30 minutes", priceCents: 18500, category: "Telehealth" },
  { code: "80053", description: "Comprehensive metabolic panel", priceCents: 4800, category: "Lab" },
  { code: "85025", description: "CBC with differential", priceCents: 3500, category: "Lab" },
  { code: "83036", description: "Hemoglobin A1c", priceCents: 4200, category: "Lab" },
  { code: "80061", description: "Lipid panel", priceCents: 4500, category: "Lab" },
  { code: "84443", description: "TSH", priceCents: 4900, category: "Lab" },
  { code: "71046", description: "Chest X-ray, 2 views", priceCents: 9800, category: "Imaging" },
  { code: "71260", description: "CT chest with contrast", priceCents: 48500, category: "Imaging" },
  { code: "70450", description: "CT head without contrast", priceCents: 39500, category: "Imaging" },
  { code: "70551", description: "MRI brain without contrast", priceCents: 92500, category: "Imaging" },
  { code: "76700", description: "Abdominal ultrasound, complete", priceCents: 28500, category: "Imaging" },
  { code: "93000", description: "Electrocardiogram, complete", priceCents: 6500, category: "Cardiology" },
  { code: "93306", description: "Echocardiogram, complete", priceCents: 45500, category: "Cardiology" },
  { code: "96372", description: "Therapeutic injection, subcutaneous/IM", priceCents: 5500, category: "Procedure" },
  { code: "90471", description: "Immunization administration", priceCents: 4000, category: "Procedure" },
  { code: "36415", description: "Venipuncture", priceCents: 1500, category: "Procedure" },
];

export const CPT_MAP = new Map(CPT_LIBRARY.map((c) => [c.code, c]));

// Common ICD-10 pick list (supplemented by the patient's own problem list in the UI).
export const ICD10_COMMON: { code: string; description: string }[] = [
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified" },
  { code: "J06.9", description: "Acute upper respiratory infection" },
  { code: "J18.9", description: "Pneumonia, unspecified organism" },
  { code: "J44.9", description: "COPD, unspecified" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
  { code: "M54.50", description: "Low back pain, unspecified" },
  { code: "R07.9", description: "Chest pain, unspecified" },
  { code: "R51.9", description: "Headache, unspecified" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "F41.9", description: "Anxiety disorder, unspecified" },
  { code: "Z00.00", description: "General adult medical exam without abnormal findings" },
  { code: "Z23", description: "Encounter for immunization" },
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
];

export const DENIAL_REASONS = [
  "CO-16: Claim lacks information or has submission errors",
  "CO-29: Time limit for filing has expired",
  "CO-50: Service not deemed medically necessary",
  "CO-97: Benefit included in payment for another service",
  "PR-1: Deductible amount",
  "CO-18: Duplicate claim or service",
  "CO-11: Diagnosis inconsistent with procedure",
];
