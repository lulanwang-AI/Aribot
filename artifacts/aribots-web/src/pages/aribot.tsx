import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { getCapabilityIcon } from "@/lib/capabilityIcons";
import { recordEvent } from "@/lib/analytics";
import { TopBar } from "@/components/ari/TopBar";
import { MessageList } from "@/components/ari/MessageList";
import { Composer } from "@/components/ari/Composer";
import { useAriStore, type AriMessage } from "@/stores/ariStore";
import { sendAriMessage } from "@/lib/ariApi";
import {
  ACTIVE_CAPABILITY_IDS,
  getCapability,
  type AriCapabilityId,
} from "@shared/ari/capabilities";
import { cn } from "@/lib/utils";
import { STANDALONE } from "@/lib/amr";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquareOff } from "lucide-react";

interface MeResponse {
  user: {
    id: string;
    email?: string;
    username?: string;
    licenseType?: string;
  };
  onboarded: boolean;
  sessionStartedAt: number;
}

export default function Aribot() {

  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: undefined });
  }, []);

  const meQuery = useQuery<MeResponse>({
    queryKey: ["/api/ari/me"],
    retry: false,
  });

  // Onboarding is currently optional - clinicians can complete it at
  // /aribot/onboarding but are no longer forced through it before using Ari.

  const mode = useAriStore((s) => s.mode);
  const capability = useAriStore((s) => s.capability);
  const setCapability = useAriStore((s) => s.setCapability);
  const additionalCapabilities = useAriStore((s) => s.additionalCapabilities);
  const toggleCapability = useAriStore((s) => s.toggleCapability);
  const messages = useAriStore((s) => s.messages);
  const addMessage = useAriStore((s) => s.addMessage);
  const appendToLastMessage = useAriStore((s) => s.appendToLastMessage);
  const attachments = useAriStore((s) => s.attachments);
  const clearAttachments = useAriStore((s) => s.clearAttachments);
  const sessionStartedAt = useAriStore((s) => s.sessionStartedAt);
  const query = useAriStore((s) => s.draft);
  const setQuery = useAriStore((s) => s.setDraft);

  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || streaming) return;

    const now = Date.now();
    const userMessage: AriMessage = {
      id: `u-${now}`,
      role: "user",
      content: trimmed,
      timestamp: now,
      mode,
    };
    const assistantMessage: AriMessage = {
      id: `a-${now}`,
      role: "assistant",
      content: "",
      timestamp: now,
      mode,
    };
    addMessage(userMessage);
    addMessage(assistantMessage);

    const payloadAttachments = attachments.map((a) => ({
      type: a.type,
      mediaType: a.mediaType,
      data: a.data,
      filename: a.filename,
    }));

    // ER mode bypasses capability gating entirely - drop both primary and
    // additional capability hints from the request so the backend sees a
    // clean ER query (matches the hidden chip strip / picker on the UI).
    const isEr = mode === "er";
    const effectiveCapability = isEr ? null : capability;
    const additionalNames = isEr
      ? []
      : additionalCapabilities
          .map((id) => getCapability(id).displayName)
          .filter(Boolean);

    // If the clinician has additional capabilities pinned, prefix the query
    // with a short directive so Ari knows to also bring those perspectives
    // into the answer. The strict `capability` value sent to the backend
    // continues to drive system prompt + gating.
    const sentQuery =
      additionalNames.length > 0
        ? `[Also bring perspectives from: ${additionalNames.join(
            ", "
          )}]\n\n${trimmed}`
        : trimmed;

    setQuery("");
    clearAttachments();
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendAriMessage(
        {
          mode,
          capability: effectiveCapability,
          query: sentQuery,
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
        },
        {
          onProgress: (delta) => appendToLastMessage(delta),
          onError: (msg) => appendToLastMessage(`\n\n_Error: ${msg}_`),
          signal: controller.signal,
        }
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [
    query,
    streaming,
    mode,
    capability,
    additionalCapabilities,
    attachments,
    addMessage,
    appendToLastMessage,
    clearAttachments,
  ]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClearScratch = useCallback(() => {
    setQuery("");
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+1-9 to switch capability.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const num = Number(e.key);
      if (!Number.isInteger(num) || num < 1 || num > ACTIVE_CAPABILITY_IDS.length) return;
      e.preventDefault();
      const next = ACTIVE_CAPABILITY_IDS[num - 1] as AriCapabilityId;
      setCapability(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCapability]);

  // The chat is the one part of this product that needs a server: it calls a
  // model with a key that must never be shipped to a browser. In the standalone
  // build it says so plainly rather than failing when someone presses send.
  if (STANDALONE) {
    return (
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <MessageSquareOff className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Ask Ari needs a server
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          The chat retrieves from PubMed and current guidelines through a model API, which needs a
          key that cannot safely be shipped to a browser. This build runs the stewardship engine
          entirely on your device, so there is no backend to hold one.
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Everything the chat would explain is already computed and shown on the case itself: the
          organism differential and why each entry is on it, the coverage arithmetic behind the
          ranking, the allergy assessment, and the reasoning for the 48 to 72 hour decision.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Back to the dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/guidance">How Ari decides</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="loader-ari-me">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // /me should always succeed now that sign-in is optional, but if it does
  // fail (network blip, server error) keep the page usable instead of
  // forcing the user to a sign-in screen.
  const user = meQuery.data?.user ?? null;

  const isEr = mode === "er";

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      data-testid="page-aribot"
      data-mode={mode}
    >
      {/* Mode-aware animated gradient backdrops. Two layers crossfade
          when the user toggles between Ari and ER so the whole surface
          gently shifts color rather than snapping. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.07] via-background to-primary/[0.04]"
        initial={false}
        animate={{ opacity: isEr ? 0 : 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        data-testid="bg-ari-gradient"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-intermediate/[0.10] via-background to-resistant/[0.06]"
        initial={false}
        animate={{ opacity: isEr ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        data-testid="bg-er-gradient"
      />
      <TopBar onClear={handleClearScratch} />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto"
            data-testid="region-ari-conversation"
          >
            <div className="mx-auto w-full max-w-4xl">
              <MessageList messages={messages} streaming={streaming} />
            </div>
          </div>
          {mode !== "er" && (
            <CapabilityChips
              primary={capability}
              additional={additionalCapabilities}
              onRemove={(id) => toggleCapability(id)}
            />
          )}
          <Composer
            query={query}
            setQuery={setQuery}
            onSend={handleSend}
            onAbort={handleAbort}
            streaming={streaming}
          />
          <footer
            className="border-t border-border bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground backdrop-blur-sm sm:px-6"
            data-testid="footer-ari"
          >
            <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2">
              <span>
                {user?.licenseType || "Clinician"}
                {(user?.email || user?.username) && (
                  <>
                    {" · "}
                    <span data-testid="text-ari-user">
                      {user.email || user.username}
                    </span>
                  </>
                )}
              </span>
              <span>
                Session started{" "}
                <span data-testid="text-ari-session-started">
                  {new Date(sessionStartedAt).toLocaleTimeString()}
                </span>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

interface CapabilityChipsProps {
  primary: AriCapabilityId | null;
  additional: AriCapabilityId[];
  onRemove: (id: AriCapabilityId) => void;
}

function CapabilityChips({
  primary,
  additional,
  onRemove,
}: CapabilityChipsProps) {
  const ids: AriCapabilityId[] = [
    ...(primary ? [primary] : []),
    ...additional,
  ];
  if (ids.length === 0) return null;
  return (
    <div
      className="border-t border-border bg-muted/30 px-4 py-2 sm:px-6"
      data-testid="region-ari-capability-chips"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2">
        {ids.map((id, idx) => {
          const meta = getCapability(id);
          const Icon = getCapabilityIcon(id);
          return (
            <span
              key={id}
              data-testid={`chip-capability-${id}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary animate-in fade-in-0 slide-in-from-left-1 fill-mode-both"
              style={{ animationDelay: `${idx * 30}ms`, animationDuration: "240ms" }}
            >
              <Icon className="h-3 w-3 text-primary" aria-hidden />
              <span>{meta.displayName}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-accent"
                data-testid={`button-remove-capability-${id}`}
                aria-label={`Remove ${meta.displayName}`}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

