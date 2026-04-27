import { useCallback, useEffect, useRef, useState } from "react";
import { recordEvent } from "@/lib/analytics";
import { TopBar } from "@/components/ari/TopBar";
import { CapabilitySidebar } from "@/components/ari/CapabilitySidebar";
import { MessageList } from "@/components/ari/MessageList";
import { Composer } from "@/components/ari/Composer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAriStore, type AriMessage } from "@/stores/ariStore";
import { sendAriMessage } from "@/lib/ariApi";
import {
  ACTIVE_CAPABILITY_IDS,
  ARI_CAPABILITIES,
  type AriCapabilityId,
} from "@shared/ari/capabilities";

export default function Aribot() {
  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: undefined });
  }, []);

  const mode = useAriStore((s) => s.mode);
  const capability = useAriStore((s) => s.capability);
  const setCapability = useAriStore((s) => s.setCapability);
  const messages = useAriStore((s) => s.messages);
  const addMessage = useAriStore((s) => s.addMessage);
  const appendToLastMessage = useAriStore((s) => s.appendToLastMessage);
  const attachments = useAriStore((s) => s.attachments);
  const clearAttachments = useAriStore((s) => s.clearAttachments);

  const [query, setQuery] = useState("");
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
    };
    const assistantMessage: AriMessage = {
      id: `a-${now}`,
      role: "assistant",
      content: "",
      timestamp: now,
    };
    addMessage(userMessage);
    addMessage(assistantMessage);

    const payloadAttachments = attachments.map((a) => ({
      type: a.type,
      mediaType: a.mediaType,
      data: a.data,
      filename: a.filename,
    }));

    const sentQuery = trimmed;
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
      // Don't hijack inside text inputs unless modifier is held — Cmd+N is OK.
      e.preventDefault();
      const next = ACTIVE_CAPABILITY_IDS[num - 1] as AriCapabilityId;
      setCapability(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCapability]);

  return (
    <div className="flex h-full flex-col" data-testid="page-aribot">
      <TopBar onClear={handleClearScratch} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className="hidden w-72 shrink-0 overflow-y-auto border-r border-border bg-muted/30 lg:block"
          data-testid="region-ari-sidebar"
        >
          <CapabilitySidebar
            selected={capability}
            onSelect={(id) => setCapability(id)}
          />
        </aside>

        {/* Mobile capability picker — Select dropdown to avoid duplicating
            the desktop sidebar (and its data-testids) into the DOM twice. */}
        <div className="border-b border-border bg-muted/30 px-3 py-2 lg:hidden">
          <Select
            value={capability}
            onValueChange={(v) => setCapability(v as AriCapabilityId)}
          >
            <SelectTrigger
              className="w-full"
              data-testid="select-capability-mobile"
              aria-label="Select Ari capability"
            >
              <SelectValue placeholder="Select capability" />
            </SelectTrigger>
            <SelectContent>
              {ARI_CAPABILITIES.map((cap) => (
                <SelectItem
                  key={cap.id}
                  value={cap.id}
                  data-testid={`option-capability-${cap.id}`}
                >
                  {cap.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <main className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto"
            data-testid="region-ari-conversation"
          >
            <div className="mx-auto w-full max-w-4xl">
              <MessageList messages={messages} streaming={streaming} />
            </div>
          </div>
          <Composer
            query={query}
            setQuery={setQuery}
            onSend={handleSend}
            onAbort={handleAbort}
            streaming={streaming}
          />
        </main>
      </div>
    </div>
  );
}
