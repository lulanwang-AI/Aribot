import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ActionBadge,
  Callout,
  EmptyState,
  Pill,
  ReviewClock,
  SeverityBadge,
  StatusBadge,
} from "@/components/amr/primitives";
import {
  SETTING_LABELS,
  TIER_CLASSES,
  TIER_LABELS,
  amrApi,
  formatDateTime,
} from "@/lib/amr";
import type { CareSetting, DosedAgent, StewardshipCaseView } from "@/lib/amr";
import { cn } from "@/lib/utils";

/**
 * The case worklist.
 *
 * One card per patient rather than a dense table: every row carries the
 * syndrome, the regimen actually running and the review clock, and a clinician
 * scanning the list at handover has to be able to read all three without
 * decoding a column header.
 *
 * Order is clinical, not alphabetical - anything with the 48-72 hour decision
 * outstanding comes first, most overdue at the top.
 */

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "review", label: "Review due" },
  { id: "active", label: "On therapy" },
  { id: "completed", label: "Completed" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

const CLOSED_STATUSES: StewardshipCaseView["status"][] = ["completed", "stopped"];

function isClosed(item: StewardshipCaseView): boolean {
  return CLOSED_STATUSES.includes(item.status);
}

/**
 * The sidebar links to /cases?filter=review, so the worklist honours it.
 *
 * The standalone build routes on the hash, which puts the query string after
 * the "#" where window.location.search cannot see it. Read both.
 */
function readFilterFromUrl(): StatusFilter {
  if (typeof window === "undefined") return "all";
  const hashQuery = window.location.hash.includes("?")
    ? window.location.hash.slice(window.location.hash.indexOf("?"))
    : "";
  const value =
    new URLSearchParams(window.location.search).get("filter") ??
    new URLSearchParams(hashQuery).get("filter");
  if (value === "review") return "review";
  if (value === "active" || value === "therapy") return "active";
  if (value === "completed") return "completed";
  return "all";
}

interface RegimenSummary {
  caption: string;
  agents: DosedAgent[];
}

/**
 * What the patient is actually on: the targeted regimen once the review is
 * done, otherwise the empiric regimen the prescriber started, otherwise the
 * top-ranked empiric option that has not been started yet.
 */
function resolveRegimen(item: StewardshipCaseView): RegimenSummary | null {
  if (item.targeted) {
    return { caption: "Targeted regimen", agents: item.targeted.regimen };
  }
  const regimens = item.empiric?.regimens ?? [];
  if (regimens.length === 0) return null;
  const started = item.selectedRegimenId
    ? regimens.find((regimen) => regimen.id === item.selectedRegimenId)
    : undefined;
  if (started) return { caption: "Current regimen", agents: started.agents };
  return { caption: "Proposed empiric, not started", agents: regimens[0].agents };
}

function CaseCard({
  item,
  shortNames,
}: {
  item: StewardshipCaseView;
  shortNames: Map<string, string>;
}) {
  const regimen = resolveRegimen(item);
  const open = !isClosed(item);

  return (
    <Link
      href={`/cases/${item.id}`}
      data-testid={`link-case-${item.id}`}
      className={cn(
        "block rounded-xl border bg-card p-4 transition-colors",
        "hover:border-primary/40 hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        item.reviewDue ? "border-intermediate/45" : "border-card-border",
      )}
    >
      <div className="grid gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-foreground">
            {item.patientLabel}
          </p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{item.mrn}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.ward} · {SETTING_LABELS[item.setting]}
          </p>
          <p className="truncate text-xs text-muted-foreground">{item.assignedTo}</p>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground">{item.syndromeName}</p>
          {regimen ? (
            <>
              <p className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {regimen.caption}
              </p>
              {regimen.agents.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {regimen.agents.map((agent) => (
                    <Pill
                      key={agent.agentId}
                      className={TIER_CLASSES[agent.tier]}
                      title={`${agent.name} ${agent.dose} · ${TIER_LABELS[agent.tier]} spectrum`}
                    >
                      {shortNames.get(agent.agentId) ?? agent.name}
                    </Pill>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No antimicrobial on the current plan.
                </p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              No regimen recorded yet. Intake is complete but empiric therapy has not been chosen.
            </p>
          )}
          {item.daysOfTherapy > 0 && (
            <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
              day {item.daysOfTherapy} of therapy
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-end lg:justify-self-end">
          <StatusBadge status={item.status} />
          <SeverityBadge severity={item.severity} />
          {open && <ReviewClock hours={item.hoursToReview} />}
          {item.targeted && (
            <ActionBadge action={item.targeted.action} label={item.targeted.actionLabel} />
          )}
          <p className="text-[11px] text-muted-foreground lg:mt-0.5">
            Updated {formatDateTime(item.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function CaseCardSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="grid gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3 w-28" />
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-end">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function Cases() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(readFilterFromUrl);
  const [setting, setSetting] = useState<CareSetting | "all">("all");

  // Re-read the query string when the router moves us here from the sidebar.
  useEffect(() => {
    setStatusFilter(readFilterFromUrl());
  }, [location]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["amr", "cases"],
    queryFn: () => amrApi.cases(),
  });

  const { data: reference } = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const shortNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of reference?.agents ?? []) map.set(agent.id, agent.shortName);
    return map;
  }, [reference]);

  const cases = useMemo(() => data ?? [], [data]);

  /** Search and setting narrow the pool; the status toggles then split it. */
  const scoped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cases.filter((item) => {
      if (setting !== "all" && item.setting !== setting) return false;
      if (!needle) return true;
      return [item.mrn, item.patientLabel, item.ward, item.assignedTo, item.syndromeName].some(
        (field) => field.toLowerCase().includes(needle),
      );
    });
  }, [cases, search, setting]);

  const counts = useMemo(
    () => ({
      all: scoped.length,
      review: scoped.filter((item) => item.reviewDue).length,
      active: scoped.filter((item) => !isClosed(item)).length,
      completed: scoped.filter((item) => isClosed(item)).length,
    }),
    [scoped],
  );

  const visible = useMemo(() => {
    const matched = scoped.filter((item) => {
      if (statusFilter === "review") return item.reviewDue;
      if (statusFilter === "active") return !isClosed(item);
      if (statusFilter === "completed") return isClosed(item);
      return true;
    });
    return matched.sort((a, b) => {
      if (a.reviewDue !== b.reviewDue) return a.reviewDue ? -1 : 1;
      if (a.hoursToReview !== b.hoursToReview) return a.hoursToReview - b.hoursToReview;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [scoped, statusFilter]);

  const filtersActive = search.trim() !== "" || statusFilter !== "all" || setting !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSetting("all");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every patient on antimicrobial therapy the programme is tracking. Anything with the
            48-72 hour decision outstanding sorts to the top, most overdue first.
          </p>
        </div>
        <Button asChild data-testid="button-new-assessment">
          <Link href="/intake">New assessment</Link>
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="MRN, patient, ward, clinician or syndrome"
            aria-label="Filter cases by MRN, patient, ward, clinician or syndrome"
            className="h-9 pl-8 text-sm"
            data-testid="input-case-search"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {STATUS_FILTERS.map((option) => {
            const active = statusFilter === option.id;
            return (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                onClick={() => setStatusFilter(option.id)}
                data-testid={`button-filter-${option.id}`}
                className={cn("gap-1.5", !active && "text-muted-foreground")}
              >
                {option.label}
                <span className="font-mono text-[11px] tabular-nums opacity-70">
                  {counts[option.id]}
                </span>
              </Button>
            );
          })}
        </div>

        <Select
          value={setting}
          onValueChange={(value) => setSetting(value as CareSetting | "all")}
        >
          <SelectTrigger className="h-9 w-[11rem] text-sm" data-testid="select-setting">
            <SelectValue placeholder="All settings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-setting-all">
              All settings
            </SelectItem>
            {(Object.entries(SETTING_LABELS) as [CareSetting, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value} data-testid={`option-setting-${value}`}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Callout tone="danger" title="The worklist did not load">
          <p>{error instanceof Error ? error.message : "Unknown error loading cases."}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={isFetching}
            onClick={() => void refetch()}
            data-testid="button-retry-cases"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isFetching ? "Retrying" : "Retry"}
          </Button>
        </Callout>
      ) : isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="mb-3 h-3 w-28" />
          {[0, 1, 2, 3].map((key) => (
            <CaseCardSkeleton key={key} />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" data-testid="text-case-count">
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {visible.length}
              </span>{" "}
              of <span className="font-mono tabular-nums">{cases.length}</span> cases
            </p>
            {filtersActive && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear filters
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No cases match these filters"
              description={
                cases.length === 0
                  ? "No patient has been enrolled yet. Start an assessment to put the first case on the worklist."
                  : "Widen the filters to see the rest of the worklist."
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  data-testid="button-clear-filters-empty"
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {visible.map((item) => (
                <CaseCard key={item.id} item={item} shortNames={shortNames} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
