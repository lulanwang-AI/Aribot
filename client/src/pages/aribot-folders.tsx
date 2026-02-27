import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useState } from "react";
import type { AribotFolder, AribotHistory } from "@shared/schema";

export default function AribotFoldersPage() {
  const { data: folders, isLoading } = useQuery<AribotFolder[]>({ queryKey: ["/api/aribot/folders"] });
  const { data: history } = useQuery<AribotHistory[]>({ queryKey: ["/api/aribot/history"] });
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const createFolder = useMutation({
    mutationFn: () => apiRequest("POST", "/api/aribot/folders", { name: newName }),
    onSuccess: () => { setNewName(""); queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }); },
  });
  const renameFolder = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/aribot/folders/${id}`, { name: editName }),
    onSuccess: () => { setEditId(null); queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }); },
  });
  const deleteFolder = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/aribot/folders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }),
  });

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto" data-testid="page-aribot-folders">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Folders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your Aribot conversations.</p>
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); if (newName.trim()) createFolder.mutate(); }}
      >
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New folder name..."
          className="max-w-xs"
          data-testid="input-new-folder"
        />
        <Button type="submit" disabled={!newName.trim()} data-testid="button-create-folder">
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </form>

      <div className="space-y-3">
        {folders?.map(f => {
          const itemCount = history?.filter(h => h.folderId === f.id).length || 0;
          return (
            <Card key={f.id} className="p-4" data-testid={`folder-card-${f.id}`}>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                {editId === f.id ? (
                  <form className="flex-1 flex gap-2" onSubmit={e => { e.preventDefault(); renameFolder.mutate(f.id); }}>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1" autoFocus />
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {itemCount} conversation{itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(f.id); setEditName(f.name); }} data-testid={`button-rename-${f.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteFolder.mutate(f.id)} data-testid={`button-delete-${f.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
