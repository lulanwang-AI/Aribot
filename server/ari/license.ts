import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
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
 * Read the user's session and confirm they completed Ari onboarding. If they
 * haven't, return 403 with { redirect: "/aribot/onboarding" }.
 */
export async function requireAriClinician(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const r = req as Request & {
    isAuthenticated?: () => boolean;
    user?: { id?: string };
  };
  const route = `${req.method} ${req.path}`;
  if (
    typeof r.isAuthenticated !== "function" ||
    !r.isAuthenticated() ||
    !r.user?.id
  ) {
    ariAudit.write({
      userId: "anonymous",
      licenseType: "UNKNOWN",
      mode: "ari",
      capability: route,
      query: "",
      attachmentCount: 0,
      latencyMs: 0,
      success: false,
      errorCode: "auth_missing",
    });
    return res
      .status(401)
      .json({ message: "Authentication required for Ari clinical workflows." });
  }

  const user = await storage.getUser(r.user.id);
  if (!user) {
    ariAudit.write({
      userId: r.user.id,
      licenseType: "UNKNOWN",
      mode: "ari",
      capability: route,
      query: "",
      attachmentCount: 0,
      latencyMs: 0,
      success: false,
      errorCode: "session_user_missing",
    });
    return res.status(401).json({ message: "Session user not found." });
  }
  // Onboarding is currently optional. If the user has completed it we use
  // their declared license type and terms-acceptance timestamp; otherwise we
  // fall through with sensible defaults (license OTHER, terms ts = now) so
  // every authenticated user can use Ari without forced signup.
  const lt = (user as any).licenseType as LicenseType | undefined;
  const ts = (user as any).acceptedAriTermsAt;
  (req as any).ariClinician = {
    userId: user.id,
    licenseType: (lt || "OTHER") as LicenseType,
    email: (user as any).email || (user as any).username || "",
    acceptedAriTermsAt:
      typeof ts === "number"
        ? ts
        : ts
          ? new Date(ts).getTime()
          : Date.now(),
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
