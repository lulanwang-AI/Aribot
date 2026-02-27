import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Copy, Shield, Sparkles, Stethoscope, FlaskConical, BookOpen, Scale, Globe, Microscope, FileText, Lightbulb, Activity, Save, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@shared/schema";

const STORAGE_KEY = "aribot_agent_config";

const SPECIALTIES = [
  "Cardiology", "Oncology", "Neurology", "Radiology", "Pediatrics",
  "Emergency Medicine", "Internal Medicine", "Surgery", "Pulmonology",
  "Endocrinology", "Gastroenterology", "Nephrology", "Rheumatology",
  "Infectious Disease", "Psychiatry", "Dermatology", "Ophthalmology",
  "Orthopedics", "Urology", "Obstetrics & Gynecology",
];

const EVIDENCE_SOURCES = [
  { id: "who", label: "WHO Guidelines", icon: Globe },
  { id: "cdc", label: "CDC Recommendations", icon: Shield },
  { id: "nice", label: "NICE Guidelines", icon: Scale },
  { id: "cochrane", label: "Cochrane Reviews", icon: BookOpen },
  { id: "uptodate", label: "UpToDate", icon: FileText },
  { id: "clinical-trials", label: "Clinical Trial Data", icon: FlaskConical },
  { id: "novel-research", label: "Novel Research / Preprints", icon: Lightbulb },
  { id: "meta-analyses", label: "Meta-Analyses & Systematic Reviews", icon: Microscope },
];

interface AgentConfig {
  focusDept: string;
  enabledSources: string[];
  evidenceLevel: string;
  citationFormat: string;
  complexityLevel: string;
  phiSafe: boolean;
  useProfile: boolean;
  drugInteractions: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  focusDept: "",
  enabledSources: ["who", "cdc", "cochrane", "uptodate"],
  evidenceLevel: "all",
  citationFormat: "inline",
  complexityLevel: "balanced",
  phiSafe: true,
  useProfile: true,
  drugInteractions: true,
};

function loadConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: AgentConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export default function Aribot() {
  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [config, setConfig] = useState<AgentConfig>(loadConfig);

  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: user?.specialty });
  }, [user?.specialty]);

  useEffect(() => {
    if (user) {
      setConfig(prev => {
        const stored = loadConfig();
        if (stored.focusDept) return prev;
        return { ...prev, focusDept: user.specialty || "", phiSafe: user.phiSafeMode };
      });
    }
  }, [user]);

  const updateConfig = useCallback((partial: Partial<AgentConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }, []);

  function toggleSource(id: string) {
    updateConfig({
      enabledSources: config.enabledSources.includes(id)
        ? config.enabledSources.filter(s => s !== id)
        : [...config.enabledSources, id],
    });
  }

  function handleCopyContext() {
    if (!user) return;
    const ctx = buildContextBlock(user, config);
    navigator.clipboard.writeText(ctx);
    toast({ title: "Context copied", description: "Paste it into Aribots AI to personalize your session." });
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-full">
        <Skeleton className="flex-1" />
        <Skeleton className="w-80" />
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="page-aribot">
      <div className="flex-1 min-w-0 p-3">
        <div className="dify-embed w-full h-full">
          <iframe
            src="https://udify.app/chatbot/oFFtZasRPIbLOTGb"
            frameBorder="0"
            allow="microphone"
            title="Aribots AI Chat"
            data-testid="iframe-aribot-chat"
          />
        </div>
      </div>

      <div className="relative shrink-0 hidden lg:flex">
        <button
          onClick={() => setShowPanel(!showPanel)}
          data-testid="button-panel-toggle"
          className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-10 h-12 w-5 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-r-0 rounded-l-md shadow-sm hover:bg-accent transition-colors"
        >
          {showPanel ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
        </button>

        <div
          className={`overflow-hidden transition-[width] duration-300 ease-in-out ${showPanel ? "w-80" : "w-0"}`}
        >
          <div
            className="w-80 border-l bg-card/50 flex flex-col h-full"
            data-testid="panel-right-sidebar"
          >
            <div className="p-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" data-testid="text-agent-title">Agentic Customization</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.name} · {user.specialty}
                  </p>
                </div>
                {saved && (
                  <div className="flex items-center gap-1 text-[10px] text-green-600 animate-in fade-in duration-200" data-testid="text-saved-indicator">
                    <Check className="h-3 w-3" />
                    Saved
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="focus" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent h-9 p-0">
                  <TabsTrigger value="focus" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-9" data-testid="tab-focus">
                    <Stethoscope className="h-3 w-3 mr-1" />
                    Focus
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-9" data-testid="tab-evidence">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Evidence
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="focus" className="mt-0 p-3 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Department / Specialty Focus</Label>
                    <Select value={config.focusDept} onValueChange={v => updateConfig({ focusDept: v })}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-focus-dept">
                        <SelectValue placeholder="Select specialty..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Aribots AI will tailor answers to this clinical area</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Clinical Complexity</Label>
                    <Select value={config.complexityLevel} onValueChange={v => updateConfig({ complexityLevel: v })}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-complexity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General — Broad, foundational</SelectItem>
                        <SelectItem value="intermediate">Intermediate — Residency level</SelectItem>
                        <SelectItem value="balanced">Balanced — Depth and breadth</SelectItem>
                        <SelectItem value="advanced">Advanced — Fellowship level</SelectItem>
                        <SelectItem value="subspecialist">Subspecialist — Deep detail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs font-medium">Context Toggles</Label>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <Sparkles className="h-3 w-3 text-primary/60" />
                          Use my profile
                        </label>
                        <Switch checked={config.useProfile} onCheckedChange={v => updateConfig({ useProfile: v })} data-testid="switch-use-profile" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <Shield className="h-3 w-3 text-primary/60" />
                          PHI-safe mode
                        </label>
                        <Switch checked={config.phiSafe} onCheckedChange={v => updateConfig({ phiSafe: v })} data-testid="switch-phi-safe" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <Activity className="h-3 w-3 text-primary/60" />
                          Flag drug interactions
                        </label>
                        <Switch checked={config.drugInteractions} onCheckedChange={v => updateConfig({ drugInteractions: v })} data-testid="switch-drug-interactions" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-0 p-3 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Active Evidence Sources</Label>
                    <p className="text-[10px] text-muted-foreground">Select which sources Aribots AI prioritizes in responses</p>
                    <div className="space-y-1">
                      {EVIDENCE_SOURCES.map(source => {
                        const Icon = source.icon;
                        const active = config.enabledSources.includes(source.id);
                        return (
                          <button
                            key={source.id}
                            onClick={() => toggleSource(source.id)}
                            className={`flex items-center gap-2.5 w-full p-2 rounded-md text-left text-xs transition-colors ${active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                            data-testid={`source-${source.id}`}
                          >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : ""}`} />
                            <span className={active ? "font-medium" : ""}>{source.label}</span>
                            <div className={`ml-auto h-2 w-2 rounded-full shrink-0 ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-medium">Evidence Level Filter</Label>
                    <Select value={config.evidenceLevel} onValueChange={v => updateConfig({ evidenceLevel: v })}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-evidence-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Evidence Levels</SelectItem>
                        <SelectItem value="level-1">Level I – RCTs & Systematic Reviews only</SelectItem>
                        <SelectItem value="level-1-2">Level I–II – Include Cohort Studies</SelectItem>
                        <SelectItem value="level-1-3">Level I–III – Include Case-Control</SelectItem>
                        <SelectItem value="expert">Include Expert Opinion</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Filter responses by strength of evidence</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-medium">Citation Format</Label>
                    <Select value={config.citationFormat} onValueChange={v => updateConfig({ citationFormat: v })}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-citation-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inline">Inline (Author, Year)</SelectItem>
                        <SelectItem value="numbered">Numbered References</SelectItem>
                        <SelectItem value="ama">AMA Style</SelectItem>
                        <SelectItem value="none">No Citations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="p-3 border-t">
              <Button size="sm" className="w-full text-xs" onClick={handleCopyContext} data-testid="button-copy-context">
                <Copy className="h-3 w-3 mr-1.5" />
                Copy Context to Aribots AI
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                Paste into chat to apply your configuration
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function buildContextBlock(user: User, config: AgentConfig): string {
  const sourceLabels = EVIDENCE_SOURCES.filter(s => config.enabledSources.includes(s.id)).map(s => s.label);
  return `CLINICIAN PROFILE CONTEXT (for personalization)
- Name: ${user.name}
- Specialty: ${user.specialty}
- Subspecialty: ${user.subspecialty}
- Hospital: ${user.hospital}
- Focus Area: ${config.focusDept || user.specialty}
- Interests: ${user.interests.join(", ")}

AGENT CONFIGURATION:
- Evidence Sources: ${sourceLabels.join(", ")}
- Evidence Level Filter: ${config.evidenceLevel}
- Clinical Complexity: ${config.complexityLevel}
- Citation Format: ${config.citationFormat}
- Drug Interaction Alerts: ${config.drugInteractions ? "enabled" : "disabled"}

INSTRUCTIONS:
- Prioritize answers within the ${config.focusDept || user.specialty} domain
- Use evidence-first reasoning, citing primary sources
- Format: concise clinician-facing language
- Ask clarifying questions when the query is ambiguous

SAFETY:
- PHI-safe mode: ${config.phiSafe ? "ENABLED – do not include any patient identifiers" : "disabled"}
- This is a clinician-to-AI discussion, not patient-facing advice`;
}
