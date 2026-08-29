import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { Users, UserPlus, UserMinus, Hash, Search, Building, Sparkles, ChevronRight } from "lucide-react";
import type { Group } from "@shared/schema";

type EnrichedGroup = Group & {
  memberAvatars: { id: string; name: string; avatarUrl: string }[];
};

export default function Groups() {
  const { data: groups, isLoading } = useQuery<EnrichedGroup[]>({ queryKey: ["/api/groups"] });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => { recordEvent("page_view", { section: "groups" }); }, []);

  const filtered = groups?.filter(g => {
    const matchesSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.topic.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || g.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-testid="page-groups">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-groups-title">
          <Users className="h-5 w-5 text-primary" />
          Groups
        </h1>
        <p className="text-sm text-muted-foreground">Join specialty communities and collaborative discussions</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search groups..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-groups" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36" data-testid="select-group-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="hospital">Hospital</SelectItem>
            <SelectItem value="interest">Interest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="grid md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-44" />)}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {filtered?.map(group => <GroupCard key={group.id} group={group} />)}
      </div>
      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No groups match your filters</p>
        </div>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: EnrichedGroup }) {
  const isMember = group.members.includes("u1");

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${group.id}/join`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/groups"] }); recordEvent("group_join", { topic: group.topic }); },
  });
  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${group.id}/leave`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/groups"] }); },
  });

  return (
    <Card data-testid={`card-group-${group.id}`} className="hover-elevate transition-all">
      <Link href={`/groups/${group.id}`}>
        <CardContent className="p-5 space-y-3 cursor-pointer">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{group.name}</h3>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  <Hash className="h-2.5 w-2.5 mr-0.5" />
                  {group.topic}
                </Badge>
                <Badge variant={group.type === "hospital" ? "outline" : "secondary"} className="text-[10px]">
                  {group.type === "hospital" ? <Building className="h-2.5 w-2.5 mr-0.5" /> : <Sparkles className="h-2.5 w-2.5 mr-0.5" />}
                  {group.type === "hospital" ? "Hospital" : "Interest"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Users className="h-3 w-3" />
              {group.memberCount.toLocaleString()}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{group.description}</p>

          {group.hospital && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3" />
              {group.hospital}{group.city ? ` · ${group.city}` : ""}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {group.memberAvatars?.map((m, i) => (
                <Avatar key={i} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={m.avatarUrl} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.members.length > 5 && (
                <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                  +{group.members.length - 5}
                </div>
              )}
            </div>

            <div onClick={e => e.preventDefault()}>
              {isMember ? (
                <Button size="sm" variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid={`button-leave-${group.id}`}>
                  <UserMinus className="h-3 w-3 mr-1.5" />
                  Leave
                </Button>
              ) : (
                <Button size="sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid={`button-join-${group.id}`}>
                  <UserPlus className="h-3 w-3 mr-1.5" />
                  Join
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
