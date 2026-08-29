import type { CoverageFlag, RiskModifier } from "../types";

/**
 * Risk modifiers derived from the 14 screening questions.
 *
 * Each modifier states which organisms it makes more likely and which coverage
 * flags it forces. The engine records every modifier it fired so the clinician
 * can see exactly which answer changed the recommendation.
 */
export const RISK_MODIFIERS: RiskModifier[] = [
  {
    id: "foley_catheter",
    label: "Indwelling urinary catheter",
    organismMultipliers: {
      pseudomonas: 2.2,
      proteus: 1.8,
      e_faecalis: 1.6,
      klebsiella: 1.4,
      candida: 2,
      esbl_enterobacterales: 1.4,
    },
    note: "Catheter biofilm selects for Pseudomonas, Proteus and enterococci. Removal matters more than the antibiotic choice. Duration in situ is what raises the antipseudomonal question, so that sits on the prolonged-catheter modifier rather than here.",
  },
  {
    id: "foley_prolonged",
    label: "Urinary catheter in place more than 7 days",
    organismMultipliers: { pseudomonas: 1.6, candida: 1.6, esbl_enterobacterales: 1.5 },
    requiresCoverage: ["pseudomonas"],
    note: "Bacteriuria becomes universal beyond a week of catheterisation.",
  },
  {
    id: "tracheostomy",
    label: "Tracheostomy",
    organismMultipliers: { pseudomonas: 2.4, mrsa: 1.6, acinetobacter: 1.8, klebsiella: 1.3 },
    requiresCoverage: ["pseudomonas"],
    note: "Tracheal colonisation with gram negatives is near universal. Colonisation is not infection.",
  },
  {
    id: "ventilator",
    label: "Mechanical ventilation",
    organismMultipliers: { pseudomonas: 2.6, acinetobacter: 2.2, mrsa: 1.8, enterobacter: 1.5 },
    requiresCoverage: ["pseudomonas", "mrsa"],
    note: "Risk rises sharply after five ventilator days.",
  },
  {
    id: "ventilator_prolonged",
    label: "Ventilated more than 5 days",
    organismMultipliers: { pseudomonas: 1.4, acinetobacter: 1.5, esbl_enterobacterales: 1.4 },
    requiresCoverage: ["pseudomonas", "mrsa"],
  },
  {
    id: "hardware_focus",
    label: "Implanted hardware at the suspected focus",
    organismMultipliers: { coag_neg_staph: 2.6, mssa: 1.3, mrsa: 1.3, e_faecalis: 1.2 },
    requiresCoverage: ["biofilm", "mrsa"],
    note: "Biofilm on hardware makes cure without device removal or rifampin-based combination therapy unlikely.",
  },
  {
    id: "hardware_present",
    label: "Implanted hardware elsewhere",
    organismMultipliers: { coag_neg_staph: 1.4 },
    note: "Any bacteraemia risks seeding retained hardware. Repeat blood cultures to document clearance.",
  },
  {
    id: "recent_antibiotics",
    label: "Antibiotics within the last 90 days",
    organismMultipliers: {
      esbl_enterobacterales: 2.4,
      pseudomonas: 1.6,
      enterobacter: 1.5,
      e_faecium: 1.8,
      candida: 1.5,
      c_difficile: 2,
    },
    requiresCoverage: ["esbl", "candida"],
    note: "The strongest single predictor of a resistant organism on the next culture.",
  },
  {
    id: "recent_hospitalisation",
    label: "Hospitalised within the last 90 days",
    organismMultipliers: { mrsa: 1.6, pseudomonas: 1.5, esbl_enterobacterales: 1.6, enterobacter: 1.3 },
    requiresCoverage: ["mrsa"],
  },
  {
    id: "long_term_care",
    label: "Long-term care facility resident",
    organismMultipliers: {
      mrsa: 1.8,
      pseudomonas: 1.7,
      esbl_enterobacterales: 1.8,
      proteus: 1.4,
      klebsiella: 1.3,
    },
    requiresCoverage: ["mrsa", "esbl"],
    note: "Facility flora differ from community flora. Use the facility antibiogram if one exists.",
  },
  {
    id: "travel_high_resistance",
    label: "Recent travel to a high-resistance region",
    organismMultipliers: { esbl_enterobacterales: 2.6, klebsiella: 1.4 },
    requiresCoverage: ["esbl"],
    note: "Travellers acquire ESBL-producing Enterobacterales at high rates, and carriage persists for months.",
  },
  {
    id: "sick_while_travelling",
    label: "Became unwell while travelling",
    organismMultipliers: { esbl_enterobacterales: 1.8 },
    requiresCoverage: ["esbl"],
    note: "Empiric therapy is driven by the antibiogram of the region where the infection was acquired, not the region of residence.",
  },
  {
    id: "immunosuppressed",
    label: "Immunosuppressed",
    organismMultipliers: { pseudomonas: 1.8, candida: 2, listeria: 2.5, enterobacter: 1.3, mrsa: 1.2 },
    requiresCoverage: ["pseudomonas"],
  },
  {
    id: "neutropenic",
    label: "Neutropenic",
    organismMultipliers: { pseudomonas: 2.2, candida: 2.2, e_coli: 1.3, klebsiella: 1.3 },
    requiresCoverage: ["pseudomonas"],
    note: "Antipseudomonal cover within one hour. Neutropenic sepsis is a time-critical emergency.",
  },
  {
    id: "known_mrsa",
    label: "Known MRSA colonisation or prior MRSA infection",
    organismMultipliers: { mrsa: 3.5 },
    requiresCoverage: ["mrsa"],
    note: "A negative MRSA nares PCR has a high negative predictive value in pneumonia and allows early de-escalation.",
  },
  {
    id: "known_esbl",
    label: "Known ESBL colonisation or prior ESBL infection",
    organismMultipliers: { esbl_enterobacterales: 4 },
    requiresCoverage: ["esbl"],
  },
  {
    id: "known_pseudomonas",
    label: "Prior Pseudomonas isolation",
    organismMultipliers: { pseudomonas: 3 },
    requiresCoverage: ["pseudomonas"],
  },
  {
    id: "dialysis",
    label: "Haemodialysis",
    organismMultipliers: { mrsa: 2.2, coag_neg_staph: 1.6, e_faecalis: 1.3 },
    requiresCoverage: ["mrsa"],
    note: "Dialysis access is the usual portal. Evaluate the access site in every febrile dialysis patient.",
  },
  {
    id: "injection_drug_use",
    label: "Injection drug use",
    organismMultipliers: { mrsa: 2.4, mssa: 1.6, pseudomonas: 1.5, candida: 1.4 },
    requiresCoverage: ["mrsa"],
    note: "Evaluate for endocarditis, epidural abscess and septic emboli.",
  },
  {
    id: "central_line",
    label: "Central venous catheter",
    organismMultipliers: { coag_neg_staph: 2.2, mrsa: 1.5, candida: 1.8, e_faecium: 1.3 },
    requiresCoverage: ["mrsa"],
    note: "The line is both the likely portal and the thing that has to come out. Candidaemia risk rises with it, so antifungal cover is raised for consideration.",
  },
  {
    id: "parenteral_nutrition",
    label: "Total parenteral nutrition",
    organismMultipliers: { candida: 2.4, coag_neg_staph: 1.4 },
    requiresCoverage: ["candida"],
    note: "The classic candidaemia patient: a tunnelled line, parenteral nutrition, and often no antibiotic exposure at all.",
  },
  {
    id: "structural_lung_disease",
    label: "Bronchiectasis or advanced COPD",
    organismMultipliers: { pseudomonas: 2.6, h_influenzae: 1.4, m_catarrhalis: 1.4 },
    requiresCoverage: ["pseudomonas"],
  },
  {
    id: "cirrhosis",
    label: "Cirrhosis",
    organismMultipliers: { e_coli: 1.4, klebsiella: 1.4, s_pneumoniae: 1.3, e_faecium: 1.3 },
    note: "Low threshold for diagnostic paracentesis to exclude spontaneous bacterial peritonitis.",
  },
  {
    id: "diabetes",
    label: "Diabetes mellitus",
    organismMultipliers: { mssa: 1.2, mrsa: 1.2, klebsiella: 1.2, candida: 1.2 },
  },
  {
    id: "ckd",
    label: "Chronic kidney disease",
    organismMultipliers: {},
    note: "Every dose in the recommendation is adjusted to the entered creatinine clearance.",
  },
  {
    id: "asplenia",
    label: "Asplenia",
    organismMultipliers: { s_pneumoniae: 2.4, h_influenzae: 2, n_meningitidis: 2.4 },
    note: "Encapsulated organism sepsis can progress within hours. Do not delay the first dose.",
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    organismMultipliers: { listeria: 2.5, e_coli: 1.2 },
    note: "Avoid fluoroquinolones and tetracyclines. Aminoglycosides only when the benefit clearly outweighs the risk.",
  },
  {
    id: "age_over_50",
    label: "Age over 50",
    organismMultipliers: { listeria: 2 },
    note: "Relevant to meningitis: all cephalosporins fail against Listeria, so ampicillin must be added.",
  },
  {
    id: "water_exposure",
    label: "Fresh water, hot tub or soil exposure",
    organismMultipliers: { pseudomonas: 2 },
    requiresCoverage: ["pseudomonas"],
  },
  {
    id: "pet_exposure",
    label: "Household pets with bite or scratch exposure",
    organismMultipliers: { mssa: 1.1, bacteroides: 1.3 },
    note: "Bite wounds need Pasteurella and anaerobic cover - amoxicillin-clavulanate is the agent of choice.",
  },
  {
    id: "carpet_dust_exposure",
    label: "Carpets, rugs or heavy dust at home",
    organismMultipliers: {},
    note: "Relevant to the allergy differential rather than the organism differential - consider whether this is allergic rather than infectious.",
  },
  {
    id: "sick_contact_confirmed",
    label: "Sick contact with a confirmed organism",
    organismMultipliers: {},
    note: "A confirmed organism in a close contact is weighted directly into the differential.",
  },
  {
    id: "influenza_season",
    label: "Influenza-like illness in the preceding week",
    organismMultipliers: { mssa: 1.8, mrsa: 1.8, s_pneumoniae: 1.4, influenza: 2.5 },
    note: "Post-influenza staphylococcal pneumonia is aggressive and often necrotising.",
  },
];

export const RISK_MODIFIERS_BY_ID: Record<string, RiskModifier> = Object.fromEntries(
  RISK_MODIFIERS.map((r) => [r.id, r]),
);

export const COVERAGE_FLAG_LABELS: Record<CoverageFlag, string> = {
  mrsa: "MRSA cover",
  pseudomonas: "Antipseudomonal cover",
  esbl: "ESBL cover",
  anaerobes: "Anaerobic cover",
  atypicals: "Atypical cover",
  enterococcus: "Enterococcal cover",
  candida: "Antifungal cover",
  cns: "CNS penetration",
  biofilm: "Biofilm-active therapy",
};

/**
 * Which agents answer each coverage flag.
 *
 * This exists because routine culture cannot exclude every organism a syndrome
 * demands cover for. Anaerobes are rarely recovered from an intra-abdominal
 * specimen and atypicals are not recovered at all on standard media, so an
 * agent covering them will never appear as "reported susceptible" and a naive
 * de-escalation would discontinue it. Cover that the syndrome mandates has to
 * survive a culture result that was never capable of confirming it.
 */
export const FLAG_AGENTS: Record<CoverageFlag, string[]> = {
  mrsa: ["vancomycin", "daptomycin", "linezolid", "ceftaroline", "tmp_smx", "doxycycline", "clindamycin"],
  pseudomonas: [
    "cefepime",
    "ceftazidime",
    "pip_tazo",
    "meropenem",
    "ciprofloxacin",
    "levofloxacin",
    "amikacin",
    "gentamicin",
    "aztreonam",
    "ceftaz_avibactam",
  ],
  esbl: ["meropenem", "ertapenem", "amikacin", "fosfomycin", "ceftaz_avibactam"],
  anaerobes: [
    "metronidazole",
    "pip_tazo",
    "amox_clav",
    "amp_sulbactam",
    "meropenem",
    "ertapenem",
    "clindamycin",
  ],
  atypicals: ["azithromycin", "doxycycline", "levofloxacin", "ciprofloxacin"],
  enterococcus: ["ampicillin", "amoxicillin", "amox_clav", "amp_sulbactam", "pip_tazo", "vancomycin", "linezolid", "daptomycin"],
  candida: ["micafungin", "fluconazole"],
  cns: [
    "ceftriaxone",
    "cefepime",
    "meropenem",
    "vancomycin",
    "ampicillin",
    "penicillin_g",
    "linezolid",
    "tmp_smx",
    "metronidazole",
    "aztreonam",
    "rifampin",
    "fluconazole",
  ],
  biofilm: ["rifampin"],
};

/** Which organisms each coverage flag is considered to answer for. */
export const FLAG_ORGANISMS: Record<CoverageFlag, string[]> = {
  mrsa: ["mrsa"],
  pseudomonas: ["pseudomonas", "acinetobacter"],
  esbl: ["esbl_enterobacterales"],
  anaerobes: ["bacteroides"],
  atypicals: ["atypicals"],
  enterococcus: ["e_faecalis", "e_faecium"],
  candida: ["candida"],
  cns: [],
  biofilm: ["coag_neg_staph"],
};

/** Comorbidity checkbox values offered on the intake form, mapped to modifiers. */
export const COMORBIDITY_OPTIONS: { value: string; label: string; modifierId?: string }[] = [
  { value: "diabetes", label: "Diabetes mellitus", modifierId: "diabetes" },
  { value: "ckd", label: "Chronic kidney disease", modifierId: "ckd" },
  { value: "dialysis", label: "On haemodialysis", modifierId: "dialysis" },
  { value: "cirrhosis", label: "Cirrhosis", modifierId: "cirrhosis" },
  { value: "copd", label: "COPD or bronchiectasis", modifierId: "structural_lung_disease" },
  { value: "heart_failure", label: "Heart failure" },
  { value: "malignancy", label: "Active malignancy" },
  { value: "transplant", label: "Solid organ or stem cell transplant", modifierId: "immunosuppressed" },
  { value: "hiv", label: "HIV" },
  { value: "asplenia", label: "Asplenia", modifierId: "asplenia" },
  { value: "injection_drug_use", label: "Injection drug use", modifierId: "injection_drug_use" },
  { value: "central_line", label: "Central venous catheter", modifierId: "central_line" },
  { value: "parenteral_nutrition", label: "Total parenteral nutrition", modifierId: "parenteral_nutrition" },
  { value: "known_mrsa", label: "Known MRSA colonisation", modifierId: "known_mrsa" },
  { value: "known_esbl", label: "Known ESBL colonisation", modifierId: "known_esbl" },
  { value: "known_pseudomonas", label: "Prior Pseudomonas isolate", modifierId: "known_pseudomonas" },
  { value: "recent_hospitalisation", label: "Hospitalised in the last 90 days", modifierId: "recent_hospitalisation" },
  { value: "recent_influenza", label: "Influenza-like illness this week", modifierId: "influenza_season" },
];
