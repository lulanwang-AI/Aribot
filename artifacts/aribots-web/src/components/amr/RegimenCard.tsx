import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Callout, LikelihoodBar, Pill, SectionHeading, SusceptibilityBar, TierBadge } from "./primitives";
import { formatDuration, formatPercent } from "@/lib/amr";
import type { RegimenRecommendation } from "@shared/amr/types";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Droplets,
  FlaskConical,
  Pill as PillIcon,
  ShieldAlert,
  Syringe,
} from "lucide-react";

const ROUTE_ICONS: Record<string, React.ReactNode> = {
  IV: <Syringe className="h-3 w-3" />,
  PO: <PillIcon className="h-3 w-3" />,
  IM: <Syringe className="h-3 w-3" />,
  topical: <Droplets className="h-3 w-3" />,
  inhaled: <Droplets className="h-3 w-3" />,
};

/**
 * One empiric regimen option.
 *
 * The card leads with what the clinician has to act on - the agents and their
 * doses - and puts the coverage arithmetic behind a disclosure. The rationale
 * is never hidden entirely: a recommendation a prescriber cannot interrogate is
 * one they are right not to trust.
 */
export function RegimenCard({
  regimen,
  coverageTarget,
  selected,
  onSelect,
  actionLabel = "Start this regimen",
  defaultExpanded = false,
}: {
  regimen: RegimenRecommendation;
  coverageTarget: number;
  selected?: boolean;
  onSelect?: (regimenId: string) => void;
  actionLabel?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || regimen.preferred);

  const blocked = regimen.allergyConflicts.some((c) => c.verdict === "contraindicated");
  const meetsTarget = regimen.expectedCoverage >= coverageTarget;
  const uncovered = regimen.organismCoverage
    .filter((o) => !o.covered && o.likelihood >= 0.04)
    .sort((a, b) => b.likelihood - a.likelihood);

  return (
    <article
      data-testid={`regimen-${regimen.id}`}
      className={cn(
        "rounded-xl border bg-card transition-colors",
        regimen.preferred ? "border-primary/45 ring-1 ring-primary/15" : "border-card-border",
        selected && "border-primary ring-2 ring-primary/25",
        blocked && "opacity-80",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {regimen.preferred && (
              <Pill className="border-primary/30 bg-primary/12 text-primary">
                <Check className="h-2.5 w-2.5" />
                Recommended
              </Pill>
            )}
            {blocked && (
              <Pill className="border-resistant/35 bg-resistant-soft text-resistant">
                <ShieldAlert className="h-2.5 w-2.5" />
                Allergy contraindication
              </Pill>
            )}
            {!regimen.preferred && !blocked && (
              <Pill className="border-border bg-muted text-muted-foreground">Option {regimen.rank}</Pill>
            )}
          </div>
          <h3 className="text-sm font-semibold leading-snug text-foreground">{regimen.label}</h3>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-mono text-xl font-semibold tabular-nums leading-none",
              meetsTarget ? "text-susceptible" : "text-intermediate",
            )}
          >
            {formatPercent(regimen.expectedCoverage)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            expected coverage
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            spectrum cost {regimen.spectrumCost}
          </p>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {regimen.agents.length === 0 ? (
          <Callout tone="success" title="No antimicrobial required" icon={<Check className="h-4 w-4" />}>
            Source control alone is the treatment here. Adding an antibiotic adds risk without adding benefit.
          </Callout>
        ) : (
          <ul className="space-y-2.5">
            {regimen.agents.map((agent) => (
              <li
                key={agent.agentId}
                className="rounded-lg border border-border/60 bg-background/60 p-3"
                data-testid={`agent-${agent.agentId}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                  <Pill className="border-border bg-muted text-muted-foreground">
                    {ROUTE_ICONS[agent.route]}
                    {agent.route}
                  </Pill>
                  <TierBadge tier={agent.tier} restricted={agent.restricted} />
                </div>
                <p className="mt-1.5 font-mono text-sm font-medium text-primary">{agent.dose}</p>
                {agent.renalNote && (
                  <p className="mt-1 text-[11px] leading-snug text-intermediate">{agent.renalNote}</p>
                )}
                {agent.cautions.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {agent.cautions.slice(0, 2).map((caution) => (
                      <li key={caution} className="text-[11px] leading-snug text-muted-foreground">
                        {caution}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">{regimen.selectionNote}</p>

        {regimen.warnings.map((warning) => (
          <Callout key={warning} tone="warning">
            {warning}
          </Callout>
        ))}

        {regimen.allergyConflicts.map((conflict) => (
          <Callout
            key={conflict.agentId}
            tone={conflict.verdict === "contraindicated" ? "danger" : conflict.verdict === "avoid" ? "warning" : "info"}
            title={`${conflict.agentName} against a recorded ${conflict.allergy} allergy`}
            icon={<ShieldAlert className="h-4 w-4" />}
          >
            {conflict.guidance}
          </Callout>
        ))}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`toggle-coverage-${regimen.id}`}
          className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Coverage against the differential
            {uncovered.length > 0 && (
              <span className="text-resistant">
                · {uncovered.length} gap{uncovered.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>

        {expanded && (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <ul className="space-y-2.5">
              {regimen.organismCoverage
                .filter((o) => o.likelihood >= 0.02)
                .map((organism) => (
                  <li key={organism.organismId}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {organism.shortName}
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                          {formatPercent(organism.likelihood * 100)} of differential
                        </span>
                      </span>
                      {!organism.covered && organism.likelihood >= 0.04 && (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-resistant" />
                      )}
                    </div>
                    <div className="mt-1 grid grid-cols-[3fr_1fr] items-center gap-2">
                      <SusceptibilityBar percent={organism.expectedSusceptibility} />
                      <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {organism.expectedSusceptibility > 0
                          ? `${organism.expectedSusceptibility}% S`
                          : "no cover"}
                      </span>
                    </div>
                  </li>
                ))}
            </ul>

            {regimen.rationale.length > 0 && (
              <div className="space-y-1 border-t border-border/60 pt-2.5">
                {regimen.rationale.map((line) => (
                  <p key={line} className="text-[11px] leading-relaxed text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Planned duration</dt>
            <dd className="mt-0.5 font-medium text-foreground">{formatDuration(regimen.durationDays)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Monitoring</dt>
            <dd className="mt-0.5 font-medium text-foreground">{regimen.monitoring.length} items</dd>
          </div>
        </dl>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{regimen.durationDays.note}</p>

        {onSelect && (
          <Button
            type="button"
            variant={regimen.preferred ? "default" : "outline"}
            className="w-full"
            disabled={blocked}
            onClick={() => onSelect(regimen.id)}
            data-testid={`select-regimen-${regimen.id}`}
          >
            {blocked ? "Blocked by a recorded allergy" : selected ? "Selected" : actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
}

/** The organism differential on its own, for the recommendation header. */
export function DifferentialList({
  differential,
  limit = 8,
}: {
  differential: { organismId: string; shortName: string; likelihood: number; reason: string }[];
  limit?: number;
}) {
  return (
    <div className="space-y-2.5">
      <SectionHeading
        title="Likely organisms"
        description="Weighted from the syndrome, the care setting and this patient's screening answers."
      />
      <ul className="space-y-2">
        {differential.slice(0, limit).map((organism) => (
          <li key={organism.organismId} data-testid={`differential-${organism.organismId}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">{organism.shortName}</span>
              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-primary">
                {formatPercent(organism.likelihood * 100)}
              </span>
            </div>
            <LikelihoodBar share={organism.likelihood} className="mt-1" />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{organism.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
