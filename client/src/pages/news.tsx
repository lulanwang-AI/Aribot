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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { Newspaper, Search, ExternalLink, Clock, BookOpen, Heart, MessageSquare, Send, Reply } from "lucide-react";
import type { NewsItem, NewsComment } from "@shared/schema";

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-testid="page-news">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-news-title">
          <Newspaper className="h-5 w-5 text-primary" />
          Medical News
        </h1>
        <p className="text-sm text-muted-foreground">
          Latest research from NEJM, The Lancet, JAMA, BMJ, and Nature Medicine
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
        {news?.map(item => <NewsCard key={item.id} item={item} onOpenComments={() => setSelectedNewsId(item.id)} />)}
      </div>

      <NewsDetailSheet newsId={selectedNewsId} open={!!selectedNewsId} onClose={() => setSelectedNewsId(null)} />
    </div>
  );
}

function NewsCard({ item, onOpenComments }: { item: NewsItemWithCommenters; onOpenComments: () => void }) {
  const isLiked = item.likes?.includes("u1");

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news/${item.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
  });

  return (
    <Card className="hover-elevate" data-testid={`card-news-${item.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
            <span className="text-xs text-muted-foreground font-medium">{item.source}</span>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.summary}</p>
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
          {detail && <span className="text-xs text-muted-foreground font-medium">{detail.source}</span>}
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
