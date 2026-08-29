import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActionBadge,
  Callout,
  DecisionSupportNotice,
  Pill,
  SectionHeading,
  SeverityBadge,
  TierBadge,
} from "@/components/amr/primitives";
import { CATEGORY_ORDER, amrApi, formatDuration } from "@/lib/amr";
import type { ReferenceData, Severity, SpectrumTier, StewardshipAction } from "@/lib/amr";
import { BookMarked, Wrench } from "lucide-react";

/**
 * The page a stewardship committee reads before approving the tool.
 *
 * It documents the path from fourteen screening answers to a ranked regimen,
 * in the same order the engine walks it, and then publishes the syndrome
 * library the engine is anchored to. Nothing here is a summary of the engine
 * written separately from it: the tiers, the agents, the coverage targets and
 * the syndromes are all read out of the live knowledge base.
 */

/** The fourteen intake questions and the stage of the pipeline each one feeds. */
const SCREENING: { question: string; stage: string; effect: string }[] = [
  {
    question: "Symptoms and onset",
    stage: "Weights the differential",
    effect:
      "Dates the illness and starts the duration clock. An influenza-like prodrome in the preceding week raises post-viral staphylococcal pneumonia, which is aggressive and often necrotising.",
  },
  {
    question: "Region of residence",
    stage: "Sets the antibiogram",
    effect: "The default source of every susceptibility percentage used in the arithmetic below.",
  },
  {
    question: "Travel history",
    stage: "Sets the antibiogram",
    effect:
      "Replaces residence when the patient fell ill away, and for 90 days after return from a high-resistance region.",
  },
  {
    question: "Sick contacts",
    stage: "Weights the differential",
    effect:
      "An organism confirmed in a household or ward contact is weighted straight into the differential rather than noted as background.",
  },
  {
    question: "Suspected source",
    stage: "Sets the syndrome",
    effect:
      "Fixes the baseline differential, the candidate regimens, the planned duration and the guideline the recommendation is anchored to.",
  },
  {
    question: "Comorbidities",
    stage: "Weights the differential",
    effect:
      "Cirrhosis, diabetes, asplenia, haemodialysis, immunosuppression and neutropenia each map to a named modifier with its own organism multipliers.",
  },
  {
    question: "Medications and supplements",
    stage: "Unlocks broader cover",
    effect:
      "Antibiotics in the last 90 days are the strongest single predictor of a resistant organism on the next culture, and put ESBL cover on the table.",
  },
  {
    question: "Allergies",
    stage: "Rules agents out",
    effect:
      "Graded by the reaction recorded. Anaphylaxis or SJS/TEN contraindicates an agent outright; a childhood rash only penalises it against an equivalent option.",
  },
  {
    question: "Care setting",
    stage: "Weights the differential",
    effect:
      "Outpatient through ICU multiplies the resistant gram negative weights before any patient-level factor is applied.",
  },
  {
    question: "Home environment",
    stage: "Weights the differential",
    effect:
      "Pets, fresh water and soil add organisms. Carpets and heavy dust point at an allergic rather than an infectious cause and are flagged as such.",
  },
  {
    question: "Urinary catheter",
    stage: "Unlocks broader cover",
    effect:
      "Days in situ are the variable that matters: past seven, bacteriuria is universal and Pseudomonas, Proteus and enterococci rise.",
  },
  {
    question: "Tracheostomy",
    stage: "Unlocks broader cover",
    effect:
      "Tracheal colonisation with gram negatives is near universal, which is why a positive aspirate on its own is not an indication to treat.",
  },
  {
    question: "Ventilation",
    stage: "Unlocks broader cover",
    effect: "Weight shifts sharply past five ventilator days rather than on the first day of intubation.",
  },
  {
    question: "Implanted hardware",
    stage: "Unlocks broader cover",
    effect:
      "Hardware at the suspected focus adds biofilm-active therapy. Hardware elsewhere still matters, because any bacteraemia risks seeding it.",
  },
];

const COVERAGE_TARGETS: { severity: Severity; target: number }[] = [
  { severity: "mild", target: 85 },
  { severity: "moderate", target: 90 },
  { severity: "severe", target: 95 },
  { severity: "septic_shock", target: 95 },
];

const CHECKPOINT: { action: StewardshipAction; label: string; when: string }[] = [
  {
    action: "stop",
    label: "Stop",
    when: "Cultures negative, an alternative diagnosis found, or the planned course is complete.",
  },
  {
    action: "de_escalate",
    label: "Narrow",
    when: "An isolate is back and a narrower agent covers it on the reported susceptibilities.",
  },
  {
    action: "continue",
    label: "Continue",
    when: "Culture-negative but clinically infected, and improving on what is running.",
  },
  {
    action: "escalate",
    label: "Escalate",
    when: "The isolate is resistant to current therapy, or the patient is not responding to it.",
  },
  {
    action: "switch_iv_to_po",
    label: "Switch to oral",
    when: "Afebrile, haemodynamically stable, absorbing, and a high-bioavailability oral agent covers the isolate.",
  },
];

const TIER_NOTES: { tier: SpectrumTier; note: string }[] = [
  {
    tier: "narrow",
    note: "Covers the target and very little else, so a completed course leaves the patient's gut and skin flora broadly intact.",
  },
  {
    tier: "moderate",
    note: "Covers the common community pathogens with predictable collateral loss, and is the usual landing point for de-escalation at 48 hours.",
  },
  {
    tier: "broad",
    note: "Reaches resistant gram negatives or MRSA. Warranted by what is actually on the differential, not by the fact that the differential is uncertain.",
  },
  {
    tier: "extended",
    note: "Carbapenems. Every course selects for carbapenem resistance across the unit, not only in the patient in front of you.",
  },
  {
    tier: "reserve",
    note: "Last line, for organisms nothing else covers. There should be an isolate on the chart rather than a suspicion.",
  },
];

function Step({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-xs font-semibold tabular-nums text-primary">
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {children}
        </div>
      </div>
    </li>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

function groupSyndromes(syndromes: ReferenceData["syndromes"]) {
  const byCategory = new Map<string, ReferenceData["syndromes"]>();
  for (const syndrome of syndromes) {
    const bucket = byCategory.get(syndrome.category) ?? [];
    bucket.push(syndrome);
    byCategory.set(syndrome.category, bucket);
  }
  const known = CATEGORY_ORDER.filter((category) => byCategory.has(category));
  const unlisted = [...byCategory.keys()].filter((category) => !CATEGORY_ORDER.includes(category)).sort();
  return [...known, ...unlisted].map((category) => ({
    category,
    syndromes: byCategory.get(category) ?? [],
  }));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function Guidance() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
        <header className="mb-6">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-96" />
        </header>
        <div className="space-y-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">How Ari decides</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The knowledge base could not be loaded, so nothing on this page can be shown as current.
          </p>
        </header>
        <Callout tone="danger" title="Knowledge base unavailable">
          {error?.message ?? "The reference endpoint returned no data."}
        </Callout>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetch()}
          data-testid="button-retry-reference"
        >
          Retry
        </Button>
      </div>
    );
  }

  const groups = groupSyndromes(data.syndromes);
  const facilityRegions = data.regions.filter((region) => region.facilityData).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="text-guidance-title">
          How Ari decides
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Knowledge base <span className="font-mono text-foreground">{data.knowledgeBaseVersion}</span>. The engine
          is deterministic: the same intake against the same antibiogram returns the same ranked regimens, so any
          recommendation can be reconstructed and defended after the fact.
        </p>
      </header>

      <section className="mb-8 space-y-3">
        <SectionHeading
          title="From intake to regimen"
          description="Six stages, in the order the engine walks them. Every stage is shown on the recommendation itself, not only here."
        />

        <ol className="space-y-3">
          <Step index={1} title="Screening">
            <Prose>
              Fourteen questions, asked once at intake. Between them they can fire {data.riskModifiers.length} named
              risk modifiers, and every modifier that fires is listed on the recommendation next to the answer that
              triggered it. A blank answer is read as absent rather than as normal, so a question nobody asked never
              quietly narrows therapy.
            </Prose>
            <Prose>
              Seven of the fourteen change which regimens are offered at all: one picks the syndrome, five can unlock
              broader cover, and the allergy history removes agents. Two select the antibiogram every percentage is
              read from. The remaining five move the weights that the arithmetic in stage 4 is applied to. Unlocking
              broader cover means an option appears for consideration, not that the patient needs it, and the ranking
              still prefers the narrowest adequate regimen.
            </Prose>
            <ol className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
              {SCREENING.map((item, index) => (
                <li
                  key={item.question}
                  className="grid grid-cols-[1.75rem_1fr] gap-x-1 px-3 py-2.5"
                  data-testid={`screening-${slug(item.question)}`}
                >
                  <span className="font-mono text-[11px] leading-5 tabular-nums text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{item.question}</span>
                      <Pill className="border-border bg-muted text-muted-foreground">{item.stage}</Pill>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.effect}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Step>

          <Step index={2} title="Applicable antibiogram">
            <Prose>
              Residence supplies the default antibiogram. A patient who fell ill while travelling carries the flora of
              where they were, so a trip marked as onset while travelling overrides residence outright. Return from a
              high-resistance region within 90 days of onset applies that region's pattern as well, because
              travel-acquired ESBL carriage persists for months after the trip ends.
            </Prose>
            <Prose>
              The region actually used and the sentence explaining why it was chosen are printed on every
              recommendation, so a reviewer never has to infer which numbers were in play.
            </Prose>
            <Callout
              tone={facilityRegions === 0 ? "warning" : "info"}
              title="Facility isolates override the shipped profile"
            >
              {facilityRegions} of {data.regions.length} regions currently carry loaded facility isolates. The rest run
              the illustrative default profile, which is named in the source line of every recommendation and must not
              be read as local surveillance.
            </Callout>
          </Step>

          <Step index={3} title="Organism differential">
            <Prose>
              Each syndrome carries a baseline differential drawn from {data.organisms.length} organisms in the
              knowledge base. Those baseline weights are multiplied first by the care setting, then by every risk
              modifier the screening answers fired.
            </Prose>
            <Prose>
              Modifiers compound with diminishing returns: the first contributes its full multiplier, each further one
              adds only half of its excess, and the combined multiplier is capped at 3.5 times. Ten factors pointing at
              Pseudomonas therefore raise it decisively without driving everything else to zero, which is what the
              epidemiology actually shows. The surviving weights are normalised to shares of the differential.
            </Prose>
          </Step>

          <Step index={4} title="Coverage arithmetic">
            <Prose>
              For each candidate regimen, expected coverage is the sum over the differential of the organism's
              likelihood times the regional percent susceptible of the best agent in that regimen against that
              organism. Best, not average: a second drug the organism is resistant to adds nothing, and intrinsic
              resistance is excluded before the antibiogram is consulted at all.
            </Prose>
            <Prose>
              An organism-agent pair the region has never reported counts as zero rather than as an assumed
              susceptibility, so an unfamiliar organism drags coverage down instead of passing silently. An organism
              counts as covered at 80 percent susceptible or better; anything below that is listed as a gap on the
              regimen card with its share of the differential.
            </Prose>
          </Step>

          <Step index={5} title="Ranking">
            <Prose>
              The narrowest regimen that clears the coverage target wins, where narrowest means the lowest total
              spectrum cost rather than the fewest drugs. Targets run from 85 percent for mild to 95 percent for
              severe and septic shock. Mild is deliberately held to a lower bar: no first-line agent
              reaches 90 percent against the full cystitis differential, and demanding it would push every patient onto
              a fluoroquinolone to chase organisms that rarely need covering.
            </Prose>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COVERAGE_TARGETS.map((entry) => (
                <div
                  key={entry.severity}
                  className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
                  data-testid={`coverage-target-${entry.severity}`}
                >
                  <SeverityBadge severity={entry.severity} />
                  <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-foreground">
                    {entry.target}%
                  </p>
                </div>
              ))}
            </div>
            <Prose>
              Coverage is an estimate, not a measurement, so regimens within 2 points of the best available coverage
              are treated as equivalent and narrowness decides between them. A carbapenem beating
              piperacillin-tazobactam by 1.5 points is not a clinical difference but it is a large ecological one, so a
              carbapenem never wins on a rounding difference. An agent a recorded allergy says to avoid costs its
              regimen the tie-break without removing the option; a contraindicating allergy removes it. When nothing
              reaches the target, raw coverage decides and the shortfall is stated on the card.
            </Prose>
          </Step>

          <Step index={6} title="The 48 to 72 hour checkpoint">
            <Prose>
              Every empiric course is booked for a decision at 48 hours and the window closes at 72. Five outcomes are
              on the table, and continue is one of them rather than the default: it has to be chosen, recorded with a
              reason and given a stop date, which is the difference between a review and a renewal.
            </Prose>
            <ul className="space-y-1.5">
              {CHECKPOINT.map((entry) => (
                <li key={entry.action} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <ActionBadge action={entry.action} label={entry.label} />
                  <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">{entry.when}</span>
                </li>
              ))}
            </ul>
          </Step>
        </ol>
      </section>

      <section className="mb-8 space-y-3">
        <SectionHeading
          title="Spectrum cost"
          description="Every agent carries a collateral damage score from 1 to 5. A regimen's spectrum cost is the sum of its agents' scores, and it is what decides between two regimens that cover the differential equally well."
        />
        <ul className="space-y-2">
          {TIER_NOTES.map((entry) => {
            const agents = data.agents.filter((agent) => agent.tier === entry.tier);
            const scores = agents.map((agent) => agent.collateralDamageScore);
            const low = scores.length ? Math.min(...scores) : 0;
            const high = scores.length ? Math.max(...scores) : 0;
            return (
              <li
                key={entry.tier}
                className="rounded-lg border border-card-border bg-card p-3.5"
                data-testid={`tier-${entry.tier}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TierBadge tier={entry.tier} />
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    score {low === high ? low : `${low} to ${high}`}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{entry.note}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{agents.length} on formulary: </span>
                  <span className="font-mono">{agents.map((agent) => agent.shortName).join(", ")}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8 space-y-3">
        <SectionHeading
          title="Syndrome library"
          description={`${data.syndromes.length} syndromes across ${groups.length} body systems. The one chosen at intake fixes the baseline differential, the candidate regimens, the duration and the guideline anchor.`}
        />
        <Accordion
          type="multiple"
          defaultValue={groups.length ? [groups[0].category] : []}
          className="rounded-xl border border-card-border bg-card px-4"
        >
          {groups.map((group) => (
            <AccordionItem key={group.category} value={group.category} className="border-border/60 last:border-b-0">
              <AccordionTrigger
                className="py-3 text-sm hover:no-underline"
                data-testid={`accordion-category-${slug(group.category)}`}
              >
                <span className="flex flex-1 items-center gap-2 pr-2 text-left">
                  <span className="font-semibold text-foreground">{group.category}</span>
                  <Pill className="border-border bg-muted font-mono tabular-nums text-muted-foreground">
                    {group.syndromes.length}
                  </Pill>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ul className="space-y-2.5">
                  {group.syndromes.map((syndrome) => (
                    <li
                      key={syndrome.id}
                      className="rounded-lg border border-border/60 bg-background/60 p-3.5"
                      data-testid={`syndrome-${syndrome.id}`}
                    >
                      <h3 className="text-sm font-semibold leading-snug text-foreground">{syndrome.name}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{syndrome.description}</p>
                      <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                        <BookMarked className="mt-px h-3 w-3 shrink-0" />
                        <span>{syndrome.guideline}</span>
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <FieldLabel>Coverage the syndrome mandates</FieldLabel>
                          {syndrome.requiredCoverage.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {syndrome.requiredCoverage.map((flag) => (
                                <Pill key={flag} className="border-primary/25 bg-primary/10 text-primary">
                                  {data.coverageFlagLabels[flag]}
                                </Pill>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                              None. The differential alone decides how broad the regimen has to be.
                            </p>
                          )}
                        </div>
                        <div className="min-w-0">
                          <FieldLabel>Total duration</FieldLabel>
                          <p className="mt-1.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                            {formatDuration(syndrome.durationDays)}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            {syndrome.durationDays.note}
                          </p>
                        </div>
                      </div>

                      {syndrome.sourceControl.length > 0 && (
                        <div className="mt-3 border-t border-border/60 pt-2.5">
                          <FieldLabel>Source control antibiotics will not achieve</FieldLabel>
                          <ul className="mt-1.5 space-y-1">
                            {syndrome.sourceControl.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground"
                              >
                                <Wrench className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <DecisionSupportNotice
        lines={[
          "Clinical decision support for licensed clinicians. It informs the prescription; it does not write it, and the prescriber remains responsible for every order.",
          `Recommendations are generated from knowledge base ${data.knowledgeBaseVersion} and the regional antibiogram named on each case. Neither replaces your own facility's isolates.`,
          "The engine reasons only about the answers it was given. An intake that omits a device, a recent course or an allergy still produces a confident recommendation, built on the gap.",
          "Verify doses, interactions and contraindications against your formulary and the patient's full medication list before prescribing.",
        ]}
      />
    </div>
  );
}
