import { useMemo, useState } from "react";
import {
  Check,
  History as HistoryIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAriStore, type AriTab } from "@/stores/ariStore";
import { getCapability } from "@shared/ari/capabilities";

export function HistorySheet() {
  const tabs = useAriStore((s) => s.tabs);
  const activeTabId = useAriStore((s) => s.activeTabId);
  const switchTab = useAriStore((s) => s.switchTab);
  const closeTab = useAriStore((s) => s.closeTab);
  const newTab = useAriStore((s) => s.newTab);
  const renameTab = useAriStore((s) => s.renameTab);
  const clearHistory = useAriStore((s) => s.clearHistory);

  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  // Sort by recency (most recent first). Empty "New chat" tabs without
  // any messages are still shown so the user can resume where they left off.
  const sorted = useMemo(
    () => [...tabs].sort((a, b) => b.updatedAt - a.updatedAt),
    [tabs]
  );

  function handleOpen(id: string) {
    switchTab(id);
    setOpen(false);
  }

  function handleNewChat() {
    newTab();
    setOpen(false);
  }

  function startRename(tab: AriTab) {
    setRenamingId(tab.id);
    setRenameDraft(tab.title);
  }

  function commitRename() {
    if (renamingId && renameDraft.trim().length > 0) {
      renameTab(renamingId, renameDraft.trim().slice(0, 80));
    }
    setRenamingId(null);
    setRenameDraft("");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-ari-history"
          aria-label="Open chat history"
          title="Chat history"
        >
          <HistoryIcon className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">History</span>
          {sorted.length > 0 && (
            <span
              className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground sm:ml-1.5"
              data-testid="badge-history-count"
            >
              {sorted.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        data-testid="sheet-ari-history"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <HistoryIcon className="h-4 w-4" />
              Chat history
            </SheetTitle>
            <Button
              size="sm"
              variant="default"
              onClick={handleNewChat}
              data-testid="button-history-new-chat"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New chat
            </Button>
          </div>
          <SheetDescription className="text-xs">
            Your last {sorted.length} {sorted.length === 1 ? "chat is" : "chats are"} kept
            on this device. Click any chat to pick up where you left off.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <ul
            className="flex flex-col gap-1 p-3"
            data-testid="list-history-tabs"
          >
            {sorted.length === 0 && (
              <li
                className="px-2 py-6 text-center text-sm text-muted-foreground"
                data-testid="empty-history"
              >
                No chats yet. Start a new conversation to see it here.
              </li>
            )}
            {sorted.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isRenaming = renamingId === tab.id;
              const lastUserMsg = [...tab.messages]
                .reverse()
                .find((m) => m.role === "user");
              const snippet = lastUserMsg
                ? trimSnippet(lastUserMsg.content)
                : tab.messages.length === 0
                  ? "Empty chat"
                  : "(no user messages yet)";
              return (
                <li
                  key={tab.id}
                  className={cn(
                    "group rounded-md border bg-card px-3 py-2 transition hover:bg-accent",
                    isActive
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-border"
                  )}
                  data-testid={`history-item-${tab.id}`}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                        className="h-7 text-sm"
                        data-testid={`input-rename-${tab.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={commitRename}
                        data-testid={`button-rename-confirm-${tab.id}`}
                        aria-label="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setRenamingId(null)}
                        data-testid={`button-rename-cancel-${tab.id}`}
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => handleOpen(tab.id)}
                      data-testid={`button-open-history-${tab.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="truncate text-sm font-medium text-foreground"
                          data-testid={`text-history-title-${tab.id}`}
                        >
                          {tab.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTimeAgo(tab.updatedAt)}
                        </span>
                      </div>
                      <p
                        className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                        data-testid={`text-history-snippet-${tab.id}`}
                      >
                        {snippet}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {tab.mode === "er" && (
                          <span className="rounded-full bg-red-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-red-700 dark:bg-red-950 dark:text-red-300">
                            ER
                          </span>
                        )}
                        {tab.capability && (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-px text-[10px] text-primary">
                            {safeCapName(tab.capability)}
                          </span>
                        )}
                        {tab.additionalCapabilities.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-border bg-background px-1.5 py-px text-[10px] text-muted-foreground"
                          >
                            {safeCapName(c)}
                          </span>
                        ))}
                        {!tab.capability &&
                          tab.additionalCapabilities.length === 0 && (
                            <span className="rounded-full border border-dashed border-border px-1.5 py-px text-[10px] text-muted-foreground">
                              Auto
                            </span>
                          )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {tab.messages.length}{" "}
                          {tab.messages.length === 1 ? "msg" : "msgs"}
                        </span>
                      </div>
                    </button>
                  )}

                  {!isRenaming && (
                    // On touch devices (no hover) the controls stay visible
                    // so they can actually be used. On larger screens they
                    // fade in on hover/focus to keep the list visually quiet.
                    <div className="mt-2 flex items-center justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 sm:h-6 sm:w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(tab);
                        }}
                        data-testid={`button-history-rename-${tab.id}`}
                        aria-label="Rename chat"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive sm:h-6 sm:w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        data-testid={`button-history-delete-${tab.id}`}
                        aria-label="Delete chat"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span>Stored locally on this device.</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                disabled={sorted.length === 0}
                data-testid="button-clear-all-history"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="dialog-clear-history">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes every saved Aribots conversation
                  on this device. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-clear-history-cancel">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearHistory();
                    setOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-clear-history-confirm"
                >
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function trimSnippet(text: string): string {
  const cleaned = text
    .replace(/^\[Also bring perspectives from:[^\]]*\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 160 ? cleaned.slice(0, 160) + "…" : cleaned;
}

function safeCapName(id: string): string {
  try {
    return getCapability(id as any).displayName;
  } catch {
    return id;
  }
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}
