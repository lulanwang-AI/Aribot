import { useLocation } from "wouter";
import { Bot } from "lucide-react";

/**
 * Floating quick-access button to the Ari clinical assistant. The new Ari UI
 * is a full multi-pane layout (mode toggle + capability sidebar + composer),
 * which doesn't fit usefully in a small drawer, so this widget simply
 * navigates to the dedicated /aribot route.
 */
export function FloatingAribot() {
  const [location, setLocation] = useLocation();

  if (location === "/" || location === "/aribot") return null;

  return (
    <button
      type="button"
      onClick={() => setLocation("/aribot")}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="button-floating-aribot"
      aria-label="Open Ari clinical assistant"
      title="Open Ari"
    >
      <Bot className="h-6 w-6" />
    </button>
  );
}
