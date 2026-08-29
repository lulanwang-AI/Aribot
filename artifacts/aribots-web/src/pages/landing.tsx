import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { BRAND_NAME, BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { ActionBadge, DecisionSupportNotice, Pill } from "@/components/amr/primitives";
import type { StewardshipAction } from "@/lib/amr";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Droplets,
  FlaskConical,
  Grid3x3,
  History,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Syringe,
} from "lucide-react";

/**
 * Public landing page, shown at "/" before sign-in.
 *
 * The audience is the people who have to sign off on the programme: pharmacy
 * directors, ID physicians and stewardship committee chairs. All of them have
 * been sold a black box before, so the page argues the way the product does -
 * by saying exactly what is measured, where the susceptibility figures come
 * from, and what the engine will not claim. No customer names, no invented
 * results, no borrowed credibility.
 *
 * Every claim below is checkable against the shipped types: the fourteen
 * intake questions are Q1 to Q14 on `Intake`, the reported figures are fields
 * on `StewardshipMetrics`, and the regimen guarantees are fields on
 * `RegimenRecommendation`. Nothing is described that the payload cannot show.
 */

const HOW_IT_WORKS: {
  id: "screen" | "start" | "reassess";
  step: string;
  title: string;
  lead: string;
  body: string;
  icon: typeof ClipboardList;
}[] = [
  {
    id: "screen",
    step: "Step 1",
    title: "Screen",
    lead: "Fourteen questions, asked once.",
    body:
      "Symptoms and onset, where the patient lives, travel, sick contacts, the suspected source, comorbidities, current medicines and any antibiotics in the last 90 days, allergies with the actual reaction, care setting, home environment, urinary catheter, tracheostomy, ventilator and implanted hardware. Each answer reweights the organism differential rather than adding to a score.",
    icon: ClipboardList,
  },
  {
    id: "start",
    step: "Step 2",
    title: "Start",
    lead: "Ranked empiric regimens, with the dose already worked out.",
    body:
      "Each option arrives with its agents, the route, the dose adjusted for creatinine clearance, the planned duration and the monitoring that goes with it. The narrowest regimen that still meets the coverage target is the one marked recommended, and the ranking says in words why it won.",
    icon: Syringe,
  },
  {
    id: "reassess",
    step: "Step 3",
    title: "Reassess",
    lead: "The 48 to 72 hour checkpoint, booked the moment therapy starts.",
    body:
      "Cultures, susceptibilities and how the patient has actually responded go in. One recorded decision comes out, with the stop date attached to it.",
    icon: Clock,
  },
];

const REVIEW_ACTIONS: { action: StewardshipAction; label: string }[] = [
  { action: "stop", label: "Stop" },
  { action: "de_escalate", label: "Narrow" },
  { action: "continue", label: "Continue" },
  { action: "escalate", label: "Escalate" },
  { action: "switch_iv_to_po", label: "Switch to oral" },
];

const METRICS: { label: string; unit: string; description: string }[] = [
  {
    label: "Days of therapy",
    unit: "therapy days, by agent and by case",
    description:
      "Antimicrobial days accumulated per agent per patient. It is the denominator the broad-spectrum figure is read against, and it is reported as a count rather than as a rate against a patient-days figure the app does not hold.",
  },
  {
    label: "De-escalation rate",
    unit: "share of empiric courses",
    description:
      "Empiric courses narrowed or stopped at the 48 to 72 hour review, rather than continued on the original agent by default. The stop rate is carried alongside it.",
  },
  {
    label: "Broad-spectrum share",
    unit: "share of all therapy days",
    description:
      "Days spent on broad, extended and reserve tier agents as a proportion of all therapy days, with the raw day count printed next to the ratio so the denominator is never hidden.",
  },
  {
    label: "IV to oral candidates",
    unit: "courses meeting the oral switch criteria",
    description:
      "Courses that clear the oral bioavailability, absorption and tolerating-oral criteria. Each one opens to the case, where the review record shows whether the switch was actually made.",
  },
  {
    label: "Restricted agent use",
    unit: "cases per restricted agent",
    description:
      "Cases carrying an agent that needs stewardship pre-authorisation, each with the indication documented at the time it was started.",
  },
  {
    label: "Review timeliness",
    unit: "reviews completed, due and overdue",
    description:
      "How many 48 to 72 hour reviews have been completed, how many are still inside their window, and how many are running past it. Each overdue case carries its own clock.",
  },
];

const DEFENSIBLE: { title: string; body: string; icon: typeof FlaskConical }[] = [
  {
    title: "Expected coverage against a named differential",
    body:
      "Every regimen states the weighted percent of the differential it is expected to cover, organism by organism, and marks what it misses. The differential is listed with the reason each organism is on it, so a disagreement can be about the organism rather than about the algorithm.",
    icon: FlaskConical,
  },
  {
    title: "The antibiogram, and where it came from",
    body:
      "Susceptibility figures carry the region, the data source and the month they were last updated. A facility running its own CLSI-interpreted isolate data is labelled as such, and a region still on a shipped default profile is labelled as that.",
    icon: Grid3x3,
  },
  {
    title: "Allergy cross-reactivity assessed, not assumed",
    body:
      "A recorded allergy is read as a reaction and a severity, not a checkbox. Cross-reactivity is scored by allergy class with the published risk where one exists, and the verdict is stated plainly: contraindicated, avoid, or acceptable with caution.",
    icon: ShieldAlert,
  },
  {
    title: "Doses adjusted to creatinine clearance",
    body:
      "Renal dosing is applied from the patient's clearance and the band that produced the dose is printed next to it. Dialysis and hepatic impairment are taken as inputs, and the agent's own pregnancy position and caveats are carried with the dose.",
    icon: Droplets,
  },
  {
    title: "A stated spectrum cost",
    body:
      "Each regimen carries the ecological cost of the agents in it. Broadening is a visible trade rather than a silent one, which is what makes ranking the narrowest adequate regimen first something a committee can defend.",
    icon: Scale,
  },
  {
    title: "Deterministic and versioned",
    body:
      "The same intake against the same antibiogram and the same knowledge base version returns the same ranked regimens, and that version is stamped on the recommendation. Nothing reaching a prescriber is generated prose dressed up as a rule.",
    icon: History,
  },
];

const WARD_REALITIES: { heading: string; body: string }[] = [
  {
    heading: "Empiric therapy starts before the cultures",
    body:
      "The first dose is given against a differential, not against an organism. Getting it right means reasoning from the syndrome, the care setting, this patient's exposures and the resistance pattern where they live, in the few minutes that actually exist.",
  },
  {
    heading: "The 48 to 72 hour window is where stewardship is won or lost",
    body:
      "By then the culture is back and the patient has declared themselves. That is the moment therapy can be stopped, narrowed to the isolate, escalated to cover a gap, or moved to oral. Miss it and a broad empiric course quietly becomes a seven-day one.",
  },
  {
    heading: "Nothing on a ward schedules that conversation",
    body:
      "Handovers move, the team changes, and the review depends on somebody remembering. This tool exists to make that window a booked decision with a due time, a checklist and one recorded outcome, rather than an accident of who happened to be on that morning.",
  },
];

/** The sidebar's shield mark, reused so signed-out and signed-in look like one product. */

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* ---------------------------------------------------------------- */}
      {/* Top bar                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link
            href="/"
            data-testid="link-home"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold leading-tight text-foreground">{BRAND_NAME}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                Antimicrobial decision support
              </span>
            </span>
          </Link>

          <Button asChild size="sm">
            <Link href="/login" data-testid="link-header-signin">
              Sign in
            </Link>
          </Button>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.08] via-background to-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <Pill className="border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="h-3 w-3 shrink-0" />
              Antimicrobial stewardship
            </Pill>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Get the empiric agent right on the first dose. Narrow it on the third day.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ari ranks empiric regimens against the organisms this patient is actually likely to
              have and the resistance pattern where they live, and puts the narrowest adequate one
              first. Then it drives the 48 to 72 hour decision that usually gets skipped: stop,
              narrow, escalate, or switch to oral.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login" data-testid="link-hero-signin">
                  Sign in
                  <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/guidance" data-testid="link-hero-guidance">
                  See how it decides
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-1.5">
              <Pill className="border-border bg-muted text-muted-foreground">Deterministic</Pill>
              <Pill className="border-border bg-muted text-muted-foreground">Versioned knowledge base</Pill>
              <Pill className="border-border bg-muted text-muted-foreground">Auditable case by case</Pill>
              <Pill className="border-border bg-muted text-muted-foreground">Runs on your antibiogram</Pill>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              The same intake against the same antibiogram returns the same ranked regimens every
              time, with the knowledge base version stamped on the recommendation. Susceptibility
              comes from your own facility's CLSI-interpreted data once it is loaded, not from a
              national average.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Three points of contact per course
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            One screening pass before the first dose, one ranked choice at the point of prescribing,
            one decision when the cultures come back. Nothing else asks for the clinician's time.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((card) => (
            <article
              key={card.id}
              className="flex flex-col rounded-xl border border-card-border bg-card p-5"
              data-testid={`card-how-${card.id}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <card.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.step}
                  </p>
                  <h3 className="text-sm font-semibold leading-tight text-foreground">{card.title}</h3>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium leading-snug text-foreground">{card.lead}</p>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>

              {card.id === "reassess" && (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    The five outcomes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {REVIEW_ACTIONS.map((item) => (
                      <ActionBadge key={item.action} action={item.action} label={item.label} />
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What the programme reports                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              What the programme reports
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Stewardship is judged on a small number of figures, and a committee cannot defend one
              it cannot open. These are the measures the app keeps. They are defined here rather than
              illustrated with numbers from somebody else's hospital, because the only ones worth
              reading are your own.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-card-border bg-card p-4"
                data-testid={`metric-${metric.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-1 text-[11px] font-medium text-primary">{metric.unit}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Every figure traces back to the individual cases behind it, so a number that looks wrong
            can be opened, read and corrected at the case rather than argued about in the abstract.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why the recommendation is defensible                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            A recommendation a prescriber can interrogate
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Advice that cannot be taken apart is advice a clinician is right not to trust. Every
            regimen shows its working before anyone is asked to accept it.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DEFENSIBLE.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-card-border bg-card p-5"
              data-testid={`card-defensible-${item.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              <div className="flex gap-3">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-snug text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Built for the way wards actually work                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border/60 bg-gradient-to-b from-primary/[0.05] to-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
          <h2 className="max-w-2xl text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Built for the way wards actually work
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {WARD_REALITIES.map((item) => (
              <div key={item.heading} className="border-l-2 border-primary/40 pl-4">
                <h3 className="text-sm font-semibold leading-snug text-foreground">{item.heading}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/login" data-testid="link-cta-signin">
                Sign in
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/guidance" data-testid="link-cta-guidance">
                See how it decides
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-border bg-sidebar">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">{BRAND_NAME}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Antimicrobial decision support
                </p>
              </div>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href="/login" data-testid="link-footer-signin">
                Sign in
              </Link>
            </Button>
          </div>

          <DecisionSupportNotice
            className="mt-8"
            lines={[
              "Clinical decision support for licensed clinicians. It informs a prescribing decision; it does not make one, and it does not replace clinical judgement, local policy or an infectious diseases opinion. The prescriber remains responsible for what is given.",
              "Recommendations come from a versioned knowledge base and a regional susceptibility profile. They are not a substitute for culture and susceptibility testing on the individual patient.",
              "The antibiograms shipped with the app are illustrative default profiles, not surveillance data. A deploying facility replaces them with its own CLSI-interpreted isolate data before the recommendations are used on real patients.",
              "Not for use by patients, and not a diagnostic device.",
            ]}
          />

          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
            Doses, durations and monitoring follow the guideline cited for each syndrome, and every
            recommendation names the guideline it followed. Verify against your own formulary and
            institutional protocol before prescribing.
          </p>
        </div>
      </footer>
    </div>
  );
}
