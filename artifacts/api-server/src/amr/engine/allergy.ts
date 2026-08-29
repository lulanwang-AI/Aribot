import type { AllergyConflict, Antimicrobial, DrugAllergy } from "../types";
import { ANTIMICROBIALS } from "../data/agents";

/**
 * Beta-lactam cross-reactivity.
 *
 * Modern data are much less alarming than the historical "10% cross-reactivity"
 * teaching: cross-reactivity between penicillins and cephalosporins is driven
 * by R1 side-chain similarity, not the shared beta-lactam ring, and is well
 * under 2% for cephalosporins with dissimilar side chains. Over-avoidance of
 * beta-lactams is itself a stewardship problem, because it pushes patients onto
 * vancomycin, fluoroquinolones and clindamycin, all of which carry worse
 * outcomes and more collateral damage. The engine therefore distinguishes a
 * true contraindication from a manageable one.
 */
const CROSS_REACTIVITY: Record<string, { classes: string[]; risk: string; note: string }> = {
  penicillin: {
    classes: ["cephalosporin_1g", "cephalosporin_3g", "cephalosporin_4g", "cephalosporin_5g", "carbapenem"],
    risk: "under 2% for cephalosporins with dissimilar side chains, under 1% for carbapenems",
    note: "Aminopenicillin side chains (amoxicillin, ampicillin) overlap with cefazolin least of all - cefazolin has a unique side chain and is generally safe.",
  },
  cephalosporin_1g: {
    classes: ["penicillin", "cephalosporin_3g", "cephalosporin_4g", "cephalosporin_5g"],
    risk: "low, side-chain dependent",
    note: "Cefazolin's side chain is not shared with any other cephalosporin.",
  },
  cephalosporin_3g: {
    classes: ["penicillin", "cephalosporin_1g", "cephalosporin_4g", "cephalosporin_5g", "monobactam"],
    risk: "side-chain dependent; ceftazidime and aztreonam share an identical side chain",
    note: "Aztreonam is safe with a penicillin allergy but NOT with a ceftazidime allergy.",
  },
  cephalosporin_4g: {
    classes: ["penicillin", "cephalosporin_1g", "cephalosporin_3g", "cephalosporin_5g"],
    risk: "side-chain dependent",
    note: "Cefepime shares its side chain with ceftazidime.",
  },
  cephalosporin_5g: {
    classes: ["penicillin", "cephalosporin_1g", "cephalosporin_3g", "cephalosporin_4g"],
    risk: "side-chain dependent",
    note: "",
  },
  carbapenem: {
    classes: ["penicillin", "cephalosporin_1g", "cephalosporin_3g", "cephalosporin_4g"],
    risk: "under 1%",
    note: "Carbapenems are usually tolerated even after a documented penicillin reaction.",
  },
  monobactam: {
    classes: ["cephalosporin_3g"],
    risk: "high with ceftazidime, which shares an identical R1 side chain; negligible with other beta-lactams",
    note: "Aztreonam is otherwise safe in penicillin allergy. The exception runs in both directions, so a documented aztreonam reaction rules out ceftazidime.",
  },
  sulfonamide: {
    classes: [],
    risk: "no meaningful cross-reactivity with non-antibiotic sulfonamides",
    note: "A sulfa diuretic intolerance does not preclude trimethoprim-sulfamethoxazole.",
  },
  fluoroquinolone: { classes: [], risk: "class-wide", note: "Cross-reactivity within the class is high - avoid all fluoroquinolones." },
  macrolide: { classes: [], risk: "class-wide", note: "" },
  glycopeptide: { classes: [], risk: "class-wide", note: "Vancomycin flushing syndrome is an infusion-rate reaction, not an allergy." },
  tetracycline: { classes: [], risk: "class-wide", note: "" },
  lincosamide: { classes: [], risk: "class-wide", note: "" },
  aminoglycoside: { classes: [], risk: "class-wide", note: "" },
  nitroimidazole: { classes: [], risk: "class-wide", note: "" },
  oxazolidinone: { classes: [], risk: "class-wide", note: "" },
  azole: { classes: [], risk: "class-wide", note: "" },
};

/** Reactions that rule an agent out entirely rather than merely warranting caution. */
const ABSOLUTE_SEVERITIES: DrugAllergy["severity"][] = ["anaphylaxis", "sjs_ten", "dress"];

/** Immediate, IgE-mediated reactions. Serious enough to respect a shared side chain. */
const IMMEDIATE_SEVERITIES: DrugAllergy["severity"][] = ["anaphylaxis", "sjs_ten", "dress", "urticaria"];

/** Agent ids grouped by R1 side chain, resolved from the formulary at load. */
const SIDE_CHAIN_BY_CLASS = new Map<string, Set<string>>();
for (const agent of ANTIMICROBIALS) {
  if (!agent.sideChainGroup) continue;
  const existing = SIDE_CHAIN_BY_CLASS.get(agent.allergyClass) ?? new Set<string>();
  existing.add(agent.sideChainGroup);
  SIDE_CHAIN_BY_CLASS.set(agent.allergyClass, existing);
}

/** Brand names that identify one specific agent, and therefore one side chain. */
const BRAND_ALIASES: Record<string, string> = {
  fortaz: "ceftazidime",
  tazicef: "ceftazidime",
  rocephin: "ceftriaxone",
  maxipime: "cefepime",
  azactam: "aztreonam",
  ancef: "cefazolin",
  kefzol: "cefazolin",
  keflex: "cephalexin",
  augmentin: "amox_clav",
  unasyn: "amp_sulbactam",
  zosyn: "pip_tazo",
  tazocin: "pip_tazo",
  merrem: "meropenem",
  primaxin: "imipenem",
  teflaro: "ceftaroline",
};

/**
 * The R1 side chain a free-text allergy entry names, when it names one at all.
 *
 * An entry has to identify a specific agent for this to mean anything. "Fortaz"
 * and "ceftazidime" do; "cephalosporins" does not, and treating a generic class
 * entry as though it named a side chain would delete aztreonam, which is the
 * escape route for exactly the patients who need it most.
 */
function sideChainFromText(entry: string): string | undefined {
  const text = entry.toLowerCase();

  for (const [brand, agentId] of Object.entries(BRAND_ALIASES)) {
    if (!text.includes(brand)) continue;
    const agent = ANTIMICROBIALS.find((a) => a.id === agentId);
    if (agent?.sideChainGroup) return agent.sideChainGroup;
  }

  for (const agent of ANTIMICROBIALS) {
    if (!agent.sideChainGroup) continue;
    const generic = agent.name.toLowerCase().split(" ")[0];
    if (generic.length >= 6 && text.includes(generic)) return agent.sideChainGroup;
  }
  return undefined;
}

/**
 * Whether a documented allergy to `allergyClass` implicates this agent through
 * a shared side chain. A generic class-level entry ("cephalosporins") cannot
 * identify a side chain, so it must not be treated as if it named one.
 */
function sharesSideChain(allergyEntry: string, allergyClass: string, agent: Antimicrobial): boolean {
  if (!agent.sideChainGroup) return false;

  // Prefer the side chain the entry actually names.
  const named = sideChainFromText(allergyEntry);
  if (named) return named === agent.sideChainGroup;

  // Otherwise only infer one when the whole class has a single side chain.
  const groups = SIDE_CHAIN_BY_CLASS.get(allergyClass);
  if (!groups || groups.size !== 1) return false;
  return groups.has(agent.sideChainGroup);
}

/**
 * Free text such as "penicillin" or "Bactrim" mapped to an allergy class.
 *
 * Order matters: the first pattern that matches wins, so specific stems are
 * listed before the broad class words. Every pattern is anchored on a real drug
 * stem rather than a substring, because a loose /azole/ once matched
 * "co-trimoxazole" and classified a sulfonamide anaphylaxis as an azole
 * allergy, leaving trimethoprim-sulfamethoxazole with a clean panel.
 */
const TEXT_TO_CLASS: { pattern: RegExp; allergyClass: string }[] = [
  {
    pattern:
      /\b(sulfa|sulph\w*|bactrim|septra|co-?trimoxazole|cotrimoxazole|sulfamethoxazole|trimethoprim)\b|\btmp\s*[-\/]?\s*smx\b|\bsmz\s*[-\/]?\s*tmp\b/i,
    allergyClass: "sulfonamide",
  },
  {
    pattern:
      /\b(penicillin|penicillins|amoxicillin|amoxycillin|ampicillin|augmentin|unasyn|piperacillin|zosyn|tazocin|benzylpenicillin|bicillin|pen\s?vk|phenoxymethylpenicillin)\b/i,
    allergyClass: "penicillin",
  },
  {
    pattern: /\b(nafcillin|oxacillin|dicloxacillin|cloxacillin|flucloxacillin|floxacillin)\b/i,
    allergyClass: "penicillin",
  },
  { pattern: /\b(cefazolin|cephalexin|cefalexin|keflex|ancef|cefadroxil|cephradine)\b/i, allergyClass: "cephalosporin_1g" },
  {
    pattern: /\b(ceftriaxone|rocephin|ceftazidime|fortaz|tazicef|cefotaxime|claforan|cefpodoxime|cefdinir|cefixime|ceftibuten)\b/i,
    allergyClass: "cephalosporin_3g",
  },
  { pattern: /\b(cefepime|maxipime)\b/i, allergyClass: "cephalosporin_4g" },
  { pattern: /\b(ceftaroline|teflaro)\b/i, allergyClass: "cephalosporin_5g" },
  { pattern: /\b(cefuroxime|cefoxitin|cefotetan|cefaclor|ceftin)\b/i, allergyClass: "cephalosporin_1g" },
  { pattern: /\bcephalosporins?\b|\bceph\w*sporin\b/i, allergyClass: "cephalosporin_3g" },
  {
    pattern: /\b(meropenem|merrem|imipenem|primaxin|ertapenem|invanz|doripenem|carbapenems?)\b/i,
    allergyClass: "carbapenem",
  },
  { pattern: /\b(aztreonam|azactam|monobactams?)\b/i, allergyClass: "monobactam" },
  {
    pattern: /\w*floxacin\b|\b(cipro|levaquin|avelox|fluoroquinolones?|quinolones?)\b/i,
    allergyClass: "fluoroquinolone",
  },
  {
    pattern: /\b(azithromycin|zithromax|erythromycin|clarithromycin|biaxin|macrolides?)\b/i,
    allergyClass: "macrolide",
  },
  {
    pattern: /\b(vancomycin|vancocin|teicoplanin|telavancin|dalbavancin|oritavancin|glycopeptides?)\b/i,
    allergyClass: "glycopeptide",
  },
  {
    pattern: /\b(doxycycline|tetracycline|minocycline|tigecycline|tetracyclines?)\b/i,
    allergyClass: "tetracycline",
  },
  { pattern: /\b(clindamycin|cleocin|lincomycin|lincosamides?)\b/i, allergyClass: "lincosamide" },
  {
    pattern: /\b(gentamicin|tobramycin|amikacin|streptomycin|plazomicin|aminoglycosides?)\b/i,
    allergyClass: "aminoglycoside",
  },
  { pattern: /\b(metronidazole|flagyl|tinidazole|nitroimidazoles?)\b/i, allergyClass: "nitroimidazole" },
  { pattern: /\b(linezolid|zyvox|tedizolid|oxazolidinones?)\b/i, allergyClass: "oxazolidinone" },
  { pattern: /\b(nitrofurantoin|macrobid|macrodantin|furadantin)\b/i, allergyClass: "nitrofuran" },
  {
    pattern:
      /\b(fluconazole|diflucan|itraconazole|voriconazole|posaconazole|isavuconazole|ketoconazole|clotrimazole|miconazole|azoles?)\b/i,
    allergyClass: "azole",
  },
  { pattern: /\b(daptomycin|cubicin|lipopeptides?)\b/i, allergyClass: "lipopeptide" },
  { pattern: /\b(rifampin|rifampicin|rifabutin|rifapentine|rifamycins?)\b/i, allergyClass: "rifamycin" },
  { pattern: /\b(fosfomycin|monurol)\b/i, allergyClass: "fosfomycin" },
  { pattern: /\b(micafungin|caspofungin|anidulafungin|echinocandins?)\b/i, allergyClass: "echinocandin" },
  { pattern: /\b(fidaxomicin|dificid)\b/i, allergyClass: "macrocyclic" },
  { pattern: /\b(oseltamivir|tamiflu|zanamivir|baloxavir)\b/i, allergyClass: "neuraminidase_inhibitor" },
];

export function classifyAllergy(entry: string): string | null {
  for (const { pattern, allergyClass } of TEXT_TO_CLASS) {
    if (pattern.test(entry)) return allergyClass;
  }
  return null;
}

/**
 * Allergy entries the classifier could not place.
 *
 * These must be surfaced, not swallowed. An unrecognised entry means the
 * allergy panel silently did not consider that drug, and a clinician reading a
 * clean panel will reasonably assume it did.
 */
export function unclassifiedAllergies(allergies: DrugAllergy[]): DrugAllergy[] {
  return allergies.filter((allergy) => classifyAllergy(allergy.agentOrClass) === null);
}

/**
 * Check one agent against the patient's allergy list.
 *
 * Returns null when there is no conflict at all.
 */
export function checkAgent(agent: Antimicrobial, allergies: DrugAllergy[]): AllergyConflict | null {
  let worst: AllergyConflict | null = null;

  for (const allergy of allergies) {
    const allergyClass = classifyAllergy(allergy.agentOrClass);
    if (!allergyClass) continue;

    const absolute = ABSOLUTE_SEVERITIES.includes(allergy.severity);
    const direct = allergyClass === agent.allergyClass;

    let conflict: AllergyConflict | null = null;

    if (direct) {
      conflict = {
        agentId: agent.id,
        agentName: agent.name,
        allergy: allergy.agentOrClass,
        severity: allergy.severity,
        kind: "direct",
        verdict: allergy.severity === "intolerance" ? "acceptable_with_caution" : "contraindicated",
        guidance:
          allergy.severity === "intolerance"
            ? `Documented intolerance (${allergy.reaction}) rather than immune-mediated allergy. Usable if the benefit is clear and the reaction is manageable.`
            : `Same class as the documented ${allergy.severity.replace(/_/g, " ")} reaction (${allergy.reaction}). Do not use.`,
      };
    } else {
      const cross = CROSS_REACTIVITY[allergyClass];
      if (cross?.classes.includes(agent.allergyClass)) {
        // A shared R1 side chain behaves like a direct match. A generic
        // "cephalosporins" entry does not identify one, so it must not delete
        // aztreonam, which is the escape route for severe beta-lactam allergy.
        const identicalSideChain = sharesSideChain(allergy.agentOrClass, allergyClass, agent);

        conflict = {
          agentId: agent.id,
          agentName: agent.name,
          allergy: allergy.agentOrClass,
          severity: allergy.severity,
          kind: "cross_reactive",
          estimatedRisk: cross.risk,
          verdict: identicalSideChain && IMMEDIATE_SEVERITIES.includes(allergy.severity)
            ? "contraindicated"
            : absolute
              ? "avoid"
              : "acceptable_with_caution",
          guidance: absolute
            ? `Documented ${allergy.severity.replace(/_/g, " ")} to ${allergy.agentOrClass}. Cross-reactivity risk is ${cross.risk}. ${
                identicalSideChain
                  ? "Identical R1 side chain - treat as contraindicated."
                  : "Use only with allergy input, graded challenge, or an alternative agent."
              } ${cross.note}`.trim()
            : `Documented ${allergy.severity.replace(/_/g, " ")} to ${allergy.agentOrClass}. Cross-reactivity risk is ${cross.risk}, so this agent is usually tolerated. ${cross.note}`.trim(),
        };
      }
    }

    if (!conflict) continue;
    const rank = { contraindicated: 3, avoid: 2, acceptable_with_caution: 1 } as const;
    if (!worst || rank[conflict.verdict] > rank[worst.verdict]) worst = conflict;
  }

  return worst;
}

/** Suggest the safest alternatives when every first-choice agent is blocked. */
export function safeAlternatives(allergies: DrugAllergy[], limit = 6): Antimicrobial[] {
  return ANTIMICROBIALS.filter((agent) => {
    const conflict = checkAgent(agent, allergies);
    return !conflict || conflict.verdict === "acceptable_with_caution";
  })
    .sort((a, b) => a.collateralDamageScore - b.collateralDamageScore)
    .slice(0, limit);
}
