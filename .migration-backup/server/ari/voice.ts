import { Router } from "express";
import multer, { MulterError } from "multer";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { requireAriClinician } from "./license";

// ── ElevenLabs voice routes ────────────────────────────────────────────────
// Uses the Replit ElevenLabs connector via @replit/connectors-sdk so we never
// have to manage an API key directly. The SDK handles identity + token
// refresh automatically.

const connectors = new ReplitConnectors();

// Default voice ID — "Aria" is a young, warm, friendly English-speaking
// female voice that ships on every ElevenLabs account, and matches the
// "Ari" branding of the chatbot. Override per-request via the `voiceId`
// body field if a clinician wants a different reader, or globally via
// the `ARI_DEFAULT_VOICE_ID` env var so ops can change voices without
// a redeploy.
const ARIA_VOICE_ID = "9BWtsMINqrJLrRacOk9x";
const DEFAULT_VOICE_ID =
  (process.env.ARI_DEFAULT_VOICE_ID || "").trim() || ARIA_VOICE_ID;
// `eleven_flash_v2_5` is ElevenLabs's lowest-latency TTS model (~75 ms
// time-to-first-byte vs ~250–300 ms for turbo), which keeps the speak
// button feeling instant in the chat. Quality is slightly behind turbo
// on long-form prose but is more than adequate for short Ari replies.
const DEFAULT_TTS_MODEL = "eleven_flash_v2_5";
const DEFAULT_STT_MODEL = "scribe_v1";

// Cap requests at sensible sizes so a runaway client can't spend our quota.
const MAX_TTS_CHARS = 4000;
const MAX_STT_BYTES = 25 * 1024 * 1024; // 25 MB, generous for ~5 min mono webm

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STT_BYTES },
});

export const ariVoiceRouter = Router();

// Wrap `connectors.proxy(...)` with one retry on transient upstream failures
// (503/504 from the connector edge or Cloudflare in front of ElevenLabs).
// We only retry once, with a small backoff, so a slow user request doesn't
// hang for many seconds while the proxy thrashes. Network errors (thrown
// by fetch) are also retried once. Body must be a string/Buffer/URLSearchParams
// for retry to work — FormData streams cannot be replayed safely, so the
// caller is responsible for passing a `buildBody` function in that case.
async function proxyWithRetry(
  connectorName: string,
  path: string,
  buildOptions: () => {
    method: string;
    headers?: Record<string, string>;
    body?: any;
  },
): Promise<Response> {
  const TRANSIENT_STATUSES = new Set([502, 503, 504]);
  const MAX_ATTEMPTS = 2; // initial + 1 retry — keeps user latency bounded
  let lastResponse: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const opts = buildOptions();
      const resp = await connectors.proxy(connectorName, path, opts);
      if (!TRANSIENT_STATUSES.has(resp.status)) {
        // Either success or a deterministic error we should surface (4xx).
        return resp;
      }
      lastResponse = resp;
      console.warn(
        `[ari/voice] proxy ${connectorName}${path} -> ${resp.status}, attempt ${attempt}/${MAX_ATTEMPTS}`,
      );
      // Drain so the underlying connection is freed before the retry, but
      // only if we're going to retry — otherwise the caller may want the
      // body for diagnostics.
      if (attempt < MAX_ATTEMPTS) {
        try { await resp.text(); } catch { /* noop */ }
      }
    } catch (err) {
      lastError = err;
      console.warn(
        `[ari/voice] proxy ${connectorName}${path} threw on attempt ${attempt}/${MAX_ATTEMPTS}:`,
        (err as Error).message,
      );
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  // Exhausted retries. Prefer returning the last response (if any) so the
  // caller can surface the actual upstream status code; otherwise rethrow.
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error
    ? lastError
    : new Error(`proxy ${connectorName}${path} failed after ${MAX_ATTEMPTS} attempts`);
}

// Extract a short, human-readable hint from an ElevenLabs error body.
// Bodies are usually JSON like { detail: { message: "..." } } or
// { error: { message: "..." } }, but we handle plain text too. We trim
// to 140 chars so the message stays usable in a toast.
function extractErrorHint(raw: string): string {
  if (!raw) return "";
  let txt = raw;
  try {
    const j = JSON.parse(raw);
    txt =
      j?.detail?.message ||
      j?.detail?.status ||
      (typeof j?.detail === "string" ? j.detail : "") ||
      j?.error?.message ||
      j?.message ||
      raw;
  } catch {
    /* not JSON — use raw text */
  }
  return String(txt).replace(/\s+/g, " ").trim().slice(0, 140);
}

// POST /api/ari/voice/tts → audio/mpeg stream
ariVoiceRouter.post("/voice/tts", requireAriClinician, async (req, res) => {
  const { text, voiceId } = (req.body ?? {}) as {
    text?: unknown;
    voiceId?: unknown;
  };

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ message: "Missing text." });
  }
  if (text.length > MAX_TTS_CHARS) {
    return res
      .status(413)
      .json({ message: `Text too long (max ${MAX_TTS_CHARS} chars).` });
  }

  const voice =
    typeof voiceId === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(voiceId)
      ? voiceId
      : DEFAULT_VOICE_ID;

  try {
    const elevenResp = await proxyWithRetry(
      "elevenlabs",
      `/v1/text-to-speech/${voice}`,
      () => ({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: DEFAULT_TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }),
    );

    if (!elevenResp.ok) {
      // Capture body for log diagnosis (rate limits, voice not found, proxy
      // errors, etc.) but never echo it back to the client.
      const raw = await elevenResp.text().catch(() => "");
      const hint = extractErrorHint(raw);
      console.error(
        "[ari/voice/tts] ElevenLabs error status:",
        elevenResp.status,
        hint || "(no body)"
      );
      const friendly =
        elevenResp.status === 401 || elevenResp.status === 403
          ? "Voice provider is not authorized. Re-link the ElevenLabs integration and try again."
          : elevenResp.status === 429
            ? "Voice provider is rate-limited. Wait a moment and try again."
            : elevenResp.status === 502 || elevenResp.status === 503 || elevenResp.status === 504
              ? "Voice provider is temporarily unavailable. Please try again."
              : "Text-to-speech provider error.";
      return res.status(502).json({ message: friendly });
    }

    const buf = Buffer.from(await elevenResp.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buf.length.toString());
    res.setHeader("Cache-Control", "no-store");
    return res.send(buf);
  } catch (err: any) {
    // proxyWithRetry rethrows when both attempts threw (network/transport
    // outage, no Response object). Map that to the same friendly 502 the
    // upstream-5xx path uses so the client sees a consistent "temporarily
    // unavailable" message instead of a misleading internal-error code.
    const msg = err?.message || "unknown error";
    console.error("[ari/voice/tts] failure:", msg);
    const friendly = /connector|integration|elevenlabs|not connected|unauthor/i.test(msg)
      ? "ElevenLabs voice provider is not connected. Connect ElevenLabs from the Integrations panel and try again."
      : "Voice provider is temporarily unavailable. Please try again.";
    return res.status(502).json({ message: friendly });
  }
});

// POST /api/ari/voice/stt → { text }
// Accepts a single audio file under the field name "audio". Forwarded to
// ElevenLabs Scribe with model_id=scribe_v1.
const sttUpload = upload.single("audio");
ariVoiceRouter.post(
  "/voice/stt",
  requireAriClinician,
  (req, res, next) => {
    sttUpload(req, res, (err: any) => {
      if (!err) return next();
      if (err instanceof MulterError) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: `Upload error: ${err.message}` });
      }
      console.error("[ari/voice/stt] upload failure:", err?.message || err);
      return res.status(400).json({ message: "Failed to read audio upload." });
    });
  },
  async (req, res) => {
  const file = (req as any).file as
    | { buffer: Buffer; mimetype: string; originalname: string; size: number }
    | undefined;

  if (!file) {
    return res.status(400).json({ message: "Missing audio file." });
  }
  if (!file.mimetype.startsWith("audio/") && file.mimetype !== "video/webm") {
    return res
      .status(415)
      .json({ message: `Unsupported media type: ${file.mimetype}` });
  }

  try {
    // We rebuild the multipart form on each retry because FormData is a
    // single-use stream — once it has been consumed by fetch we cannot
    // replay it for the second attempt.
    const buildForm = () => {
      const form = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      form.append("file", blob, file.originalname || "speech.webm");
      form.append("model_id", DEFAULT_STT_MODEL);
      return form;
    };

    const elevenResp = await proxyWithRetry(
      "elevenlabs",
      "/v1/speech-to-text",
      () => ({
        method: "POST",
        body: buildForm(),
      }),
    );

    if (!elevenResp.ok) {
      // Pull a short error hint from upstream so the user can actually see
      // what went wrong (rate limit, unauthorized, bad audio, etc.). We
      // sanitize and bound it so we never echo audio metadata back.
      const raw = await elevenResp.text().catch(() => "");
      const hint = extractErrorHint(raw);
      console.error(
        "[ari/voice/stt] ElevenLabs error status:",
        elevenResp.status,
        hint || "(no body)"
      );
      const friendly =
        elevenResp.status === 401 || elevenResp.status === 403
          ? "Voice provider is not authorized. Re-link the ElevenLabs integration and try again."
          : elevenResp.status === 429
            ? "Voice provider is rate-limited. Wait a moment and try again."
            : elevenResp.status === 413
              ? "Recording is too long for the transcription provider."
              : elevenResp.status === 502 || elevenResp.status === 503 || elevenResp.status === 504
                ? "Voice provider is temporarily unavailable. Please try again."
                : "Speech-to-text provider error.";
      return res.status(502).json({ message: friendly });
    }

    const data = (await elevenResp.json()) as { text?: string };
    return res.json({ text: (data.text || "").trim() });
  } catch (err: any) {
    // Log the raw error server-side for ops/debugging, but never echo
    // internal connector/provider error text to the client. Only the
    // narrow, well-understood "not connected" case gets a tailored hint;
    // transport failures bubble up as the same friendly 502 the upstream-
    // 5xx path uses so the client sees a consistent message.
    const msg = err?.message || "unknown error";
    console.error("[ari/voice/stt] failure:", msg);
    const friendly = /connector|integration|elevenlabs|not connected|unauthor/i.test(msg)
      ? "ElevenLabs voice provider is not connected. Connect ElevenLabs from the Integrations panel and try again."
      : "Voice provider is temporarily unavailable. Please try again.";
    return res.status(502).json({ message: friendly });
  }
  }
);
