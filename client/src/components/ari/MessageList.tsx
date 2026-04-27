import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AriMessage } from "@/stores/ariStore";

interface MessageListProps {
  messages: AriMessage[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center"
        data-testid="state-ari-empty"
      >
        <div className="max-w-md text-sm text-muted-foreground">
          Select a capability and describe the clinical question. Ari will
          respond with cited, primary-source guidance. ER mode skips retrieval
          for speed and is not verified — confirm before acting.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 sm:px-6"
      data-testid="list-ari-messages"
    >
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </AnimatePresence>
      {streaming && messages[messages.length - 1]?.role === "assistant" && (
        <StreamingIndicator />
      )}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}

function MessageBubble({ message }: { message: AriMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {isUser ? "You" : "Ari"}
      </div>
      <div
        className={cn(
          "max-w-[85ch] rounded-lg border px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "border-border bg-muted text-foreground"
            : "border-border bg-card text-foreground"
        )}
      >
        {isUser ? (
          <pre className="whitespace-pre-wrap break-words font-sans">
            {message.content}
          </pre>
        ) : (
          <AssistantContent text={message.content} />
        )}
      </div>
    </motion.div>
  );
}

/**
 * Render assistant text. Splits on top-level ari_* fenced JSON code blocks and
 * renders the prose around them as markdown. The JSON blocks themselves are
 * shown raw in a monospace box for now — a richer renderer comes in the next
 * prompt.
 */
function AssistantContent({ text }: { text: string }) {
  const segments = splitOnAriJsonBlocks(text);
  return (
    <div className="space-y-3">
      {segments.map((seg, i) =>
        seg.kind === "prose" ? (
          <div key={i} className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {seg.content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre
            key={i}
            className="overflow-x-auto rounded border border-border bg-muted px-3 py-2 text-[12px] leading-snug"
            data-testid={`block-ari-json-${i}`}
          >
            <code>{seg.content}</code>
          </pre>
        )
      )}
    </div>
  );
}

type Segment = { kind: "prose" | "json"; content: string };

const ARI_JSON_FENCE = /```(?:json)?\s*(\{[\s\S]*?"kind"\s*:\s*"ari_[\s\S]*?\})\s*```/g;

function splitOnAriJsonBlocks(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  ARI_JSON_FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ARI_JSON_FENCE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "prose",
        content: text.slice(lastIndex, match.index),
      });
    }
    segments.push({ kind: "json", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "prose", content: text.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ kind: "prose", content: text });
  }
  return segments;
}

function StreamingIndicator() {
  return (
    <div
      className="flex items-center gap-2 px-1 text-xs text-muted-foreground"
      data-testid="indicator-ari-streaming"
    >
      <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/70" />
      Ari is responding…
    </div>
  );
}
