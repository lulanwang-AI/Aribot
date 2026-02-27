import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Tag, FolderOpen } from "lucide-react";
import type { AribotHistory, AribotFolder } from "@shared/schema";

export default function AribotHistoryPage() {
  const { data: history, isLoading } = useQuery<AribotHistory[]>({ queryKey: ["/api/aribot/history"] });
  const { data: folders } = useQuery<AribotFolder[]>({ queryKey: ["/api/aribot/folders"] });
  const folderMap = Object.fromEntries((folders || []).map(f => [f.id, f.name]));

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto" data-testid="page-aribot-history">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Chat History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your previous Aribot conversations.</p>
      </div>

      <div className="space-y-2">
        {history?.map(h => (
          <Card key={h.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`history-item-${h.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{h.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {h.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                  {h.folderId && folderMap[h.folderId] && (
                    <Badge variant="outline" className="text-[10px]">
                      <FolderOpen className="h-2.5 w-2.5 mr-0.5" />
                      {folderMap[h.folderId]}
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatTime(h.createdAt)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
