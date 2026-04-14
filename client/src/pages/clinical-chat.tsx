import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePatientStore } from "@/store/patientStore";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Bot, User, Loader2, BookmarkPlus, AlertTriangle,
  ChevronRight, ChevronLeft, FileText, Pill, Stethoscope, FlaskConical,
  Shield, Activity, Sparkles, MessageCircle
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What are the likely differentials?",
  "Check for drug interactions",
  "What do guidelines recommend?",
  "What workup is indicated?",
];

interface ParsedSource {
  id: number;
  title: string;
  level: string;
  confidence: "High" | "Moderate" | "Low";
}

function parseSourcesFromContent(content: string): ParsedSource[] {
  const sources: ParsedSource[] = [];
  const regex = /\[(\d+)\]\s*([^[\n]+?)(?:\s*\(([^)]+)\))?(?:\n|$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = parseInt(match[1]);
    const title = match[2].trim();
    const level = match[3]?.trim() || "Clinical Reference";
    const confidence: "High" | "Moderate" | "Low" =
      level.toLowerCase().includes("rct") || level.toLowerCase().includes("meta")
        ? "High"
        : level.toLowerCase().includes("guideline")
          ? "Moderate"
          : "Low";
    if (!sources.find(s => s.id === id)) {
      sources.push({ id, title, level, confidence });
    }
  }
  return sources;
}

function ConfidenceTag({ level }: { level: "High" | "Moderate" | "Low" }) {
  const colors = {
    High: "bg-green-100 text-green-700 border-green-200",
    Moderate: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[level]}`} data-testid={`confidence-${level.toLowerCase()}`}>
      {level}
    </Badge>
  );
}

function SourceChip({ source }: { source: ParsedSource }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border text-xs" data-testid={`source-chip-${source.id}`}>
      <FileText className="h-3 w-3 text-primary shrink-0" />
      <span className="flex-1 truncate font-medium">{source.title}</span>
      <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">{source.level}</Badge>
      <ConfidenceTag level={source.confidence} />
    </div>
  );
}

function PatientContextBar() {
  const { name, chiefComplaint, allergies, medications } = usePatientStore();
  if (!name) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b text-xs" data-testid="patient-context-bar">
      <Badge variant="outline" className="gap-1 shrink-0">
        <User className="h-3 w-3" /> {name}
      </Badge>
      {chiefComplaint && (
        <span className="text-muted-foreground truncate">
          <strong>CC:</strong> {chiefComplaint}
        </span>
      )}
      {allergies && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 gap-0.5">
          <AlertTriangle className="h-2.5 w-2.5" /> Allergies
        </Badge>
      )}
      {medications && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 gap-0.5">
          <Pill className="h-2.5 w-2.5" /> {medications.split("\n").filter(Boolean).length} meds
        </Badge>
      )}
    </div>
  );
}

export default function ClinicalChat() {
  const [, setLocation] = useLocation();
  const store = usePatientStore();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [store.chatMessages, scrollToBottom]);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;
    const userMsg = text.trim();
    setInput("");
    const priorHistory = store.chatMessages
      .filter(m => m.content)
      .map(m => ({ role: m.role, content: m.content }));
    store.addChatMessage({ role: "user", content: userMsg });
    store.addChatMessage({ role: "assistant", content: "" });
    setIsStreaming(true);

    try {
      const res = await fetch("/api/clinical-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          patientContext: {
            name: store.name,
            dob: store.dob,
            mrn: store.mrn,
            sex: store.sex,
            preferredLanguage: store.preferredLanguage,
            specialty: store.specialty,
            visitType: store.visitType,
            chiefComplaint: store.chiefComplaint,
            vitals: store.vitals,
            painScore: store.painScore,
            lmp: store.lmp,
            smokingStatus: store.smokingStatus,
            alcoholUse: store.alcoholUse,
            medications: store.medications,
            allergies: store.allergies,
            pmh: store.pmh,
            psh: store.psh,
            familyHistory: store.familyHistory,
            recentResults: store.recentResults,
            encounterPrimer: store.encounterPrimer,
            preChartComplete: store.preChartComplete,
            uploadedDocuments: store.uploadedDocuments.map(d => ({ name: d.name, type: d.type, content: d.content.slice(0, 2000) })),
          },
          history: priorHistory,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          store.appendToLastAssistant(chunk);
          scrollToBottom();
        }
      }
    } catch {
      store.appendToLastAssistant("\n\n*[Error: Failed to get response. Please try again.]*");
      toast({ title: "Chat error", description: "Failed to get AI response", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const [integrating, setIntegrating] = useState<number | null>(null);

  async function saveToSoap(content: string, msgIndex: number) {
    setIntegrating(msgIndex);
    try {
      const patientContext = store.patient
        ? `${store.patient.name}, ${store.patient.sex}, DOB ${store.patient.dob}, Chief Complaint: ${store.patient.chiefComplaint}`
        : "";

      const res = await fetch("/api/soap/integrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: content,
          currentSoap: store.soapDraft,
          patientContext,
        }),
      });

      if (!res.ok) throw new Error("Integration failed");

      const updated = await res.json();
      store.updateSoapSection("S", updated.S || store.soapDraft.S);
      store.updateSoapSection("O", updated.O || store.soapDraft.O);
      store.updateSoapSection("A", updated.A || store.soapDraft.A);
      store.updateSoapSection("P", updated.P || store.soapDraft.P);

      toast({ title: "Integrated into SOAP", description: "AI merged the information across all relevant SOAP sections." });
    } catch {
      const current = store.soapDraft.A;
      store.updateSoapSection("A", current ? current + "\n\n" + content : content);
      toast({ title: "Saved to SOAP Assessment", description: "AI integration unavailable — appended to Assessment." });
    } finally {
      setIntegrating(null);
    }
  }

  const allSources = store.chatMessages
    .filter(m => m.role === "assistant" && m.content)
    .flatMap(m => parseSourcesFromContent(m.content));
  const uniqueSources = allSources.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PatientContextBar />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="text-clinical-chat-title">ARIbot Consult</h1>
            {!store.preChartComplete && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] ml-2 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> No pre-charting data
              </Badge>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {store.chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">ARIbot Consult</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Ask clinical questions about your patient. ARI provides evidence-based answers with source citations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(prompt)}
                      data-testid={`button-prompt-${prompt.split(" ").slice(0, 3).join("-").toLowerCase()}`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {store.chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
                  : "bg-muted/60 rounded-2xl rounded-bl-md px-4 py-2.5 border"
                }`} data-testid={`chat-message-${msg.role}-${i}`}>
                  {msg.role === "assistant" && msg.content === "" && isStreaming ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && msg.content && !isStreaming && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 gap-1"
                        onClick={() => saveToSoap(msg.content, i)}
                        disabled={integrating !== null}
                        data-testid={`button-save-soap-${i}`}
                      >
                        {integrating === i ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Integrating into SOAP...</>
                        ) : (
                          <><BookmarkPlus className="h-3 w-3" /> Integrate into SOAP</>
                        )}
                      </Button>
                      {parseSourcesFromContent(msg.content).length === 0 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-200 gap-0.5">
                          <AlertTriangle className="h-2 w-2" /> No citations
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t">
            {store.chatMessages.length > 0 && !isStreaming && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 px-2"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a clinical question... (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="resize-none"
                disabled={isStreaming}
                data-testid="input-chat-message"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="shrink-0 self-end h-10 w-10"
                data-testid="button-send-chat"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className={`border-l transition-all duration-300 ${sourcesOpen ? "w-72" : "w-8"}`}>
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="w-full h-10 flex items-center justify-center border-b hover:bg-muted/50 transition-colors"
            data-testid="button-toggle-sources"
          >
            {sourcesOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          {sourcesOpen && (
            <div className="p-3 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evidence Sources</h3>
              {uniqueSources.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sources will appear here as you chat.</p>
              ) : (
                uniqueSources.map(src => <SourceChip key={src.id} source={src} />)
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setLocation("/soap")} className="gap-1 text-xs" data-testid="button-go-soap">
          Continue to SOAP Note <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
