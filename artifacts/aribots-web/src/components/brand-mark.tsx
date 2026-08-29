import aribotMark from "@assets/aribot-mark-primary-1024_1777274279204.png";
import { cn } from "@/lib/utils";

/**
 * The Ari brand mark.
 *
 * One component so the logo cannot drift between the sidebar, the sign-in
 * screen and the landing page.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-14 w-14",
  } as const;

  return (
    <img
      src={aribotMark}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-lg object-contain", dimensions[size], className)}
    />
  );
}

export const BRAND_NAME = "Ari AMR";
export const BRAND_TAGLINE = "Antimicrobial decision support";
