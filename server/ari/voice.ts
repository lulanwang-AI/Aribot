import { Router } from "express";
import multer, { MulterError } from "multer";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { requireAriClinician } from "./license";

// ── ElevenLabs voice routes ────────────────────────────────────────────────
// Uses the Replit ElevenLabs connector via @replit/connectors-sdk so we never
// have to manage an API key directly. The SDK handles identity + token
// refresh automatically.

const connectors = new ReplitConnectors();

// Default voice ID — "Rachel" is a clear, neutral English voice that ships
// on every ElevenLabs account. Override per-request via the `voiceId` body
// field if a clinician wants a different reader.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_TTS_MODEL = "eleven_turbo_v2_5";
const DEFAULT_STT_MODEL = "scribe_v1";

// Cap requests at sensible sizes so a runaway client can't spend our quota.
const MAX_TTS_CHARS = 4000;
const MAX_STT_BYTES = 25 * 1024 * 1024; // 25 MB, generous for ~5 min mono webm

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STT_BYTES },
});

export const ariVoiceRouter = Router();

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
    const elevenResp = await connectors.proxy(
      "elevenlabs",
      `/v1/text-to-speech/${voice}`,
      {
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
      }
    );

    if (!elevenResp.ok) {
      await elevenResp.text().catch(() => "");
      console.error("[ari/voice/tts] ElevenLabs error status:", elevenResp.status);
      return res.status(502).json({ message: "Text-to-speech provider error." });
    }

    const buf = Buffer.from(await elevenResp.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buf.length.toString());
    res.setHeader("Cache-Control", "no-store");
    return res.send(buf);
  } catch (err: any) {
    console.error("[ari/voice/tts] failure:", err?.message || "unknown error");
    return res.status(500).json({ message: "Text-to-speech failed." });
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
    // Build a multipart form for ElevenLabs. We re-wrap the buffer in a Blob
    // so global FormData (Node 20+) accepts it without us needing form-data.
    const form = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    form.append("file", blob, file.originalname || "speech.webm");
    form.append("model_id", DEFAULT_STT_MODEL);

    const elevenResp = await connectors.proxy(
      "elevenlabs",
      "/v1/speech-to-text",
      {
        method: "POST",
        body: form,
      }
    );

    if (!elevenResp.ok) {
      // Drain the body so the connection can be reused, but don't log it —
      // upstream payloads can echo the user's audio metadata.
      await elevenResp.text().catch(() => "");
      console.error("[ari/voice/stt] ElevenLabs error status:", elevenResp.status);
      return res
        .status(502)
        .json({ message: "Speech-to-text provider error." });
    }

    const data = (await elevenResp.json()) as { text?: string };
    return res.json({ text: (data.text || "").trim() });
  } catch (err: any) {
    console.error("[ari/voice/stt] failure:", err?.message || "unknown error");
    return res.status(500).json({ message: "Speech-to-text failed." });
  }
  }
);
