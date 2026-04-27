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
import { LogOut } from "lucide-react";
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
