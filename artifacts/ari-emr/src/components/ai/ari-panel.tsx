import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Send, Loader2, Stethoscope, MessageSquareText } from "lucide-react";
import ariLogo from "@assets/aribot-mark-primary-1024_1785138240677.png";

interface AriMessage {
  role: "user" | "ari";
  content: string;
  differentials?: Array<{ diagnosis: string; likelihood: string; rationale: string; workup: string }>;
}

const likelihoodStyle: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export function AriAvatar({ size = 8 }: { size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white border border-border shadow-sm flex items-center justify-center p-1 shrink-0`}>
      <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
    </div>
  );
}

export default function AriPanel({
  patientId,
  patientName,
  open,
  onOpenChange,
}: {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"qa" | "differential">("qa");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AriMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery<{ available: boolean }>({ queryKey: ["/api/ari/status"] });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ask = useMutation({
    mutationFn: async ({ text, m }: { text: string; m: "qa" | "differential" }) => {
      if (m === "qa") {
        const res = await apiRequest("POST", "/api/ari/chart-qa", { patientId, question: text });
        return { kind: "qa" as const, data: await res.json() };
      }
      const res = await apiRequest("POST", "/api/ari/differential", { patientId, presentation: text });
      return { kind: "diff" as const, data: await res.json() };
    },
    onSuccess: (r) => {
      if (r.kind === "qa") {
        setMessages((p) => [...p, { role: "ari", content: r.data.answer }]);
      } else {
        setMessages((p) => [...p, {
          role: "ari",
          content: r.data.disclaimer,
          differentials: r.data.differentials,
        }]);
      }
    },
    onError: () => setMessages((p) => [...p, { role: "ari", content: "Sorry — I couldn't process that. Please try again." }]),
  });

  const send = () => {
    const text = input.trim();
    if (!text || ask.isPending) return;
    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    ask.mutate({ text, m: mode });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <AriAvatar size={10} />
            <div>
              <SheetTitle className="text-base">Ari</SheetTitle>
              <SheetDescription className="text-xs">
                Chart assistant for {patientName}
                {status && !status.available && " · limited mode (no AI key)"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant={mode === "qa" ? "default" : "outline"} onClick={() => setMode("qa")} data-testid="button-ari-mode-qa">
              <MessageSquareText className="w-3.5 h-3.5 mr-1.5" /> Chart Q&A
            </Button>
            <Button size="sm" variant={mode === "differential" ? "default" : "outline"} onClick={() => setMode("differential")} data-testid="button-ari-mode-differential">
              <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> Differential
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground pt-10 space-y-2">
              <p className="font-medium text-sm text-foreground">Ask Ari about this chart</p>
              <p>{mode === "qa"
                ? `Try: "What changed since the last visit?" or "Summarize active problems and meds."`
                : `Describe the presentation, e.g. "58yo with 2 days of productive cough and low-grade fever."`}</p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "ari" && <AriAvatar />}
                <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                  {m.differentials && (
                    <div className="mt-3 space-y-2">
                      {m.differentials.map((d, j) => (
                        <div key={j} className="bg-background rounded-md border border-border p-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-xs">{d.diagnosis}</p>
                            <Badge variant="outline" className={`text-[10px] ${likelihoodStyle[d.likelihood] ?? ""}`}>{d.likelihood}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{d.rationale}</p>
                          <p className="text-[11px] mt-1"><span className="font-medium">Workup:</span> {d.workup}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex gap-2.5">
                <AriAvatar />
                <div className="bg-muted rounded-lg p-3 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Ari is thinking…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={mode === "qa" ? "Ask about this patient's chart…" : "Describe the clinical presentation…"}
              className="min-h-[44px] max-h-32 text-sm resize-none"
              data-testid="input-ari-message"
            />
            <Button onClick={send} disabled={!input.trim() || ask.isPending} size="icon" className="shrink-0 self-end" data-testid="button-ari-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Decision support only — verify with clinical judgment.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
