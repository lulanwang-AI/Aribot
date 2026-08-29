import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { resolveAuthenticatedUser } from "../auth-setup";
import { ariAudit } from "./audit";

export const LICENSE_TYPES = [
  "MD",
  "DO",
  "NP",
  "PA",
  "RN",
  "PharmD",
  "OTHER",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

export const onboardingSchema = z.object({
  licenseType: z.enum(LICENSE_TYPES),
  licenseNumber: z.string().max(64).optional(),
  licenseState: z.string().max(8).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Terms acknowledgment is required." }),
  }),
});

export type AriClinicianContext = {
  userId: string;
  licenseType: LicenseType;
  email: string;
  acceptedAriTermsAt: number;
};

/**
 * Resolve the current Ari clinician. Both sign-in and onboarding are
 * currently optional — when no session exists we fall back to the seeded
 * default clinician (`u1`) so anyone can use Ari without forced signup.
 */
export async function requireAriClinician(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authenticatedUser = await resolveAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ message: "Sign in required." });
    return;
  }
  const user = await storage.getUser(authenticatedUser.id);
  if (!user) {
    res.status(401).json({ message: "Sign in required." });
    return;
  }
  if (!(user as any).licenseType || !(user as any).acceptedAriTermsAt) {
    res.status(403).json({
      code: "ARI_ONBOARDING_REQUIRED",
      message: "Complete clinician onboarding before using Ari clinical tools.",
    });
    return;
  }
  const lt = (user as any).licenseType as LicenseType | undefined;
  const ts = (user as any).acceptedAriTermsAt;
  (req as any).ariClinician = {
    userId: user.id,
    licenseType: lt as LicenseType,
    email: (user as any).email || (user as any).username || "",
    acceptedAriTermsAt:
      typeof ts === "number" ? ts : new Date(ts as string).getTime(),
  } satisfies AriClinicianContext;
  next();
}

/**
 * Build the per-session clinician context block that is appended to the Ari
 * system prompt. Gentle nudge only — never overrides safety gates.
 */
export function buildClinicianPromptAddendum(licenseType: LicenseType): string {
  return (
    `\n\nClinician context for this session: license type ${licenseType}. ` +
    `Tailor terminology and depth accordingly. Pharmacists receive deeper PK/PD detail; ` +
    `nurses receive workflow-focused framing; physicians receive full differential discussion. ` +
    `This context never overrides safety gates.`
  );
}
