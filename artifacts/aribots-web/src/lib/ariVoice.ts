// Browser-side helpers for Aribots voice features. STT goes through the
// /api/ari/voice/stt endpoint (proxied to ElevenLabs Scribe). TTS goes
// through /api/ari/voice/tts and returns an audio/mpeg blob we play
// inline via the HTMLAudioElement APIs.

export class VoiceRecorder {
  private mediaStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private resolveStop: ((blob: Blob) => void) | null = null;
  private rejectStop: ((err: Error) => void) | null = null;

  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  async start(): Promise<void> {
    if (!VoiceRecorder.isSupported()) {
      throw new Error("Voice input is not supported in this browser.");
    }
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const mime = pickPreferredMime();
    this.recorder = mime
      ? new MediaRecorder(this.mediaStream, { mimeType: mime })
      : new MediaRecorder(this.mediaStream);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, {
        type: this.recorder?.mimeType || "audio/webm",
      });
      this.cleanup();
      this.resolveStop?.(blob);
      this.resolveStop = null;
      this.rejectStop = null;
    };
    this.recorder.onerror = (ev) => {
      const err = new Error(
        (ev as any)?.error?.message || "Recorder error"
      );
      this.cleanup();
      this.rejectStop?.(err);
      this.resolveStop = null;
      this.rejectStop = null;
    };
    this.recorder.start();
  }

  stop(): Promise<Blob> {
    if (!this.recorder || this.recorder.state === "inactive") {
      return Promise.reject(new Error("Recorder not active."));
    }
    return new Promise<Blob>((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
      try {
        this.recorder?.stop();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        this.recorder.stop();
      }
    } catch {
      /* noop */
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.recorder = null;
  }
}

function pickPreferredMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* noop */
    }
  }
  return null;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  const ext = guessExt(blob.type);
  form.append("audio", blob, `speech.${ext}`);
  const res = await fetch("/api/ari/voice/stt", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(
      data?.message || `Transcription failed (${res.status}).`
    );
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

function guessExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ── Text-to-speech playback ───────────────────────────────────────────────
// We share a single Audio instance per page to avoid the user being able to
// stack overlapping playbacks. Callers control the lifecycle through start
// (returns a handle that exposes stop + an `ended` promise).
//
// Importantly, `stop()` and `stopActivePlayback()` both deterministically
// settle the prior handle's `ended` promise so any UI bound to that promise
// (e.g. the message footer's "Stop" → "Listen" toggle) flips back to idle
// the moment another message starts speaking.

interface ActivePlayback {
  audio: HTMLAudioElement;
  url: string;
  finish: () => void;
}

let active: ActivePlayback | null = null;

export interface TtsHandle {
  stop: () => void;
  ended: Promise<void>;
}

export async function speakText(text: string): Promise<TtsHandle> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nothing to speak.");

  // Stop any currently-playing playback before starting the next one.
  stopActivePlayback();

  const res = await fetch("/api/ari/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed.slice(0, 4000) }),
    credentials: "include",
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || `Voice synthesis failed (${res.status}).`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  let settled = false;
  let resolveEnded!: () => void;
  let rejectEnded!: (err: Error) => void;
  const ended = new Promise<void>((resolve, reject) => {
    resolveEnded = resolve;
    rejectEnded = reject;
  });

  function cleanup() {
    if (active && active.audio === audio) {
      active = null;
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }

  const finish = () => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveEnded();
  };
  const fail = (err: Error) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectEnded(err);
  };

  audio.onended = finish;
  audio.onerror = () => fail(new Error("Audio playback failed."));

  // Register before play() so a same-tick stopActivePlayback() can find us.
  active = { audio, url, finish };

  try {
    // Some browsers reject `play()` if invoked outside a user gesture, but
    // since callers wire this to a click, it should work.
    await audio.play();
  } catch (err) {
    // Important: if play() rejects (autoplay policy, decode error, etc.),
    // we must still revoke the object URL and reset the singleton, AND
    // settle the `ended` promise so callers don't hang.
    fail(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }

  return {
    stop: () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* noop */
      }
      finish();
    },
    ended,
  };
}

// ── Live interim transcription via the browser's Web Speech API ──────────
// This is a UX nicety only - it lets us stream interim text into the
// composer while the user is still talking so they can see "what the
// system thinks they're saying". The authoritative transcription is still
// produced by ElevenLabs Scribe on stop (more accurate, multilingual,
// punctuation-aware). When the browser doesn't support SpeechRecognition
// (Firefox, some Safari versions), `LiveTranscriber.isSupported()` returns
// false and the composer simply hides the live preview line.

type SpeechRecognitionCtor = new () => any;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface LiveTranscriberCallbacks {
  // Fired whenever the recognizer emits an updated interim result. The
  // text is the concatenation of all final + the latest interim chunk so
  // the UI can simply render it without buffering itself.
  onInterim?: (text: string) => void;
  // Fired when a phrase is finalized by the recognizer (typically after
  // a short silence). Useful if you want to gradually accumulate text.
  onFinal?: (text: string) => void;
  // Fired on a recognizer error so the UI can fall back gracefully.
  onError?: (message: string) => void;
}

export class LiveTranscriber {
  private rec: any | null = null;
  private finalChunks: string[] = [];

  static isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  start(cb: LiveTranscriberCallbacks = {}): boolean {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang =
        (typeof navigator !== "undefined" && navigator.language) || "en-US";
      this.finalChunks = [];
      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text: string = result[0]?.transcript ?? "";
          if (result.isFinal) {
            const trimmed = text.trim();
            if (trimmed) {
              this.finalChunks.push(trimmed);
              cb.onFinal?.(trimmed);
            }
          } else {
            interim += text;
          }
        }
        const combined = [
          this.finalChunks.join(" "),
          interim.trim(),
        ]
          .filter(Boolean)
          .join(" ");
        cb.onInterim?.(combined);
      };
      rec.onerror = (event: any) => {
        // "no-speech" and "aborted" are common and harmless; surface only
        // the genuinely useful errors.
        const code = event?.error || "unknown";
        if (code === "no-speech" || code === "aborted") return;
        cb.onError?.(code);
      };
      rec.start();
      this.rec = rec;
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (!this.rec) return;
    try {
      this.rec.onresult = null;
      this.rec.onerror = null;
      this.rec.stop();
    } catch {
      /* noop */
    }
    this.rec = null;
    this.finalChunks = [];
  }
}

export function stopActivePlayback(): void {
  const current = active;
  if (!current) return;
  try {
    current.audio.pause();
    current.audio.currentTime = 0;
  } catch {
    /* noop */
  }
  // `finish()` revokes the object URL, clears `active`, and resolves the
  // owning handle's `ended` promise so any subscriber flips back to idle.
  current.finish();
}
