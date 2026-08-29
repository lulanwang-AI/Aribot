import type {
  AllergyConflict,
  CoverageFlag,
  EmpiricRecommendation,
  Intake,
  OrganismCoverage,
  RegimenRecommendation,
  RegimenTemplate,
  RiskModifier,
  Severity,
  Syndrome,
  TravelEpisode,
} from "../types";
import { getAgent } from "../data/agents";
import { getOrganism } from "../data/organisms";
import { getAntibiogram, REGIONS_BY_ID, susceptibilityFor } from "../data/antibiogram";
import { getSyndrome } from "../data/syndromes";
import { COMORBIDITY_OPTIONS, RISK_MODIFIERS_BY_ID } from "../data/risk-factors";
import { annotateWeightBasedDose, doseAgent, estimateCreatinineClearance, isPaediatric } from "./dosing";
import { checkAgent, safeAlternatives, unclassifiedAllergies } from "./allergy";

export const KNOWLEDGE_BASE_VERSION = "amr-kb-2026.02";

/** Regions where imported resistance is high enough to change empiric choice. */
const HIGH_RESISTANCE_REGIONS = new Set([
  "south_asia",
  "southeast_asia",
  "mena",
  "eu_east",
  "eu_south",
  "latam",
  "sub_saharan_africa",
  "east_asia",
]);

const SEVERITY_ORDER: Record<Severity, number> = {
  mild: 0,
  moderate: 1,
  severe: 2,
  septic_shock: 3,
};

/**
 * Whole calendar days between two dates.
 *
 * Compared as UTC calendar days so a date-only onset ("2026-08-14") and a full
 * timestamp do not differ by a fractional day and round inconsistently.
 */
function daysBetween(from: string, to: string): number {
  const dayIndex = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return Number.NaN;
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  };
  const a = dayIndex(from);
  const b = dayIndex(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return b - a;
}

/** Travel-acquired carriage persists for months, but not indefinitely. */
const TRAVEL_CARRIAGE_WINDOW_DAYS = 90;

/**
 * Whether a trip is recent enough to still shape the differential.
 *
 * resolveRegion and deriveRiskFactors both need this and previously disagreed:
 * one applied a 90 day window and the other applied none, so a trip taken years
 * ago still fired the travel risk modifier. One definition, used by both.
 */
function tripIsRecent(trip: TravelEpisode, onsetDate: string): boolean {
  if (trip.becameSickWhileTravelling) return true;
  if (!onsetDate || !trip.returned) return false;
  const sinceReturn = daysBetween(trip.returned, onsetDate);
  return sinceReturn >= 0 && sinceReturn <= TRAVEL_CARRIAGE_WINDOW_DAYS;
}

/**
 * Decide which antibiogram to reason over.
 *
 * A patient who fell ill while travelling carries the flora of the place they
 * were in, not the place they live. Getting this wrong is one of the more
 * common empiric therapy errors, so the decision and its reason are surfaced
 * explicitly rather than buried.
 */
export function resolveRegion(intake: Intake): { regionId: string; reason: string } {
  const onset = intake.symptoms.onsetDate;

  for (const trip of intake.travel) {
    if (!trip.regionId || !REGIONS_BY_ID[trip.regionId]) continue;
    if (trip.becameSickWhileTravelling) {
      return {
        regionId: trip.regionId,
        reason: `Symptoms began while travelling in ${REGIONS_BY_ID[trip.regionId].name}, so that region's resistance pattern drives empiric choice rather than the region of residence.`,
      };
    }
    // Recent return from a high-resistance region still shifts the ESBL risk
    // even when symptoms began after getting home.
    const sinceReturn = onset ? daysBetween(trip.returned, onset) : Number.POSITIVE_INFINITY;
    if (HIGH_RESISTANCE_REGIONS.has(trip.regionId) && tripIsRecent(trip, onset)) {
      return {
        regionId: trip.regionId,
        reason: `Returned from ${REGIONS_BY_ID[trip.regionId].name} ${sinceReturn} days before onset. Travel-acquired ESBL carriage persists for months, so that region's pattern is applied.`,
      };
    }
  }

  const home = REGIONS_BY_ID[intake.residenceRegionId];
  return {
    regionId: intake.residenceRegionId,
    reason: home
      ? `No qualifying travel exposure. Applying the ${home.name} antibiogram for the patient's region of residence.`
      : "No region supplied.",
  };
}

/** Work out which risk modifiers the intake answers fire. */
export function deriveRiskFactors(intake: Intake): RiskModifier[] {
  const ids = new Set<string>();

  if (intake.foleyCatheter.present) {
    ids.add("foley_catheter");
    if ((intake.foleyCatheter.days ?? 0) > 7) ids.add("foley_prolonged");
  }
  if (intake.tracheostomy.present) ids.add("tracheostomy");
  if (intake.ventilator.present) {
    ids.add("ventilator");
    if ((intake.ventilator.days ?? 0) > 5) ids.add("ventilator_prolonged");
  }
  if (intake.hardware.length > 0) {
    ids.add(intake.hardware.some((h) => h.suspectedFocus) ? "hardware_focus" : "hardware_present");
  }
  if (intake.antibioticsLast90Days.length > 0) ids.add("recent_antibiotics");
  if (intake.setting === "ltc") ids.add("long_term_care");

  for (const trip of intake.travel) {
    if (!trip.regionId || !REGIONS_BY_ID[trip.regionId]) continue;
    if (!tripIsRecent(trip, intake.symptoms.onsetDate)) continue;
    if (HIGH_RESISTANCE_REGIONS.has(trip.regionId)) ids.add("travel_high_resistance");
    if (trip.becameSickWhileTravelling) ids.add("sick_while_travelling");
  }

  if (intake.clinical.immunosuppressed) ids.add("immunosuppressed");
  if (intake.clinical.neutropenic) ids.add("neutropenic");
  if (intake.clinical.pregnant) ids.add("pregnancy");
  if (intake.clinical.ageYears > 50) ids.add("age_over_50");
  if (intake.homeEnvironment.waterExposure) ids.add("water_exposure");
  if (intake.homeEnvironment.pets.length > 0) ids.add("pet_exposure");
  if (intake.homeEnvironment.carpets) ids.add("carpet_dust_exposure");
  if (intake.sickContacts.some((c) => c.confirmedOrganism)) ids.add("sick_contact_confirmed");

  for (const comorbidity of intake.comorbidities) {
    const option = COMORBIDITY_OPTIONS.find((o) => o.value === comorbidity);
    if (option?.modifierId) ids.add(option.modifierId);
  }

  return [...ids].map((id) => RISK_MODIFIERS_BY_ID[id]).filter(Boolean);
}

/**
 * Coverage flags fall into two groups that must not be conflated.
 *
 * `required` is what the syndrome itself mandates - anaerobic cover for a
 * perforated viscus is not negotiable. `considered` is what the patient's risk
 * profile raises for consideration; it unlocks broader regimens as options
 * without asserting that the patient needs them. Presenting a risk-raised flag
 * as a requirement is how empiric therapy creeps to carbapenems by default.
 */
export function deriveCoverageFlags(
  syndrome: Syndrome,
  risks: RiskModifier[],
): { required: CoverageFlag[]; considered: CoverageFlag[]; all: CoverageFlag[] } {
  const required = new Set<CoverageFlag>(syndrome.requiredCoverage);
  const considered = new Set<CoverageFlag>();
  for (const risk of risks) {
    for (const flag of risk.requiresCoverage ?? []) {
      if (!required.has(flag)) considered.add(flag);
    }
  }
  return {
    required: [...required],
    considered: [...considered],
    all: [...new Set([...required, ...considered])],
  };
}

interface WeightedOrganism {
  organismId: string;
  weight: number;
  reasons: string[];
}

/** Build the normalised organism differential for this patient. */
export function buildDifferential(
  syndrome: Syndrome,
  intake: Intake,
  risks: RiskModifier[],
): WeightedOrganism[] {
  const weights = new Map<string, WeightedOrganism>();

  for (const base of syndrome.baseOrganisms) {
    weights.set(base.organismId, {
      organismId: base.organismId,
      weight: base.weight,
      reasons: [base.reason],
    });
  }

  const contextMultipliers: [Record<string, number> | undefined, string][] = [
    [syndrome.settingMultipliers?.[intake.setting], `the ${intake.setting.toUpperCase()} setting`],
    [syndrome.severityMultipliers?.[intake.clinical.severity], `${intake.clinical.severity.replace(/_/g, " ")} severity`],
  ];

  for (const [multipliers, label] of contextMultipliers) {
    if (!multipliers) continue;
    for (const [organismId, multiplier] of Object.entries(multipliers)) {
      const existing = weights.get(organismId);
      if (existing) {
        existing.weight *= multiplier;
        if (multiplier > 1) existing.reasons.push(`Weighted up for ${label}`);
      } else if (multiplier > 1) {
        weights.set(organismId, {
          organismId,
          weight: 4 * multiplier,
          reasons: [`Added for ${label}`],
        });
      }
    }
  }

  // Risk multipliers are combined with diminishing returns and then capped.
  // Multiplying them out raw compounds fast - a ventilated ICU patient with a
  // catheter and recent antibiotics would end up with Pseudomonas at 80% of the
  // differential, which is not what VAP epidemiology shows. Ten risk factors
  // pointing at one organism should raise it decisively, not eliminate
  // everything else.
  const RISK_MULTIPLIER_CAP = 3.5;
  const combined = new Map<string, { multiplier: number; reasons: string[] }>();
  for (const risk of risks) {
    for (const [organismId, multiplier] of Object.entries(risk.organismMultipliers)) {
      if (multiplier === 1) continue;
      const entry = combined.get(organismId) ?? { multiplier: 1, reasons: [] };
      // Each additional factor contributes its excess over 1, at half weight
      // after the first, so the third and fourth signal add real but shrinking
      // amounts.
      entry.multiplier =
        entry.multiplier === 1 ? multiplier : entry.multiplier + (multiplier - 1) * 0.5;
      if (multiplier > 1) entry.reasons.push(risk.label);
      combined.set(organismId, entry);
    }
  }

  for (const [organismId, entry] of combined) {
    const multiplier = Math.min(entry.multiplier, RISK_MULTIPLIER_CAP);
    const existing = weights.get(organismId);
    if (existing) {
      existing.weight *= multiplier;
      if (multiplier > 1) existing.reasons.push(...entry.reasons);
    } else if (multiplier > 1.2) {
      weights.set(organismId, {
        organismId,
        weight: 3 * multiplier,
        reasons: entry.reasons,
      });
    }
  }

  // A confirmed organism in a close contact is direct evidence, not a modifier.
  for (const contact of intake.sickContacts) {
    if (!contact.confirmedOrganism) continue;
    const existing = weights.get(contact.confirmedOrganism);
    const reason = `Confirmed in a sick contact (${contact.who || "close contact"})`;
    if (existing) {
      existing.weight *= 2.5;
      existing.reasons.push(reason);
    } else {
      weights.set(contact.confirmedOrganism, {
        organismId: contact.confirmedOrganism,
        weight: 20,
        reasons: [reason],
      });
    }
  }

  // A known organism collapses the differential onto it.
  if (intake.knownOrganismId) {
    const known = intake.knownOrganismId;
    for (const entry of weights.values()) {
      entry.weight = entry.organismId === known ? entry.weight * 20 : entry.weight * 0.1;
    }
    if (!weights.has(known)) {
      weights.set(known, {
        organismId: known,
        weight: 200,
        reasons: ["Organism already identified on culture or rapid diagnostic"],
      });
    }
  }

  const list = [...weights.values()].filter((o) => o.weight > 0.5);
  const total = list.reduce((sum, o) => sum + o.weight, 0) || 1;
  return list
    .map((o) => ({
      ...o,
      weight: o.weight / total,
      // Several modifiers often carry the same label for one organism. Repeating
      // it four times in the explanation makes the panel harder to read without
      // adding information.
      reasons: [...new Set(o.reasons)],
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Whether a regimen is on the table for this patient.
 *
 * The two flag gates are deliberately asymmetric. `requiresFlags` is checked
 * against every flag in play, so a risk factor can unlock a broader option for
 * consideration. `excludeWithFlags` is checked only against flags the syndrome
 * itself mandates, so a merely considered flag can never delete a narrow
 * option: one amoxicillin course in the last ninety days should put ESBL cover
 * on the table, not remove ceftriaxone from a pyelonephritis list.
 */
function regimenIsApplicable(
  template: RegimenTemplate,
  intake: Intake,
  flags: { all: CoverageFlag[]; required: CoverageFlag[] },
): boolean {
  if (template.settings && !template.settings.includes(intake.setting)) return false;
  if (template.minSeverity && SEVERITY_ORDER[intake.clinical.severity] < SEVERITY_ORDER[template.minSeverity]) {
    return false;
  }
  if (template.maxSeverity && SEVERITY_ORDER[intake.clinical.severity] > SEVERITY_ORDER[template.maxSeverity]) {
    return false;
  }
  if (template.requiresFlags && !template.requiresFlags.every((f) => flags.all.includes(f))) return false;
  if (template.excludeWithFlags && template.excludeWithFlags.some((f) => flags.required.includes(f))) {
    return false;
  }
  return true;
}

function scoreRegimen(
  template: RegimenTemplate,
  differential: WeightedOrganism[],
  regionId: string,
  intake: Intake,
  syndrome: Syndrome,
): RegimenRecommendation {
  const antibiogram = getAntibiogram(regionId);
  const cnsDosing = syndrome.requiredCoverage.includes("cns");
  const preferOral = intake.setting === "outpatient";

  const agents = template.agentIds.map((agentId) => {
    const agent = getAgent(agentId);
    const dosed = doseAgent(agent, intake.clinical, { preferOral, cnsDosing });
    return annotateWeightBasedDose(dosed, intake.clinical.weightKg);
  });

  const allergyConflicts: AllergyConflict[] = [];
  for (const agentId of template.agentIds) {
    const conflict = checkAgent(getAgent(agentId), intake.allergies);
    if (conflict) allergyConflicts.push(conflict);
  }

  // Renormalise over the organisms an antibacterial regimen can actually be
  // scored against, so a viral or fungal entry on the differential neither
  // inflates nor deflates the percentage.
  const bacterial = differential.filter((entry) => (getOrganism(entry.organismId).kind ?? "bacterial") === "bacterial");
  const bacterialTotal = bacterial.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const scored: WeightedOrganism[] = bacterial.map((entry) => ({
    ...entry,
    weight: entry.weight / bacterialTotal,
  }));

  const organismCoverage: OrganismCoverage[] = scored.map((entry) => {
    const organism = getOrganism(entry.organismId);
    let best = 0;
    let bestAgent = "";

    for (const agentId of template.agentIds) {
      if (organism.intrinsicResistance.includes(agentId)) continue;
      const percent = susceptibilityFor(antibiogram, entry.organismId, agentId);
      if (percent > best) {
        best = percent;
        bestAgent = getAgent(agentId).shortName;
      }
    }

    // Source-control-only options have no agents; drainage is the treatment.
    if (template.agentIds.length === 0) best = 0;

    return {
      organismId: entry.organismId,
      name: organism.name,
      shortName: organism.shortName,
      likelihood: Number(entry.weight.toFixed(4)),
      expectedSusceptibility: best,
      covered: best >= 80,
      reason: best === 0
        ? `${organism.shortName} is not covered by this regimen${template.agentIds.length ? " - intrinsic resistance or no reliable agent" : ""}.`
        : `${best}% of ${organism.shortName} isolates in this region are susceptible to ${bestAgent}.`,
    };
  });

  const sourceControlOnly = template.agentIds.length === 0;
  const expectedCoverage = sourceControlOnly
    ? 0
    : organismCoverage.reduce((sum, o) => sum + o.likelihood * o.expectedSusceptibility, 0);

  // Spectrum cost is the sum, but breadth is the maximum: the single broadest
  // agent in a regimen is what selects resistance across the unit. Summing
  // alone would make levofloxacin monotherapy (one agent scoring 4) look
  // narrower than ceftriaxone plus azithromycin (two agents scoring 3), which
  // inverts the stewardship answer for community-acquired pneumonia.
  const spectrumCost = template.agentIds.reduce(
    (sum, agentId) => sum + getAgent(agentId).collateralDamageScore,
    0,
  );
  const spectrumBreadth = template.agentIds.reduce(
    (max, agentId) => Math.max(max, getAgent(agentId).collateralDamageScore),
    0,
  );

  const rationale: string[] = [];
  if (template.note) rationale.push(template.note);
  const uncovered = organismCoverage.filter((o) => !o.covered && o.likelihood >= 0.05);
  if (uncovered.length) {
    rationale.push(
      `Gaps: ${uncovered.map((o) => `${getOrganism(o.organismId).shortName} (${Math.round(o.likelihood * 100)}% of the differential, ${o.expectedSusceptibility}% susceptible)`).join(", ")}.`,
    );
  }
  const restricted = agents.filter((a) => a.restricted);
  if (restricted.length) {
    rationale.push(
      `${restricted.map((a) => a.name).join(" and ")} ${restricted.length > 1 ? "are" : "is"} stewardship-restricted - document the indication and set a hard review date.`,
    );
  }

  const warnings: string[] = [];
  for (const conflict of allergyConflicts) {
    if (conflict.verdict !== "acceptable_with_caution") {
      warnings.push(`${conflict.agentName}: ${conflict.guidance}`);
    }
  }
  if (intake.clinical.pregnant) {
    for (const agentId of template.agentIds) {
      const agent = getAgent(agentId);
      if (agent.pregnancyUse === "contraindicated") warnings.push(`${agent.name} is contraindicated in pregnancy.`);
      else if (agent.pregnancyUse === "avoid_if_alternative") warnings.push(`${agent.name} should be avoided in pregnancy if an alternative exists.`);
    }
  }
  const crCl = estimateCreatinineClearance(intake.clinical);
  if (typeof crCl === "number" && Number.isFinite(crCl) && crCl < 30) {
    if (template.agentIds.includes("nitrofurantoin")) {
      warnings.push("Nitrofurantoin does not reach therapeutic urinary concentrations below a creatinine clearance of 30 mL/min.");
    }
    if (template.agentIds.includes("cefepime")) {
      warnings.push("Cefepime neurotoxicity risk is high at this creatinine clearance - the renally adjusted dose is shown and mental status needs daily review.");
    }
  }
  if (template.agentIds.includes("vancomycin") && template.agentIds.includes("pip_tazo")) {
    warnings.push("Vancomycin with piperacillin-tazobactam carries an additive acute kidney injury signal. Cefepime plus metronidazole gives comparable coverage with less nephrotoxicity.");
  }
  if (template.agentIds.includes("daptomycin") && (syndrome.id === "cap" || syndrome.id === "hap_vap" || syndrome.id === "aspiration_pneumonia")) {
    warnings.push("Daptomycin is inactivated by pulmonary surfactant and must not be used for pneumonia.");
  }

  const monitoring = [
    ...new Set([...syndrome.monitoring, ...agents.flatMap((a) => a.monitoring)]),
  ];

  return {
    id: template.id,
    label: template.label,
    agents,
    expectedCoverage: Number(expectedCoverage.toFixed(1)),
    spectrumCost,
    spectrumBreadth,
    rank: 0,
    preferred: false,
    sourceControlOnly,
    organismCoverage,
    allergyConflicts,
    rationale,
    warnings,
    durationDays: syndrome.durationDays,
    monitoring,
    selectionNote: "",
  };
}

/**
 * Coverage target.
 *
 * The sicker the patient, the less tolerable a coverage gap is. A mild
 * outpatient infection is deliberately held to a lower bar: for uncomplicated
 * cystitis no first-line agent reaches 90% against the full differential, and
 * demanding it would push every patient onto a fluoroquinolone or a carbapenem
 * to chase organisms that rarely need covering.
 */
function coverageTargetFor(severity: Severity): number {
  if (SEVERITY_ORDER[severity] >= SEVERITY_ORDER.severe) return 95;
  if (severity === "mild") return 85;
  return 90;
}

function buildWorkup(syndrome: Syndrome, intake: Intake): string[] {
  const workup = [...syndrome.monitoring];
  workup.unshift("Draw all cultures BEFORE the first dose wherever it does not delay therapy");
  if (intake.foleyCatheter.present) workup.push("Exchange the urinary catheter and culture the fresh specimen");
  if (intake.ventilator.present || intake.tracheostomy.present) {
    workup.push("Send a deep respiratory specimen rather than a tracheal aspirate of colonising flora");
  }
  if (intake.hardware.some((h) => h.suspectedFocus)) {
    workup.push("Plan operative sampling of the hardware - sonication culture markedly improves yield over swabs");
  }
  if (intake.clinical.severity === "septic_shock") workup.push("Lactate now and repeat after resuscitation");
  return [...new Set(workup)];
}

function buildRedFlags(syndrome: Syndrome, intake: Intake): string[] {
  const flags: string[] = [];
  const { clinical } = intake;

  if (isPaediatric(clinical)) {
    flags.push(
      clinical.ageYears > 0
        ? `Paediatric patient (age ${clinical.ageYears}). This engine carries adult dosing only, so no dose shown here is valid for this patient. Use a paediatric reference and paediatric infectious diseases input.`
        : "Age has not been recorded. Doses are withheld because adult dosing cannot be assumed. Enter the patient's age.",
    );
  }

  if (clinical.severity === "septic_shock") {
    flags.push("Septic shock: give the first antimicrobial dose within one hour and start fluid resuscitation now.");
  }
  if (syndrome.id === "necrotizing_fasciitis") {
    flags.push("Necrotising infection is a surgical emergency. Antibiotics do not substitute for immediate exploration.");
  }
  if (syndrome.id === "meningitis") {
    flags.push("Do not delay antibiotics for imaging or lumbar puncture. Give dexamethasone with or before the first dose.");
    flags.push(
      "Any encephalopathy, seizure or focal neurological sign: start intravenous aciclovir 10 mg/kg every 8 hours alongside the antibacterials and continue until CSF herpes simplex PCR is negative. Untreated herpes encephalitis is usually fatal and the outcome depends on how early aciclovir starts.",
    );
  }
  if (clinical.neutropenic) {
    flags.push("Neutropenic sepsis: antipseudomonal cover within one hour, and do not wait for the neutrophil count to be confirmed.");
  }
  if ((clinical.lactate ?? 0) >= 4) flags.push("Lactate 4 mmol/L or above indicates tissue hypoperfusion.");
  if ((clinical.systolicBp ?? 999) < 90) flags.push("Systolic blood pressure below 90 mmHg despite fluids indicates shock.");
  // Red flags are for cases that can deteriorate. Firing one on every mild
  // outpatient cystitis trains clinicians to ignore the panel; the full source
  // control list is still shown in its own section regardless of severity.
  if (syndrome.sourceControl.length && SEVERITY_ORDER[clinical.severity] >= SEVERITY_ORDER.moderate) {
    flags.push(`Source control is required and is not optional: ${syndrome.sourceControl[0]}`);
  }
  return flags;
}

export function recommendEmpiric(intake: Intake): EmpiricRecommendation {
  const syndrome = getSyndrome(intake.suspectedSyndromeId);
  const { regionId, reason: regionReason } = resolveRegion(intake);
  const region = REGIONS_BY_ID[regionId];
  if (!region) throw new Error(`Unknown region id: ${regionId}`);
  const antibiogram = getAntibiogram(regionId);

  const risks = deriveRiskFactors(intake);
  const coverage = deriveCoverageFlags(syndrome, risks);
  const differential = buildDifferential(syndrome, intake, risks);

  const applicable = syndrome.regimens.filter((t) => regimenIsApplicable(t, intake, coverage));
  // If severity or setting filters left nothing, fall back to the full list
  // rather than showing a clinician an empty recommendation.
  const templates = applicable.length ? applicable : syndrome.regimens;

  const scored = templates.map((t) => scoreRegimen(t, differential, regionId, intake, syndrome));

  const target = coverageTargetFor(intake.clinical.severity);

  const pregnancyContraindicated = (r: RegimenRecommendation) =>
    intake.clinical.pregnant &&
    r.agents.some((a) => getAgent(a.agentId).pregnancyUse === "contraindicated");

  // A contraindication has to remove the option, not sit in a warnings array
  // under a card that still says "Recommended".
  const blocked = (r: RegimenRecommendation) =>
    r.allergyConflicts.some((c) => c.verdict === "contraindicated") || pregnancyContraindicated(r);

  const usable = scored.filter((r) => !blocked(r));
  // Falling back to the blocked list is the only way to show the clinician what
  // was considered, but the fallback must never be dressed up as a
  // recommendation. Endorsing a contraindicated regimen is worse than showing
  // nothing, because every other signal on the card says "start this".
  const everyRegimenBlocked = usable.length === 0;
  const pool = everyRegimenBlocked ? scored : usable;

  // Stewardship ranking: among regimens that meet the coverage target, prefer
  // the narrowest. Only when nothing meets the target does raw coverage win.
  // Coverage is an estimate, not a measurement. Treating a two-point difference
  // as decisive is how empiric therapy creeps upward: a carbapenem beating
  // piperacillin-tazobactam by 1.5 points is not a clinical difference, but it
  // is a large ecological one. Regimens within the tolerance band of the best
  // available coverage are therefore treated as equivalent, and narrowness
  // decides between them.
  const COVERAGE_TOLERANCE = 2;
  const bestCoverage = pool.reduce((max, r) => Math.max(max, r.expectedCoverage), 0);
  const adequacyFloor = Math.min(target, bestCoverage - COVERAGE_TOLERANCE);
  const isAdequate = (r: RegimenRecommendation) => r.expectedCoverage >= adequacyFloor;

  // An agent the patient should avoid is a real cost, so it breaks ties against
  // an otherwise equivalent regimen without removing the option entirely.
  const allergyPenalty = (r: RegimenRecommendation) =>
    r.allergyConflicts.filter((c) => c.verdict === "avoid").length;

  // An agent to be avoided in pregnancy is a real cost too, so it breaks ties
  // against an otherwise equivalent regimen.
  const pregnancyPenalty = (r: RegimenRecommendation) =>
    intake.clinical.pregnant
      ? r.agents.filter((a) => getAgent(a.agentId).pregnancyUse === "avoid_if_alternative").length
      : 0;

  const mildPresentation = intake.clinical.severity === "mild";

  const ranked = [...pool].sort((a, b) => {
    // Antibiotics add nothing to a simple drained abscess in a well patient, so
    // where the knowledge base offers source control alone at mild severity it
    // leads. Above mild it stays on the list but never at the top.
    if (a.sourceControlOnly !== b.sourceControlOnly) {
      if (mildPresentation) return a.sourceControlOnly ? -1 : 1;
      return a.sourceControlOnly ? 1 : -1;
    }
    const aAdequate = isAdequate(a);
    const bAdequate = isAdequate(b);
    if (aAdequate !== bAdequate) return aAdequate ? -1 : 1;
    if (aAdequate && bAdequate) {
      const penaltyDelta = allergyPenalty(a) - allergyPenalty(b);
      if (penaltyDelta !== 0) return penaltyDelta;
      const pregnancyDelta = pregnancyPenalty(a) - pregnancyPenalty(b);
      if (pregnancyDelta !== 0) return pregnancyDelta;
      if (a.spectrumBreadth !== b.spectrumBreadth) return a.spectrumBreadth - b.spectrumBreadth;
      if (a.spectrumCost !== b.spectrumCost) return a.spectrumCost - b.spectrumCost;
      return b.expectedCoverage - a.expectedCoverage;
    }
    return b.expectedCoverage - a.expectedCoverage;
  });

  const severePresentation = SEVERITY_ORDER[intake.clinical.severity] >= SEVERITY_ORDER.severe;
  const meetsTarget = pool.filter((r) => r.expectedCoverage >= target);
  const broadestAtTarget = meetsTarget.reduce<RegimenRecommendation | undefined>(
    (best, r) => (!best || r.expectedCoverage > best.expectedCoverage ? r : best),
    undefined,
  );

  ranked.forEach((regimen, index) => {
    regimen.rank = index + 1;
    regimen.preferred = !everyRegimenBlocked && index === 0;
    const isPreferred = regimen.preferred;

    if (everyRegimenBlocked) {
      regimen.selectionNote =
        "Contraindicated for this patient by the recorded allergies or by pregnancy. Every regimen the knowledge base holds for this syndrome is contraindicated, so nothing here is being recommended. Obtain allergy and infectious diseases input now.";
      return;
    }

    if (regimen.sourceControlOnly) {
      regimen.selectionNote = isPreferred
        ? "Source control alone. For a simple abscess in a well patient, drainage is curative and an antibiotic adds risk without adding benefit."
        : "Source control alone, without an antimicrobial. Adequate only for a small simple abscess in a well patient.";
      return;
    }

    if (regimen.expectedCoverage >= target) {
      regimen.selectionNote = isPreferred
        ? `Narrowest regimen reaching the ${target}% coverage target for this differential (${regimen.expectedCoverage}%). Its broadest agent scores ${regimen.spectrumBreadth} of 5, total spectrum cost ${regimen.spectrumCost}.`
        : `Meets the ${target}% target at ${regimen.expectedCoverage}%, at a spectrum cost of ${regimen.spectrumCost}.`;
      return;
    }

    if (isAdequate(regimen)) {
      if (isPreferred && broadestAtTarget) {
        // Being explicit matters here: a higher-coverage regimen exists and the
        // engine has deliberately not chosen it. The clinician gets to see the
        // trade it made rather than a claim that nothing reached the target.
        regimen.selectionNote =
          `At ${regimen.expectedCoverage}% this falls just under the ${target}% target, within ${COVERAGE_TOLERANCE} points of ${broadestAtTarget.label} (${broadestAtTarget.expectedCoverage}%), and is narrower - spectrum cost ${regimen.spectrumCost} against ${broadestAtTarget.spectrumCost}. A difference this small is inside the error of the estimate, so the narrower regimen is preferred. Escalate to the broader option if the patient deteriorates.`;
      } else if (isPreferred) {
        regimen.selectionNote =
          `No regimen reaches the ${target}% target for this differential. At ${regimen.expectedCoverage}% this is the highest-coverage option available, and the narrowest of those within ${COVERAGE_TOLERANCE} points of it (spectrum cost ${regimen.spectrumCost}).${severePresentation ? " Given the severity of this presentation, involve infectious diseases." : ""}`;
      } else {
        regimen.selectionNote = `Within ${COVERAGE_TOLERANCE} points of the best available coverage at ${regimen.expectedCoverage}%, spectrum cost ${regimen.spectrumCost}.`;
      }
      return;
    }

    regimen.selectionNote = `Below the ${target}% target and more than ${COVERAGE_TOLERANCE} points behind the best available option, at ${regimen.expectedCoverage}%.`;
  });

  const now = new Date();
  const dueAt = new Date(now.getTime() + 48 * 3_600_000);

  const disclaimers = [
    "Clinical decision support for licensed clinicians. It informs but does not replace clinical judgement, and the prescriber remains responsible for every order.",
    `Recommendations are generated from knowledge base ${KNOWLEDGE_BASE_VERSION} and the ${region.name} antibiogram (${antibiogram.source}).`,
    "Verify doses, interactions and contraindications against your formulary and your patient's full medication list before prescribing.",
    "Adult dosing only. The engine does not hold paediatric or neonatal doses.",
  ];
  if (antibiogram.source.startsWith("Illustrative")) {
    disclaimers.push(
      "This region is using the shipped illustrative resistance profile, not your facility's own isolates. Load your facility antibiogram before clinical use.",
    );
  }

  return {
    generatedAt: now.toISOString(),
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    syndrome: { id: syndrome.id, name: syndrome.name, guideline: syndrome.guideline },
    region: { id: region.id, name: region.name, source: `${antibiogram.source}. ${regionReason}`, updated: antibiogram.updated },
    coverageTarget: target,
    differential: differential.map((entry) => {
      const organism = getOrganism(entry.organismId);
      return {
        organismId: entry.organismId,
        name: organism.name,
        shortName: organism.shortName,
        likelihood: Number(entry.weight.toFixed(4)),
        expectedSusceptibility: 0,
        covered: false,
        reason: entry.reasons.join("; "),
      };
    }),
    riskFactors: risks.map((r) => ({ id: r.id, label: r.label, note: r.note })),
    requiredCoverage: coverage.required,
    consideredCoverage: coverage.considered,
    regimens: ranked,
    sourceControl: syndrome.sourceControl,
    workup: buildWorkup(syndrome, intake),
    reassessment: {
      dueAt: dueAt.toISOString(),
      windowHours: [48, 72],
      checklist: [
        "Review every culture and rapid diagnostic that has resulted",
        "Ask the question directly: can this be stopped?",
        "If not stopped, can it be narrowed to a definitive agent?",
        "Can intravenous therapy switch to oral?",
        "Is the source controlled, or does a drain, line removal or debridement still need to happen?",
        "Set the stop date now and write it in the notes",
      ],
    },
    nonBacterialConsiderations: differential
      .filter((entry) => (getOrganism(entry.organismId).kind ?? "bacterial") !== "bacterial")
      .map((entry) => {
        const organism = getOrganism(entry.organismId);
        return {
          organismId: entry.organismId,
          name: organism.name,
          likelihood: Number(entry.weight.toFixed(4)),
          note:
            organism.kind === "viral"
              ? `${organism.shortName} is on the differential but is not covered by any antibacterial regimen. ${organism.notes ?? ""}`.trim()
              : `${organism.shortName} needs a separate antifungal decision; antibacterial coverage percentages do not speak to it.`,
        };
      }),
    redFlags: [
      ...buildRedFlags(syndrome, intake),
      ...(everyRegimenBlocked
        ? [
            "Every regimen for this syndrome is contraindicated by the recorded allergies. Nothing below is a recommendation. Obtain allergy and infectious diseases input before prescribing.",
          ]
        : []),
      ...unclassifiedAllergies(intake.allergies).map(
        (allergy) =>
          `Allergy entry "${allergy.agentOrClass}" could not be matched to a drug class, so the allergy check did not account for it. Review it manually before prescribing.`,
      ),
    ],
    safeAlternatives: everyRegimenBlocked
      ? safeAlternatives(intake.allergies).map((agent) => ({
          agentId: agent.id,
          name: agent.name,
          drugClass: agent.drugClass,
          tier: agent.tier,
        }))
      : [],
    disclaimers,
  };
}
