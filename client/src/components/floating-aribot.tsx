import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, X } from "lucide-react";
import { AriChat } from "@/components/ari-chat";

export function FloatingAribot() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  if (location === "/" || location === "/aribot") return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          data-testid="button-floating-aribot"
          aria-label="Open Ari clinical assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[420px] h-[640px] max-h-[85vh] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          data-testid="panel-aribot-drawer"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
            <span className="text-xs font-semibold">Ari Quick Assist</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
              data-testid="button-close-floating-aribot"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <AriChat variant="compact" />
          </div>
        </div>
      )}
    </>
  );
}
