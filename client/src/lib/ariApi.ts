import type { AriCapabilityId } from "@shared/ari/capabilities";
import type { AriAttachment } from "@/stores/ariStore";

export interface AriChatRequest {
  mode: "ari" | "er";
  capability: AriCapabilityId;
  query: string;
  attachments?: AriAttachment[];
}

export interface AriStreamCallbacks {
  onProgress: (deltaText: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

/**
 * Send an Ari chat request and stream the response.
 *
 * Streams Server-Sent Events from POST /api/ari/chat. The protocol matches the
 * server in server/ari/routes.ts:
 *   - Each Anthropic text delta is sent as one or more `data:` lines per
 *     event, with a trailing blank line terminating the event. Multi-line
 *     deltas are split into multiple `data:` lines per the SSE spec, and we
 *     re-join them with `\n` here. Successive deltas are concatenated as-is
 *     (no separator) so the assistant prose reconstructs verbatim.
 *   - Completion: `event: done\n\n`.
 *   - Errors: `event: error\ndata: { "message": "..." }\n\n` (sanitized JSON).
 */
export async function sendAriMessage(
  payload: AriChatRequest,
  cb: AriStreamCallbacks
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/ari/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(payload),
      signal: cb.signal,
    });
  } catch (err: any) {
    // Aborted before the response started — silent, matches the in-stream
    // abort handling below.
    if (err?.name === "AbortError") return;
    cb.onError?.(err?.message || "Ari request failed before sending.");
    return;
  }

  if (!res.ok) {
    let message = `Ari request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore parse error
    }
    cb.onError?.(message);
    return;
  }

  const body = res.body;
  if (!body) {
    cb.onError?.("Ari response had no body.");
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are terminated by a blank line (\n\n).
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            // Strip a single optional leading space after `data:`.
            dataLines.push(line.slice(5).replace(/^ /, ""));
          }
          // Ignore other fields (id:, retry:, comments).
        }

        const data = dataLines.join("\n");

        if (eventName === "done") {
          cb.onDone?.();
          return;
        }
        if (eventName === "error") {
          let msg = "Ari is temporarily unavailable. Please try again.";
          try {
            const parsed = JSON.parse(data);
            if (parsed?.message) msg = parsed.message;
          } catch {
            // keep default
          }
          cb.onError?.(msg);
          return;
        }
        // Default `message` event = a text delta. Forward verbatim.
        if (data.length > 0) cb.onProgress(data);
      }
    }
    // Stream ended without an explicit `done` event — treat as completion.
    cb.onDone?.();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      // Aborted by caller; do not surface as an error.
      return;
    }
    cb.onError?.(err?.message || "Ari stream interrupted.");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

/**
 * Upload a file to /api/ari/upload and return the attachment metadata returned
 * by the server (mime-sniffed, base64-encoded, PDF text-extracted).
 *
 * Uploads happen one at a time at the call site so the UI can show per-file
 * progress without juggling parallel requests.
 */
export async function uploadAriFile(file: File): Promise<AriAttachment> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/ari/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.message || `Upload failed (${r.status}).`);
  }
  const json = await r.json();
  const previewUrl =
    json.type === "image" ? URL.createObjectURL(file) : undefined;
  return {
    type: json.type,
    mediaType: json.mediaType,
    data: json.data,
    filename: json.filename,
    sizeBytes: json.sizeBytes,
    pageCount: json.pageCount,
    textPreview: json.textPreview,
    previewUrl,
  };
}

/**
 * Read a File and return base64 data + media type for use as an Ari attachment.
 *
 * Used as a fallback when the upload endpoint is not reachable (e.g. dev
 * scripts). Production callers should prefer uploadAriFile so the server can
 * mime-sniff and PDF-parse.
 */
export async function fileToAttachment(file: File): Promise<AriAttachment> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked base64 to avoid call-stack issues on large PDFs.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as number[]);
  }
  const data = btoa(binary);

  const mediaType = file.type || "application/octet-stream";
  const isImage = mediaType.startsWith("image/");
  const isPdf = mediaType === "application/pdf";
  const type: AriAttachment["type"] = isImage
    ? "image"
    : isPdf
      ? "pdf"
      : "document";

  const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

  return {
    type,
    mediaType,
    data,
    filename: file.name,
    previewUrl,
  };
}
