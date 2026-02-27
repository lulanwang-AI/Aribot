import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Paperclip, FileText, Image, File, Users, Plus, Bot, Stethoscope, FlaskConical, ShieldCheck, Sparkles, BookOpen, Settings, Zap, ChevronLeft, ChevronRight, Globe, Building2, Brain, Activity, Target, Lightbulb, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { ChatThread, ChatMessage, User } from "@shared/schema";

export default function Chats() {
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showAssistant, setShowAssistant] = useState(false);

  const { data: threads, isLoading } = useQuery<ChatThread[]>({ queryKey: ["/api/chats"] });
  const { data: me } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chats", activeThread, "messages"],
    queryFn: () => fetch(`/api/chats/${activeThread}/messages`).then(r => r.json()),
    enabled: !!activeThread,
  });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const userMap = Object.fromEntries((allUsers || []).map(u => [u.id, u]));

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/chats/${activeThread}/messages`, { content: message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeThread, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getAttachmentIcon(type: string) {
    if (type === "pdf") return <FileText className="h-3 w-3" />;
    if (type === "png" || type === "jpg") return <Image className="h-3 w-3" />;
    return <File className="h-3 w-3" />;
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  const selected = threads?.find(t => t.id === activeThread);

  return (
    <div className="flex h-full" data-testid="page-chats">
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-lg font-semibold" data-testid="text-chats-title">Chats</h1>
          <Button size="sm" variant="outline" data-testid="button-new-chat">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {threads?.map(thread => (
            <button
              key={thread.id}
              onClick={() => setActiveThread(thread.id)}
              className={`w-full text-left p-3 border-b transition-colors hover:bg-muted/50 ${activeThread === thread.id ? "bg-muted" : ""}`}
              data-testid={`chat-thread-${thread.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {thread.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{thread.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(thread.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
                </div>
                {thread.unreadCount > 0 && (
                  <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                {selected.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.participants.length} participants</p>
              </div>
              <Button
                size="sm"
                variant={showAssistant ? "default" : "outline"}
                className="shrink-0 hidden lg:flex"
                onClick={() => setShowAssistant(!showAssistant)}
                data-testid="button-toggle-assistant"
              >
                <Bot className="h-3.5 w-3.5 mr-1.5" />
                AI Assistant
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto">
                {messages?.map(msg => {
                  const isMe = msg.senderId === "u1";
                  const sender = userMap[msg.senderId];
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                      <div className={`max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                        {!isMe && <p className="text-xs font-medium mb-1">{sender?.name || "Unknown"}</p>}
                        <p className="text-sm">{msg.content}</p>
                        {msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className={`flex items-center gap-1.5 text-xs ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {getAttachmentIcon(att.type)}
                                <span>{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <form
                className="flex items-center gap-2 max-w-2xl mx-auto"
                onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(); }}
              >
                <Button type="button" size="icon" variant="ghost" className="shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending} data-testid="button-send-message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative shrink-0 hidden lg:block">
        <button
          onClick={() => setShowAssistant(!showAssistant)}
          data-testid="button-assistant-panel-toggle"
          className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-10 h-12 w-5 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-r-0 rounded-l-md shadow-sm hover:bg-accent transition-colors"
        >
          {showAssistant ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showAssistant && <ChatAssistantPanel />}
      </div>
    </div>
  );
}

function ChatAssistantPanel() {
  const { toast } = useToast();
  const [selectedDepts, setSelectedDepts] = useState<string[]>(["Cardiology"]);
  const [responseMode, setResponseMode] = useState("balanced");
  const [selectedSources, setSelectedSources] = useState<string[]>(["WHO", "CDC", "UpToDate"]);
  const [evidenceLevel, setEvidenceLevel] = useState("all");
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [citeDirect, setCiteDirect] = useState(true);
  const [includeTrials, setIncludeTrials] = useState(true);
  const [showContraindications, setShowContraindications] = useState(true);
  const [drugInteractions, setDrugInteractions] = useState(false);
  const [patientFriendly, setPatientFriendly] = useState(false);
  const [language, setLanguage] = useState("technical");
  const [contextWindow, setContextWindow] = useState("thread");

  const departments = [
    "Cardiology", "Oncology", "Neurology", "Emergency Medicine", "Radiology",
    "Pediatrics", "Internal Medicine", "Surgery", "Infectious Disease",
    "Pulmonology", "Endocrinology", "Nephrology", "Psychiatry", "Dermatology",
    "Orthopedics", "Gastroenterology", "Hematology", "Rheumatology",
  ];

  const guideSources = [
    { id: "WHO", label: "WHO", icon: Globe },
    { id: "CDC", label: "CDC", icon: ShieldCheck },
    { id: "FDA", label: "FDA", icon: ShieldCheck },
    { id: "NIH", label: "NIH/NHLBI", icon: Building2 },
    { id: "UpToDate", label: "UpToDate", icon: BookOpen },
    { id: "Cochrane", label: "Cochrane", icon: FlaskConical },
    { id: "AHA", label: "AHA/ACC", icon: Activity },
    { id: "NCCN", label: "NCCN", icon: Target },
  ];

  function toggleDept(d: string) {
    setSelectedDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function toggleSource(s: string) {
    setSelectedSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  return (
    <div className="w-[320px] border-l bg-muted/10 overflow-y-auto shrink-0" data-testid="panel-chat-assistant">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI Assistant
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Personalize your clinical AI experience</p>
      </div>

      <Tabs defaultValue="focus" className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent h-9 p-0">
          <TabsTrigger value="focus" className="flex-1 rounded-none text-xs h-9 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none" data-testid="tab-focus">
            <Stethoscope className="h-3 w-3 mr-1" />
            Focus
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex-1 rounded-none text-xs h-9 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none" data-testid="tab-sources">
            <BookOpen className="h-3 w-3 mr-1" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1 rounded-none text-xs h-9 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none" data-testid="tab-behavior">
            <Settings className="h-3 w-3 mr-1" />
            Behavior
          </TabsTrigger>
        </TabsList>

        <TabsContent value="focus" className="p-4 mt-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Target className="h-3 w-3 text-primary" />
              Department / Specialty Focus
            </Label>
            <p className="text-[10px] text-muted-foreground">Answers will prioritize these areas</p>
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
              {departments.map(d => (
                <Badge
                  key={d}
                  variant={selectedDepts.includes(d) ? "default" : "outline"}
                  className="text-[10px] cursor-pointer transition-colors"
                  onClick={() => toggleDept(d)}
                  data-testid={`badge-dept-${d}`}
                >
                  {d}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-primary" />
              Response Mode
            </Label>
            <Select value={responseMode} onValueChange={setResponseMode}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-response-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guidelines">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> Strictly Guidelines (WHO, CDC, FDA)
                  </span>
                </SelectItem>
                <SelectItem value="evidence">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3" /> Evidence-Based (Clinical Trials)
                  </span>
                </SelectItem>
                <SelectItem value="novel">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" /> Novel Ideas & Emerging Research
                  </span>
                </SelectItem>
                <SelectItem value="balanced">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Balanced (All Sources)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {responseMode === "guidelines" && "Responses strictly reference established clinical guidelines and protocols."}
              {responseMode === "evidence" && "Focus on randomized trials, meta-analyses, and systematic reviews."}
              {responseMode === "novel" && "Highlight cutting-edge research, emerging therapies, and novel approaches."}
              {responseMode === "balanced" && "Blend guidelines, trial data, and recent literature for comprehensive answers."}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs font-medium">Evidence Level Filter</Label>
            <Select value={evidenceLevel} onValueChange={setEvidenceLevel}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-evidence-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1a">Level 1a — Systematic Reviews of RCTs</SelectItem>
                <SelectItem value="1b">Level 1b+ — Individual RCTs & Above</SelectItem>
                <SelectItem value="2">Level 2+ — Cohort Studies & Above</SelectItem>
                <SelectItem value="3">Level 3+ — Case-Control & Above</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="p-4 mt-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-primary" />
              Guideline & Reference Sources
            </Label>
            <p className="text-[10px] text-muted-foreground">Select which sources the AI should prioritize</p>
            <div className="space-y-1">
              {guideSources.map(src => {
                const Icon = src.icon;
                return (
                  <button
                    key={src.id}
                    onClick={() => toggleSource(src.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-colors ${
                      selectedSources.includes(src.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                    }`}
                    data-testid={`source-${src.id}`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${selectedSources.includes(src.id) ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium flex-1">{src.label}</span>
                    {selectedSources.includes(src.id) && (
                      <Badge variant="secondary" className="text-[9px]">Active</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs font-medium">Context Scope</Label>
            <Select value={contextWindow} onValueChange={setContextWindow}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-context-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thread">Current Thread Only</SelectItem>
                <SelectItem value="recent">Recent Conversations (7 days)</SelectItem>
                <SelectItem value="all">All Conversation History</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="p-4 mt-0 space-y-4">
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Settings className="h-3 w-3 text-primary" />
              Assistant Behavior
            </Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Auto-suggest responses</label>
                <Switch checked={autoSuggest} onCheckedChange={setAutoSuggest} data-testid="switch-auto-suggest" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Cite sources directly</label>
                <Switch checked={citeDirect} onCheckedChange={setCiteDirect} data-testid="switch-cite-direct" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Include clinical trial data</label>
                <Switch checked={includeTrials} onCheckedChange={setIncludeTrials} data-testid="switch-include-trials" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Show contraindications</label>
                <Switch checked={showContraindications} onCheckedChange={setShowContraindications} data-testid="switch-contraindications" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Flag drug interactions</label>
                <Switch checked={drugInteractions} onCheckedChange={setDrugInteractions} data-testid="switch-drug-interactions" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Patient-friendly language</label>
                <Switch checked={patientFriendly} onCheckedChange={setPatientFriendly} data-testid="switch-patient-friendly" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs font-medium">Response Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical / Clinical</SelectItem>
                <SelectItem value="simplified">Simplified Medical</SelectItem>
                <SelectItem value="academic">Academic / Research</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t space-y-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Assistant Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-muted-foreground">
              Active · {selectedDepts.length} dept{selectedDepts.length !== 1 ? "s" : ""} · {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Mode: {responseMode === "guidelines" ? "Guidelines" : responseMode === "evidence" ? "Evidence-Based" : responseMode === "novel" ? "Novel Ideas" : "Balanced"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 h-8 text-xs"
            onClick={() => toast({ title: "Settings saved", description: "Your AI assistant preferences have been updated." })}
            data-testid="button-save-assistant"
          >
            <Zap className="h-3 w-3 mr-1.5" />
            Apply
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setSelectedDepts(["Cardiology"]);
              setResponseMode("balanced");
              setSelectedSources(["WHO", "CDC", "UpToDate"]);
              setEvidenceLevel("all");
              toast({ title: "Reset", description: "Assistant settings reset to defaults." });
            }}
            data-testid="button-reset-assistant"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
