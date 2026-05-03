import { Router } from "express";
import { ZodError } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./client";
import { ARI_MODEL_ID, ARI_SYSTEM_PROMPT, MCP_SERVERS } from "./config";
import { AriRequestSchema, type AriAttachment } from "./schema";
import {
  ARI_GUEST_USER_ID,
  buildClinicianPromptAddendum,
  onboardingSchema,
  requireAriClinician,
} from "./license";
import { ariAudit } from "./audit";
import { detectPhi, PHI_REJECTION_MESSAGE } from "./phi";
import { getMemoryStore } from "./memory";
import { ariUploadRouter } from "./upload";
import { ariVoiceRouter } from "./voice";
import { storage } from "../storage";
import { parseAriStream } from "./blocks";
import {
  CAPABILITY_REJECTION_MESSAGE,
  isActiveCapability,
} from "./capabilities";

const MCP_BETA_HEADER = "mcp-client-2025-04-04";
// PDFs need this beta header until Anthropic GAs native PDF input.
const PDF_BETA_HEADER = "pdfs-2024-09-25";

const router = Router();

// --- Onboarding (does NOT require completed onboarding, but does require login)
router.post("/onboarding", async (req, res) => {
  const r = req as any;
  if (typeof r.isAuthenticated !== "function" || !r.isAuthenticated() || !r.user?.id) {
    return res.status(401).json({ message: "Sign in required." });
  }
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid onboarding payload",
      issues: (parsed.error as ZodError).flatten(),
    });
  }
  const updated = await storage.updateUser(r.user.id, {
    licenseType: parsed.data.licenseType,
    licenseNumber: parsed.data.licenseNumber || "",
    licenseState: parsed.data.licenseState || "",
    acceptedAriTermsAt: Date.now(),
  } as any);
  if (!updated) return res.status(404).json({ message: "User not found." });
  const { password: _, ...safe } = updated;
  return res.json({ user: safe });
});

// --- Status endpoint for the Ari frontend. Sign-in is currently optional;
// when no session exists we fall back to the seeded clinician (u1) so the
// page renders without redirecting to the login screen.
router.get("/me", async (req, res) => {
  const r = req as any;
  const sessionUserId =
    typeof r.isAuthenticated === "function" && r.isAuthenticated()
      ? r.user?.id
      : undefined;
  const userId = sessionUserId || ARI_GUEST_USER_ID;
  const user = await storage.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  const { password: _, ...safe } = user;
  return res.json({
    user: safe,
    onboarded: Boolean((user as any).licenseType && (user as any).acceptedAriTermsAt),
    sessionStartedAt: Date.now(),
    guest: !sessionUserId,
  });
});

// --- Admin memory list. Locked behind ARI_MEMORY_ADMIN_USERS allowlist
// (comma-separated user ids). When unset, this endpoint is hard-disabled so
// that an in-memory store is never enumerable to ordinary clinicians.
router.get("/memory", requireAriClinician, async (req, res) => {
  const allowlist = (process.env.ARI_MEMORY_ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const userId = (req as any).ariClinician?.userId;
  if (allowlist.length === 0 || !userId || !allowlist.includes(userId)) {
    return res
      .status(403)
      .json({ message: "Memory inspection requires an admin allowlist entry." });
  }
  const topic = typeof req.query.topic === "string" ? req.query.topic : undefined;
  const store = getMemoryStore();
  const entries = await store.listAll(topic);
  res.json({ writable: store.isWritable(), entries });
});

// --- File upload (mounted as a sub-router so multer middleware is scoped).
router.use("/", ariUploadRouter);
router.use("/", ariVoiceRouter);

// --- Main chat endpoint (streaming SSE).
router.post("/chat", requireAriClinician, async (req, res) => {
  const startedAt = Date.now();
  const clinician = (req as any).ariClinician as
    | { userId: string; licenseType: string }
    | undefined;
  const userId = clinician?.userId || "unknown";
  const licenseType = clinician?.licenseType || "OTHER";

  // Pre-Zod check on capability so we can return the exact rejection prose
  // mandated by the system prompt, instead of a generic Zod enum error.
  const rawCapability = (req.body as any)?.capability;
  if (typeof rawCapability === "string" && !isActiveCapability(rawCapability)) {
    auditFail({ userId, licenseType, mode: "ari", capability: rawCapability, query: "", attachmentCount: 0, startedAt, errorCode: "capability_rejected" });
    return res.status(400).json({ message: CAPABILITY_REJECTION_MESSAGE });
  }

  const parsed = AriRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    auditFail({ userId, licenseType, mode: "ari", capability: rawCapability || "unknown", query: "", attachmentCount: 0, startedAt, errorCode: "schema_invalid" });
    return res.status(400).json({
      message: "Invalid Ari request body",
      issues: (parsed.error as ZodError).flatten(),
    });
  }
  const { mode, capability: rawCap, query, attachments } = parsed.data;
  // Capability is optional — when absent, Ari auto-infers from the query per
  // the system prompt. Use a stable label for audit/telemetry.
  const capability = rawCap ?? null;
  const auditCapability = capability ?? "auto";

  // PHI guard at request time. Reject obvious identifiers before reaching Anthropic.
  const phi = detectPhi(query);
  if (!phi.ok) {
    auditFail({ userId, licenseType, mode, capability: auditCapability, query, attachmentCount: attachments?.length || 0, startedAt, errorCode: "phi_blocked" });
    return res.status(422).json({
      message: PHI_REJECTION_MESSAGE,
      matchedPatterns: phi.matchedPatterns,
    });
  }

  const payloadBlock = {
    type: "text" as const,
    text: JSON.stringify(
      capability ? { mode, capability, query } : { mode, query }
    ),
  };

  const attachmentBlocks = (attachments || []).map((a: AriAttachment) => {
    if (a.type === "image") {
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: a.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: a.data,
        },
      };
    }
    if (a.type === "pdf" || a.mediaType === "application/pdf") {
      return {
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data: a.data,
        },
        title: a.filename,
      };
    }
    // text/plain document — pass as a text block prefixed with the filename.
    return {
      type: "text" as const,
      text: `Attached document: ${a.filename}\n\n${a.data}`,
    };
  });

  const userContent = [...attachmentBlocks, payloadBlock];

  const systemPrompt = ARI_SYSTEM_PROMPT + buildClinicianPromptAddendum(licenseType as any);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientGone = false;
  req.on("close", () => {
    clientGone = true;
  });

  const sendTextDelta = (text: string) => {
    if (clientGone || !text) return;
    const lines = text.split("\n");
    for (const line of lines) {
      res.write(`data: ${line}\n`);
    }
    res.write(`\n`);
  };

  const sendEvent = (event: string, data: string) => {
    if (clientGone) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  };

  const hasPdf = (attachments || []).some(
    (a: AriAttachment) => a.type === "pdf" || a.mediaType === "application/pdf"
  );
  const betaHeaders = [MCP_BETA_HEADER, hasPdf ? PDF_BETA_HEADER : null]
    .filter(Boolean)
    .join(",");

  let assistantText = "";
  try {
    // ER mode is documented as "no tool calls" in the system prompt, so avoid
    // attaching MCP servers there — Anthropic still lists tools at request
    // time and a flaky/rate-limited MCP would otherwise fail the whole turn.
    const requestBody: Anthropic.Beta.Messages.MessageCreateParamsStreaming = {
      model: ARI_MODEL_ID,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: userContent as Anthropic.Beta.BetaContentBlockParam[] },
      ],
      stream: true,
      ...(mode !== "er" ? { mcp_servers: MCP_SERVERS } : {}),
    };
    const stream = await anthropic.beta.messages.create(requestBody, {
      headers: { "anthropic-beta": betaHeaders },
    });

    for await (const event of stream) {
      if (clientGone) break;
      if (
        event.type === "content_block_delta" &&
        (event as any).delta?.type === "text_delta"
      ) {
        const delta = (event as any).delta.text || "";
        assistantText += delta;
        sendTextDelta(delta);
      }
    }

    sendEvent("done", "{}");
    res.end();

    // Audit success.
    ariAudit.write({
      userId,
      licenseType,
      mode,
      capability: auditCapability,
      query,
      attachmentCount: attachments?.length || 0,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    // Memory write hook — fire-and-forget. Skip in ER mode, when no
    // capability was specified (memory is keyed per-capability), and when
    // the memory store reports not writable.
    if (mode !== "er" && capability) {
      const store = getMemoryStore();
      if (store.isWritable()) {
        runMemoryExtraction({
          query,
          assistantText,
          capability,
          userId,
        }).catch((err) => {
          console.warn("[ari/memory] extraction failed:", err?.message || err);
        });
      }
    }
  } catch (err: any) {
    console.error("[ari] stream error:", err?.message || err);
    const sanitized =
      typeof err?.status === "number"
        ? `Ari upstream error (status ${err.status}).`
        : "Ari is temporarily unavailable. Please try again.";
    sendEvent("error", JSON.stringify({ message: sanitized }));
    res.end();

    auditFail({
      userId,
      licenseType,
      mode,
      capability: auditCapability,
      query,
      attachmentCount: attachments?.length || 0,
      startedAt,
      errorCode: typeof err?.status === "number" ? `upstream_${err.status}` : "stream_error",
    });
  }
});

function auditFail(opts: {
  userId: string;
  licenseType: string;
  mode: "ari" | "er";
  capability: string;
  query: string;
  attachmentCount: number;
  startedAt: number;
  errorCode: string;
}) {
  ariAudit.write({
    userId: opts.userId,
    licenseType: opts.licenseType,
    mode: opts.mode,
    capability: opts.capability,
    query: opts.query,
    attachmentCount: opts.attachmentCount,
    latencyMs: Date.now() - opts.startedAt,
    success: false,
    errorCode: opts.errorCode,
  });
}

/**
 * Persist memory entries directly from parsed `ari_claim` blocks where
 * `verified === true`. Memory content is the claim's own statement plus the
 * citations array — no freeform model extraction over the full assistant
 * response, which previously could persist unverified content.
 *
 * Topic is the request capability; slug is a hash of the claim text so
 * repeated identical verified claims dedupe naturally.
 */
async function runMemoryExtraction(opts: {
  query: string;
  assistantText: string;
  capability: string;
  userId: string;
}) {
  const blocks = parseAriStream(opts.assistantText);
  const verifiedClaims = blocks.filter(
    (b) => (b as any).kind === "claim" && (b as any).verified === true
  );
  if (verifiedClaims.length === 0) return;

  const store = getMemoryStore();
  for (const claim of verifiedClaims) {
    const data = (claim as any).data || claim;
    const statement: string =
      typeof data.statement === "string"
        ? data.statement
        : typeof data.text === "string"
          ? data.text
          : "";
    if (!statement || statement.length < 8) continue;
    const citations: any[] = Array.isArray(data.citations) ? data.citations : [];
    const slug = sha1Slug(statement);
    const md = renderClaimMarkdown(statement, citations);
    try {
      await store.appendOrCreate(opts.capability, slug, md, {
        capability: opts.capability,
        clinicianId: opts.userId,
        verified: true,
        sourceCount: citations.length,
      });
    } catch (err: any) {
      console.warn("[ari/memory] write failed:", err?.message || err);
    }
  }
}

function renderClaimMarkdown(statement: string, citations: any[]): string {
  const lines = [`**Verified claim:** ${statement}`];
  if (citations.length > 0) {
    lines.push("", "Sources:");
    for (const c of citations) {
      const title = c?.title || c?.source || "(untitled source)";
      const url = c?.url ? ` — ${c.url}` : "";
      lines.push(`- ${title}${url}`);
    }
  }
  return lines.join("\n");
}

function sha1Slug(text: string): string {
  // sha-1 truncated to 16 hex chars is plenty for slug uniqueness.
  // crypto is available in node — import lazily to avoid top-level churn.
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 16);
}

export default router;
