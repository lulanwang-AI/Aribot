import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PHIWarningPanel } from "@/components/phi-warning-panel";
import { ClickableDoctor } from "@/components/doctor-profile-sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { detectPHI } from "@/lib/phi";
import { ArrowLeft, Heart, Flag, Clock, Send, Reply, UserX, Image as ImageIcon } from "lucide-react";
import type { TriagePost, Comment } from "@shared/schema";

type DetailComment = Comment & { author: { name: string; specialty: string } | null };
type DetailPost = TriagePost & {
  author: { name: string; specialty: string } | null;
  comments: DetailComment[];
};

export default function TriageDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { data: post, isLoading } = useQuery<DetailPost>({
    queryKey: ["/api/triage", id],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/triage")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Triage
        </Button>
      </div>
    );
  }

  const childrenMap = new Map<string, DetailComment[]>();
  post.comments.forEach(c => {
    if (c.parentId) {
      const existing = childrenMap.get(c.parentId) || [];
      existing.push(c);
      childrenMap.set(c.parentId, existing);
    }
  });
  const topLevel = post.comments.filter(c => !c.parentId);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Button variant="outline" size="sm" onClick={() => setLocation("/triage")} data-testid="button-back">
        <ArrowLeft className="h-3 w-3 mr-1.5" />
        Back
      </Button>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold leading-snug" data-testid="text-post-title">{post.title}</h1>
            {post.flagged && <Badge variant="destructive">Flagged</Badge>}
          </div>

          {post.author && (
            <div className="flex items-center gap-2">
              <ClickableDoctor userId={post.authorId} name={post.author.name} specialty={post.author.specialty} showAvatar={true} avatarSize="md" />
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
          )}

          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-post-content">{post.content}</p>

          {post.images && post.images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {post.images.map((img, i) => (
                <div key={i} className="rounded-md overflow-hidden border bg-muted">
                  <img src={img} alt="Clinical image" className="h-40 w-auto object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {post.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <LikeButton post={post} />
            <span className="text-xs text-muted-foreground">{post.likes.length} {post.likes.length === 1 ? "like" : "likes"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Comments ({post.comments.length})</h2>
        {topLevel.map(comment => (
          <CommentThread key={comment.id} comment={comment} postId={id} childrenMap={childrenMap} depth={0} />
        ))}
        <AddCommentForm postId={id} />
      </div>
    </div>
  );
}

function LikeButton({ post }: { post: DetailPost }) {
  const isLiked = post.likes.includes("u1");
  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/triage/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage", post.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
    },
  });
  return (
    <Button size="sm" variant={isLiked ? "default" : "outline"} onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-like-detail">
      <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current" : ""}`} />
      {isLiked ? "Liked" : "Like"}
    </Button>
  );
}

function CommentThread({ comment, postId, childrenMap, depth }: {
  comment: DetailComment; postId: string; childrenMap: Map<string, DetailComment[]>; depth: number;
}) {
  const children = childrenMap.get(comment.id) || [];
  const maxNestingDisplay = 4;
  return (
    <div>
      <CommentCard comment={comment} postId={postId} isReply={depth > 0} />
      {children.length > 0 && (
        <div className={depth < maxNestingDisplay ? "ml-6 mt-1 space-y-1" : "mt-1 space-y-1"}>
          {children.map(child => (
            <CommentThread key={child.id} comment={child} postId={postId} childrenMap={childrenMap} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment, postId, isReply }: { comment: DetailComment; postId: string; isReply?: boolean }) {
  const [showReply, setShowReply] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/comments/${comment.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/triage", postId] }),
  });
  const flagMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/comments/${comment.id}/flag`, { reason: "Flagged" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/triage", postId] }),
  });

  const isLiked = comment.likes?.includes("u1");

  return (
    <div className={`p-3 rounded-md bg-card ${isReply ? "border-l-2 border-primary/20" : ""}`} data-testid={`comment-${comment.id}`}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        {comment.anonymous ? (
          <div className="flex items-center gap-1.5">
            <UserX className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Anonymous Clinician</span>
          </div>
        ) : comment.author ? (
          <ClickableDoctor userId={comment.authorId} name={comment.author.name} specialty={comment.author.specialty} showAvatar={true} avatarSize="sm" />
        ) : (
          <span className="text-xs font-medium">Unknown</span>
        )}
        <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
        {comment.flagged && <Badge variant="destructive" className="text-[10px]">Flagged</Badge>}
      </div>
      <p className="text-sm mb-2">{comment.content}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => likeMutation.mutate()} disabled={likeMutation.isPending}>
          <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current text-red-500" : ""}`} />
          {comment.likes?.length || 0}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setShowReply(!showReply)}>
          <Reply className="h-3 w-3 mr-1" />
          Reply
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => flagMutation.mutate()} disabled={flagMutation.isPending || comment.flagged}>
          <Flag className="h-3 w-3" />
        </Button>
      </div>
      {showReply && <div className="mt-2"><AddCommentForm postId={postId} parentId={comment.id} compact onDone={() => setShowReply(false)} /></div>}
    </div>
  );
}

function AddCommentForm({ postId, parentId, compact, onDone }: { postId: string; parentId?: string; compact?: boolean; onDone?: () => void }) {
  const [content, setContent] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const { toast } = useToast();

  const phiFindings = detectPHI(content);
  const hasPhiIssues = phiFindings.length > 0;

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/triage/${postId}/comments`, { content, parentId: parentId || null, anonymous }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage", postId] });
      setContent("");
      setConfirmed(false);
      setAnonymous(false);
      toast({ title: "Comment added" });
      onDone?.();
    },
  });

  const canSubmit = content.trim() && confirmed && !hasPhiIssues;

  return (
    <div className={`space-y-2 ${compact ? "" : "p-3 rounded-md bg-card"}`}>
      <Textarea
        placeholder={parentId ? "Write a reply..." : "Add a comment... (No patient identifiers)"}
        value={content}
        onChange={e => setContent(e.target.value)}
        className={compact ? "min-h-[60px]" : "min-h-[80px]"}
        data-testid={parentId ? `input-reply-${parentId}` : "input-comment"}
      />
      {!compact && <PHIWarningPanel text={content} onRedact={setContent} />}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox id={`confirm-${parentId || "main"}`} checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} data-testid={parentId ? `checkbox-reply-confirm-${parentId}` : "checkbox-comment-confirm"} />
          <label htmlFor={`confirm-${parentId || "main"}`} className="text-xs text-muted-foreground cursor-pointer">No patient identifiers</label>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <UserX className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Anonymous</span>
          <Switch checked={anonymous} onCheckedChange={setAnonymous} className="scale-75" data-testid={parentId ? `switch-anon-${parentId}` : "switch-anonymous"} />
        </label>
      </div>
      <Button size="sm" onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending} data-testid={parentId ? `button-submit-reply-${parentId}` : "button-submit-comment"}>
        <Send className="h-3 w-3 mr-1.5" />
        {mutation.isPending ? "Posting..." : parentId ? "Reply" : "Post Comment"}
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
