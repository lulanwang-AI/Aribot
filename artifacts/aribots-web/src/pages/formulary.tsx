import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { amrApi, TIER_LABELS } from "@/lib/amr";
import type { Antimicrobial, RenalAdjustment, Route, SpectrumTier } from "@shared/amr/types";
import { cn } from "@/lib/utils";
import { Callout, EmptyState, Pill, SectionHeading, TierBadge } from "@/components/amr/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronRight,
  Droplets,
  FlaskConical,
  Info,
  Lock,
  Pill as PillIcon,
  Search,
  Syringe,
  Wind,
} from "lucide-react";

/**
 * The formulary reference.
 *
 * This screen exists so a prescriber can answer "what is this agent, what does
 * it cost the ward ecologically, and what do I have to watch" without leaving
 * the stewardship tool. The list is ordered by collateral damage rather than
 * alphabetically on purpose: the narrow agents a clinician should reach for
 * first are the ones they see first.
 */

const TIER_ORDER: SpectrumTier[] = ["narrow", "moderate", "broad", "extended", "reserve"];

/** Static so Tailwind keeps the classes; the meter fill takes the tier hue. */
const TIER_METER_CLASSES: Record<SpectrumTier, string> = {
  narrow: "bg-tier-narrow",
  moderate: "bg-tier-moderate",
  broad: "bg-tier-broad",
  extended: "bg-tier-extended",
  reserve: "bg-tier-reserve",
};

const ROUTE_ICONS: Record<Route, ReactNode> = {
  IV: <Syringe className="h-2.5 w-2.5 shrink-0" />,
  PO: <PillIcon className="h-2.5 w-2.5 shrink-0" />,
  IM: <Syringe className="h-2.5 w-2.5 shrink-0" />,
  topical: <Droplets className="h-2.5 w-2.5 shrink-0" />,
  inhaled: <Wind className="h-2.5 w-2.5 shrink-0" />,
};

const PREGNANCY_LABELS: Record<Antimicrobial["pregnancyUse"], string> = {
  acceptable: "Acceptable",
  avoid_if_alternative: "Avoid if an alternative exists",
  contraindicated: "Contraindicated",
};

const PREGNANCY_TONES: Record<Antimicrobial["pregnancyUse"], FactTone> = {
  acceptable: "good",
  avoid_if_alternative: "warn",
  contraindicated: "bad",
};

type TierFilter = SpectrumTier | "all";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/**
 * Renal bands arrive as JSON, and JSON has no Infinity, so the open-ended top
 * band comes over the wire with a null maxCrCl. Treat null, undefined and a
 * non-finite number the same way: the band runs from minCrCl upwards.
 */
function renalBandLabel(band: RenalAdjustment): { display: string; title: string } {
  const max: number | null | undefined = band.maxCrCl;
  if (max === null || max === undefined || !Number.isFinite(max)) {
    return { display: `${band.minCrCl}+`, title: `${band.minCrCl} mL/min and above` };
  }
  return { display: `${band.minCrCl} to ${max}`, title: `${band.minCrCl} to ${max} mL/min` };
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/**
 * Collateral damage, 1 to 5, as five blocks.
 *
 * The number is always printed next to it. A meter read in greyscale, or by a
 * clinician who cannot separate the tier hues, still gives the same answer.
 */
function SpectrumMeter({ score, tier }: { score: number; tier: SpectrumTier }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn(
            "h-3 w-2 rounded-[2px]",
            step <= score ? TIER_METER_CLASSES[tier] : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

function RoutePills({ routes }: { routes: Route[] }) {
  return (
    <>
      {routes.map((route) => (
        <Pill key={route} className="border-border bg-muted text-muted-foreground" title={`Route: ${route}`}>
          {ROUTE_ICONS[route]}
          {route}
        </Pill>
      ))}
    </>
  );
}

function RestrictedPill() {
  return (
    <Pill
      className="border-tier-reserve/35 bg-tier-reserve/12 text-tier-reserve"
      title="Stewardship pre-authorisation required at most facilities"
    >
      <Lock className="h-2.5 w-2.5 shrink-0" />
      Restricted
    </Pill>
  );
}

type FactTone = "good" | "warn" | "bad" | "plain" | "muted";

const FACT_TONES: Record<FactTone, string> = {
  good: "text-susceptible",
  warn: "text-intermediate",
  bad: "text-resistant",
  plain: "text-foreground",
  muted: "text-muted-foreground",
};

function FactRow({ label, value, tone }: { label: string; value: string; tone: FactTone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs leading-snug text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 text-xs font-semibold", FACT_TONES[tone])}>{value}</span>
    </div>
  );
}

function DoseBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums text-primary">{value}</p>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
  testId,
}: {
  message: string;
  onRetry: () => void;
  testId: string;
}) {
  return (
    <Callout tone="danger" title="Could not load the formulary">
      <p className="mb-2">{message}</p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry} data-testid={testId}>
        Try again
      </Button>
    </Callout>
  );
}

/* ------------------------------------------------------------------ */
/* Monograph sheet                                                     */
/* ------------------------------------------------------------------ */

function Monograph({ agent }: { agent: Antimicrobial }) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <SectionHeading
          title="Dosing at normal renal function"
          description="Confirm weight, indication and renal function before prescribing."
        />
        <div className="space-y-2">
          <DoseBlock label="Standard adult dose" value={agent.adultDose} />
          {agent.severeDose && (
            <DoseBlock label="Severe infection or CNS dosing" value={agent.severeDose} />
          )}
          {agent.oralDose && <DoseBlock label="Oral step-down" value={agent.oralDose} />}
        </div>
      </section>

      {agent.renalAdjustments.length > 0 && (
        <section className="space-y-2">
          <SectionHeading
            title="Renal adjustment"
            description="Bands are inclusive of the lower bound. The top band runs upwards from its floor."
          />
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 whitespace-nowrap text-[11px] uppercase tracking-wider">
                    CrCl mL/min
                  </TableHead>
                  <TableHead className="h-8 text-[11px] uppercase tracking-wider">Dose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.renalAdjustments.map((band) => {
                  const label = renalBandLabel(band);
                  return (
                    <TableRow key={`${band.minCrCl}-${band.dose}`} data-testid={`renal-band-${band.minCrCl}`}>
                      <TableCell
                        className="whitespace-nowrap align-top font-mono text-xs tabular-nums text-foreground"
                        title={label.title}
                      >
                        {label.display}
                      </TableCell>
                      <TableCell className="align-top text-xs text-foreground">
                        <span className="font-mono tabular-nums">{band.dose}</span>
                        {band.note && (
                          <span className="mt-0.5 block font-sans text-[11px] leading-snug text-muted-foreground">
                            {band.note}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {agent.monitoring.length > 0 && (
        <section className="space-y-2">
          <SectionHeading title="Monitoring" description="Follow these while the patient is on therapy." />
          <ul className="space-y-1.5">
            {agent.monitoring.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                data-testid="monitoring-item"
              >
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {agent.cautions.length > 0 && (
        <section className="space-y-2">
          <SectionHeading title="Cautions" />
          <div className="space-y-2">
            {agent.cautions.map((caution) => (
              <Callout key={caution} tone="warning">
                {caution}
              </Callout>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-1">
        <SectionHeading title="Prescribing facts" />
        <div>
          <FactRow
            label="Use in pregnancy"
            value={PREGNANCY_LABELS[agent.pregnancyUse]}
            tone={PREGNANCY_TONES[agent.pregnancyUse]}
          />
          <FactRow
            label="Reaches the CNS at meningitic dosing"
            value={agent.cnsPenetration ? "Yes" : "No"}
            tone={agent.cnsPenetration ? "plain" : "muted"}
          />
          <FactRow
            label="Oral bioavailability high enough to switch"
            value={agent.highOralBioavailability ? "Yes" : "No"}
            tone={agent.highOralBioavailability ? "plain" : "muted"}
          />
          <FactRow
            label="Stewardship pre-authorisation"
            value={agent.restricted ? "Required" : "Not required"}
            tone={agent.restricted ? "warn" : "muted"}
          />
          <FactRow label="Allergy cross-reactivity group" value={agent.allergyClass} tone="plain" />
        </div>
      </section>
    </div>
  );
}

function MonographSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Formulary() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");
  const [restrictedOnly, setRestrictedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reference = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const agentId = selectedId ?? "";
  const monograph = useQuery({
    queryKey: ["amr", "agent", agentId],
    queryFn: () => amrApi.agent(agentId),
    enabled: agentId !== "",
  });

  const agents = useMemo(() => {
    const all = reference.data?.agents ?? [];
    return [...all].sort(
      (a, b) => a.collateralDamageScore - b.collateralDamageScore || a.name.localeCompare(b.name),
    );
  }, [reference.data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return agents.filter((agent) => {
      if (tier !== "all" && agent.tier !== tier) return false;
      if (restrictedOnly && !agent.restricted) return false;
      if (!needle) return true;
      return (
        agent.name.toLowerCase().includes(needle) || agent.drugClass.toLowerCase().includes(needle)
      );
    });
  }, [agents, query, tier, restrictedOnly]);

  const selectedSummary = agents.find((agent) => agent.id === selectedId);
  /** The list row carries enough to draw the sheet header while the monograph loads. */
  const headline = monograph.data ?? selectedSummary;
  const filtersActive = query.trim() !== "" || tier !== "all" || restrictedOnly;

  const clearFilters = () => {
    setQuery("");
    setTier("all");
    setRestrictedOnly(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Formulary</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every agent the engine can recommend, with its spectrum cost, routes and monitoring
              requirements.
            </p>
          </div>
          {reference.data && (
            <p className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              Knowledge base {reference.data.knowledgeBaseVersion}
            </p>
          )}
        </div>
      </header>

      {reference.isError ? (
        <ErrorBlock
          message={reference.error instanceof Error ? reference.error.message : "Request failed."}
          onRetry={() => void reference.refetch()}
          testId="button-retry-reference"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-card-border bg-card p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by agent or drug class"
                aria-label="Search by agent or drug class"
                className="h-9 pl-8 text-sm"
                data-testid="input-agent-search"
              />
            </div>

            <Select value={tier} onValueChange={(value) => setTier(value as TierFilter)}>
              <SelectTrigger className="h-9 w-[160px] text-sm" aria-label="Spectrum tier" data-testid="select-tier">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-tier-all">
                  All tiers
                </SelectItem>
                {TIER_ORDER.map((value) => (
                  <SelectItem key={value} value={value} data-testid={`select-tier-${value}`}>
                    {TIER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="restricted-only"
                checked={restrictedOnly}
                onCheckedChange={setRestrictedOnly}
                data-testid="switch-restricted-only"
              />
              <Label htmlFor="restricted-only" className="cursor-pointer text-xs font-medium text-foreground">
                Restricted agents only
              </Label>
            </div>
          </div>

          <Callout
            tone="info"
            title="Spectrum cost is an ecological score, not a potency score"
            icon={<Info className="h-4 w-4" />}
          >
            Each agent carries a collateral damage score from 1 to 5: 1 leaves the resident flora
            largely intact, 5 is a last-line agent whose routine use selects for resistance across
            the unit. It says nothing about how hard the drug kills. The engine ranks regimens by
            the sum of these scores and prefers the lowest-scoring regimen that still meets the
            coverage target, so a 5 only surfaces when nothing narrower covers the differential.
          </Callout>

          {reference.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-card-border bg-card p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-24" />
                  <Skeleton className="mt-3 h-4 w-40" />
                  <Skeleton className="mt-3 h-3 w-28" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="h-6 w-6" />}
              title="No agent matches these filters"
              description="Widen the tier filter or clear the search to see the full formulary."
              action={
                filtersActive ? (
                  <Button type="button" variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground" role="status">
                {filtered.length} of {agents.length} agents, narrowest first
              </p>

              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(agent.id)}
                      data-testid={`agent-card-${agent.id}`}
                      className="flex h-full w-full flex-col rounded-xl border border-card-border bg-card p-4 text-left transition-colors hover:border-primary/45 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-snug text-foreground">
                            {agent.name}
                          </h3>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {agent.shortName}
                          </p>
                        </div>
                        <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>

                      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{agent.drugClass}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <TierBadge tier={agent.tier} restricted={agent.restricted} />
                        {agent.restricted && <RestrictedPill />}
                        <RoutePills routes={agent.routes} />
                      </div>

                      <div className="mt-auto flex items-center gap-2 pt-3">
                        <SpectrumMeter score={agent.collateralDamageScore} tier={agent.tier} />
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          spectrum cost {agent.collateralDamageScore}/5
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
          data-testid="sheet-agent-monograph"
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="text-base">{headline?.name ?? "Agent"}</SheetTitle>
            <SheetDescription>{headline?.drugClass ?? "Loading the monograph"}</SheetDescription>
          </SheetHeader>

          {headline && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Pill className="border-border bg-muted font-mono text-muted-foreground">
                {headline.shortName}
              </Pill>
              <TierBadge tier={headline.tier} restricted={headline.restricted} />
              {headline.restricted && <RestrictedPill />}
              <RoutePills routes={headline.routes} />
            </div>
          )}

          <div className="mt-5">
            {monograph.isError ? (
              <Callout tone="danger" title="Could not load this monograph">
                <p className="mb-2">
                  {monograph.error instanceof Error ? monograph.error.message : "Request failed."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void monograph.refetch()}
                  data-testid="button-retry-agent"
                >
                  Try again
                </Button>
              </Callout>
            ) : monograph.data ? (
              <Monograph agent={monograph.data} />
            ) : (
              <MonographSkeleton />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
