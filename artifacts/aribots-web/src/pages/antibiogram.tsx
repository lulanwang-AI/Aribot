import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Callout, EmptyState, Pill, SectionHeading, Stat } from "@/components/amr/primitives";
import { TIER_LABELS, amrApi, formatPercent, susceptibilityClass } from "@/lib/amr";
import type { Organism, SpectrumTier } from "@shared/amr/types";
import { RotateCw, Search, ShieldCheck } from "lucide-react";

/**
 * The regional resistance browser.
 *
 * This screen exists so a prescriber can audit the engine rather than trust it.
 * Every empiric ranking is arithmetic over this grid, so the grid is shown at
 * full resolution, with its provenance stated before any of its numbers.
 *
 * Agents run narrow to broad, left to right, because the stewardship question a
 * clinician is actually asking is "how far right do I have to go before the
 * number is adequate".
 */

/** Spectrum tiers in escalation order. Drives column order and the filter. */
const TIER_ORDER: SpectrumTier[] = ["narrow", "moderate", "broad", "extended", "reserve"];

const GRAM_LABELS: Record<Organism["gram"], string> = {
  positive: "Gram positive",
  negative: "Gram negative",
  atypical: "Atypical",
  anaerobe: "Anaerobe",
  fungal: "Fungal",
};

/** The five headline rates a stewardship committee reports on. */
const HEADLINE_RATES = [
  {
    key: "mrsaRate",
    label: "MRSA",
    hint: "Percent of S. aureus isolates that are methicillin resistant.",
  },
  {
    key: "esblRate",
    label: "ESBL",
    hint: "Percent of E. coli and Klebsiella isolates producing an extended-spectrum beta-lactamase.",
  },
  {
    key: "creRate",
    label: "CRE",
    hint: "Percent of Enterobacterales resistant to carbapenems. Scales the carbapenem numbers in this grid.",
  },
  {
    key: "mdrPseudomonasRate",
    label: "MDR Pseudomonas",
    hint: "Percent of P. aeruginosa that are multidrug resistant. Erodes every antipseudomonal column in parallel.",
  },
  {
    key: "vreRate",
    label: "VRE",
    hint: "Percent of E. faecium isolates resistant to vancomycin. Sets the E. faecium vancomycin cell directly.",
  },
] as const;

/** Tone thresholds shared by the five headline tiles. */
function rateTone(percent: number): "good" | "warn" | "bad" {
  if (percent < 15) return "good";
  if (percent <= 30) return "warn";
  return "bad";
}

/** Soft cell wash behind the number. The number always carries the meaning. */
function cellBackground(percent: number): string {
  if (percent >= 85) return "bg-susceptible-soft";
  if (percent >= 70) return "bg-intermediate-soft";
  if (percent > 0) return "bg-resistant-soft";
  return "bg-untested-soft";
}

function isTier(value: string): value is SpectrumTier {
  return (TIER_ORDER as string[]).includes(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request failed.";
}

export default function Antibiogram() {
  const [regionId, setRegionId] = useState("us_northeast");
  const [organismFilter, setOrganismFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<SpectrumTier | "all">("all");

  const referenceQuery = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const antibiogramQuery = useQuery({
    queryKey: ["amr", "antibiogram", regionId],
    queryFn: () => amrApi.antibiogram(regionId),
  });

  const reference = referenceQuery.data;
  const antibiogram = antibiogramQuery.data;

  /** Region options grouped by area, in the order the knowledge base lists them. */
  const regionGroups = useMemo(() => {
    const regions = reference?.regions ?? [];
    const groups: { area: string; regions: typeof regions }[] = [];
    for (const region of regions) {
      const existing = groups.find((group) => group.area === region.area);
      if (existing) existing.regions.push(region);
      else groups.push({ area: region.area, regions: [region] });
    }
    return groups;
  }, [reference]);

  const referenceRegion = reference?.regions.find((region) => region.id === regionId);
  const region = antibiogram?.region ?? referenceRegion;
  const facilityData = antibiogram?.facilityData ?? referenceRegion?.facilityData ?? false;
  const source = antibiogram?.source ?? referenceRegion?.source ?? "";
  const updated = antibiogram?.updated ?? referenceRegion?.updated ?? "";

  /**
   * Rows are the organisms the antibiogram actually reports on; columns are the
   * agents tested against at least one visible row. Recomputing the columns
   * against the filtered rows keeps the grid free of all-blank columns.
   */
  const matrix = useMemo(() => {
    if (!antibiogram) return null;
    const table = antibiogram.susceptibility;
    const needle = organismFilter.trim().toLowerCase();

    const organisms = antibiogram.organisms.filter((organism) => {
      if (!table[organism.id]) return false;
      if (!needle) return true;
      return (
        organism.name.toLowerCase().includes(needle) ||
        organism.shortName.toLowerCase().includes(needle)
      );
    });

    const tested = new Set<string>();
    for (const organism of organisms) {
      for (const agentId of Object.keys(table[organism.id] ?? {})) tested.add(agentId);
    }

    const agents = antibiogram.agents
      .filter((agent) => tested.has(agent.id) && (tierFilter === "all" || agent.tier === tierFilter))
      .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));

    const tierGroups: { tier: SpectrumTier; count: number }[] = [];
    for (const agent of agents) {
      const last = tierGroups[tierGroups.length - 1];
      if (last && last.tier === agent.tier) last.count += 1;
      else tierGroups.push({ tier: agent.tier, count: 1 });
    }

    let pairs = 0;
    for (const organism of organisms) {
      const row: Record<string, number> = table[organism.id] ?? {};
      for (const agent of agents) {
        const value: number | undefined = row[agent.id];
        if (value !== undefined) pairs += 1;
      }
    }

    return { organisms, agents, tierGroups, pairs, table };
  }, [antibiogram, organismFilter, tierFilter]);

  const filtered = organismFilter.trim().length > 0 || tierFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="text-antibiogram-title">
          Antibiogram
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Empiric ranking is arithmetic over these susceptibility rates: the narrowest regimen that clears the coverage
          target wins. Every profile shipped with the app is an illustrative default and stays one until your facility
          loads its own CLSI isolate counts.
        </p>
      </header>

      {/* Region selector -------------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[16rem] max-w-sm flex-1">
          <label
            htmlFor="antibiogram-region"
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Region applied to empiric therapy
          </label>
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger
              id="antibiogram-region"
              className="mt-1.5"
              disabled={referenceQuery.isLoading || !!referenceQuery.error}
              data-testid="select-antibiogram-region"
            >
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              {regionGroups.map((group) => (
                <SelectGroup key={group.area}>
                  <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.area}
                  </SelectLabel>
                  {group.regions.map((option) => (
                    <SelectItem key={option.id} value={option.id} data-testid={`region-option-${option.id}`}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reference && (
          <p className="pb-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            Knowledge base {reference.knowledgeBaseVersion}
          </p>
        )}
      </div>

      {referenceQuery.error && (
        <div className="mt-4">
          <Callout tone="danger" title="Region list unavailable">
            <p>{errorMessage(referenceQuery.error)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                referenceQuery.refetch();
              }}
              data-testid="button-retry-reference"
            >
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </Callout>
        </div>
      )}

      {/* Provenance ------------------------------------------------------- */}
      <div className="mt-4">
        {antibiogramQuery.isLoading && !region ? (
          <Skeleton className="h-[4.5rem] w-full rounded-lg" />
        ) : region ? (
          facilityData ? (
            <Callout
              tone="success"
              title={`${region.name}: the facility's own isolates are in use`}
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <p data-testid="text-antibiogram-provenance">
                <strong>{source}</strong>. Updated {updated}. Recommendations for this region are ranked against your
                own lab's susceptibility counts rather than a shipped default.
              </p>
            </Callout>
          ) : (
            <Callout tone="warning" title={`${region.name}: illustrative default profile, not surveillance data`}>
              <p data-testid="text-antibiogram-provenance">
                <strong>{source}</strong>. Updated {updated}. These rates still drive every empiric recommendation for
                this region, so read them as a plausible starting point and replace them with your facility's CLSI
                antibiogram before they are used to defend a prescribing decision.
              </p>
            </Callout>
          )
        ) : null}
      </div>

      {/* Headline resistance rates ---------------------------------------- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {region
          ? HEADLINE_RATES.map((rate) => (
              <div key={rate.key} data-testid={`stat-${rate.key}`}>
                <Stat
                  label={rate.label}
                  value={Math.round(region[rate.key])}
                  unit="%"
                  hint={rate.hint}
                  tone={rateTone(region[rate.key])}
                />
              </div>
            ))
          : HEADLINE_RATES.map((rate) => <Skeleton key={rate.key} className="h-[6.5rem] w-full rounded-lg" />)}
      </div>

      {/* Susceptibility matrix -------------------------------------------- */}
      <section className="mt-8 space-y-3">
        <SectionHeading
          title="Susceptibility matrix"
          description="Percent of isolates susceptible, organism by agent. Columns run narrow to reserve, left to right."
          action={
            matrix ? (
              <span
                className="font-mono text-[11px] tabular-nums text-muted-foreground"
                data-testid="text-matrix-counts"
              >
                {matrix.organisms.length} organisms · {matrix.agents.length} agents · {matrix.pairs} reported pairs
              </span>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] max-w-xs flex-1">
            <label
              htmlFor="antibiogram-organism-filter"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Organism
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="antibiogram-organism-filter"
                value={organismFilter}
                onChange={(event) => setOrganismFilter(event.target.value)}
                placeholder="Filter by name, e.g. pseudomonas"
                className="h-9 pl-8 text-sm"
                data-testid="input-organism-filter"
              />
            </div>
          </div>

          <div className="w-[11rem]">
            <label
              htmlFor="antibiogram-tier-filter"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Spectrum tier
            </label>
            <Select value={tierFilter} onValueChange={(value) => setTierFilter(isTier(value) ? value : "all")}>
              <SelectTrigger id="antibiogram-tier-filter" className="mt-1.5 h-9" data-testid="select-tier-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="tier-option-all">
                  All tiers
                </SelectItem>
                {TIER_ORDER.map((tier) => (
                  <SelectItem key={tier} value={tier} data-testid={`tier-option-${tier}`}>
                    {TIER_LABELS[tier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setOrganismFilter("");
                setTierFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-card-border bg-card px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Reading the grid
          </span>
          <Pill className="border-susceptible/30 bg-susceptible-soft text-susceptible">85 and above, susceptible</Pill>
          <Pill className="border-intermediate/30 bg-intermediate-soft text-intermediate">70 to 84, intermediate</Pill>
          <Pill className="border-resistant/30 bg-resistant-soft text-resistant">below 70, resistant</Pill>
          <Pill className="border-untested/30 bg-untested-soft text-untested">blank, not reported</Pill>
          <span className="text-[11px] leading-snug text-muted-foreground">
            Each number is the percent of isolates susceptible. A blank cell means the pair is not reported in this
            table, and the ranking engine scores an unreported pair as zero coverage, so no regimen is ever ranked on
            the strength of a missing number.
          </span>
        </div>

        {antibiogramQuery.error ? (
          <Callout tone="danger" title={`Could not load the ${region?.name ?? "regional"} antibiogram`}>
            <p>{errorMessage(antibiogramQuery.error)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                antibiogramQuery.refetch();
              }}
              data-testid="button-retry-antibiogram"
            >
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </Callout>
        ) : !matrix ? (
          <MatrixSkeleton />
        ) : matrix.organisms.length === 0 || matrix.agents.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No organism and agent pairs match these filters"
            description="Widen the spectrum tier or clear the organism text to bring the grid back."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOrganismFilter("");
                  setTierFilter("all");
                }}
                data-testid="button-clear-filters-empty"
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div
            className="max-h-[34rem] overflow-x-auto overflow-y-auto rounded-xl border border-card-border bg-card"
            data-testid="antibiogram-matrix"
          >
            <table className="w-max min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    scope="col"
                    className="sticky left-0 top-0 z-30 min-w-[12rem] border-b border-r border-border bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Organism
                  </th>
                  {matrix.tierGroups.map((group) => (
                    <th
                      key={group.tier}
                      colSpan={group.count}
                      scope="colgroup"
                      className="sticky top-0 z-20 h-7 whitespace-nowrap border-b border-r border-border bg-card px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {TIER_LABELS[group.tier]}
                    </th>
                  ))}
                </tr>
                <tr>
                  {matrix.agents.map((agent) => (
                    <th
                      key={agent.id}
                      scope="col"
                      title={`${agent.name}, ${TIER_LABELS[agent.tier]} spectrum`}
                      className="sticky top-7 z-20 min-w-[2.75rem] whitespace-nowrap border-b border-border bg-card px-1.5 py-1.5 text-center text-[10px] font-medium leading-none tracking-tight text-foreground"
                    >
                      {agent.shortName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.organisms.map((organism) => {
                  const row: Record<string, number> = matrix.table[organism.id] ?? {};
                  return (
                    <tr key={organism.id} className="group" data-testid={`antibiogram-row-${organism.id}`}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-1 text-left align-middle transition-colors group-hover:bg-muted"
                      >
                        <span className="block truncate text-xs font-medium text-foreground" title={organism.name}>
                          {organism.shortName}
                        </span>
                        <span className="block text-[10px] leading-tight text-muted-foreground">
                          {GRAM_LABELS[organism.gram]}
                        </span>
                      </th>
                      {matrix.agents.map((agent) => {
                        const value: number | undefined = row[agent.id];
                        return (
                          <td
                            key={agent.id}
                            className="border-b border-border/60 p-0.5 transition-colors group-hover:bg-muted/40"
                            data-testid={`cell-${organism.id}-${agent.id}`}
                          >
                            {value === undefined ? (
                              <div
                                title={`${organism.name} against ${agent.name}: not reported, scored as zero coverage`}
                                className="flex h-7 items-center justify-center rounded font-mono text-[11px] tabular-nums text-untested"
                              >
                                <span aria-hidden="true">-</span>
                                <span className="sr-only">Not reported</span>
                              </div>
                            ) : (
                              <div
                                title={`${organism.name} against ${agent.name}: ${formatPercent(value)} susceptible`}
                                className={cn(
                                  "flex h-7 items-center justify-center rounded font-mono text-[11px] font-semibold tabular-nums",
                                  cellBackground(value),
                                  susceptibilityClass(value),
                                )}
                              >
                                {Math.round(value)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Percentages are population estimates for the selected region. They set the prior for empiric therapy only. The
          moment a culture results, the isolate's own reported S, I or R replaces every number on this page.
        </p>
      </section>
    </div>
  );
}

/** Load state shaped like the grid it replaces, so nothing jumps when it lands. */
function MatrixSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-card-border bg-card p-3" data-testid="antibiogram-skeleton">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-[12rem] shrink-0" />
        <Skeleton className="h-7 flex-1" />
      </div>
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex gap-2">
          <Skeleton className="h-7 w-[12rem] shrink-0" />
          <Skeleton className="h-7 flex-1" />
        </div>
      ))}
    </div>
  );
}
