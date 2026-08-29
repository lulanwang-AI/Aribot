import type { Antimicrobial, ClinicalParameters, DosedAgent, Route, Severity } from "../types";

/**
 * This engine carries adult dosing only. Below this age every dose it holds is
 * the wrong dose, so it declines to print one rather than printing an adult
 * figure next to a paediatric weight.
 */
export const ADULT_AGE_YEARS = 18;

/**
 * Below the adult threshold, or age not supplied at all.
 *
 * The `> 0` guard this replaced excluded exactly the patients most at risk from
 * an adult dose: an infant under one year is legitimately recorded as age 0,
 * and an intake where age was never filled in also arrives as 0. Both fell
 * straight through to a full adult dose with no red flag. Absent an age, the
 * safe assumption is that we do not know it is an adult.
 */
export function isPaediatric(clinical: ClinicalParameters): boolean {
  return !Number.isFinite(clinical.ageYears) || clinical.ageYears < ADULT_AGE_YEARS;
}

/**
 * Cockcroft-Gault creatinine clearance, mL/min.
 *
 * Used only when the intake did not supply a measured clearance. Actual body
 * weight is used below a BMI of 30 and adjusted body weight above it, which is
 * the convention most pharmacy departments follow.
 */
export function estimateCreatinineClearance(clinical: ClinicalParameters): number | undefined {
  // JSON has no undefined, so a cleared field arrives as null. Passing that
  // through would coerce to 0 in the band comparison and select the severe
  // renal failure band of every agent.
  const supplied = clinical.creatinineClearance;
  if (supplied != null && Number.isFinite(supplied) && supplied >= 0) return supplied;

  // ---- Fix 15: on dialysis the formula does not apply ----
  // Cockcroft-Gault is meaningless in anuric or dialysis-dependent patients, so
  // dosing falls to the lowest band plus an explicit pharmacy check rather than
  // to a computed number.
  if (clinical.onDialysis) return undefined;
  const { ageYears, weightKg, serumCreatinine, sex, heightCm } = clinical;
  if (serumCreatinine === undefined || weightKg === undefined || ageYears === undefined) return undefined;
  if (serumCreatinine <= 0 || weightKg <= 0) return undefined;
  // Cockcroft-Gault is not validated below 18. Returning a confident-looking
  // number for a child would then drive renal band selection off a formula that
  // does not apply.
  if (ageYears < ADULT_AGE_YEARS) return undefined;

  let dosingWeight = weightKg;
  if (heightCm) {
    const heightInches = heightCm / 2.54;
    const ibw =
      sex === "female"
        ? 45.5 + 2.3 * Math.max(0, heightInches - 60)
        : 50 + 2.3 * Math.max(0, heightInches - 60);
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    if (bmi >= 30) dosingWeight = ibw + 0.4 * (weightKg - ibw);
    else if (weightKg > ibw) dosingWeight = ibw;
  }

  const base = ((140 - ageYears) * dosingWeight) / (72 * serumCreatinine);
  return Math.round(sex === "female" ? base * 0.85 : base);
}

function selectBand(agent: Antimicrobial, crCl: number | undefined) {
  if (crCl === undefined || !Number.isFinite(crCl) || crCl < 0) return undefined;
  const band = agent.renalAdjustments.find((b) => crCl >= b.minCrCl && crCl < b.maxCrCl);
  if (band) return band;
  // A clearance above every declared band still belongs in the top band.
  // Without this, an unusually high clearance falls through to no band at all
  // and the agent is dosed as though renal function were unknown.
  return [...agent.renalAdjustments].sort((a, b) => b.minCrCl - a.minCrCl)[0];
}

/**
 * The band that represents normal renal function, i.e. the one with no upper
 * bound. Doses in this band are the agent's ordinary dose, so they must never
 * displace a severe or meningitic dose.
 */
function topBandOf(agent: Antimicrobial) {
  return agent.renalAdjustments.find((band) => band.maxCrCl === Infinity);
}

const SEVERE: Severity[] = ["severe", "septic_shock"];

function buildCautions(agent: Antimicrobial, clinical: ClinicalParameters): string[] {
  const cautions = [...agent.cautions];
  if (clinical.pregnant) {
    if (agent.pregnancyUse === "contraindicated") {
      cautions.unshift("Contraindicated in pregnancy.");
    } else if (agent.pregnancyUse === "avoid_if_alternative") {
      cautions.unshift("Avoid in pregnancy if a safer alternative exists.");
    }
  }
  if (clinical.hepaticImpairment === "severe" && /rifampin|linezolid|metronidazole|fluconazole/.test(agent.id)) {
    cautions.unshift("Severe hepatic impairment - reduce dose and monitor LFTs closely.");
  }
  return cautions;
}

/**
 * Produce the dose that will actually be shown to the clinician: the agent's
 * standard dose, escalated for severe infection where a severe dose exists,
 * then overridden by the renal band when one applies.
 */
export function doseAgent(
  agent: Antimicrobial,
  clinical: ClinicalParameters,
  opts: { preferOral?: boolean; cnsDosing?: boolean } = {},
): DosedAgent {
  if (isPaediatric(clinical)) {
    return {
      agentId: agent.id,
      name: agent.name,
      drugClass: agent.drugClass,
      route: agent.routes.includes("IV") ? "IV" : agent.routes[0],
      dose: "Paediatric dosing is out of scope for this engine - use a paediatric reference",
      renalNote: clinical.ageYears > 0
        ? `Age ${clinical.ageYears}: adult dosing does not apply and no dose is shown.`
        : "Age not recorded. No dose is shown, because adult dosing cannot be assumed.",
      monitoring: agent.monitoring,
      cautions: [
        "This tool holds adult doses only. Do not extrapolate. Use BNF for Children or an equivalent paediatric reference and involve paediatric infectious diseases.",
        ...agent.cautions,
      ],
      tier: agent.tier,
      restricted: agent.restricted,
    };
  }

  const crCl = estimateCreatinineClearance(clinical);
  const severe = SEVERE.includes(clinical.severity) || opts.cnsDosing === true;

  // ---- Fix 17: the route decision and the dose must not disagree ----
  // Only switch to oral when there is a real oral dose to switch to. Choosing
  // route PO and then printing the intravenous dose is worse than staying IV.
  const oralChosen = opts.preferOral === true && agent.routes.includes("PO") && agent.oralDose !== undefined;
  const route: Route = oralChosen ? "PO" : agent.routes.includes("IV") ? "IV" : agent.routes[0];

  let dose = severe && agent.severeDose ? agent.severeDose : agent.adultDose;
  if (oralChosen && agent.oralDose) dose = agent.oralDose;

  let renalNote: string | undefined;

  if (clinical.onDialysis) {
    const lowest = [...agent.renalAdjustments].sort((a, b) => a.minCrCl - b.minCrCl)[0];
    if (lowest && !oralChosen) dose = lowest.dose;
    return {
      agentId: agent.id,
      name: agent.name,
      drugClass: agent.drugClass,
      route,
      dose,
      renalNote: `On dialysis: dosed at the lowest renal band and given after the session. Confirm the regimen and any post-dialysis supplement with pharmacy.${lowest?.note ? ` ${lowest.note}` : ""}`,
      monitoring: agent.monitoring,
      cautions: buildCautions(agent, clinical),
      tier: agent.tier,
      restricted: agent.restricted,
    };
  }

  const band = selectBand(agent, crCl);
  const topBand = topBandOf(agent);

  if (band && crCl !== undefined) {
    if (topBand && band === topBand) {
      // Normal renal function. The band carries no reduction, so the severe or
      // meningitic dose stands; any note on it is informational only.
      //
      // Getting this wrong is not a cosmetic problem: the previous version let
      // ceftriaxone's "no renal adjustment required" band overwrite the 2 g
      // q12h meningitic dose with 1-2 g q24h, and did the same to meropenem,
      // clindamycin's toxin-suppression dose and enteral vancomycin for
      // fulminant C. difficile. A note may explain a dose. It may never be one.
      if (band.note) renalNote = `CrCl ${crCl} mL/min - ${band.note}`;
    } else if (oralChosen) {
      // The bands are written for the intravenous dose, so they annotate rather
      // than replace an oral regimen.
      renalNote = `CrCl ${crCl} mL/min - reduced renal function, confirm the oral dose${band.note ? `. ${band.note}` : ""}`;
    } else {
      dose = band.dose;
      renalNote = `CrCl ${crCl} mL/min${band.note ? ` - ${band.note}` : ""}`;
    }
  } else if (crCl === undefined) {
    renalNote =
      "No creatinine clearance supplied - dose shown is for normal renal function. Confirm renal function before administration.";
  }

  const cautions = buildCautions(agent, clinical);

  return {
    agentId: agent.id,
    name: agent.name,
    drugClass: agent.drugClass,
    route,
    dose,
    renalNote,
    monitoring: agent.monitoring,
    cautions,
    tier: agent.tier,
    restricted: agent.restricted,
  };
}

/** Weight-based agents whose dose string should show the computed milligrams. */
export function annotateWeightBasedDose(dosed: DosedAgent, weightKg: number): DosedAgent {
  // Never render a computed milligram figure onto a dose the engine has already
  // declined to give.
  if (dosed.dose.startsWith("Paediatric dosing is out of scope")) return dosed;
  const perKg = /(\d+)(?:-(\d+))?\s*mg\/kg/.exec(dosed.dose);
  if (!perKg || !weightKg) return dosed;
  const low = Number(perKg[1]) * weightKg;
  const high = perKg[2] ? Number(perKg[2]) * weightKg : undefined;
  const rendered = high
    ? `${Math.round(low)}-${Math.round(high)} mg`
    : `${Math.round(low)} mg`;
  return { ...dosed, dose: `${dosed.dose} (${rendered} at ${weightKg} kg)` };
}
