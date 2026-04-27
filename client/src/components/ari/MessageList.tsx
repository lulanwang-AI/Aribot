import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AriMessage } from "@/components/ari/AriMessage";
import { useAriStore, type AriMessage as AriMessageType } from "@/stores/ariStore";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  BookOpen,
  Keyboard,
  Mic,
  Upload,
} from "lucide-react";

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
    return <EmptyState />;
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

  // User messages stay as a compact right-aligned bubble. Assistant
  // responses render flat across the full content column — no bubble, no
  // border — so long answers read like a document instead of a chat reply.
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex flex-col items-end gap-1"
        data-testid={`message-user-${message.id}`}
      >
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          You
        </div>
        <div
          className={cn(
            "max-w-[85ch] rounded-lg border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-foreground"
          )}
        >
          <pre className="whitespace-pre-wrap break-words font-sans">
            {message.content}
          </pre>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex w-full flex-col gap-1"
      data-testid={`message-assistant-${message.id}`}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Ari
      </div>
      <div className="w-full text-sm leading-relaxed text-foreground">
        <AriMessage
          text={message.content}
          mode={message.mode || mode}
          streaming={streaming}
        />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  const trustBadges = [
    { icon: ShieldCheck, label: "HIPAA-compliant" },
    { icon: Lock, label: "Fully private chat" },
    { icon: UserCheck, label: "Human expert–derived" },
    { icon: BookOpen, label: "Evidence-based references" },
  ];
  const inputModes = [
    { icon: Keyboard, label: "Type" },
    { icon: Mic, label: "Speak" },
    { icon: Upload, label: "Upload" },
  ];
  return (
    <div
      className="flex h-full items-center justify-center px-6 py-6"
      data-testid="state-ari-empty"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            data-testid="text-ask-sy-headline"
          >
            Ask Sy
          </h2>
          <p className="text-sm text-muted-foreground">
            Your clinical assistant. Cited, fail-closed, fully private.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-2"
          data-testid="region-trust-badges"
        >
          {trustBadges.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              data-testid={`badge-trust-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>

        <p
          className="max-w-xl text-xs leading-relaxed text-muted-foreground"
          data-testid="text-evidence-stats"
        >
          5M Clinical Triage Data; 220M+ peer-reviewed papers; 50k curated
          guidelines; 40M+ PubMed citations; 2M+ Central records plus 530k+
          Clinical Trials studies; 38.4M Open Targets evidence items
          associations.
        </p>

        <div
          className="flex items-center gap-3 text-xs text-muted-foreground"
          data-testid="region-input-modes"
        >
          {inputModes.map(({ icon: Icon, label }, i) => (
            <span key={label} className="inline-flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-foreground"
                data-testid={`hint-input-${label.toLowerCase()}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
              {i < inputModes.length - 1 && (
                <span aria-hidden="true" className="text-muted-foreground/50">
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
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
