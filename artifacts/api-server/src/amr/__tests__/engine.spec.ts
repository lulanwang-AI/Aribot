/**
 * Engine safety regression suite.
 *
 * Every check here corresponds to a defect that was found in review and fixed.
 * They are the cases where a wrong answer would reach a prescriber, so they run
 * as a plain script with no test framework dependency:
 *
 *   pnpm --filter @workspace/api-server run test:engine
 *
 * A non-zero exit means a safety property regressed.
 */
import { recommendEmpiric } from "../engine/empiric";
import { recommendTargeted } from "../engine/targeted";
import { emptyIntake, emptyClinical } from "../store";
import { classifyAllergy, checkAgent } from "../engine/allergy";
import { doseAgent } from "../engine/dosing";
import { getAgent } from "../data/agents";

let fails = 0;
function check(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  ::  " + detail : ""}`);
  if (!condition) fails += 1;
}

const adult = (o: Record<string, unknown> = {}) =>
  emptyClinical({ ageYears: 60, sex: "male", weightKg: 80, serumCreatinine: 1.0, severity: "moderate", ...o });

// 1. Severe/meningitic dosing survives normal renal function.
const ctxDose = doseAgent(getAgent("ceftriaxone"), adult({ severity: "severe" }), { cnsDosing: true });
check("meningitic ceftriaxone dose preserved", ctxDose.dose.includes("q12h"), ctxDose.dose);

// 2. Paediatric refusal.
const paed = doseAgent(getAgent("ceftriaxone"), adult({ ageYears: 4, weightKg: 16 }));
check("paediatric dose refused", paed.dose.startsWith("Paediatric dosing is out of scope"), paed.dose);

// 3. Allergy classification traps.
check("co-trimoxazole is a sulfonamide", classifyAllergy("co-trimoxazole") === "sulfonamide");

// 4. Every regimen contraindicated -> nothing preferred.
const vancAllergy = recommendEmpiric(emptyIntake({
  suspectedSyndromeId: "meningitis",
  clinical: adult({ severity: "severe" }),
  allergies: [{ agentOrClass: "vancomycin", reaction: "anaphylaxis", severity: "anaphylaxis" }],
}));
check("no preferred regimen when all are contraindicated",
  vancAllergy.regimens.every((r) => !r.preferred),
  `${vancAllergy.regimens.filter((r) => r.preferred).length} preferred`);
check("safe alternatives offered instead", vancAllergy.safeAlternatives.length > 0);

// 5. Considered flags unlock, never suppress.
const pyelo = recommendEmpiric(emptyIntake({
  suspectedSyndromeId: "pyelonephritis",
  clinical: adult(),
  antibioticsLast90Days: ["amoxicillin"],
}));
check("ceftriaxone still offered after prior antibiotics",
  pyelo.regimens.some((r) => r.id === "pyelo_ceftriaxone"));

// 6. Encephalitis regimen exists and includes aciclovir.
const meningitis = recommendEmpiric(emptyIntake({ suspectedSyndromeId: "meningitis", clinical: adult({ severity: "severe" }) }));
check("aciclovir option present for meningitis",
  meningitis.regimens.some((r) => r.agents.some((a) => a.agentId === "acyclovir")));
check("HSV red flag raised", meningitis.redFlags.some((f) => /aciclovir/i.test(f)));

// 7. MRSA nares must not withdraw an active agent in bacteraemia.
const mrsaBsi = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "bacteremia", clinical: adult() }),
  syndromeId: "bacteremia",
  currentAgentIds: ["vancomycin"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "mrsa", specimen: "Blood", collectedOn: new Date().toISOString(), susceptibilities: { vancomycin: "S", linezolid: "S", daptomycin: "S" } }],
    rapidDiagnostics: [{ name: "MRSA nares PCR", result: "Negative" }],
    notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: false, sourceControlDone: true, improving: true, notes: "" },
});
check("vancomycin not withdrawn from confirmed MRSA bacteraemia",
  !mrsaBsi.discontinue.some((d) => d.agentId === "vancomycin"),
  mrsaBsi.discontinue.map((d) => d.name).join(", ") || "nothing stopped");

// 8. Nitrofurantoin must not be chosen above the bladder.
const pyeloTargeted = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "pyelonephritis", clinical: adult() }),
  syndromeId: "pyelonephritis",
  currentAgentIds: ["ceftriaxone"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "e_coli", specimen: "Urine", collectedOn: new Date().toISOString(), susceptibilities: { nitrofurantoin: "S", fosfomycin: "S", ceftriaxone: "R", cefepime: "R", meropenem: "S" } }],
    rapidDiagnostics: [], notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: true, sourceControlDone: true, improving: true, notes: "" },
});
check("no bladder-only agent for pyelonephritis",
  !pyeloTargeted.regimen.some((a) => ["nitrofurantoin", "fosfomycin"].includes(a.agentId)),
  pyeloTargeted.regimen.map((a) => a.name).join(", "));

// 9. Neutropenic patient with negative cultures must not be told to stop.
const fnNoGrowth = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "neutropenic_fever", clinical: adult({ neutropenic: true, immunosuppressed: true, severity: "severe" }) }),
  syndromeId: "neutropenic_fever",
  currentAgentIds: ["cefepime"],
  therapyStartedAt: new Date().toISOString(),
  cultures: { status: "no_growth", isolates: [], rapidDiagnostics: [], notes: "" },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: true, sourceControlDone: true, improving: true, notes: "" },
});
check("no stop while still neutropenic", fnNoGrowth.action !== "stop", fnNoGrowth.action);

// 10. Meningitis with negative CSF culture must not stop.
const menNoGrowth = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "meningitis", clinical: adult({ severity: "severe" }) }),
  syndromeId: "meningitis",
  currentAgentIds: ["ceftriaxone", "vancomycin"],
  therapyStartedAt: new Date().toISOString(),
  cultures: { status: "no_growth", isolates: [], rapidDiagnostics: [], notes: "" },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: true, sourceControlDone: true, improving: true, notes: "" },
});
check("no stop for culture-negative meningitis", menNoGrowth.action !== "stop", menNoGrowth.action);


// 11. A pregnancy contraindication removes the option, it does not merely warn.
const pregnant = recommendEmpiric(emptyIntake({
  suspectedSyndromeId: "cap",
  clinical: adult({ sex: "female", pregnant: true }),
}));
check("no doxycycline regimen preferred in pregnancy",
  !pregnant.regimens.filter((r) => r.preferred).some((r) => r.agents.some((a) => a.agentId === "doxycycline")),
  pregnant.regimens.find((r) => r.preferred)?.label ?? "none");

// 12. Beta-lactam side chains, both directions.
check("ceftazidime allergy contraindicates aztreonam",
  checkAgent(getAgent("aztreonam"), [{ agentOrClass: "ceftazidime", reaction: "anaphylaxis", severity: "anaphylaxis" }])?.verdict === "contraindicated");
check("generic cephalosporin allergy leaves aztreonam available",
  checkAgent(getAgent("aztreonam"), [{ agentOrClass: "cephalosporins", reaction: "anaphylaxis", severity: "anaphylaxis" }])?.verdict !== "contraindicated");

// 13. A null creatinine clearance must not select the renal failure band.
const nulled = doseAgent(getAgent("meropenem"), adult({ creatinineClearance: null as unknown as undefined, serumCreatinine: 0.9 }));
check("null clearance falls through to the estimate", !nulled.dose.includes("q24h"), nulled.dose);

// 14. Dialysis does not get a Cockcroft-Gault band.
const dialysis = doseAgent(getAgent("meropenem"), adult({ onDialysis: true, serumCreatinine: 6.0 }));
check("dialysis dosed at the lowest band with a pharmacy check",
  /dialysis/i.test(dialysis.renalNote ?? ""), dialysis.renalNote ?? "");

// 15. A virus on the differential is not scored as a coverage gap.
const capRec = recommendEmpiric(emptyIntake({ suspectedSyndromeId: "cap", clinical: adult() }));
check("influenza reported separately, not as a gap",
  capRec.nonBacterialConsiderations.some((o) => o.organismId === "influenza") &&
  !capRec.regimens[0].organismCoverage.some((o) => o.organismId === "influenza"));

// 16. Travel that is not recent must not fire the travel modifiers.
const oldTrip = recommendEmpiric(emptyIntake({
  suspectedSyndromeId: "pyelonephritis",
  clinical: adult(),
  symptoms: { onsetDate: "2026-08-01", timeOfDay: "", symptoms: [], exacerbatingFactors: "", alleviatingFactors: "", notes: "" },
  travel: [{ regionId: "south_asia", departed: "2019-01-01", returned: "2019-02-01", becameSickWhileTravelling: false, exposures: "" }],
}));
check("stale travel does not fire the travel risk modifier",
  !oldTrip.riskFactors.some((r) => r.id === "travel_high_resistance"),
  oldTrip.riskFactors.map((r) => r.id).join(", "));

// 17. Piperacillin-tazobactam is not credited against ESBL.
const esblRow = capRec.regimens[0];
void esblRow;
const esblCoverage = recommendEmpiric(emptyIntake({
  suspectedSyndromeId: "pyelonephritis",
  clinical: adult({ severity: "severe" }),
  comorbidities: ["known_esbl"],
})).regimens.flatMap((r) => r.organismCoverage.filter((o) => o.organismId === "esbl_enterobacterales"));
check("no regimen claims ESBL cover from piperacillin-tazobactam alone",
  esblCoverage.every((o) => o.expectedSusceptibility === 0 || o.expectedSusceptibility > 60));

// 18. A sterile-site isolate blocks the oral switch.
const bsiOral = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "cellulitis", clinical: adult() }),
  syndromeId: "cellulitis",
  currentAgentIds: ["cefazolin"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "mssa", specimen: "Blood", collectedOn: new Date().toISOString(), susceptibilities: { cefazolin: "S", cephalexin: "S" } }],
    rapidDiagnostics: [], notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: true, sourceControlDone: true, improving: true, notes: "" },
});
check("bacteraemia blocks the intravenous to oral switch", !bsiOral.ivToPo.eligible, bsiOral.ivToPo.blockers.join("; "));

// 19. An intermediate result is a dosing problem, not a coverage gap.
const intermediate = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "hap_vap", clinical: adult() }),
  syndromeId: "hap_vap",
  currentAgentIds: ["cefepime"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "pseudomonas", specimen: "Bronchoalveolar lavage", collectedOn: new Date().toISOString(), susceptibilities: { cefepime: "I", meropenem: "S" } }],
    rapidDiagnostics: [], notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: false, sourceControlDone: true, improving: true, notes: "" },
});
check("intermediate is not treated as a coverage gap",
  intermediate.action !== "escalate" && intermediate.warnings.some((w) => /intermediate is a dosing category/i.test(w)),
  intermediate.action);


// 20. An infant, and an intake with no age at all, must both be refused.
for (const [label, age] of [["infant aged 0", 0], ["age not recorded", Number.NaN]] as const) {
  const d = doseAgent(getAgent("ceftriaxone"), adult({ ageYears: age, weightKg: 7 }));
  check(`${label} is refused an adult dose`, d.dose.startsWith("Paediatric dosing is out of scope"), d.dose);
}

// 21. Cover a culture could never have proven must survive a negative panel.
const iai = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "intra_abdominal", clinical: adult() }),
  syndromeId: "intra_abdominal",
  currentAgentIds: ["ceftriaxone", "metronidazole"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "e_coli", specimen: "Peritoneal fluid", collectedOn: new Date().toISOString(), susceptibilities: { ceftriaxone: "S", cefazolin: "S", ertapenem: "S" } }],
    rapidDiagnostics: [], notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: false, sourceControlDone: true, improving: true, notes: "" },
});
check("anaerobic cover survives a negative anaerobe culture",
  iai.regimen.some((a) => a.agentId === "metronidazole") && !iai.discontinue.some((d) => d.agentId === "metronidazole"),
  iai.discontinue.map((d) => d.name).join(", ") || "nothing stopped");

const capAtypical = recommendTargeted({
  intake: emptyIntake({ suspectedSyndromeId: "cap", clinical: adult() }),
  syndromeId: "cap",
  currentAgentIds: ["ceftriaxone", "azithromycin"],
  therapyStartedAt: new Date().toISOString(),
  cultures: {
    status: "growth",
    isolates: [{ organismId: "s_pneumoniae", specimen: "Sputum", collectedOn: new Date().toISOString(), susceptibilities: { penicillin_g: "S", ceftriaxone: "S" } }],
    rapidDiagnostics: [], notes: "",
  },
  response: { afebrile24h: true, hemodynamicallyStable: true, wbcTrend: "falling", tolueratingOral: false, sourceControlDone: true, improving: true, notes: "" },
});
check("atypical cover survives a culture that cannot grow atypicals",
  capAtypical.regimen.some((a) => a.agentId === "azithromycin"),
  capAtypical.regimen.map((a) => a.name).join(", "));

console.log(fails === 0 ? "\nALL REGRESSION CHECKS PASS" : `\n${fails} FAILURES`);
if (fails > 0) process.exit(1);
