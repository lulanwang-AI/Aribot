import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import {
  Shield,
  CheckCircle,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
} from "lucide-react";
import type { FlaggedItem } from "@shared/schema";

export default function Team() {
  const { data: items, isLoading } = useQuery<FlaggedItem[]>({
    queryKey: ["/api/moderation"],
  });

  useEffect(() => {
    recordEvent("page_view", { section: "team" });
  }, []);

  const pending = items?.filter((i) => i.status === "pending") || [];
  const resolved = items?.filter((i) => i.status !== "pending") || [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-team-title">
          <Shield className="h-5 w-5 text-primary" />
          Team Administration
        </h1>
        <p className="text-sm text-muted-foreground">
          Moderation queue and content management
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Review
            {pending.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-1">
                {pending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          )}
          {!isLoading && pending.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No items pending review</p>
            </div>
          )}
          <div className="space-y-3">
            {pending.map((item) => (
              <ModerationCard key={item.id} item={item} />
            ))}
          </div>
        </CardContent>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Resolved Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolved.map((item) => (
                <ModerationCard key={item.id} item={item} resolved />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModerationCard({ item, resolved }: { item: FlaggedItem; resolved?: boolean }) {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (status: FlaggedItem["status"]) => {
      await apiRequest("PATCH", `/api/moderation/${item.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation"] });
      toast({ title: "Moderation action applied" });
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    safe: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    edit_requested: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div
      className="p-4 rounded-md bg-muted/30 space-y-2"
      data-testid={`moderation-item-${item.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.contentType === "post" ? (
            <FileText className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {item.contentType}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-md ${statusColors[item.status] || ""}`}>
            {item.status.replace("_", " ")}
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(item.createdAt)}
        </span>
      </div>

      <p className="text-sm bg-card p-2 rounded-md">{item.content}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>By: {item.authorName}</span>
        <span>Reason: {item.reason}</span>
      </div>

      {!resolved && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateMutation.mutate("safe")}
            disabled={updateMutation.isPending}
            data-testid={`button-mark-safe-${item.id}`}
          >
            <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
            Mark Safe
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateMutation.mutate("edit_requested")}
            disabled={updateMutation.isPending}
            data-testid={`button-request-edit-${item.id}`}
          >
            <Edit className="h-3 w-3 mr-1.5" />
            Request Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => updateMutation.mutate("removed")}
            disabled={updateMutation.isPending}
            data-testid={`button-remove-${item.id}`}
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Remove
          </Button>
        </div>
      )}
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
