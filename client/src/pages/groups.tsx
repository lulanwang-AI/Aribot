import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { Users, UserPlus, UserMinus, Hash } from "lucide-react";
import type { Group } from "@shared/schema";

export default function Groups() {
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  useEffect(() => {
    recordEvent("page_view", { section: "groups" });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-groups-title">
          <Users className="h-5 w-5 text-primary" />
          Groups
        </h1>
        <p className="text-sm text-muted-foreground">
          Join specialty communities and collaborative discussions
        </p>
      </div>

      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {groups?.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const isMember = group.members.includes("u1");

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${group.id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      recordEvent("group_join", { topic: group.topic });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${group.id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      recordEvent("group_leave", { topic: group.topic });
    },
  });

  return (
    <Card data-testid={`card-group-${group.id}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{group.name}</h3>
            <Badge variant="secondary" className="text-xs">
              <Hash className="h-2.5 w-2.5 mr-0.5" />
              {group.topic}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            {group.memberCount.toLocaleString()}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {group.description}
        </p>
        {isMember ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            data-testid={`button-leave-${group.id}`}
          >
            <UserMinus className="h-3 w-3 mr-1.5" />
            Leave Group
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            data-testid={`button-join-${group.id}`}
          >
            <UserPlus className="h-3 w-3 mr-1.5" />
            Join Group
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
