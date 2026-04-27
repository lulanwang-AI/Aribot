import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, Star } from "lucide-react";
import { recordEvent } from "@/lib/analytics";
import { TopBar } from "@/components/ari/TopBar";
import { TabStrip } from "@/components/ari/TabStrip";
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

  // Onboarding is currently optional — clinicians can complete it at
  // /aribot/onboarding but are no longer forced through it before using Ari.

  const mode = useAriStore((s) => s.mode);
  const capability = useAriStore((s) => s.capability);
  const setCapability = useAriStore((s) => s.setCapability);
  const additionalCapabilities = useAriStore((s) => s.additionalCapabilities);
  const toggleCapability = useAriStore((s) => s.toggleCapability);
  const promoteCapability = useAriStore((s) => s.promoteCapability);
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

    // If the clinician has additional capabilities pinned, prefix the query
    // with a short directive so Ari knows to also bring those perspectives
    // into the answer. The strict `capability` value sent to the backend
    // continues to drive system prompt + gating.
    const additionalNames = additionalCapabilities
      .map((id) => getCapability(id).displayName)
      .filter(Boolean);
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
          capability,
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

  return (
    <div className="flex h-full flex-col" data-testid="page-aribot">
      <TopBar onClear={handleClearScratch} />
      <TabStrip />
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
          <CapabilityChips
            primary={capability}
            additional={additionalCapabilities}
            onRemove={(id) => toggleCapability(id)}
            onPromote={(id) => promoteCapability(id)}
          />
          <Composer
            query={query}
            setQuery={setQuery}
            onSend={handleSend}
            onAbort={handleAbort}
            streaming={streaming}
          />
          <footer
            className="border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground sm:px-6"
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
  onPromote: (id: AriCapabilityId) => void;
}

function CapabilityChips({
  primary,
  additional,
  onRemove,
  onPromote,
}: CapabilityChipsProps) {
  const all: { id: AriCapabilityId; isPrimary: boolean }[] = [
    ...(primary ? [{ id: primary, isPrimary: true }] : []),
    ...additional.map((id) => ({ id, isPrimary: false })),
  ];
  const noneSelected = all.length === 0;
  return (
    <div
      className="border-t border-border bg-muted/30 px-4 py-2 sm:px-6"
      data-testid="region-ari-capability-chips"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Capabilities
        </span>
        {noneSelected && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
            data-testid="chip-capability-auto"
          >
            Auto-detect
          </span>
        )}
        {all.map((cap) => {
          const meta = getCapability(cap.id);
          return (
            <span
              key={cap.id}
              data-testid={`chip-capability-${cap.id}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                cap.isPrimary
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              )}
            >
              {cap.isPrimary && (
                <Star className="h-3 w-3 fill-primary text-primary" aria-label="Primary" />
              )}
              {!cap.isPrimary && (
                <button
                  type="button"
                  onClick={() => onPromote(cap.id)}
                  className="rounded p-0.5 hover:bg-accent"
                  data-testid={`button-promote-capability-${cap.id}`}
                  aria-label={`Make ${meta.displayName} the primary capability`}
                  title="Make primary"
                >
                  <Star className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
              )}
              <span>{meta.displayName}</span>
              <button
                type="button"
                onClick={() => onRemove(cap.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-accent"
                data-testid={`button-remove-capability-${cap.id}`}
                aria-label={`Remove ${meta.displayName}`}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <span className="text-[11px] text-muted-foreground">
          {noneSelected
            ? "Ari will infer the right capability from your question — or use the + button to pick one."
            : "Use the + button in the chat to add more."}
        </span>
      </div>
    </div>
  );
}

