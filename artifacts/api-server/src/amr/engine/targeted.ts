import type {
  ClinicalResponse,
  CoverageFlag,
  CultureIsolate,
  CultureResult,
  DosedAgent,
  Intake,
  StewardshipAction,
  TargetedRecommendation,
} from "../types";
import { ANTIMICROBIALS, getAgent } from "../data/agents";
import { getOrganism } from "../data/organisms";
import { getSyndrome } from "../data/syndromes";
import { FLAG_AGENTS, FLAG_ORGANISMS } from "../data/risk-factors";
import { annotateWeightBasedDose, doseAgent } from "./dosing";
import { checkAgent } from "./allergy";
import { KNOWLEDGE_BASE_VERSION } from "./empiric";

const ACTION_LABELS: Record<StewardshipAction, string> = {
  stop: "Stop antimicrobials",
  de_escalate: "De-escalate to targeted therapy",
  continue: "Continue current therapy",
  escalate: "Escalate - current therapy does not cover the isolate",
  switch_iv_to_po: "Switch intravenous to oral",
  broaden_pending_source_control: "Hold current therapy and achieve source control",
  change_for_reliability: "Change therapy for reliable cover - spectrum widens",
};

/** Syndromes where intravenous therapy must continue regardless of oral tolerance. */
const IV_ONLY_SYNDROMES = new Set(["meningitis", "bacteremia"]);

/** Syndromes where a negative culture is expected and does not license stopping. */
const CULTURE_NEGATIVE_EXPECTED = new Set([
  "cellulitis",
  "cap",
  "aspiration_pneumonia",
  "diabetic_foot",
  "purulent_ssti",
  "surgical_site",
]);

/**
 * Syndromes where a negative culture must never produce a stop.
 *
 * Partially treated bacterial meningitis is routinely CSF-culture-negative, a
 * necrotising infection is a surgical diagnosis rather than a microbiological
 * one, and deep-seated infection is frequently unrecovered. In these a negative
 * panel carries no information, so treating it as permission to stop would be
 * acting on the absence of evidence.
 */
const STOP_FORBIDDEN = new Set([
  "meningitis",
  "necrotizing_fasciitis",
  "septic_arthritis",
  "osteomyelitis_hardware",
  "intra_abdominal",
  "healthcare_iai",
]);

function isContaminant(isolate: CultureIsolate): boolean {
  return isolate.probableContaminant === true;
}

/** Every isolate the laboratory did not flag as a contaminant. */
function significantIsolates(cultures: CultureResult): CultureIsolate[] {
  return cultures.isolates.filter((i) => !isContaminant(i) && i.organismId);
}

/**
 * The isolate that drives the headline wording and the duration rule: the most
 * clinically significant non-contaminant, preferring sterile-site specimens.
 * Coverage decisions consider every significant isolate, not just this one.
 */
function primaryIsolate(cultures: CultureResult): CultureIsolate | undefined {
  const real = significantIsolates(cultures);
  if (!real.length) return undefined;
  const sterileSite = /blood|csf|joint|bone|peritone|pleural/i;
  return real.find((i) => sterileSite.test(i.specimen)) ?? real[0];
}

/**
 * Coverage the syndrome mandates that this culture result cannot speak to.
 *
 * A required flag only needs protecting when no isolate actually represents it.
 * Once Pseudomonas is growing in the bottle, the antipseudomonal requirement is
 * answered by the agent chosen for that isolate, and holding a second
 * antipseudomonal "for the flag" is double cover by accident. But anaerobes and
 * atypicals are rarely or never recovered, so a negative panel is not evidence
 * that cover can stop, and the agent supplying it has to survive.
 */
function protectedAgents(
  syndromeId: string,
  currentAgentIds: string[],
  isolates: CultureIsolate[],
): { agentIds: string[]; flags: CoverageFlag[] } {
  const syndrome = getSyndrome(syndromeId);
  const isolatedOrganisms = new Set(isolates.map((iso) => iso.organismId));

  const agentIds: string[] = [];
  const flags: CoverageFlag[] = [];

  for (const flag of syndrome.requiredCoverage) {
    const representedByCulture = (FLAG_ORGANISMS[flag] ?? []).some((organismId) =>
      isolatedOrganisms.has(organismId),
    );
    if (representedByCulture) continue;

    const answers = FLAG_AGENTS[flag] ?? [];
    const onTherapy = currentAgentIds
      .filter((agentId) => answers.includes(agentId))
      .sort((a, b) => getAgent(a).collateralDamageScore - getAgent(b).collateralDamageScore);
    if (!onTherapy.length) continue;

    const chosen = onTherapy[0];
    if (!agentIds.includes(chosen)) agentIds.push(chosen);
    flags.push(flag);
  }

  return { agentIds, flags };
}

/** Narrowest agent the isolate tested susceptible to, respecting allergies. */
/** Agents that only reach therapeutic concentrations in the bladder. */
const URINARY_ONLY = new Set(["nitrofurantoin", "fosfomycin"]);
/** Inactivated by pulmonary surfactant. */
const NOT_FOR_LUNG = new Set(["daptomycin"]);
const PNEUMONIA_SYNDROME_IDS = new Set(["cap", "hap_vap", "aspiration_pneumonia"]);

function narrowestActiveAgent(
  isolate: CultureIsolate,
  intake: Intake,
  opts: { requireOral?: boolean; requireCns?: boolean; syndromeId?: string } = {},
) {
  const organism = getOrganism(isolate.organismId);
  const isCsf = /csf|cerebrospinal/i.test(isolate.specimen);

  const candidates = ANTIMICROBIALS.filter((agent) => {
    if (organism.intrinsicResistance.includes(agent.id)) return false;
    if (opts.requireOral && !(agent.routes.includes("PO") && agent.highOralBioavailability)) return false;
    if (opts.requireCns && !agent.cnsPenetration) return false;

    // Susceptibility in a test tube is not the same as adequate concentration
    // at the site of infection. The laboratory reports the former; only the
    // engine can apply the latter.
    if (isCsf && !agent.cnsPenetration) return false;
    if (URINARY_ONLY.has(agent.id) && opts.syndromeId !== "cystitis") return false;
    if (NOT_FOR_LUNG.has(agent.id) && opts.syndromeId && PNEUMONIA_SYNDROME_IDS.has(opts.syndromeId)) return false;

    const reported = isolate.susceptibilities[agent.id];
    // Only agents the lab actually reported susceptible are eligible. An
    // untested agent is never assumed active.
    if (reported !== "S") return false;

    const conflict = checkAgent(agent, intake.allergies);
    if (conflict && conflict.verdict !== "acceptable_with_caution") return false;
    return true;
  });

  if (!candidates.length) return undefined;

  // Prefer the organism's guideline-preferred definitive agents, then fall back
  // to the lowest collateral damage score.
  const preferred = candidates.filter((a) => organism.preferredDefinitive.includes(a.id));
  const pool = preferred.length ? preferred : candidates;
  return pool.sort((a, b) => {
    const aRank = organism.preferredDefinitive.indexOf(a.id);
    const bRank = organism.preferredDefinitive.indexOf(b.id);
    if (aRank !== -1 && bRank !== -1 && aRank !== bRank) return aRank - bRank;
    if (a.collateralDamageScore !== b.collateralDamageScore) {
      return a.collateralDamageScore - b.collateralDamageScore;
    }
    return a.tier.localeCompare(b.tier);
  })[0];
}

function durationFor(
  syndromeId: string,
  isolate: CultureIsolate | undefined,
  response: ClinicalResponse,
): { min: number; max: number; note: string } {
  const syndrome = getSyndrome(syndromeId);
  const base = { ...syndrome.durationDays };
  const sourceOutstanding = !response.sourceControlDone && syndrome.sourceControl.length > 0;

  if (isolate && /blood/i.test(isolate.specimen)) {
    if (isolate.organismId === "mssa" || isolate.organismId === "mrsa") {
      return {
        min: 14,
        max: 42,
        note: "S. aureus bacteraemia: at least 14 days from the first negative blood culture for uncomplicated disease, 4-6 weeks for endocarditis, endovascular infection or metastatic seeding. Infectious diseases consultation is associated with lower mortality.",
      };
    }
    if (isolate.organismId === "candida") {
      return {
        min: 14,
        max: 14,
        note: "Candidaemia: 14 days from the first negative blood culture, with dilated ophthalmological examination and line removal.",
      };
    }
    if (["e_coli", "klebsiella", "proteus", "enterobacter", "esbl_enterobacterales", "pseudomonas"].includes(isolate.organismId)) {
      // The 7 day evidence is conditional on both source control and response.
      // Quoting it to a patient with an undrained focus reads as permission the
      // trials never gave.
      const shortCourseEligible = !sourceOutstanding && response.improving;
      return {
        min: shortCourseEligible ? 7 : 14,
        max: 14,
        note: shortCourseEligible
          ? "Gram-negative bacteraemia: 7 days is non-inferior to 14 when the source is controlled and the patient has responded."
          : `Gram-negative bacteraemia: the 7 day course applies only when the source is controlled and the patient is improving, which is not the case here${sourceOutstanding ? " (source control outstanding)" : ""}${!response.improving ? " (not yet improving)" : ""}. Treat for 14 days and reassess.`,
      };
    }
    if (isolate.organismId === "coag_neg_staph") {
      return {
        min: 5,
        max: 7,
        note: "Coagulase-negative staphylococcal line infection: 5-7 days after line removal. Without removal, relapse is likely.",
      };
    }
  }

  if (sourceOutstanding) {
    return {
      min: base.min,
      max: base.max + 7,
      note: `${base.note} Source control is not yet complete, so the clock has not started - duration is counted from the day of adequate source control, not from the first dose.`,
    };
  }

  return base;
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export interface TargetedInput {
  intake: Intake;
  syndromeId: string;
  currentAgentIds: string[];
  therapyStartedAt: string;
  cultures: CultureResult;
  response: ClinicalResponse;
}

export function recommendTargeted(input: TargetedInput): TargetedRecommendation {
  const { intake, syndromeId, currentAgentIds, cultures, response, therapyStartedAt } = input;
  const syndrome = getSyndrome(syndromeId);

  const rationale: string[] = [];
  const warnings: string[] = [];
  const discontinue: TargetedRecommendation["discontinue"] = [];
  let action: StewardshipAction = "continue";
  let confidence: TargetedRecommendation["confidence"] = "moderate";
  let headline = "";
  let regimen: DosedAgent[] = [];

  const isolate = primaryIsolate(cultures);
  const significant = significantIsolates(cultures);
  const contaminants = cultures.isolates.filter(isContaminant);
  const cnsDosing = syndrome.requiredCoverage.includes("cns");

  /* ---------------- Intravenous to oral gate ----------------
   * Computed before any branch so that no branch can route around it. Handing a
   * patient an oral dose because they happen to be tolerating fluids, while
   * they are still febrile or the source is undrained, is the failure this
   * list exists to prevent.
   */
  const ivBlockers: string[] = [];
  if (!response.tolueratingOral) ivBlockers.push("Not tolerating oral intake");
  if (!response.afebrile24h) ivBlockers.push("Not afebrile for 24 hours");
  if (!response.hemodynamicallyStable) ivBlockers.push("Not haemodynamically stable");
  if (!response.sourceControlDone && syndrome.sourceControl.length) {
    ivBlockers.push("Source control incomplete");
  }
  if (IV_ONLY_SYNDROMES.has(syndromeId)) {
    ivBlockers.push(`${syndrome.name} requires intravenous therapy irrespective of oral tolerance`);
  }
  // A sterile-site isolate demands intravenous therapy whatever the syndrome id
  // says, because the syndrome list can never enumerate every presentation that
  // ends with an organism in the blood or the CSF.
  const sterileSiteIsolate = significant.find((iso) => /blood|csf|cerebrospinal/i.test(iso.specimen));
  if (sterileSiteIsolate) {
    ivBlockers.push(
      `${getOrganism(sterileSiteIsolate.organismId).shortName} from ${sterileSiteIsolate.specimen}: a sterile-site isolate requires intravenous therapy`,
    );
  }
  if (intake.hardware.some((h) => h.suspectedFocus)) {
    ivBlockers.push("Infected implanted hardware at the suspected focus");
  }
  const oralPermitted = ivBlockers.length === 0;

  const dose = (agentId: string, preferOral = false) =>
    annotateWeightBasedDose(
      doseAgent(getAgent(agentId), intake.clinical, { preferOral, cnsDosing }),
      intake.clinical.weightKg,
    );

  /* ---------------- No growth ---------------- */
  if (cultures.status === "no_growth" || (cultures.status === "contaminant" && !isolate)) {
    // Neutropenia is its own stop-forbidding condition: the syndrome's own
    // duration rule says continue until neutrophil recovery, so stopping on a
    // negative culture would contradict the knowledge base in the same response.
    const stopForbidden = STOP_FORBIDDEN.has(syndromeId) || intake.clinical.neutropenic;
    const cultureNegativeExpected = CULTURE_NEGATIVE_EXPECTED.has(syndromeId) || stopForbidden;

    if (stopForbidden && response.improving) {
      rationale.push(
        intake.clinical.neutropenic
          ? "The patient is still neutropenic. Continue empiric antibacterial cover until neutrophil recovery and 48 hours afebrile, whatever the cultures show."
          : `A negative culture in ${syndrome.name.toLowerCase()} is uninformative: the infection is frequently unrecovered, and prior antibiotics suppress growth further. Absence of an isolate is not evidence the infection has gone.`,
      );
    }

    if (response.improving && !cultureNegativeExpected) {
      action = "stop";
      confidence = response.afebrile24h && response.hemodynamicallyStable ? "high" : "moderate";
      headline = "Cultures are negative at the 48-72 hour checkpoint and the patient has improved. Stop antimicrobials.";
      rationale.push(
        "No organism has been isolated from any site after 48-72 hours of incubation with the patient clinically improving.",
        "Continuing empiric therapy past a negative 48-72 hour checkpoint drives resistance and C. difficile risk without benefit.",
      );
      for (const agentId of currentAgentIds) {
        discontinue.push({ agentId, name: getAgent(agentId).name, reason: "No organism isolated and the patient has improved" });
      }
    } else if (response.improving && cultureNegativeExpected) {
      action = "de_escalate";
      confidence = "moderate";
      headline = `Cultures are negative, which is expected in ${syndrome.name.toLowerCase()}. Narrow to the shortest effective course and set a stop date.`;
      rationale.push(
        `${syndrome.name} is frequently culture negative, so a negative result does not rule out bacterial infection.`,
        "Narrow to a single agent aimed at the most likely pathogen and commit to a fixed, short total duration.",
      );
      const narrowest = currentAgentIds
        .map((id) => getAgent(id))
        .sort((a, b) => a.collateralDamageScore - b.collateralDamageScore)[0];
      if (narrowest) {
        regimen = [dose(narrowest.id, oralPermitted)];
        for (const agentId of currentAgentIds) {
          if (agentId === narrowest.id) continue;
          discontinue.push({
            agentId,
            name: getAgent(agentId).name,
            reason: "Redundant once the differential has narrowed and cultures are negative",
          });
        }
      }
    } else {
      action = "broaden_pending_source_control";
      confidence = "low";
      headline = "Cultures are negative but the patient is not improving. Look for an uncontrolled source before broadening.";
      rationale.push(
        "Failure to improve with negative cultures usually means an undrained focus, a non-bacterial diagnosis, or a resistant organism suppressed by prior antibiotics.",
        "Re-image, re-examine every line and device, and reconsider the diagnosis before adding another antibiotic.",
      );
      warnings.push("Escalating the spectrum without finding the source rarely rescues a patient who is not responding.");
      regimen = currentAgentIds.map((id) => dose(id));
    }
  } else if (cultures.status === "pending") {
    /* ---------------- Still pending ---------------- */
    action = "continue";
    confidence = "low";
    headline = "Cultures are still pending. Continue empiric therapy and reassess as soon as they result.";
    rationale.push("No definitive result yet. The 48-72 hour decision point still stands - set a hard reassessment time.");
    regimen = currentAgentIds.map((id) => dose(id));
  } else if (isolate) {
    /* ---------------- Growth ---------------- */
    const organisms = significant.map((iso) => getOrganism(iso.organismId));
    const organism = getOrganism(isolate.organismId);
    const organismNames = organisms.map((o) => o.shortName).join(" and ");

    // Every significant isolate has to be covered, not just the headline one.
    // A single-isolate view is how a de-escalation ends up dropping the only
    // antipseudomonal agent because the sterile-site organism happened to be a
    // staphylococcus.
    const targetsByIsolate = significant.map((iso) => ({
      isolate: iso,
      organism: getOrganism(iso.organismId),
      agent: narrowestActiveAgent(iso, intake, { requireCns: cnsDosing, syndromeId }),
      activeOnCurrent: currentAgentIds.filter((agentId) => iso.susceptibilities[agentId] === "S"),
      intermediateOnCurrent: currentAgentIds.filter((agentId) => iso.susceptibilities[agentId] === "I"),
      untestedOnCurrent: currentAgentIds.filter((agentId) => iso.susceptibilities[agentId] === undefined),
    }));

    // An isolate is only uncovered when every current agent was actually tested
    // and came back non-susceptible. An intermediate result is a dose problem,
    // and an untested agent is a laboratory question - neither is evidence of
    // resistance, and treating them as such manufactures a false coverage gap.
    const uncovered = targetsByIsolate.filter(
      (entry) =>
        entry.activeOnCurrent.length === 0 &&
        entry.intermediateOnCurrent.length === 0 &&
        entry.untestedOnCurrent.length === 0,
    );

    const intermediateOnly = targetsByIsolate.filter(
      (entry) => entry.activeOnCurrent.length === 0 && entry.intermediateOnCurrent.length > 0,
    );
    const untestedOnly = targetsByIsolate.filter(
      (entry) =>
        entry.activeOnCurrent.length === 0 &&
        entry.intermediateOnCurrent.length === 0 &&
        entry.untestedOnCurrent.length > 0,
    );

    for (const entry of intermediateOnly) {
      const names = entry.intermediateOnCurrent.map((id) => getAgent(id).name).join(", ");
      warnings.push(
        `${entry.organism.shortName} tested intermediate to ${names}. Intermediate is a dosing category, not resistance: it is achievable at maximal dosing or by extended infusion where the agent allows, or at a site that concentrates the drug. Optimise the dose or change agent, but do not read it as failure.`,
      );
    }
    for (const entry of untestedOnly) {
      const names = entry.untestedOnCurrent.map((id) => getAgent(id).name).join(", ");
      warnings.push(
        `${entry.organism.shortName} has no reported result for ${names}. Ask the laboratory to test them before assuming either activity or resistance.`,
      );
      confidence = "low";
    }
    const targetAgents = [
      ...new Map(
        targetsByIsolate
          .map((entry) => entry.agent)
          .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent))
          .map((agent) => [agent.id, agent]),
      ).values(),
    ];

    if (uncovered.length > 0) {
      action = "escalate";
      confidence = "high";
      const gapNames = uncovered.map((entry) => entry.organism.shortName).join(" and ");
      headline = `${gapNames} ${uncovered.length > 1 ? "are" : "is"} not covered by the current regimen. Change therapy now.`;
      rationale.push(
        `${gapNames} tested resistant, or was not reported susceptible, to every agent the patient is currently receiving.`,
      );
      for (const entry of uncovered) {
        if (entry.organism.notes) rationale.push(entry.organism.notes);
      }
      warnings.push("This is an active coverage gap, not a de-escalation decision. Treat it as urgent.");

      if (targetAgents.length && uncovered.every((entry) => entry.agent)) {
        const guard = protectedAgents(syndromeId, currentAgentIds, significant);
        const keptIds = [...guard.agentIds];
        for (const entry of targetsByIsolate) {
          if (!entry.agent) continue;
          if (keptIds.some((agentId) => entry.isolate.susceptibilities[agentId] === "S")) continue;
          if (!keptIds.includes(entry.agent.id)) keptIds.push(entry.agent.id);
        }
        regimen = keptIds.map((id) => dose(id));
        for (const agentId of currentAgentIds) {
          if (keptIds.includes(agentId)) continue;
          discontinue.push({
            agentId,
            name: getAgent(agentId).name,
            reason: `Not active against ${organismNames}`,
          });
        }
      } else {
        warnings.push(
          "No agent in the formulary was reported susceptible for at least one isolate. Escalate to infectious diseases and request extended susceptibility testing.",
        );
        regimen = currentAgentIds.map((id) => dose(id));
      }
    } else {
      const allActive = [...new Set(targetsByIsolate.flatMap((entry) => entry.activeOnCurrent))];
      // Agents we are not willing to call resistant: susceptible, intermediate
      // (a dosing problem) and untested (a laboratory question). Any of these
      // may legitimately stay on the regimen.
      const retainable = [
        ...new Set([
          ...allActive,
          ...targetsByIsolate.flatMap((entry) => entry.intermediateOnCurrent),
          ...targetsByIsolate.flatMap((entry) => entry.untestedOnCurrent),
        ]),
      ];
      const currentNarrowest =
        retainable
          .map((id) => getAgent(id))
          .sort((a, b) => a.collateralDamageScore - b.collateralDamageScore)[0] ??
        getAgent(currentAgentIds[0]);

      // Build the smallest set that covers every isolate and every mandated
      // flag. Start from the agents the syndrome forces us to retain, then add a
      // targeted agent only for isolates those do not already cover: keeping
      // both piperacillin-tazobactam for anaerobic cover and cefepime for a
      // Pseudomonas that piperacillin-tazobactam already covers is two
      // antipseudomonals for one organism.
      const guard = protectedAgents(syndromeId, currentAgentIds, significant);
      const finalIds: string[] = [...guard.agentIds];
      for (const entry of targetsByIsolate) {
        if (!entry.agent) continue;
        const alreadyCovered = finalIds.some((agentId) => entry.isolate.susceptibilities[agentId] === "S");
        if (alreadyCovered) continue;
        if (!finalIds.includes(entry.agent.id)) finalIds.push(entry.agent.id);
      }

      const currentCost = currentAgentIds.reduce((sum, agentId) => sum + getAgent(agentId).collateralDamageScore, 0);
      const targetCost = finalIds.reduce((sum, agentId) => sum + getAgent(agentId).collateralDamageScore, 0);
      const narrower = finalIds.length > 0 && targetCost < currentCost;
      const dropsAgents = finalIds.length > 0 && finalIds.length < currentAgentIds.length;
      const canNarrow = narrower || dropsAgents;

      if (canNarrow) {
        // Calling a spectrum increase a de-escalation would put the wrong label
        // on the change and would inflate the programme's de-escalation rate
        // with changes that widened therapy.
        action = narrower ? "de_escalate" : "change_for_reliability";
        confidence = "high";
        const regimenName =
          finalIds.length === 1
            ? getAgent(finalIds[0]).name
            : finalIds.map((id) => getAgent(id).name).join(" plus ");
        headline = narrower
          ? `${organismNames} isolated. De-escalate to ${regimenName}.`
          : `${organismNames} isolated. Change to ${regimenName} - fewer agents, but a wider spectrum than the current regimen.`;

        for (const entry of targetsByIsolate) {
          if (!entry.agent) continue;
          rationale.push(
            `${entry.organism.shortName} from ${entry.isolate.specimen} tested susceptible to ${entry.agent.name}.`,
          );
        }
        rationale.push(
          narrower
            ? `Narrowing from ${currentAgentIds.length} agent${currentAgentIds.length > 1 ? "s" : ""} to ${finalIds.length} takes the regimen's spectrum cost from ${currentCost} to ${targetCost}.`
            : `This drops from ${currentAgentIds.length} agents to ${finalIds.length}, but the spectrum cost rises from ${currentCost} to ${targetCost}. It is a change made for reliable cover of the isolate, not a de-escalation, and it should be recorded as such.`,
        );
        for (const kept of guard.agentIds) {
          rationale.push(
            `${getAgent(kept).name} is retained: ${getSyndrome(syndromeId).name.toLowerCase()} requires cover that a routine culture cannot exclude, so a negative panel is not evidence it can stop.`,
          );
        }
        for (const org of organisms) {
          if (org.notes) rationale.push(org.notes);
        }

        regimen = finalIds.map((id) => dose(id));
        for (const agentId of currentAgentIds) {
          if (finalIds.includes(agentId)) continue;
          discontinue.push({
            agentId,
            name: getAgent(agentId).name,
            reason: `Broader than needed now that ${organismNames} susceptibility is known`,
          });
        }
      } else {
        action = "continue";
        confidence = allActive.length ? "moderate" : "low";
        headline = allActive.length
          ? `${organismNames} isolated and the current regimen is already the narrowest active option.`
          : `${organismNames} isolated. No current agent was reported susceptible outright, but none was reported resistant either.`;
        rationale.push(
          allActive.length
            ? `${currentNarrowest.name} is active against the isolate and no narrower agent tested susceptible.`
            : `${currentNarrowest.name} was not reported susceptible, but neither was it reported resistant. Optimise the dose or obtain the missing susceptibility result rather than changing agent blind.`,
        );
        const keep = new Set([...retainable, ...guard.agentIds]);
        regimen = [...keep].map((id) => dose(id));
        for (const agentId of currentAgentIds) {
          if (keep.has(agentId)) continue;
          discontinue.push({
            agentId,
            name: getAgent(agentId).name,
            reason: `Not active against ${organismNames} and no longer needed`,
          });
        }
      }
    }

    // Organism-specific safety rails that override the generic logic.
    if (isolate.organismId === "mssa" && /blood/i.test(isolate.specimen)) {
      warnings.push(
        "MSSA bacteraemia: cefazolin or nafcillin outperform vancomycin. If the patient is still on vancomycin, switch today.",
      );
    }
    if (isolate.organismId === "enterobacter" && currentAgentIds.includes("ceftriaxone")) {
      warnings.push(
        "AmpC organism: ceftriaxone can fail on therapy through inducible resistance even when the lab reports susceptible. Cefepime is the safer definitive choice.",
      );
    }
    if (isolate.organismId === "coag_neg_staph" && !intake.hardware.length && cultures.isolates.length === 1) {
      warnings.push(
        "A single positive set of coagulase-negative staphylococci with no intravascular device is usually a contaminant. Confirm before committing to therapy.",
      );
    }
    if (isolate.organismId === "candida") {
      warnings.push("Candidaemia requires line removal, daily blood cultures until clearance, and dilated ophthalmological examination.");
    }
  }

  if (contaminants.length) {
    rationale.push(
      `${contaminants.length} isolate${contaminants.length > 1 ? "s were" : " was"} flagged as a probable contaminant and did not drive this recommendation.`,
    );
  }

  const PNEUMONIA_SYNDROMES = new Set(["cap", "hap_vap", "aspiration_pneumonia"]);
  const mrsaIsolated = significant.some((iso) => iso.organismId === "mrsa");

  for (const rapid of cultures.rapidDiagnostics) {
    // The negative predictive value of a nares swab is established for
    // pneumonia and does not transfer to bacteraemia, bone, device or skin
    // infection. And it can never override a positive culture: withdrawing the
    // only active agent from a confirmed MRSA bloodstream infection because a
    // nose swab was negative is the worst failure this engine could produce.
    if (
      /mrsa/i.test(rapid.name) &&
      /negative/i.test(rapid.result) &&
      PNEUMONIA_SYNDROMES.has(syndromeId) &&
      !mrsaIsolated
    ) {
      rationale.push(
        "MRSA nares PCR is negative. In pneumonia this has a high negative predictive value and supports stopping anti-MRSA therapy today.",
      );
      const antiMrsa = currentAgentIds.filter((id) => ["vancomycin", "linezolid", "daptomycin", "ceftaroline"].includes(id));
      for (const agentId of antiMrsa) {
        if (discontinue.some((d) => d.agentId === agentId)) continue;
        if (regimen.some((a) => a.agentId === agentId)) continue;
        discontinue.push({ agentId, name: getAgent(agentId).name, reason: "MRSA nares PCR negative" });
      }
    } else if (/mrsa/i.test(rapid.name) && /negative/i.test(rapid.result) && mrsaIsolated) {
      rationale.push(
        "MRSA nares PCR is negative but MRSA has been isolated from a clinical specimen. The culture governs; the swab does not.",
      );
    }
    if (/procalcitonin/i.test(rapid.name)) {
      rationale.push(`Procalcitonin ${rapid.result} - use the trend to support stopping, never in isolation.`);
    }
  }

  /* ---------------- IV to oral switch ---------------- */
  let oralAgent: DosedAgent | undefined;
  if (oralPermitted) {
    const oralTarget = isolate
      ? narrowestActiveAgent(isolate, intake, { requireOral: true, requireCns: cnsDosing, syndromeId })
      : ANTIMICROBIALS.filter(
          (a) =>
            currentAgentIds.includes(a.id) && a.highOralBioavailability && a.routes.includes("PO"),
        )[0];
    if (oralTarget) {
      oralAgent = dose(oralTarget.id, true);
    } else {
      ivBlockers.push("No highly bioavailable oral agent is active against this isolate");
    }
  }

  if (action === "continue" && oralAgent && regimen.length === 1 && regimen[0].route === "IV") {
    action = "switch_iv_to_po";
    headline = `Switch to oral ${oralAgent.name} - the patient meets every intravenous-to-oral criterion.`;
    rationale.push(
      "Afebrile, haemodynamically stable, tolerating oral intake and source controlled. Intravenous access carries line infection risk with no added benefit here.",
    );
    regimen = [oralAgent];
  }

  /* ---------------- Duration and monitoring ---------------- */
  const totalDuration = durationFor(syndromeId, isolate, response);
  const stopDate =
    action === "stop" ? new Date().toISOString() : addDays(therapyStartedAt, totalDuration.min);

  const monitoring = new Set<string>();
  if (action !== "stop") {
    for (const agent of regimen) for (const item of agent.monitoring) monitoring.add(item);
    for (const item of syndrome.monitoring) monitoring.add(item);
    if (isolate && /blood/i.test(isolate.specimen)) {
      monitoring.add("Repeat blood cultures every 48 hours until documented clearance");
    }
    monitoring.add("Reassess daily: can this stop, narrow, or move to oral today?");
  } else {
    monitoring.add("Watch for recurrent fever over the next 48 hours");
    monitoring.add("No further antimicrobial monitoring required once therapy is stopped");
  }

  if (!response.sourceControlDone && syndrome.sourceControl.length) {
    warnings.push(
      `Source control is still outstanding: ${syndrome.sourceControl[0]} Antibiotics will not compensate for an undrained focus.`,
    );
  }

  const disclaimers = [
    "Clinical decision support for licensed clinicians. The prescriber remains responsible for every order.",
    `Generated from knowledge base ${KNOWLEDGE_BASE_VERSION} using the reported susceptibility panel for this patient.`,
    "Susceptibility interpretation follows the reporting laboratory. Agents not reported are treated as untested, never as active.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    action,
    actionLabel: ACTION_LABELS[action],
    headline,
    confidence,
    regimen,
    discontinue,
    totalDuration,
    stopDate,
    monitoring: [...monitoring],
    rationale: rationale.filter(Boolean),
    warnings,
    ivToPo: { eligible: ivBlockers.length === 0, agent: oralAgent, blockers: ivBlockers },
    disclaimers,
  };
}
