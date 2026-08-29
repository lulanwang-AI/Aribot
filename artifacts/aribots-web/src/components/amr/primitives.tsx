import { cn } from "@/lib/utils";
import {
  ACTION_CLASSES,
  CATEGORY_CLASSES,
  SEVERITY_CLASSES,
  SEVERITY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TIER_CLASSES,
  TIER_LABELS,
  formatPercent,
  formatReviewClock,
  susceptibilityBg,
  susceptibilityClass,
} from "@/lib/amr";
import type {
  Severity,
  SpectrumTier,
  StewardshipAction,
  StewardshipCaseView,
  SusceptibilityCategory,
} from "@shared/amr/types";
import { AlertTriangle, Clock, Lock } from "lucide-react";

/**
 * Shared vocabulary for the stewardship UI.
 *
 * Susceptibility and spectrum are the two scales this product is built on, so
 * they get one implementation each. Every one of them shows a number or a
 * letter alongside the colour - a clinician reading a printed handover sheet in
 * greyscale must get the same answer as one reading the screen.
 */

export function Pill({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Pill className={SEVERITY_CLASSES[severity]} title={`Severity: ${SEVERITY_LABELS[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </Pill>
  );
}

export function StatusBadge({ status }: { status: StewardshipCaseView["status"] }) {
  return <Pill className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</Pill>;
}

export function TierBadge({ tier, restricted }: { tier: SpectrumTier; restricted?: boolean }) {
  return (
    <Pill
      className={TIER_CLASSES[tier]}
      title={
        restricted
          ? `${TIER_LABELS[tier]} spectrum. Stewardship-restricted: the indication has to be documented.`
          : `${TIER_LABELS[tier]} spectrum`
      }
    >
      {restricted && <Lock className="h-2.5 w-2.5 shrink-0" />}
      {TIER_LABELS[tier]}
    </Pill>
  );
}

export function ActionBadge({ action, label }: { action: StewardshipAction; label: string }) {
  return <Pill className={cn(ACTION_CLASSES[action], "px-2.5 py-1 text-xs")}>{label}</Pill>;
}

/** Lab-reported S/I/R, shown as the letter the lab actually printed. */
export function CategoryBadge({ category }: { category: SusceptibilityCategory }) {
  const labels: Record<SusceptibilityCategory, string> = {
    S: "Susceptible",
    I: "Intermediate",
    R: "Resistant",
  };
  return (
    <Pill className={cn(CATEGORY_CLASSES[category], "w-6 justify-center px-0")} title={labels[category]}>
      {category}
    </Pill>
  );
}

/**
 * A susceptibility percentage as a labelled bar.
 *
 * The number is the primary signal; the bar is there to make a column of them
 * scannable.
 */
export function SusceptibilityBar({
  percent,
  label,
  sublabel,
  className,
}: {
  percent: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {(label || sublabel) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && <span className="truncate text-xs text-foreground">{label}</span>}
          <span className={cn("shrink-0 font-mono text-xs font-semibold tabular-nums", susceptibilityClass(percent))}>
            {percent > 0 ? formatPercent(percent) : "not tested"}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", susceptibilityBg(percent))}
          style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
        />
      </div>
      {sublabel && <p className="text-[11px] leading-snug text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

/** Likelihood share of the differential, drawn in the brand hue rather than the S/I/R ramp. */
export function LikelihoodBar({ share, className }: { share: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(share * 100, 1.5)}%` }} />
    </div>
  );
}

export function ReviewClock({ hours, className }: { hours: number; className?: string }) {
  const overdue = hours <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        overdue ? "text-resistant" : hours <= 12 ? "text-intermediate" : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {formatReviewClock(hours)}
    </span>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-primary/25 bg-primary/[0.06] text-foreground",
    warning: "border-intermediate/30 bg-intermediate-soft text-foreground",
    danger: "border-resistant/30 bg-resistant-soft text-foreground",
    success: "border-susceptible/25 bg-susceptible-soft text-foreground",
  } as const;
  const iconTone = {
    info: "text-primary",
    warning: "text-intermediate",
    danger: "text-resistant",
    success: "text-susceptible",
  } as const;

  return (
    <div className={cn("rounded-lg border p-3", tones[tone], className)}>
      <div className="flex gap-2.5">
        <span className={cn("mt-0.5 shrink-0", iconTone[tone])}>
          {icon ?? <AlertTriangle className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          {title && <p className="text-xs font-semibold leading-snug">{title}</p>}
          <div className="text-xs leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * The standing reminder that this is decision support.
 *
 * It is deliberately quiet rather than a modal: a warning a clinician has to
 * dismiss forty times a shift stops being read by the second week.
 */
export function DecisionSupportNotice({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/70 bg-muted/40 p-3", className)}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Decision support, not a prescription
      </p>
      <ul className="space-y-1">
        {lines.map((line) => (
          <li key={line} className="text-[11px] leading-relaxed text-muted-foreground">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones = {
    default: "text-foreground",
    good: "text-susceptible",
    warn: "text-intermediate",
    bad: "text-resistant",
  } as const;
  return (
    <div className="rounded-lg border border-card-border bg-card p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 flex items-baseline gap-1 text-2xl font-semibold tabular-nums", tones[tone])}>
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
