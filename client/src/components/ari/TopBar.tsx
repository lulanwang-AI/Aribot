import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2, History } from "lucide-react";
import { useAriStore, type AriMode } from "@/stores/ariStore";
import { useAuth } from "@/lib/auth";

interface TopBarProps {
  onClear: () => void;
}

export function TopBar({ onClear }: TopBarProps) {
  const auth = useAuth();
  const mode = useAriStore((s) => s.mode);
  const setMode = useAriStore((s) => s.setMode);
  const messages = useAriStore((s) => s.messages);
  const resetSession = useAriStore((s) => s.resetSession);
  const modeHistory = useAriStore((s) => s.modeHistory);

  const [pendingMode, setPendingMode] = useState<AriMode | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showModeLog, setShowModeLog] = useState(false);

  function handleModeChange(next: AriMode) {
    if (next === mode) return;
    if (messages.length > 0) {
      setPendingMode(next);
      return;
    }
    setMode(next);
  }

  function confirmModeSwitch() {
    if (pendingMode) {
      setMode(pendingMode);
      resetSession();
      onClear();
    }
    setPendingMode(null);
  }

  function handleClearClick() {
    if (messages.length === 0) return;
    setConfirmClear(true);
  }

  const isSwitchToEr = pendingMode === "er";

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold leading-tight" data-testid="text-ari-title">
              Ari
            </h1>
            <p className="text-xs text-muted-foreground">
              Clinical assistant — primary-source citations, fail-closed gating
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={mode}
            onValueChange={(v) => handleModeChange(v as AriMode)}
          >
            <TabsList data-testid="tabs-ari-mode">
              <TabsTrigger value="ari" data-testid="tab-ari-mode-ari">
                Ari
              </TabsTrigger>
              <TabsTrigger value="er" data-testid="tab-ari-mode-er">
                ER
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {import.meta.env.DEV && (
            <Popover open={showModeLog} onOpenChange={setShowModeLog}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="button-mode-log"
                  aria-label="Mode log"
                >
                  <History className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 max-h-72 overflow-y-auto p-3 text-xs"
                data-testid="popover-mode-log"
              >
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Mode log (dev)
                </div>
                {modeHistory.length === 0 ? (
                  <div className="text-muted-foreground">No mode switches yet.</div>
                ) : (
                  <ul className="space-y-1">
                    {modeHistory
                      .slice()
                      .reverse()
                      .map((e, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>
                            <span className="uppercase">{e.from}</span>
                            <span className="mx-1 text-muted-foreground">→</span>
                            <span className="uppercase">{e.to}</span>
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(e.at).toLocaleTimeString()}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearClick}
            disabled={messages.length === 0}
            data-testid="button-ari-clear"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
          {auth?.signOut && (
            <Button
              variant="outline"
              size="sm"
              onClick={auth.signOut}
              data-testid="button-ari-signout"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </div>

      {mode === "er" && (
        <div
          role="alert"
          className="sticky top-0 z-20 border-b border-red-700 bg-red-600 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-white shadow-sm sm:px-6"
          data-testid="banner-er-mode"
        >
          ER MODE — RESPONSE NOT VERIFIED AGAINST LIVE SOURCES. CONFIRM BEFORE ACTING.
        </div>
      )}

      <AlertDialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMode(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-ari-mode-switch">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSwitchToEr ? "Switch to ER Mode?" : "Switch to Ari Mode?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSwitchToEr
                ? "ER Mode disables source verification. Responses will be based on the model's training only and have not been confirmed against current guidelines. Switch to ER Mode?"
                : "Switching modes clears the current conversation. Continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-ari-mode-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeSwitch}
              className={
                isSwitchToEr
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : undefined
              }
              data-testid="button-ari-mode-confirm"
            >
              {isSwitchToEr ? "Switch to ER Mode" : "Switch and clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent data-testid="dialog-ari-clear">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages and attachments in this Ari session will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-ari-clear-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetSession();
                onClear();
                setConfirmClear(false);
              }}
              data-testid="button-ari-clear-confirm"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
