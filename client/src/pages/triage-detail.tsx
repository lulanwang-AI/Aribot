import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PHIWarningPanel } from "@/components/phi-warning-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { detectPHI } from "@/lib/phi";
import {
  ArrowLeft,
  Heart,
  Flag,
  Clock,
  Send,
} from "lucide-react";
import type { TriagePost, Comment } from "@shared/schema";

type DetailPost = TriagePost & {
  author: { name: string; specialty: string } | null;
  comments: (Comment & { author: { name: string; specialty: string } | null })[];
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/triage")}
        data-testid="button-back"
      >
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
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {post.author.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{post.author.name}</span>
              <Badge variant="secondary" className="text-xs">{post.author.specialty}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
          )}

          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-post-content">{post.content}</p>

          <div className="flex items-center gap-1.5 flex-wrap">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <LikeButton post={post} />
            <span className="text-xs text-muted-foreground">
              {post.likes.length} {post.likes.length === 1 ? "like" : "likes"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Comments ({post.comments.length})
        </h2>
        {post.comments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} postId={id} />
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
      recordEvent("post_liked", { tags: post.tags });
    },
  });

  return (
    <Button
      size="sm"
      variant={isLiked ? "default" : "outline"}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      data-testid="button-like-detail"
    >
      <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current" : ""}`} />
      {isLiked ? "Liked" : "Like"}
    </Button>
  );
}

function CommentCard({
  comment,
  postId,
}: {
  comment: Comment & { author: { name: string; specialty: string } | null };
  postId: string;
}) {
  const flagMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/comments/${comment.id}/flag`, { reason: "Flagged" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage", postId] });
    },
  });

  return (
    <div className="flex gap-3 p-3 rounded-md bg-card" data-testid={`comment-${comment.id}`}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {comment.author?.name.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{comment.author?.name}</span>
          {comment.author && (
            <Badge variant="secondary" className="text-xs">{comment.author.specialty}</Badge>
          )}
          <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
          {comment.flagged && <Badge variant="destructive" className="text-xs">Flagged</Badge>}
        </div>
        <p className="text-sm" data-testid={`text-comment-${comment.id}`}>{comment.content}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => flagMutation.mutate()}
          disabled={flagMutation.isPending || comment.flagged}
          data-testid={`button-flag-comment-${comment.id}`}
        >
          <Flag className="h-3 w-3 mr-1" />
          Flag
        </Button>
      </div>
    </div>
  );
}

function AddCommentForm({ postId }: { postId: string }) {
  const [content, setContent] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const phiFindings = detectPHI(content);
  const hasPhiIssues = phiFindings.length > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/triage/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triage", postId] });
      recordEvent("post_commented", { tags: [] });
      setContent("");
      setConfirmed(false);
      toast({ title: "Comment added" });
    },
  });

  const canSubmit = content.trim() && confirmed && !hasPhiIssues;

  return (
    <div className="space-y-3 p-3 rounded-md bg-card">
      <Textarea
        placeholder="Add a comment... (No patient identifiers)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px]"
        data-testid="input-comment"
      />
      <PHIWarningPanel text={content} onRedact={setContent} />
      <div className="flex items-center gap-2">
        <Checkbox
          id="comment-confirm"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          data-testid="checkbox-comment-confirm"
        />
        <label htmlFor="comment-confirm" className="text-xs text-muted-foreground cursor-pointer">
          I confirm this comment contains no patient identifiers.
        </label>
      </div>
      <Button
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        data-testid="button-submit-comment"
      >
        <Send className="h-3 w-3 mr-1.5" />
        {mutation.isPending ? "Posting..." : "Post Comment"}
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
