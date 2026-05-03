import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Paperclip, FileText, Image, File, Users, Plus } from "lucide-react";
import { useState } from "react";
import type { ChatThread, ChatMessage, User } from "@shared/schema";

export default function Chats() {
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: threads, isLoading } = useQuery<ChatThread[]>({ queryKey: ["/api/chats"] });
  const { data: me } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chats", activeThread, "messages"],
    queryFn: () => fetch(`/api/chats/${activeThread}/messages`).then(r => r.json()),
    enabled: !!activeThread,
  });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const userMap = Object.fromEntries((allUsers || []).map(u => [u.id, u]));

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/chats/${activeThread}/messages`, { content: message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeThread, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getAttachmentIcon(type: string) {
    if (type === "pdf") return <FileText className="h-3 w-3" />;
    if (type === "png" || type === "jpg") return <Image className="h-3 w-3" />;
    return <File className="h-3 w-3" />;
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  const selected = threads?.find(t => t.id === activeThread);

  return (
    <div className="flex h-full" data-testid="page-chats">
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-lg font-semibold" data-testid="text-chats-title">Chats</h1>
          <Button size="sm" variant="outline" data-testid="button-new-chat">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {threads?.map(thread => (
            <button
              key={thread.id}
              onClick={() => setActiveThread(thread.id)}
              className={`w-full text-left p-3 border-b transition-colors hover:bg-muted/50 ${activeThread === thread.id ? "bg-muted" : ""}`}
              data-testid={`chat-thread-${thread.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {thread.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{thread.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(thread.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
                </div>
                {thread.unreadCount > 0 && (
                  <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                {selected.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.participants.length} participants</p>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto">
                {messages?.map(msg => {
                  const isMe = msg.senderId === "u1";
                  const sender = userMap[msg.senderId];
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                      <div className={`max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                        {!isMe && <p className="text-xs font-medium mb-1">{sender?.name || "Unknown"}</p>}
                        <p className="text-sm">{msg.content}</p>
                        {msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className={`flex items-center gap-1.5 text-xs ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {getAttachmentIcon(att.type)}
                                <span>{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <form
                className="flex items-center gap-2 max-w-2xl mx-auto"
                onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(); }}
              >
                <Button type="button" size="icon" variant="ghost" className="shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending} data-testid="button-send-message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
