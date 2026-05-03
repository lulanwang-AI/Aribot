import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Users,
  Trophy,
  Crown,
  BadgeCheck,
} from "lucide-react";
import type { FlaggedItem, Team } from "@shared/schema";

type EnrichedTeam = Team & {
  members: { userId: string; role: "admin" | "member"; name: string; specialty: string; hospital: string; avatarUrl: string; verified: boolean; rankingScore: number }[];
};

export default function Team() {
  const { data: items, isLoading: modLoading } = useQuery<FlaggedItem[]>({
    queryKey: ["/api/moderation"],
  });
  const { data: teams, isLoading: teamsLoading } = useQuery<EnrichedTeam[]>({
    queryKey: ["/api/teams"],
  });

  useEffect(() => {
    recordEvent("page_view", { section: "team" });
  }, []);

  const pending = items?.filter((i) => i.status === "pending") || [];
  const resolved = items?.filter((i) => i.status !== "pending") || [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-team-title">
          <Shield className="h-5 w-5 text-primary" />
          My Teams
        </h1>
        <p className="text-sm text-muted-foreground">
          Team management and moderation
        </p>
      </div>

      {teamsLoading && <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-48" />)}</div>}

      {teams?.map(team => (
        <Card key={team.id} data-testid={`team-${team.id}`}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {team.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{team.description}</p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {team.members.map(member => (
                <div key={member.userId} className="flex items-center gap-3 p-3 rounded-md bg-muted/30" data-testid={`team-member-${member.userId}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {member.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
                      {member.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1">
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.specialty}</p>
                    <p className="text-[11px] text-muted-foreground">{member.hospital}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0">
                    <Trophy className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{member.rankingScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Separator />

      <div>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Moderation Queue
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs ml-1">
              {pending.length}
            </Badge>
          )}
        </h2>
      </div>

      <Card>
        <CardContent className="pt-4">
          {modLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          )}
          {!modLoading && pending.length === 0 && (
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
