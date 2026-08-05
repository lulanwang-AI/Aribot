import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, Info, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useAriStore } from "@/stores/ariStore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { ExplainerSheet } from "@/components/ari/ExplainerSheet";
import { HistorySheet } from "@/components/ari/HistorySheet";
import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";

interface TopBarProps {
  onClear: () => void;
}

export function TopBar(_props: TopBarProps) {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const tabs = useAriStore((s) => s.tabs);
  const isDark = theme === "dark";

  const [historyOpen, setHistoryOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <>
      {/* Liquid-glass header bar */}
      <div
        className="relative flex flex-row items-center justify-between gap-2 border-b px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-3"
        style={{
          backgroundColor: isDark ? "rgba(8,26,44,0.72)" : "rgba(255,255,255,0.55)",
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.72)",
        }}
        data-testid="topbar-ari"
      >
        {/* Liquid glass top sheen line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: isDark
              ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
          }}
        />
        {/* Ari accent gradient line at bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(42,123,255,0.45) 40%, rgba(18,181,201,0.45) 60%, transparent 100%)",
          }}
        />

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Glass logo chip */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm"
            style={{
              backgroundColor: "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.9)",
            }}
          >
            <img
              src={aribotLogoPath}
              alt="Aribot"
              className="h-6 w-6 object-contain"
              data-testid="img-ari-logo"
            />
          </div>
          <div className="min-w-0">
            <h1
              className="flex items-center gap-2 text-base font-semibold leading-tight"
              data-testid="text-ari-title"
              style={{ color: isDark ? "#eaf2fc" : "#0c1c2c" }}
            >
              Ari
              <span
                className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.55)",
                  borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)",
                  color: isDark ? "#9db0c2" : "#5a6c7d",
                }}
                data-testid="badge-ari-version"
              >
                V4.0
              </span>
            </h1>
            <p
              className="hidden text-xs md:block"
              style={{ color: isDark ? "#9db0c2" : "#5a6c7d" }}
            >
              Clinical assistant — primary-source citations, fail-closed gating
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-ari-menu"
                aria-label="Open menu"
                title="Menu"
                className="border backdrop-blur-sm"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.55)",
                  borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)",
                  color: isDark ? "#eaf2fc" : "#0c1c2c",
                }}
              >
                <Menu className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setHistoryOpen(true)}
                data-testid="menu-item-history"
              >
                <History className="mr-2 h-4 w-4" />
                History
                {tabs.length > 0 && (
                  <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {tabs.length}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setExplainerOpen(true)}
                data-testid="menu-item-explainer"
              >
                <Info className="mr-2 h-4 w-4" />
                What Ari can do
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(isDark ? "light" : "dark")}
                data-testid="menu-item-theme"
              >
                {isDark ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                {isDark ? "Day mode" : "Night mode"}
              </DropdownMenuItem>
              {auth?.signOut && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={auth.signOut}
                    data-testid="menu-item-signout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
      <ExplainerSheet open={explainerOpen} onOpenChange={setExplainerOpen} />
    </>
  );
}
