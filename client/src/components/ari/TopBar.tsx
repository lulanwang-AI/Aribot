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
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun } from "lucide-react";
import { useAriStore, type AriMode } from "@/stores/ariStore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { ExplainerSheet } from "@/components/ari/ExplainerSheet";
import { HistorySheet } from "@/components/ari/HistorySheet";
import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";

interface TopBarProps {
  onClear: () => void;
}

export function TopBar({ onClear }: TopBarProps) {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const mode = useAriStore((s) => s.mode);
  const setMode = useAriStore((s) => s.setMode);
  const messages = useAriStore((s) => s.messages);
  const resetSession = useAriStore((s) => s.resetSession);
  const isDark = theme === "dark";

  const [pendingMode, setPendingMode] = useState<AriMode | null>(null);

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

  const isSwitchToEr = pendingMode === "er";

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src={aribotLogoPath}
            alt="Aribot"
            className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            data-testid="img-ari-logo"
          />
          <div className="min-w-0">
            <h1
              className="flex items-center gap-2 text-base font-semibold leading-tight"
              data-testid="text-ari-title"
            >
              Ari
              <span
                className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                data-testid="badge-ari-version"
              >
                V3.0
              </span>
            </h1>
            <p className="hidden text-xs text-muted-foreground md:block">
              Clinical assistant — primary-source citations, fail-closed gating
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
          <Tabs
            value={mode}
            onValueChange={(v) => handleModeChange(v as AriMode)}
          >
            <TabsList data-testid="tabs-ari-mode">
              <TabsTrigger value="ari" data-testid="tab-ari-mode-ari">
                Ari<span className="hidden sm:inline">&nbsp;Mode</span>
              </TabsTrigger>
              <TabsTrigger value="er" data-testid="tab-ari-mode-er">
                ER<span className="hidden sm:inline">&nbsp;Mode</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <HistorySheet />
          <ExplainerSheet />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            data-testid="button-ari-theme-toggle"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {auth?.signOut && (
            <Button
              variant="outline"
              size="sm"
              onClick={auth.signOut}
              data-testid="button-ari-signout"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          )}
        </div>
      </div>

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
    </>
  );
}
