import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAriStore } from "@/stores/ariStore";

export function TabStrip() {
  const tabs = useAriStore((s) => s.tabs);
  const activeTabId = useAriStore((s) => s.activeTabId);
  const switchTab = useAriStore((s) => s.switchTab);
  const closeTab = useAriStore((s) => s.closeTab);
  const newTab = useAriStore((s) => s.newTab);

  return (
    <div
      className="flex items-end gap-1 border-b border-border bg-muted/30 px-2 pt-2 sm:px-4"
      data-testid="region-tab-strip"
      role="tablist"
      aria-label="Chat tabs"
    >
      <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const canClose = tabs.length > 1;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              data-testid={`tab-${tab.id}`}
              className={cn(
                "group flex h-9 min-w-[140px] max-w-[220px] shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-xs transition-colors",
                isActive
                  ? "border-border bg-background text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <button
                type="button"
                onClick={() => switchTab(tab.id)}
                className="flex min-w-0 flex-1 items-center text-left"
                data-testid={`button-tab-switch-${tab.id}`}
                title={tab.title}
              >
                <span className="truncate">{tab.title}</span>
              </button>
              {canClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={cn(
                    "rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground",
                    isActive ? "" : "opacity-0 group-hover:opacity-100"
                  )}
                  data-testid={`button-tab-close-${tab.id}`}
                  aria-label={`Close ${tab.title}`}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => newTab()}
        className="mb-px ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
        data-testid="button-new-tab"
        aria-label="New chat tab"
        title="New chat"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
