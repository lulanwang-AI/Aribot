import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Callout,
  DecisionSupportNotice,
  EmptyState,
  LikelihoodBar,
  Pill,
  ReviewClock,
  SectionHeading,
  SeverityBadge,
  Stat,
  StatusBadge,
  TierBadge,
} from "@/components/amr/primitives";
import { amrApi, SETTING_LABELS, formatPercent } from "@/lib/amr";
import type { SpectrumTier, StewardshipCaseView } from "@/lib/amr";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";

/**
 * The stewardship team's morning screen.
 *
 * It answers three questions in the order a ward round asks them: what is
 * overdue, what is unsafe, and how is the programme performing. Everything
 * above the fold is something a person has to act on today; the programme
 * metrics sit below because nobody changes a de-escalation rate before lunch.
 */

const NOTICE_LINES = [
  "Clinical decision support for licensed clinicians. It informs a prescribing decision; it does not make one. The prescriber remains responsible for the order, the dose and the 48-72 hour decision.",
  "Recommendations are reproducible for a given intake, antibiogram and knowledge base version, so a stewardship committee can reproduce and defend any recommendation reached from this screen.",
  "The antibiograms shipped with the app are illustrative default profiles, not surveillance data. Local resistance can differ enough to change which regimen ranks first, so treat coverage percentages as indicative until your facility loads its own isolate data.",
];

const SPECTRUM_TIERS: readonly string[] = ["narrow", "moderate", "broad", "extended", "reserve"];

/** metrics.agentUsage types tier as a plain string; narrow it before it reaches TierBadge. */
function isSpectrumTier(value: string): value is SpectrumTier {
  return SPECTRUM_TIERS.includes(value);
}

function ProportionRow({
  label,
  count,
  max,
  badge,
  testId,
}: {
  label: string;
  count: number;
  max: number;
  badge?: React.ReactNode;
  testId: string;
}) {
  return (
    <li data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">{label}</span>
          {badge}
        </span>
        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">{count}</span>
      </div>
      <LikelihoodBar share={count / max} className="mt-1" />
    </li>
  );
}

function ReviewRow({ patientCase }: { patientCase: StewardshipCaseView }) {
  return (
    <Link
      href={`/cases/${patientCase.id}`}
      data-testid={`link-review-${patientCase.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-foreground">{patientCase.patientLabel}</span>
          <SeverityBadge severity={patientCase.severity} />
          <StatusBadge status={patientCase.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {patientCase.syndromeName} · {patientCase.ward} · {SETTING_LABELS[patientCase.setting]} · day{" "}
          {patientCase.daysOfTherapy} of therapy · {patientCase.assignedTo}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ReviewClock hours={patientCase.hoursToReview} />
        <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-[220px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const metricsQuery = useQuery({
    queryKey: ["amr", "metrics"],
    queryFn: () => amrApi.metrics(),
    refetchInterval: 60_000,
  });
  const casesQuery = useQuery({
    queryKey: ["amr", "cases"],
    queryFn: () => amrApi.cases(),
    refetchInterval: 60_000,
  });
  // The knowledge base version the engine is currently running, read from the
  // reference payload rather than inferred from whatever a case was stamped with.
  const referenceQuery = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const metrics = metricsQuery.data;
  const cases = casesQuery.data;
  const error = metricsQuery.error ?? casesQuery.error;
  const knowledgeBaseVersion = referenceQuery.data?.knowledgeBaseVersion;

  const reviewsDue = (cases ?? [])
    .filter((item) => item.reviewDue)
    .sort((a, b) => a.hoursToReview - b.hoursToReview);
  // Past the far end of the 48 to 72 hour window, which is when a missed
  // review stops being a slip and starts being a patient on unnecessary broad
  // therapy. hoursToReview counts down to the 48 hour mark, so 72 hours is -24.
  const overdueCount = reviewsDue.filter((item) => item.hoursToReview <= -24).length;

  const alerts = [...(metrics?.coverageGapAlerts ?? [])].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1,
  );

  const maxAgentCases = Math.max(1, ...(metrics?.agentUsage ?? []).map((agent) => agent.cases));
  const maxSyndromeCases = Math.max(1, ...(metrics?.syndromeMix ?? []).map((syndrome) => syndrome.cases));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="text-dashboard-title">
          Stewardship dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {knowledgeBaseVersion ? `Knowledge base ${knowledgeBaseVersion}. ` : ""}Recommendations are advisory decision
          support; the prescriber signs the order.
        </p>
      </header>

      {error && (
        <div className="mb-6">
          <Callout tone="danger" title="The dashboard could not load">
            <p>{error instanceof Error ? error.message : "The stewardship API did not respond."}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              data-testid="button-retry-dashboard"
              onClick={() => {
                void metricsQuery.refetch();
                void casesQuery.refetch();
                void referenceQuery.refetch();
              }}
            >
              <RefreshCw aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </Callout>
        </div>
      )}

      {!metrics || !cases ? (
        !error && <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* 1. The programme at a glance. Counts first, rates second. */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Active cases"
              value={metrics.activeCases}
              hint={`${metrics.daysOfTherapy} days of therapy recorded`}
            />
            <Stat
              label="Reviews due"
              value={metrics.reviewsDue}
              tone={metrics.reviewsOverdue > 0 ? "bad" : metrics.reviewsDue > 0 ? "warn" : "default"}
              hint={
                metrics.reviewsOverdue > 0
                  ? `${metrics.reviewsOverdue} past 72 hours and still unreviewed`
                  : "48-72 hour checkpoints falling due"
              }
            />
            <Stat
              label="De-escalation rate"
              value={formatPercent(metrics.deEscalationRate)}
              hint="of completed 48-72 hour reviews"
            />
            <Stat
              label="Broad-spectrum share"
              value={formatPercent(metrics.broadSpectrumShare)}
              hint={`${metrics.broadSpectrumDays} of ${metrics.daysOfTherapy} days of therapy`}
            />
            <Stat
              label="IV-to-oral eligible"
              value={metrics.ivToPoEligible}
              tone={metrics.ivToPoEligible > 0 ? "warn" : "default"}
              hint="tolerating oral, on an agent with a PO form"
            />
            <Stat
              label="Restricted agents"
              value={metrics.restrictedAgentCases}
              hint="cases needing a documented indication"
            />
          </section>

          {/* 2. Coverage gaps. The only thing on this page that can be unsafe right now. */}
          <section className="space-y-2.5">
            <SectionHeading
              title="Coverage gap alerts"
              description="Raised when the regimen a patient is actually on does not cover an organism their differential or their cultures put in play."
            />
            {alerts.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck aria-hidden="true" className="h-6 w-6" />}
                title="Nothing needs attention right now"
                description="No active case has an organism its current regimen fails to cover. Alerts appear here the moment cultures or a risk factor open a gap."
              />
            ) : (
              alerts.map((alert) => (
                <Link
                  key={alert.caseId}
                  href={`/cases/${alert.caseId}`}
                  data-testid={`link-alert-${alert.caseId}`}
                  className="block transition-opacity hover:opacity-90"
                >
                  <Callout tone={alert.severity === "high" ? "danger" : "warning"} title={alert.patientLabel}>
                    <p>{alert.message}</p>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      {/* The tone colour repeats this word on purpose: severity never rides on colour alone. */}
                      <Pill
                        className={
                          alert.severity === "high"
                            ? "border-resistant/40 bg-card text-resistant"
                            : "border-intermediate/40 bg-card text-intermediate"
                        }
                      >
                        {alert.severity === "high" ? "High priority" : "Medium priority"}
                      </Pill>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        Open case
                        <ChevronRight aria-hidden="true" className="h-3 w-3" />
                      </span>
                    </span>
                  </Callout>
                </Link>
              ))
            )}
          </section>

          {/* 3. The worklist. This is why the team opens the app. */}
          <section>
            <div
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                overdueCount > 0
                  ? "border-resistant/35 ring-1 ring-resistant/15"
                  : reviewsDue.length > 0
                    ? "border-primary/40 ring-1 ring-primary/10"
                    : "border-card-border",
              )}
            >
              <div className="border-b border-border/60 px-4 py-3">
                <SectionHeading
                  title={`Reviews due now${reviewsDue.length > 0 ? ` (${reviewsDue.length})` : ""}`}
                  description="Every empiric course gets a decision at 48-72 hours: stop, narrow, switch to oral, or continue with a recorded reason."
                  action={
                    <div className="flex items-center gap-2">
                      {overdueCount > 0 && (
                        <Pill className="border-resistant/35 bg-resistant-soft text-resistant">
                          {overdueCount} past 72 h
                        </Pill>
                      )}
                      <Link
                        href="/cases?filter=review"
                        data-testid="link-reviews-all"
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        All reviews
                        <ChevronRight aria-hidden="true" className="h-3 w-3" />
                      </Link>
                    </div>
                  }
                />
              </div>

              {reviewsDue.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={<CheckCircle2 aria-hidden="true" className="h-6 w-6" />}
                    title="No review is due"
                    description="Every active course is inside its 48 hour window. The next one appears here as soon as its clock runs down."
                    action={
                      <Button asChild variant="outline" size="sm" data-testid="button-open-cases">
                        <Link href="/cases">Open the case list</Link>
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {reviewsDue.map((patientCase) => (
                    <li key={patientCase.id}>
                      <ReviewRow patientCase={patientCase} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 4. Programme shape. Read weekly, not hourly. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-card-border bg-card p-4">
              <SectionHeading
                title="Agents in use"
                description="Cases carrying each agent. Reserve and restricted entries are the ones that need a documented indication."
              />
              {metrics.agentUsage.length === 0 ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  No therapy has been started yet, so no agent is in use.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {metrics.agentUsage.map((agent) => (
                    <ProportionRow
                      key={agent.agentId}
                      testId={`agent-usage-${agent.agentId}`}
                      label={agent.name}
                      count={agent.cases}
                      max={maxAgentCases}
                      badge={isSpectrumTier(agent.tier) ? <TierBadge tier={agent.tier} /> : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-card-border bg-card p-4">
              <SectionHeading
                title="Syndrome mix"
                description="What the team is actually treating. A mix drifting toward undifferentiated sepsis is worth a look at intake quality."
              />
              {metrics.syndromeMix.length === 0 ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  No case has reached a syndrome assignment yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {metrics.syndromeMix.map((syndrome) => (
                    <ProportionRow
                      key={syndrome.syndromeId}
                      testId={`syndrome-mix-${syndrome.syndromeId}`}
                      label={syndrome.name}
                      count={syndrome.cases}
                      max={maxSyndromeCases}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>

          <DecisionSupportNotice lines={NOTICE_LINES} />
        </div>
      )}
    </div>
  );
}
