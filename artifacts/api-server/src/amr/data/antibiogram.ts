import type { Antibiogram, Region, SusceptibilityTable } from "../types";

/**
 * Regional antibiograms.
 *
 * IMPORTANT - data provenance. The percentages below are ILLUSTRATIVE
 * DEFAULTS shipped so the engine has something to reason over out of the box.
 * They are not surveillance data and must not be presented as such. A
 * deploying facility replaces them with its own CLSI-interpreted antibiogram
 * (see `registerAntibiogram`), at which point every recommendation is driven by
 * that facility's real isolates. The UI always shows the `source` string so a
 * clinician can see which of the two they are looking at.
 *
 * Regional tables are derived, not hand-written per region: a single reference
 * table is transformed by each region's resistance profile. That keeps the
 * derivation auditable - a stewardship pharmacist can point at the ESBL rate
 * and see exactly which ceftriaxone number it produced.
 */

const ILLUSTRATIVE =
  "Illustrative default profile - replace with your facility's CLSI antibiogram";

export const REGIONS: Region[] = [
  {
    id: "us_northeast",
    name: "US Northeast",
    area: "North America",
    mrsaRate: 32,
    esblRate: 14,
    creRate: 3,
    mdrPseudomonasRate: 12,
    vreRate: 24,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "us_southeast",
    name: "US Southeast",
    area: "North America",
    mrsaRate: 45,
    esblRate: 16,
    creRate: 4,
    mdrPseudomonasRate: 14,
    vreRate: 28,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "us_midwest",
    name: "US Midwest",
    area: "North America",
    mrsaRate: 34,
    esblRate: 12,
    creRate: 2,
    mdrPseudomonasRate: 10,
    vreRate: 22,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "us_west",
    name: "US West",
    area: "North America",
    mrsaRate: 38,
    esblRate: 15,
    creRate: 3,
    mdrPseudomonasRate: 13,
    vreRate: 20,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "us_southwest",
    name: "US Southwest / border",
    area: "North America",
    mrsaRate: 42,
    esblRate: 22,
    creRate: 5,
    mdrPseudomonasRate: 16,
    vreRate: 21,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "canada",
    name: "Canada",
    area: "North America",
    mrsaRate: 22,
    esblRate: 10,
    creRate: 1,
    mdrPseudomonasRate: 8,
    vreRate: 14,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "eu_west",
    name: "Western Europe",
    area: "Europe",
    mrsaRate: 14,
    esblRate: 12,
    creRate: 2,
    mdrPseudomonasRate: 11,
    vreRate: 12,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "eu_south",
    name: "Southern Europe",
    area: "Europe",
    mrsaRate: 28,
    esblRate: 24,
    creRate: 14,
    mdrPseudomonasRate: 22,
    vreRate: 18,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "eu_east",
    name: "Eastern Europe",
    area: "Europe",
    mrsaRate: 30,
    esblRate: 34,
    creRate: 22,
    mdrPseudomonasRate: 30,
    vreRate: 22,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "south_asia",
    name: "South Asia",
    area: "Asia",
    mrsaRate: 42,
    esblRate: 62,
    creRate: 32,
    mdrPseudomonasRate: 34,
    vreRate: 16,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "southeast_asia",
    name: "Southeast Asia",
    area: "Asia",
    mrsaRate: 36,
    esblRate: 48,
    creRate: 20,
    mdrPseudomonasRate: 28,
    vreRate: 14,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "east_asia",
    name: "East Asia",
    area: "Asia",
    mrsaRate: 40,
    esblRate: 32,
    creRate: 10,
    mdrPseudomonasRate: 18,
    vreRate: 10,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "mena",
    name: "Middle East / North Africa",
    area: "Middle East and Africa",
    mrsaRate: 38,
    esblRate: 45,
    creRate: 24,
    mdrPseudomonasRate: 30,
    vreRate: 15,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "sub_saharan_africa",
    name: "Sub-Saharan Africa",
    area: "Middle East and Africa",
    mrsaRate: 34,
    esblRate: 40,
    creRate: 12,
    mdrPseudomonasRate: 22,
    vreRate: 10,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "latam",
    name: "Latin America",
    area: "Latin America",
    mrsaRate: 44,
    esblRate: 38,
    creRate: 18,
    mdrPseudomonasRate: 26,
    vreRate: 20,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
  {
    id: "oceania",
    name: "Australia / New Zealand",
    area: "Oceania",
    mrsaRate: 18,
    esblRate: 9,
    creRate: 1,
    mdrPseudomonasRate: 7,
    vreRate: 26,
    source: ILLUSTRATIVE,
    updated: "2026-01",
  },
];

export const REGIONS_BY_ID: Record<string, Region> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);

/**
 * Reference susceptibility table, percent susceptible.
 *
 * Values are for a low-resistance reference population; the regional profile
 * then bends them. Agents an organism is intrinsically resistant to are
 * omitted here and are treated as 0% by the engine.
 */
const BASE_SUSCEPTIBILITY: SusceptibilityTable = {
  s_pneumoniae: {
    penicillin_g: 93,
    amoxicillin: 95,
    amox_clav: 95,
    ampicillin: 93,
    amp_sulbactam: 93,
    ceftriaxone: 97,
    cefepime: 97,
    cefazolin: 88,
    cephalexin: 85,
    meropenem: 98,
    ertapenem: 97,
    levofloxacin: 98,
    azithromycin: 68,
    doxycycline: 80,
    tmp_smx: 72,
    vancomycin: 100,
    linezolid: 100,
    clindamycin: 82,
    pip_tazo: 95,
  },
  h_influenzae: {
    amoxicillin: 72,
    amox_clav: 97,
    amp_sulbactam: 96,
    ampicillin: 72,
    ceftriaxone: 99,
    cefepime: 99,
    meropenem: 99,
    ertapenem: 99,
    levofloxacin: 99,
    ciprofloxacin: 98,
    azithromycin: 98,
    doxycycline: 96,
    tmp_smx: 74,
    pip_tazo: 97,
  },
  m_catarrhalis: {
    amox_clav: 100,
    amp_sulbactam: 100,
    ceftriaxone: 100,
    cefepime: 100,
    azithromycin: 99,
    doxycycline: 99,
    levofloxacin: 99,
    tmp_smx: 90,
    meropenem: 100,
    ertapenem: 100,
    pip_tazo: 100,
    amoxicillin: 8,
  },
  atypicals: {
    azithromycin: 92,
    doxycycline: 96,
    levofloxacin: 99,
    ciprofloxacin: 82,
  },
  mssa: {
    nafcillin: 100,
    cefazolin: 100,
    cephalexin: 99,
    ceftriaxone: 97,
    amox_clav: 98,
    amp_sulbactam: 98,
    pip_tazo: 98,
    meropenem: 98,
    ertapenem: 97,
    cefepime: 97,
    vancomycin: 100,
    daptomycin: 99,
    linezolid: 100,
    ceftaroline: 100,
    clindamycin: 82,
    tmp_smx: 96,
    doxycycline: 94,
    levofloxacin: 82,
    ciprofloxacin: 78,
    rifampin: 97,
    penicillin_g: 8,
  },
  mrsa: {
    vancomycin: 99,
    daptomycin: 98,
    linezolid: 99,
    ceftaroline: 99,
    tmp_smx: 95,
    doxycycline: 92,
    clindamycin: 68,
    rifampin: 96,
    levofloxacin: 34,
    ciprofloxacin: 28,
  },
  s_saprophyticus: {
    nitrofurantoin: 98,
    tmp_smx: 94,
    cephalexin: 96,
    cefazolin: 96,
    amox_clav: 98,
    ciprofloxacin: 94,
    levofloxacin: 94,
    fosfomycin: 92,
    vancomycin: 100,
    doxycycline: 92,
  },
  coag_neg_staph: {
    vancomycin: 100,
    daptomycin: 98,
    linezolid: 99,
    ceftaroline: 96,
    cefazolin: 40,
    nafcillin: 38,
    tmp_smx: 72,
    doxycycline: 78,
    clindamycin: 58,
    rifampin: 92,
    levofloxacin: 48,
  },
  s_pyogenes: {
    penicillin_g: 100,
    amoxicillin: 100,
    amox_clav: 100,
    ampicillin: 100,
    amp_sulbactam: 100,
    cefazolin: 100,
    cephalexin: 100,
    ceftriaxone: 100,
    cefepime: 100,
    meropenem: 100,
    ertapenem: 100,
    vancomycin: 100,
    linezolid: 100,
    daptomycin: 99,
    clindamycin: 88,
    azithromycin: 78,
    levofloxacin: 98,
    pip_tazo: 100,
  },
  e_faecalis: {
    ampicillin: 97,
    amoxicillin: 97,
    amox_clav: 97,
    amp_sulbactam: 97,
    pip_tazo: 96,
    vancomycin: 96,
    linezolid: 99,
    daptomycin: 99,
    meropenem: 92,
    nitrofurantoin: 96,
    fosfomycin: 95,
    doxycycline: 60,
    levofloxacin: 62,
    ciprofloxacin: 60,
  },
  e_faecium: {
    linezolid: 98,
    daptomycin: 96,
    vancomycin: 100,
    ampicillin: 12,
    amoxicillin: 12,
    nitrofurantoin: 50,
    doxycycline: 42,
  },
  e_coli: {
    ampicillin: 48,
    amoxicillin: 48,
    amox_clav: 82,
    amp_sulbactam: 62,
    cefazolin: 86,
    cephalexin: 84,
    ceftriaxone: 94,
    ceftazidime: 93,
    cefepime: 96,
    pip_tazo: 95,
    meropenem: 100,
    ertapenem: 99,
    aztreonam: 93,
    ciprofloxacin: 80,
    levofloxacin: 80,
    tmp_smx: 76,
    nitrofurantoin: 96,
    fosfomycin: 98,
    gentamicin: 92,
    amikacin: 99,
    doxycycline: 66,
    ceftaz_avibactam: 100,
  },
  esbl_enterobacterales: {
    meropenem: 99,
    ertapenem: 97,
    amikacin: 92,
    gentamicin: 62,
    fosfomycin: 90,
    nitrofurantoin: 78,
    tmp_smx: 38,
    ciprofloxacin: 22,
    levofloxacin: 22,
    ceftaz_avibactam: 99,
  },
  klebsiella: {
    amox_clav: 80,
    amp_sulbactam: 70,
    cefazolin: 84,
    cephalexin: 80,
    ceftriaxone: 92,
    ceftazidime: 92,
    cefepime: 95,
    pip_tazo: 92,
    meropenem: 99,
    ertapenem: 98,
    aztreonam: 92,
    ciprofloxacin: 88,
    levofloxacin: 88,
    tmp_smx: 84,
    gentamicin: 92,
    amikacin: 98,
    nitrofurantoin: 42,
    fosfomycin: 76,
    ceftaz_avibactam: 100,
  },
  proteus: {
    ampicillin: 72,
    amoxicillin: 72,
    amox_clav: 92,
    amp_sulbactam: 90,
    cefazolin: 86,
    ceftriaxone: 96,
    cefepime: 97,
    pip_tazo: 97,
    meropenem: 99,
    ertapenem: 99,
    ciprofloxacin: 82,
    levofloxacin: 82,
    tmp_smx: 82,
    gentamicin: 92,
    amikacin: 98,
  },
  enterobacter: {
    ceftriaxone: 74,
    ceftazidime: 76,
    cefepime: 94,
    pip_tazo: 82,
    meropenem: 98,
    ertapenem: 92,
    aztreonam: 76,
    ciprofloxacin: 89,
    levofloxacin: 89,
    tmp_smx: 84,
    gentamicin: 92,
    amikacin: 98,
    ceftaz_avibactam: 99,
  },
  pseudomonas: {
    pip_tazo: 88,
    ceftazidime: 88,
    cefepime: 88,
    meropenem: 86,
    aztreonam: 72,
    ciprofloxacin: 78,
    levofloxacin: 74,
    gentamicin: 84,
    amikacin: 95,
    ceftaz_avibactam: 96,
  },
  acinetobacter: {
    meropenem: 62,
    amp_sulbactam: 68,
    amikacin: 66,
    gentamicin: 52,
    ciprofloxacin: 44,
    levofloxacin: 46,
    tmp_smx: 48,
    doxycycline: 62,
    pip_tazo: 52,
    cefepime: 54,
  },
  bacteroides: {
    metronidazole: 98,
    pip_tazo: 96,
    amox_clav: 94,
    amp_sulbactam: 92,
    meropenem: 98,
    ertapenem: 96,
    clindamycin: 62,
  },
  c_difficile: {
    vancomycin_po: 99,
    fidaxomicin: 99,
    metronidazole: 92,
  },
  candida: {
    micafungin: 98,
    fluconazole: 74,
  },
  n_meningitidis: {
    ceftriaxone: 100,
    penicillin_g: 92,
    meropenem: 100,
    ciprofloxacin: 96,
  },
  listeria: {
    ampicillin: 100,
    amoxicillin: 100,
    amp_sulbactam: 100,
    meropenem: 98,
    tmp_smx: 98,
    penicillin_g: 98,
  },
  hsv: {
    acyclovir: 99,
  },
  influenza: {
    oseltamivir: 98,
  },
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Bend the reference table by a region's resistance profile.
 *
 * Every transformation below is a stated, auditable rule rather than a
 * hand-tuned number, so a pharmacist reviewing the antibiogram page can trace
 * each percentage back to the regional rate that produced it.
 */
function deriveTable(region: Region): SusceptibilityTable {
  const table: SusceptibilityTable = JSON.parse(JSON.stringify(BASE_SUSCEPTIBILITY));
  const { esblRate, creRate, mdrPseudomonasRate } = region;

  // ESBL production removes every oxyimino-cephalosporin, aztreonam and, in
  // practice, most penicillin/inhibitor combinations from the reliable list.
  const esblScaled = ["e_coli", "klebsiella", "proteus"];
  for (const orgId of esblScaled) {
    const row = table[orgId];
    if (!row) continue;
    const retained = 1 - esblRate / 100;
    for (const agentId of ["ceftriaxone", "ceftazidime", "cefepime", "aztreonam", "cefazolin", "cephalexin"]) {
      if (row[agentId] !== undefined) row[agentId] = clamp(row[agentId] * retained);
    }
    // Inhibitor combinations retain partial activity against ESBL isolates but
    // are unreliable for invasive infection.
    for (const agentId of ["pip_tazo", "amox_clav", "amp_sulbactam"]) {
      if (row[agentId] !== undefined) row[agentId] = clamp(row[agentId] * (retained + 0.35 * (esblRate / 100)));
    }
    // ESBL producers carry co-resistance to fluoroquinolones and TMP-SMX.
    for (const agentId of ["ciprofloxacin", "levofloxacin", "tmp_smx", "gentamicin"]) {
      if (row[agentId] !== undefined) row[agentId] = clamp(row[agentId] * (1 - 0.65 * (esblRate / 100)));
    }
  }

  // Carbapenem resistance is applied last so it also caps ESBL fallbacks.
  //
  // The regional CRE rate is quoted for Enterobacterales as a whole, but it is
  // not distributed evenly across them: KPC and NDM carriage is concentrated in
  // Klebsiella, while carbapenem-resistant E. coli and Proteus remain
  // comparatively uncommon even in high-prevalence regions. Applying the
  // headline rate uniformly would wrongly strip ertapenem from E. coli
  // pyelonephritis in South Asia and push every such patient to an
  // aminoglycoside.
  const creShare: Record<string, number> = {
    klebsiella: 1,
    esbl_enterobacterales: 0.7,
    enterobacter: 0.6,
    e_coli: 0.2,
    proteus: 0.2,
  };
  for (const [orgId, share] of Object.entries(creShare)) {
    const row = table[orgId];
    if (!row) continue;
    const retained = 1 - (creRate * share) / 100;
    for (const agentId of ["meropenem", "ertapenem"]) {
      if (row[agentId] !== undefined) row[agentId] = clamp(row[agentId] * retained);
    }
    if (row["amikacin"] !== undefined) {
      row["amikacin"] = clamp(row["amikacin"] * (1 - 0.4 * ((creRate * share) / 100)));
    }
  }

  // MDR Pseudomonas erodes every antipseudomonal in parallel.
  const psa = table["pseudomonas"];
  if (psa) {
    const retained = 1 - mdrPseudomonasRate / 100;
    for (const agentId of ["pip_tazo", "ceftazidime", "cefepime", "meropenem", "ciprofloxacin", "levofloxacin", "gentamicin"]) {
      if (psa[agentId] !== undefined) psa[agentId] = clamp(psa[agentId] * retained);
    }
    // Aztreonam is the weakest antipseudomonal beta-lactam and is hydrolysed by
    // the same enzymes that drive the MDR phenotype, so it erodes faster than
    // the rest rather than being left untouched.
    if (psa["aztreonam"] !== undefined) {
      psa["aztreonam"] = clamp(psa["aztreonam"] * Math.max(0, 1 - 1.2 * (mdrPseudomonasRate / 100)));
    }
    if (psa["amikacin"] !== undefined) psa["amikacin"] = clamp(psa["amikacin"] * (1 - 0.5 * (mdrPseudomonasRate / 100)));
    if (psa["ceftaz_avibactam"] !== undefined) {
      psa["ceftaz_avibactam"] = clamp(psa["ceftaz_avibactam"] * (1 - 0.25 * (mdrPseudomonasRate / 100)));
    }
  }

  // Acinetobacter tracks the same MDR pressure as Pseudomonas.
  const acb = table["acinetobacter"];
  if (acb) {
    const retained = 1 - 0.6 * (mdrPseudomonasRate / 100);
    for (const agentId of Object.keys(acb)) acb[agentId] = clamp(acb[agentId] * retained);
  }

  // Vancomycin-resistant E. faecium.
  const efm = table["e_faecium"];
  if (efm && efm["vancomycin"] !== undefined) {
    efm["vancomycin"] = clamp(100 - region.vreRate);
  }

  return table;
}

const derived = new Map<string, Antibiogram>();

/** Facility-supplied antibiograms take precedence over the derived defaults. */
const facilityOverrides = new Map<string, Antibiogram>();

export function getAntibiogram(regionId: string): Antibiogram {
  const override = facilityOverrides.get(regionId);
  if (override) return override;

  const cached = derived.get(regionId);
  if (cached) return cached;

  const region = REGIONS_BY_ID[regionId];
  if (!region) throw new Error(`Unknown region id: ${regionId}`);

  const antibiogram: Antibiogram = {
    regionId: region.id,
    regionName: region.name,
    source: region.source,
    updated: region.updated,
    susceptibility: deriveTable(region),
  };
  derived.set(regionId, antibiogram);
  return antibiogram;
}

/**
 * Install a facility's own antibiogram for a region. This is the path a
 * deploying hospital uses to replace the illustrative defaults with real
 * isolate data.
 */
export function registerAntibiogram(antibiogram: Antibiogram): void {
  facilityOverrides.set(antibiogram.regionId, antibiogram);
}

export function hasFacilityAntibiogram(regionId: string): boolean {
  return facilityOverrides.has(regionId);
}

/**
 * Percent of isolates of `organismId` expected to be susceptible to `agentId`
 * in this region. Returns 0 when the pair is absent from the table, which is
 * the correct default: an untested agent is not a covered agent.
 */
export function susceptibilityFor(
  antibiogram: Antibiogram,
  organismId: string,
  agentId: string,
): number {
  return antibiogram.susceptibility[organismId]?.[agentId] ?? 0;
}
