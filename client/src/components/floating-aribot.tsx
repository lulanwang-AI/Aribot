import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, MessageSquare, FolderOpen, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useLocation } from "wouter";
import type { AribotHistory, AribotFolder } from "@shared/schema";

export function FloatingAribot() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "history" | "folders">("chat");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: history } = useQuery<AribotHistory[]>({ queryKey: ["/api/aribot/history"] });
  const { data: folders } = useQuery<AribotFolder[]>({ queryKey: ["/api/aribot/folders"] });

  const createFolder = useMutation({
    mutationFn: () => apiRequest("POST", "/api/aribot/folders", { name: newFolderName }),
    onSuccess: () => { setNewFolderName(""); queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }); },
  });
  const renameFolder = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/aribot/folders/${id}`, { name: editName }),
    onSuccess: () => { setEditingFolder(null); queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }); },
  });
  const deleteFolder = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/aribot/folders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/aribot/folders"] }),
  });

  if (location === "/") return null;

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          data-testid="button-floating-aribot"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[700px] h-[600px] bg-background border rounded-xl shadow-2xl flex overflow-hidden" data-testid="panel-aribot-drawer">
          <div className="w-48 border-r flex flex-col bg-muted/30">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Aribots AI</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex border-b">
              {(["chat", "history", "folders"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-[11px] font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <ScrollArea className="flex-1 p-2">
              {tab === "history" && (
                <div className="space-y-1">
                  {history?.map(h => (
                    <div key={h.id} className="p-2 rounded-md hover:bg-muted/50 cursor-pointer text-xs" data-testid={`history-${h.id}`}>
                      <p className="font-medium truncate">{h.title}</p>
                      <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(h.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "folders" && (
                <div className="space-y-1">
                  {folders?.map(f => (
                    <div key={f.id} className="flex items-center gap-1 p-2 rounded-md hover:bg-muted/50 group" data-testid={`folder-${f.id}`}>
                      {editingFolder === f.id ? (
                        <form className="flex-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); renameFolder.mutate(f.id); }}>
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-6 text-xs" autoFocus />
                        </form>
                      ) : (
                        <>
                          <FolderOpen className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-xs flex-1 truncate">{f.name}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => { setEditingFolder(f.id); setEditName(f.name); }}>
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteFolder.mutate(f.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  <form
                    className="flex items-center gap-1 mt-2"
                    onSubmit={(e) => { e.preventDefault(); if (newFolderName.trim()) createFolder.mutate(); }}
                  >
                    <Input
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="New folder..."
                      className="h-7 text-xs"
                    />
                    <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 shrink-0" disabled={!newFolderName.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </form>
                </div>
              )}
              {tab === "chat" && (
                <div className="p-2 text-xs text-muted-foreground text-center">
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  Chat is displayed on the right
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 dify-embed">
            <iframe
              src="https://udify.app/chatbot/oFFtZasRPIbLOTGb"
              frameBorder="0"
              allow="microphone"
              title="Aribot Chat"
              data-testid="iframe-floating-aribot"
            />
          </div>
        </div>
      )}
    </>
  );
}
