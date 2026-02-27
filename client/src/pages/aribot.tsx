import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Copy, User as UserIcon, Shield, Sparkles, Stethoscope, FlaskConical, BookOpen, Scale, Globe, Microscope, FileText, Lightbulb, Activity, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

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

const RESPONSE_STYLES = [
  { value: "concise", label: "Concise", desc: "Brief, bullet-point answers" },
  { value: "detailed", label: "Detailed", desc: "Thorough explanations with citations" },
  { value: "socratic", label: "Socratic", desc: "Guides through reasoning with questions" },
  { value: "differential", label: "Differential", desc: "Structured differential diagnosis format" },
];

export default function Aribot() {
  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { toast } = useToast();

  const [focusDept, setFocusDept] = useState("");
  const [enabledSources, setEnabledSources] = useState<string[]>(["who", "cdc", "cochrane", "uptodate"]);
  const [responseStyle, setResponseStyle] = useState("detailed");
  const [evidenceLevel, setEvidenceLevel] = useState("all");
  const [citationFormat, setCitationFormat] = useState("inline");
  const [complexityLevel, setComplexityLevel] = useState("balanced");
  const [phiSafe, setPhiSafe] = useState(true);
  const [useProfile, setUseProfile] = useState(true);
  const [drugInteractions, setDrugInteractions] = useState(true);
  const [patientEducation, setPatientEducation] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);

  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: user?.specialty });
  }, [user?.specialty]);

  useEffect(() => {
    if (user) {
      setPhiSafe(user.phiSafeMode);
      setFocusDept(user.specialty || "");
    }
  }, [user]);

  function toggleSource(id: string) {
    setEnabledSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function handleCopyContext() {
    if (!user) return;
    const ctx = buildContextBlock(user, phiSafe, focusDept, enabledSources, responseStyle, evidenceLevel);
    navigator.clipboard.writeText(ctx);
    toast({ title: "Context copied", description: "Paste it into Aribot to personalize your session." });
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
            title="Aribot Chat"
            data-testid="iframe-aribot-chat"
          />
        </div>
      </div>

      <div className="w-80 border-l bg-card/50 flex flex-col shrink-0 hidden lg:flex" data-testid="panel-right-sidebar">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" data-testid="text-agent-title">Aribot Agent</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user.name} · {user.specialty}
              </p>
            </div>
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
              <TabsTrigger value="behavior" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-9" data-testid="tab-behavior">
                <Brain className="h-3 w-3 mr-1" />
                Behavior
              </TabsTrigger>
            </TabsList>

            <TabsContent value="focus" className="mt-0 p-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Department / Specialty Focus</Label>
                <Select value={focusDept} onValueChange={setFocusDept}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-focus-dept">
                    <SelectValue placeholder="Select specialty..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Aribot will tailor answers to this clinical area</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Clinical Complexity</Label>
                <Select value={complexityLevel} onValueChange={setComplexityLevel}>
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
                    <Switch checked={useProfile} onCheckedChange={setUseProfile} data-testid="switch-use-profile" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                      <Shield className="h-3 w-3 text-primary/60" />
                      PHI-safe mode
                    </label>
                    <Switch checked={phiSafe} onCheckedChange={setPhiSafe} data-testid="switch-phi-safe" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                      <Activity className="h-3 w-3 text-primary/60" />
                      Flag drug interactions
                    </label>
                    <Switch checked={drugInteractions} onCheckedChange={setDrugInteractions} data-testid="switch-drug-interactions" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="evidence" className="mt-0 p-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Active Evidence Sources</Label>
                <p className="text-[10px] text-muted-foreground">Select which sources Aribot prioritizes in responses</p>
                <div className="space-y-1">
                  {EVIDENCE_SOURCES.map(source => {
                    const Icon = source.icon;
                    const active = enabledSources.includes(source.id);
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
                <Select value={evidenceLevel} onValueChange={setEvidenceLevel}>
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
                <Select value={citationFormat} onValueChange={setCitationFormat}>
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

            <TabsContent value="behavior" className="mt-0 p-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Response Style</Label>
                <div className="space-y-1">
                  {RESPONSE_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => setResponseStyle(style.value)}
                      className={`flex flex-col gap-0.5 w-full p-2 rounded-md text-left transition-colors ${responseStyle === style.value ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      data-testid={`style-${style.value}`}
                    >
                      <span className={`text-xs ${responseStyle === style.value ? "font-medium text-foreground" : "text-muted-foreground"}`}>{style.label}</span>
                      <span className="text-[10px] text-muted-foreground">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-medium">Output Options</Label>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground cursor-pointer">Generate patient handouts</label>
                    <Switch checked={patientEducation} onCheckedChange={setPatientEducation} data-testid="switch-patient-ed" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground cursor-pointer">Include diagrams / images</label>
                    <Switch checked={includeImages} onCheckedChange={setIncludeImages} data-testid="switch-images" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-3 border-t">
          <Button size="sm" className="w-full text-xs" onClick={handleCopyContext} data-testid="button-copy-context">
            <Copy className="h-3 w-3 mr-1.5" />
            Copy Context to Aribot
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Paste into chat to apply your configuration
          </p>
        </div>
      </div>
    </div>
  );
}

function buildContextBlock(
  user: User,
  phiSafe: boolean,
  focusDept: string,
  enabledSources: string[],
  responseStyle: string,
  evidenceLevel: string,
): string {
  const sourceLabels = EVIDENCE_SOURCES.filter(s => enabledSources.includes(s.id)).map(s => s.label);
  return `CLINICIAN PROFILE CONTEXT (for personalization)
- Name: ${user.name}
- Specialty: ${user.specialty}
- Subspecialty: ${user.subspecialty}
- Hospital: ${user.hospital}
- Focus Area: ${focusDept || user.specialty}
- Interests: ${user.interests.join(", ")}

AGENT CONFIGURATION:
- Evidence Sources: ${sourceLabels.join(", ")}
- Evidence Level Filter: ${evidenceLevel}
- Response Style: ${responseStyle}
- Citation Format: inline

INSTRUCTIONS:
- Prioritize answers within the ${focusDept || user.specialty} domain
- Use evidence-first reasoning, citing primary sources
- Format: concise clinician-facing language
- Ask clarifying questions when the query is ambiguous

SAFETY:
- PHI-safe mode: ${phiSafe ? "ENABLED – do not include any patient identifiers" : "disabled"}
- This is a clinician-to-AI discussion, not patient-facing advice`;
}
