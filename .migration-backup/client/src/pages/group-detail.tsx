import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Users, Building, Hash, Sparkles, UserPlus, UserMinus, CheckCircle, Trophy } from "lucide-react";
import type { Group, User } from "@shared/schema";

type GroupDetail = Group & { memberDetails: User[] };

export default function GroupDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const { data: group, isLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/groups", id],
    queryFn: () => fetch(`/api/groups/${id}`).then(r => r.json()),
  });

  const isMember = group?.members.includes("u1");

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/groups")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Groups
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Button variant="outline" size="sm" onClick={() => setLocation("/groups")} data-testid="button-back-groups">
        <ArrowLeft className="h-3 w-3 mr-1.5" />
        Back
      </Button>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-lg font-bold" data-testid="text-group-name">{group.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  <Hash className="h-3 w-3 mr-0.5" />
                  {group.topic}
                </Badge>
                <Badge variant={group.type === "hospital" ? "outline" : "secondary"}>
                  {group.type === "hospital" ? <Building className="h-3 w-3 mr-0.5" /> : <Sparkles className="h-3 w-3 mr-0.5" />}
                  {group.type === "hospital" ? "Hospital" : "Interest"}
                </Badge>
              </div>
            </div>
            {isMember ? (
              <Button variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid="button-leave-group">
                <UserMinus className="h-4 w-4 mr-1.5" />
                Leave Group
              </Button>
            ) : (
              <Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="button-join-group">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Join Group
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{group.description}</p>

          {group.hospital && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              {group.hospital}{group.city ? ` · ${group.city}` : ""}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {group.memberCount} members
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3">Members ({group.memberDetails?.length || 0})</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {group.memberDetails?.map(member => (
            <Card key={member.id} className="p-3 flex items-center gap-3" data-testid={`member-${member.id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatarUrl} />
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {member.verified && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{member.specialty}</p>
                <p className="text-[11px] text-muted-foreground">{member.hospital}</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{member.rankingScore}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
