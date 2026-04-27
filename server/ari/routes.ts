import { Router } from "express";
import { ZodError } from "zod";
import { anthropic } from "./client";
import { ARI_MODEL_ID, ARI_SYSTEM_PROMPT, MCP_SERVERS } from "./config";
import { AriRequestSchema, type AriAttachment } from "./schema";
import { requireAriAuth } from "./auth";

const MCP_BETA_HEADER = "mcp-client-2025-04-04";

const router = Router();

router.post("/chat", requireAriAuth, async (req, res) => {
  const parsed = AriRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid Ari request body",
      issues: (parsed.error as ZodError).flatten(),
    });
  }
  const { mode, capability, query, attachments } = parsed.data;

  const payloadBlock = {
    type: "text" as const,
    text: JSON.stringify({ mode, capability, query }),
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
    return {
      type: "document" as const,
      source: {
        type: "base64" as const,
        media_type: "application/pdf" as const,
        data: a.data,
      },
      title: a.filename,
    };
  });

  const userContent = [payloadBlock, ...attachmentBlocks];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientGone = false;
  req.on("close", () => {
    clientGone = true;
  });

  // SSE-compliant text delta writer. Splits on newlines so multi-line deltas
  // emit multiple `data:` lines per the SSE spec.
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

  try {
    const stream = await anthropic.beta.messages.create(
      {
        model: ARI_MODEL_ID,
        max_tokens: 4096,
        system: ARI_SYSTEM_PROMPT,
        mcp_servers: MCP_SERVERS,
        messages: [{ role: "user", content: userContent }],
        stream: true,
      },
      {
        headers: { "anthropic-beta": MCP_BETA_HEADER },
      }
    );

    for await (const event of stream) {
      if (clientGone) break;
      if (
        event.type === "content_block_delta" &&
        (event as any).delta?.type === "text_delta"
      ) {
        sendTextDelta((event as any).delta.text || "");
      }
    }

    sendEvent("done", "{}");
    res.end();
  } catch (err: any) {
    console.error("[ari] stream error:", err?.message || err);
    const sanitized =
      typeof err?.status === "number"
        ? `Ari upstream error (status ${err.status}).`
        : "Ari is temporarily unavailable. Please try again.";
    sendEvent("error", JSON.stringify({ message: sanitized }));
    res.end();
  }
});

export default router;
