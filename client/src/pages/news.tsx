import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { Newspaper, Search, ExternalLink, Clock, BookOpen, Heart, MessageSquare, Send, Reply, Share2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User as UserIcon, FileText, Bot, Settings, Sparkles, Zap, Filter, Bell, Plus, X, RefreshCw, Wand2, SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { NewsItem, NewsComment, User } from "@shared/schema";

const SOURCES = ["All", "NEJM", "The Lancet", "JAMA", "BMJ", "Nature Medicine"];
const SPECIALTIES = ["All", "Cardiology", "Oncology", "Neurology", "Emergency Medicine", "Radiology", "Pediatrics", "Internal Medicine", "Surgery", "Infectious Disease"];

type DetailComment = NewsComment & { author: { name: string; specialty: string; avatarUrl: string } | null };

type NewsItemWithCommenters = NewsItem & {
  commenters?: { id: string; name: string; avatarUrl: string }[];
};

export default function News() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All");
  const [specialty, setSpecialty] = useState("All");
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [fullArticleItem, setFullArticleItem] = useState<NewsItemWithCommenters | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(true);

  const queryParams = new URLSearchParams();
  if (source !== "All") queryParams.set("source", source);
  if (specialty !== "All") queryParams.set("specialty", specialty.toLowerCase().replace(/ /g, "-"));
  if (search) queryParams.set("search", search);
  const qs = queryParams.toString();

  const { data: news, isLoading } = useQuery<NewsItemWithCommenters[]>({
    queryKey: ["/api/news", qs],
    queryFn: () => fetch(`/api/news${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });

  useEffect(() => {
    recordEvent("page_view", { section: "news" });
  }, []);

  return (
    <div className="flex h-full relative" data-testid="page-news">
      <div className={`flex-1 min-w-0 p-4 md:p-6 overflow-auto ${showAgentPanel ? "max-w-4xl" : "max-w-5xl mx-auto"}`}>
        <div className="mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-news-title">
            <Newspaper className="h-5 w-5 text-primary" />
            News AI
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-powered research discovery from top medical journals
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-news"
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-44" data-testid="select-source">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-48" data-testid="select-specialty">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>}

        {!isLoading && news?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No articles match your filters</p>
          </div>
        )}

        <div className="space-y-3">
          {news?.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              onOpenComments={() => setSelectedNewsId(item.id)}
              onOpenFullArticle={() => setFullArticleItem(item)}
            />
          ))}
        </div>
      </div>

      <div className="relative shrink-0 hidden lg:flex">
        <button
          onClick={() => setShowAgentPanel(!showAgentPanel)}
          data-testid="button-agent-panel-toggle"
          className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-10 h-12 w-5 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-r-0 rounded-l-md shadow-sm hover:bg-accent transition-colors"
        >
          {showAgentPanel ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
        </button>
        <div className={`overflow-hidden transition-[width] duration-300 ease-in-out ${showAgentPanel ? "w-[320px]" : "w-0"}`}>
          <AgentConfigPanel />
        </div>
      </div>

      <NewsDetailSheet newsId={selectedNewsId} open={!!selectedNewsId} onClose={() => setSelectedNewsId(null)} />
      <FullArticleSheet item={fullArticleItem} open={!!fullArticleItem} onClose={() => setFullArticleItem(null)} />
    </div>
  );
}

function AgentConfigPanel() {
  const [agentName, setAgentName] = useState("My Research Agent");
  const [selectedSources, setSelectedSources] = useState<string[]>(["NEJM", "The Lancet", "JAMA", "BMJ", "Nature Medicine"]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Cardiology", "Clinical Trials"]);
  const [summaryLength, setSummaryLength] = useState("medium");
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [highlightBreakthroughs, setHighlightBreakthroughs] = useState(true);
  const [includeAbstract, setIncludeAbstract] = useState(true);
  const [citationStyle, setCitationStyle] = useState("ama");
  const [frequency, setFrequency] = useState("daily");
  const [newTopic, setNewTopic] = useState("");
  const { toast } = useToast();

  const allTopics = ["Cardiology", "Oncology", "Neurology", "Emergency Medicine", "Radiology", "Pediatrics", "Internal Medicine", "Surgery", "Infectious Disease", "Clinical Trials", "AI in Medicine", "Gene Therapy", "Immunotherapy", "Precision Medicine", "Digital Health"];

  function toggleSource(s: string) {
    setSelectedSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleTopic(t: string) {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function addCustomTopic() {
    if (newTopic.trim() && !selectedTopics.includes(newTopic.trim())) {
      setSelectedTopics(prev => [...prev, newTopic.trim()]);
      setNewTopic("");
    }
  }

  return (
    <div className="w-[320px] border-l bg-muted/10 overflow-y-auto shrink-0" data-testid="panel-agent-config">
      <div className="p-4 border-b">
        <div className="mb-1">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            News AI Agent
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground">Configure your personal research agent</p>
      </div>

      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Wand2 className="h-3 w-3 text-primary" />
            Agent Name
          </Label>
          <Input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-agent-name"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-primary" />
            Journal Sources
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {["NEJM", "The Lancet", "JAMA", "BMJ", "Nature Medicine"].map(s => (
              <Badge
                key={s}
                variant={selectedSources.includes(s) ? "default" : "outline"}
                className="text-[10px] cursor-pointer transition-colors"
                onClick={() => toggleSource(s)}
                data-testid={`badge-source-${s}`}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary" />
            Topics of Interest
          </Label>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
            {allTopics.map(t => (
              <Badge
                key={t}
                variant={selectedTopics.includes(t) ? "default" : "outline"}
                className="text-[10px] cursor-pointer transition-colors"
                onClick={() => toggleTopic(t)}
                data-testid={`badge-topic-${t}`}
              >
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              placeholder="Add custom topic..."
              className="h-7 text-xs flex-1"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomTopic()}
              data-testid="input-custom-topic"
            />
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0" onClick={addCustomTopic}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Settings className="h-3 w-3 text-primary" />
            Agent Behavior
          </Label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Auto-summarize articles</label>
              <Switch checked={autoSummarize} onCheckedChange={setAutoSummarize} data-testid="switch-auto-summarize" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Highlight breakthroughs</label>
              <Switch checked={highlightBreakthroughs} onCheckedChange={setHighlightBreakthroughs} data-testid="switch-highlight" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Include abstract</label>
              <Switch checked={includeAbstract} onCheckedChange={setIncludeAbstract} data-testid="switch-include-abstract" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Daily email digest</label>
              <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} data-testid="switch-daily-digest" />
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-medium">Summary Length</Label>
          <Select value={summaryLength} onValueChange={setSummaryLength}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-summary-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brief">Brief (1-2 sentences)</SelectItem>
              <SelectItem value="medium">Medium (paragraph)</SelectItem>
              <SelectItem value="detailed">Detailed (full breakdown)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Citation Format</Label>
          <Select value={citationStyle} onValueChange={setCitationStyle}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-citation-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ama">AMA Style</SelectItem>
              <SelectItem value="apa">APA Style</SelectItem>
              <SelectItem value="vancouver">Vancouver Style</SelectItem>
              <SelectItem value="harvard">Harvard Style</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Scan Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Every hour</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pt-3 border-t">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Agent Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-muted-foreground">Active · Scanning 5 journals</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Last scan: 12 min ago · 3 new articles found</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 h-8 text-xs"
            onClick={() => toast({ title: "Agent updated", description: "Your News AI agent configuration has been saved." })}
            data-testid="button-save-agent"
          >
            <Zap className="h-3 w-3 mr-1.5" />
            Save Agent
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs"
            onClick={() => toast({ title: "Scanning...", description: "Your agent is scanning journals for new articles." })}
            data-testid="button-run-agent"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewsCard({ item, onOpenComments, onOpenFullArticle }: { item: NewsItemWithCommenters; onOpenComments: () => void; onOpenFullArticle: () => void }) {
  const isLiked = item.likes?.includes("u1");
  const [expanded, setExpanded] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news/${item.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
  });

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-news-${item.id}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
              <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
              <span className="text-xs text-blue-500 font-medium">{item.source}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              onClick={onOpenFullArticle}
              title="View full article"
              data-testid={`button-full-article-${item.id}`}
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.summary}</p>

          {expanded && (
            <div className="pt-2 pb-1 space-y-3 border-t animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs">
                <UserIcon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{item.researcherName}</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {renderMarkdownLight(item.abstract)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={`${tag}-${idx}`} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
              {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {item.readingTime} min
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(item.publishedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant={isLiked ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              data-testid={`button-like-news-${item.id}`}
            >
              <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {item.likes?.length || 0}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onOpenComments}
              data-testid={`button-comments-news-${item.id}`}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {item.commentCount || 0}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowShareDialog(true)}
              data-testid={`button-share-news-${item.id}`}
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs ml-auto"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-news-${item.id}`}
            >
              {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {expanded ? "Less" : "Abstract"}
            </Button>
            {item.commenters && item.commenters.length > 0 && (
              <div className="flex items-center -space-x-1.5 ml-1" data-testid={`commenters-news-${item.id}`}>
                {item.commenters.slice(0, 4).map(c => (
                  <Avatar key={c.id} className="h-5 w-5 ring-2 ring-background" title={c.name}>
                    <AvatarImage src={c.avatarUrl} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {item.commenters.length > 4 && (
                  <span className="text-[10px] text-muted-foreground ml-2">+{item.commenters.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <ShareNewsDialog open={showShareDialog} onClose={() => setShowShareDialog(false)} newsItem={item} />
    </>
  );
}

function renderMarkdownLight(text: string): JSX.Element[] {
  if (!text) return [];
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return <p key={i} className={line === "" ? "h-2" : ""}>{parts}</p>;
  });
}

function ShareNewsDialog({ open, onClose, newsItem }: { open: boolean; onClose: () => void; newsItem: NewsItem }) {
  const { data: doctors } = useQuery<User[]>({ queryKey: ["/api/doctors"] });
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filtered = doctors?.filter(d =>
    d.id !== "u1" && (!searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 10);

  function handleShare(doctor: User) {
    toast({ title: "Article shared", description: `Sent "${newsItem.title}" to ${doctor.name}` });
    onClose();
    setSearchQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setSearchQuery(""); } }}>
      <DialogContent className="max-w-sm" data-testid="dialog-share-news">
        <DialogHeader>
          <DialogTitle className="text-sm">Share Article</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground line-clamp-1 -mt-2">{newsItem.title}</p>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="input-share-search"
          />
        </div>
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {filtered?.map(doctor => (
            <button
              key={doctor.id}
              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
              onClick={() => handleShare(doctor)}
              data-testid={`button-share-to-${doctor.id}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={doctor.avatarUrl} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {doctor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{doctor.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{doctor.specialty}</p>
              </div>
              <Send className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
            </button>
          ))}
          {filtered?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No doctors found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FullArticleSheet({ item, open, onClose }: { item: NewsItemWithCommenters | null; open: boolean; onClose: () => void }) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-[520px] sm:w-[580px] overflow-y-auto" data-testid="sheet-full-article">
        <SheetHeader>
          <SheetTitle className="text-left text-base leading-snug pr-4">{item.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge className="text-xs">{item.source}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {item.readingTime} min read
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30">
            <UserIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium">{item.researcherName}</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Abstract</h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line space-y-1">
              {renderMarkdownLight(item.abstract)}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2 border-t">
            {item.tags.map((tag, idx) => (
              <Badge key={`${tag}-${idx}`} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Heart className="h-3 w-3" /> {item.likes?.length || 0} likes
            <span className="mx-1">·</span>
            <MessageSquare className="h-3 w-3" /> {item.commentCount || 0} comments
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NewsDetailSheet({ newsId, open, onClose }: { newsId: string | null; open: boolean; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery<NewsItem & { comments: DetailComment[] }>({
    queryKey: ["/api/news", newsId],
    queryFn: () => fetch(`/api/news/${newsId}`).then(r => r.json()),
    enabled: !!newsId && open,
  });

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto" data-testid="sheet-news-detail">
        <SheetHeader>
          <SheetTitle className="text-left text-sm leading-snug">{detail?.title}</SheetTitle>
          {detail && <span className="text-xs text-blue-500 font-medium">{detail.source}</span>}
        </SheetHeader>
        {isLoading && <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>}
        {detail && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{detail.summary}</p>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Comments ({detail.comments?.length || 0})</h3>
              {detail.comments?.filter(c => !c.parentId).map(comment => (
                <NewsCommentCard key={comment.id} comment={comment} newsId={newsId!} allComments={detail.comments} />
              ))}
              <AddNewsComment newsId={newsId!} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NewsCommentCard({ comment, newsId, allComments }: { comment: DetailComment; newsId: string; allComments: DetailComment[] }) {
  const [showReply, setShowReply] = useState(false);
  const isLiked = comment.likes?.includes("u1");
  const children = allComments.filter(c => c.parentId === comment.id);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news-comments/${comment.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/news", newsId] }),
  });

  const initials = comment.author?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";

  return (
    <div className="space-y-1">
      <div className="p-3 rounded-md bg-muted/30" data-testid={`news-comment-${comment.id}`}>
        <div className="flex items-center gap-2 mb-1">
          {comment.author && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
          )}
          <span className="text-xs font-medium">{comment.author?.name || "Unknown"}</span>
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm mb-1.5">{comment.content}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => likeMutation.mutate()} disabled={likeMutation.isPending}>
            <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current text-red-500" : ""}`} />
            {comment.likes?.length || 0}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setShowReply(!showReply)}>
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        </div>
        {showReply && (
          <div className="mt-2">
            <AddNewsComment newsId={newsId} parentId={comment.id} compact onDone={() => setShowReply(false)} />
          </div>
        )}
      </div>
      {children.length > 0 && (
        <div className="ml-6 space-y-1">
          {children.map(child => (
            <NewsCommentCard key={child.id} comment={child} newsId={newsId} allComments={allComments} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddNewsComment({ newsId, parentId, compact, onDone }: { newsId: string; parentId?: string; compact?: boolean; onDone?: () => void }) {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news/${newsId}/comments`, { content, parentId: parentId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", newsId] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setContent("");
      toast({ title: "Comment added" });
      onDone?.();
    },
  });

  return (
    <div className={`flex gap-2 ${compact ? "" : "pt-2"}`}>
      <Textarea
        placeholder={parentId ? "Write a reply..." : "Add a comment..."}
        value={content}
        onChange={e => setContent(e.target.value)}
        className="min-h-[50px] text-sm"
        data-testid={parentId ? `input-news-reply-${parentId}` : "input-news-comment"}
      />
      <Button size="sm" className="shrink-0 h-auto" onClick={() => mutation.mutate()} disabled={!content.trim() || mutation.isPending} data-testid={parentId ? `button-news-reply-${parentId}` : "button-news-comment"}>
        <Send className="h-3 w-3" />
      </Button>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
