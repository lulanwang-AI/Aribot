import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrendingPanel, TrendingDrawer } from "@/components/trending-panel";
import { PHIWarningPanel, PostingRulesBanner } from "@/components/phi-warning-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { detectPHI } from "@/lib/phi";
import { ClickableDoctor } from "@/components/doctor-profile-sheet";
import {
  Plus,
  Heart,
  MessageSquare,
  Flag,
  Clock,
  Search,
  Stethoscope,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TriagePost } from "@shared/schema";
import { useEffect } from "react";

type EnrichedPost = TriagePost & {
  author: { name: string; specialty: string } | null;
  commentCount: number;
};

export default function Triage() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: posts, isLoading } = useQuery<EnrichedPost[]>({
    queryKey: ["/api/triage", sortBy],
    queryFn: () => fetch(`/api/triage?sort=${sortBy}`).then(r => r.json()),
  });

  useEffect(() => {
    recordEvent("page_view", { section: "triage" });
  }, []);

  const filtered = posts?.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-triage-title">
            <Stethoscope className="h-5 w-5 text-primary" />
            Clinical Triage
          </h1>
          <p className="text-sm text-muted-foreground">
            Discuss complex cases with verified clinicians
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-case">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Clinical Case</DialogTitle>
            </DialogHeader>
            <CreateCaseForm
              onSuccess={() => {
                setDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases by title or tag..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-triage"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40" data-testid="select-sort-triage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="discussed">Most Discussed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TrendingDrawer />

      <div className="flex gap-6 mt-4">
        <div className="flex-1 space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          )}
          {!isLoading && filtered?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No cases found</p>
            </div>
          )}
          {filtered?.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setLocation(`/triage/${post.id}`)} />
          ))}
        </div>

        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 bg-card rounded-md p-4">
            <TrendingPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onClick }: { post: EnrichedPost; onClick: () => void }) {
  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/triage/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
      recordEvent("post_liked", { tags: post.tags });
    },
  });

  const flagMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/triage/${post.id}/flag`, { reason: "Flagged by user" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
      recordEvent("post_flagged", { tags: post.tags });
    },
  });

  const isLiked = post.likes.includes("u1");

  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-triage-${post.id}`}>
      <CardContent className="p-4 space-y-2" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug">{post.title}</h3>
          {post.flagged && <Badge variant="destructive" className="text-xs shrink-0">Flagged</Badge>}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <div className="px-4 pb-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant={isLiked ? "default" : "outline"}
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current" : ""}`} />
          {post.likes.length}
        </Button>
        <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-comments-${post.id}`}>
          <MessageSquare className="h-3 w-3" />
          {post.commentCount}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(post.createdAt)}
        </span>
        {post.author && (
          <span className="ml-auto">
            <ClickableDoctor
              userId={post.authorId}
              name={post.author.name}
              avatarUrl={post.author.avatarUrl}
              showAvatar={true}
              avatarSize="sm"
            />
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => flagMutation.mutate()}
          disabled={flagMutation.isPending || post.flagged}
          data-testid={`button-flag-${post.id}`}
        >
          <Flag className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

function CreateCaseForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const phiFindings = detectPHI(content);
  const hasPhiIssues = phiFindings.length > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      await apiRequest("POST", "/api/triage", { title, content, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
      recordEvent("post_created", {
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast({ title: "Case created", description: "Your clinical case has been posted." });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = title.trim() && content.trim() && confirmed && !hasPhiIssues;

  return (
    <div className="space-y-4">
      <PostingRulesBanner />

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="Brief case title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="input-case-title"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Case Details</label>
        <Textarea
          placeholder="Describe the clinical scenario. Do not include any patient identifiers."
          className="min-h-[160px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          data-testid="input-case-content"
        />
      </div>

      <PHIWarningPanel text={content} onRedact={setContent} />

      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <Input
          placeholder="cardiology, chest-pain, echo (comma-separated)"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          data-testid="input-case-tags"
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="confirm-no-phi"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          data-testid="checkbox-confirm-no-phi"
        />
        <label htmlFor="confirm-no-phi" className="text-xs text-muted-foreground leading-snug cursor-pointer">
          I confirm this post contains no patient identifiers (names, DOB, MRN, exact address, phone, email, unique photos, etc.).
        </label>
      </div>

      <Button
        className="w-full"
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        data-testid="button-submit-case"
      >
        {mutation.isPending ? "Creating..." : "Create Case"}
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
