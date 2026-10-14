import { cn } from "@/lib/utils";

/**
 * Compliance badges for the public site.
 *
 * Drawn in-house so they can sit on dark and light surfaces and scale cleanly.
 * They inherit `currentColor`, so the surrounding text colour sets the tone.
 * Replace with auditor-issued artwork by swapping these two components; every
 * placement goes through ComplianceBadges.
 */

type BadgeProps = { className?: string; title?: string };

export function HipaaBadge({ className, title = "HIPAA Compliant" }: BadgeProps) {
  return (
    <svg
      viewBox="0 0 168 56"
      role="img"
      aria-label={title}
      className={cn("h-12 w-auto", className)}
      data-testid="badge-hipaa"
    >
      <title>{title}</title>
      <rect x="1" y="1" width="166" height="54" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* shield */}
      <path
        d="M28 10 L42 15.5 V27 C42 35.5 36 42 28 45.5 C20 42 14 35.5 14 27 V15.5 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M21.5 27.5 L26 32 L35 22.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="54" y="27" fill="currentColor" fontFamily="Manrope, Inter, sans-serif" fontWeight="800" fontSize="17" letterSpacing="0.5">
        HIPAA
      </text>
      <text x="54" y="42" fill="currentColor" fillOpacity="0.75" fontFamily="Manrope, Inter, sans-serif" fontWeight="600" fontSize="9.5" letterSpacing="2.2">
        COMPLIANT
      </text>
    </svg>
  );
}

export function Soc2Badge({ className, title = "SOC 2 Compliant" }: BadgeProps) {
  return (
    <svg
      viewBox="0 0 168 56"
      role="img"
      aria-label={title}
      className={cn("h-12 w-auto", className)}
      data-testid="badge-soc2"
    >
      <title>{title}</title>
      <rect x="1" y="1" width="166" height="54" rx="12" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* seal */}
      <circle cx="28" cy="28" r="16" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="28" cy="28" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2.2 2.2" />
      <path d="M22.5 28.5 L26.5 32.5 L34 24.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="54" y="27" fill="currentColor" fontFamily="Manrope, Inter, sans-serif" fontWeight="800" fontSize="17" letterSpacing="0.5">
        SOC 2
      </text>
      <text x="54" y="42" fill="currentColor" fillOpacity="0.75" fontFamily="Manrope, Inter, sans-serif" fontWeight="600" fontSize="9.5" letterSpacing="2.2">
        COMPLIANT
      </text>
    </svg>
  );
}

export function ComplianceBadges({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const height = { sm: "h-9", md: "h-12", lg: "h-16" }[size];
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)} data-testid="compliance-badges">
      <HipaaBadge className={height} />
      <Soc2Badge className={height} />
    </div>
  );
}
