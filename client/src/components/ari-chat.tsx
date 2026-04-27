import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Pill,
  Bandage,
  FlaskConical,
  Wind,
  Calculator,
  ClipboardList,
  AlertTriangle,
  Receipt,
  Scan,
  Send,
  Square,
  Copy,
  Trash2,
  Paperclip,
  X,
  ShieldAlert,
  Sparkles,
  Bot,
} from "lucide-react";

type AriMode = "ari" | "er";
type AriCapabilityId =
  | "antibiotic_stewardship"
  | "wound_skin"
  | "pharmacy"
  | "ventilator"
  | "calculators"
  | "clinical_protocols"
  | "er_triage"
  | "cms_billing"
  | "rad_onc_imaging";

interface CapabilityMeta {
  id: AriCapabilityId;
  label: string;
  hint: string;
  Icon: typeof Pill;
}

const CAPABILITIES: CapabilityMeta[] = [
  { id: "antibiotic_stewardship", label: "Antibiotic Stewardship", hint: "Empiric coverage, de-escalation, durations", Icon: Pill },
  { id: "wound_skin", label: "Wound & Skin", hint: "Ulcers, dressings, infections", Icon: Bandage },
  { id: "pharmacy", label: "Pharmacy", hint: "Dosing, interactions, renal/hepatic adj.", Icon: FlaskConical },
  { id: "ventilator", label: "Ventilator", hint: "Mode selection, troubleshooting", Icon: Wind },
  { id: "calculators", label: "Calculators", hint: "Clinical scoring & risk tools", Icon: Calculator },
  { id: "clinical_protocols", label: "Clinical Protocols", hint: "Step-by-step pathways", Icon: ClipboardList },
  { id: "er_triage", label: "ER Triage", hint: "Acuity assessment", Icon: AlertTriangle },
  { id: "cms_billing", label: "CMS Billing", hint: "Coverage, codes, modifiers", Icon: Receipt },
  { id: "rad_onc_imaging", label: "Rad/Onc Imaging", hint: "Modality selection & oncology imaging", Icon: Scan },
];

interface AttachmentDraft {
  type: "image" | "pdf";
  mediaType: string;
  data: string;
  filename: string;
}

interface AriChatProps {
  variant?: "full" | "compact";
}

export function AriChat({ variant = "full" }: AriChatProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<AriMode>("ari");
  const [capability, setCapability] = useState<AriCapabilityId>("pharmacy");
  const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const compact = variant === "compact";

  const handleAttach = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDrafts: AttachmentDraft[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 5MB.`, variant: "destructive" });
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast({ title: "Unsupported file", description: `${file.name} must be an image or PDF.`, variant: "destructive" });
        continue;
      }
      const data = await fileToBase64(file);
      newDrafts.push({
        type: isImage ? "image" : "pdf",
        mediaType: file.type,
        data,
        filename: file.name,
      });
    }
    if (newDrafts.length) setAttachments((prev) => [...prev, ...newDrafts]);
  }, [toast]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const handleClear = useCallback(() => {
    setResponse("");
    setErrorMsg(null);
    setQuery("");
    setAttachments([]);
  }, []);

  const handleCopy = useCallback(() => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    toast({ title: "Copied", description: "Ari response copied to clipboard." });
  }, [response, toast]);

  const handleSend = useCallback(async () => {
    if (!query.trim() || streaming) return;
    setErrorMsg(null);
    setResponse("");
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/ari/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ac.signal,
        body: JSON.stringify({
          mode,
          capability,
          query: query.trim(),
          attachments: attachments.length
            ? attachments.map((a) => ({
                type: a.type === "pdf" ? "pdf" : "image",
                mediaType: a.mediaType,
                data: a.data,
                filename: a.filename,
              }))
            : undefined,
        }),
      });

      if (!res.ok) {
        let msg = `Request failed (${res.status}).`;
        try {
          const j = await res.json();
          if (res.status === 401) msg = "You must be signed in to use Ari.";
          else if (j?.message) msg = j.message;
        } catch {
          /* ignore */
        }
        setErrorMsg(msg);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setErrorMsg("No response stream available.");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let evt = "";
      let dataLines: string[] = [];

      const dispatch = () => {
        if (dataLines.length === 0 && !evt) return;
        const data = dataLines.join("\n");
        if (evt === "done") {
          // streaming complete
        } else if (evt === "error") {
          let msg = "Ari encountered an error.";
          try {
            const parsed = JSON.parse(data);
            if (parsed?.message) msg = parsed.message;
          } catch {
            if (data) msg = data;
          }
          setErrorMsg(msg);
        } else {
          // Each SSE event corresponds to one Anthropic text delta. Newlines
          // within a single delta are preserved by the multi-`data:`-line join
          // above; successive deltas concatenate directly (token-by-token).
          if (data.length) {
            setResponse((prev) => prev + data);
          }
        }
        evt = "";
        dataLines = [];
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (line === "") {
            dispatch();
          } else if (line.startsWith("event:")) {
            evt = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
          }
        }
      }
      dispatch();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setErrorMsg(err?.message || "Network error contacting Ari.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [mode, capability, query, attachments, streaming]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${compact ? "p-2 gap-2" : "p-4 gap-4"}`} data-testid="component-ari-chat">
      <header className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`} data-testid="text-ari-title">
              Ari Clinical AI
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Claude + clinical MCP tools · Licensed clinicians only
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMode("ari")}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
              mode === "ari" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
            data-testid="button-mode-ari"
          >
            Ari
          </button>
          <button
            type="button"
            onClick={() => setMode("er")}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
              mode === "er" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
            data-testid="button-mode-er"
          >
            ER
          </button>
        </div>
      </header>

      <section className="shrink-0">
        <Label className="text-xs font-medium mb-1.5 block">Capability</Label>
        <div className={`grid gap-1.5 ${compact ? "grid-cols-3" : "grid-cols-3 lg:grid-cols-3 xl:grid-cols-9"}`}>
          {CAPABILITIES.map((c) => {
            const active = capability === c.id;
            const Icon = c.Icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCapability(c.id)}
                title={c.hint}
                className={`flex flex-col items-center gap-1 p-2 rounded-md border text-[10px] leading-tight text-center transition-colors ${
                  active
                    ? "bg-primary/10 border-primary text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
                data-testid={`button-capability-${c.id}`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                <span className={active ? "font-medium" : ""}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="shrink-0 space-y-1.5">
        <Label className="text-xs font-medium" htmlFor="ari-query">
          Clinical question
        </Label>
        <Textarea
          id="ari-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "er"
              ? "ER mode: enter the protocol question (no live retrieval; verify before acting)..."
              : "Ask Ari a clinical question. Be specific about patient context, allergies, renal function, etc."
          }
          rows={compact ? 3 : 5}
          maxLength={8000}
          className="text-sm resize-none"
          disabled={streaming}
          data-testid="input-ari-query"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{query.length} / 8000</span>
          <label className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors" data-testid="label-ari-attach">
            <Paperclip className="h-3 w-3" />
            Attach
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleAttach(e.target.files);
                e.target.value = "";
              }}
              data-testid="input-ari-attachment"
            />
          </label>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1" data-testid={`badge-attachment-${i}`}>
                {a.filename}
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="hover:text-destructive"
                  aria-label={`Remove ${a.filename}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="flex items-center gap-2 shrink-0">
        {streaming ? (
          <Button onClick={handleStop} variant="outline" size="sm" className="flex-1" data-testid="button-ari-stop">
            <Square className="h-3.5 w-3.5 mr-1.5" />
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            size="sm"
            className="flex-1"
            disabled={!query.trim()}
            data-testid="button-ari-send"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Ask Ari
          </Button>
        )}
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          disabled={streaming}
          data-testid="button-ari-clear"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </section>

      {mode === "er" && (
        <div className="shrink-0 flex items-start gap-2 p-2 rounded-md border border-destructive/30 bg-destructive/5 text-[10px] text-destructive">
          <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
          <span>ER Mode: response is not verified against live sources. Confirm before acting.</span>
        </div>
      )}

      <section className="flex-1 min-h-0 flex flex-col rounded-md border bg-card/50">
        <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Ari response
          </div>
          {response && (
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              data-testid="button-ari-copy"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 text-xs whitespace-pre-wrap break-words" data-testid="text-ari-response">
            {errorMsg ? (
              <p className="text-destructive" data-testid="text-ari-error">{errorMsg}</p>
            ) : response ? (
              <span>
                {response}
                {streaming && <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse align-middle" />}
              </span>
            ) : streaming ? (
              <span className="text-muted-foreground">Contacting Ari…</span>
            ) : (
              <span className="text-muted-foreground">
                Pick a capability, write your question, then Ask Ari. Responses stream in real time.
              </span>
            )}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
