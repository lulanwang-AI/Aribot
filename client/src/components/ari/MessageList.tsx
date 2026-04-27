import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AriMessage } from "@/components/ari/AriMessage";
import { useAriStore, type AriMessage as AriMessageType } from "@/stores/ariStore";

interface MessageListProps {
  messages: AriMessageType[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const mode = useAriStore((s) => s.mode);

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
        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              mode={mode}
              streaming={streaming && isLast}
            />
          );
        })}
      </AnimatePresence>
      {streaming && messages[messages.length - 1]?.role === "assistant" && (
        <StreamingIndicator />
      )}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}

function MessageBubble({
  message,
  mode,
  streaming,
}: {
  message: AriMessageType;
  mode: "ari" | "er";
  streaming: boolean;
}) {
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
          <AriMessage
            text={message.content}
            mode={message.mode || mode}
            streaming={streaming}
          />
        )}
      </div>
    </motion.div>
  );
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
