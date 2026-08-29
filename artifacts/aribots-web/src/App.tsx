import { useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import CaseDetail from "@/pages/case-detail";
import Intake from "@/pages/intake";
import Antibiogram from "@/pages/antibiogram";
import Formulary from "@/pages/formulary";
import Guidance from "@/pages/guidance";
import Ari from "@/pages/aribot";
import Account from "@/pages/account";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import AriAmr from "@/pages/ari-amr";
import { AuthContext } from "@/lib/auth";
import { STANDALONE } from "@/lib/amr";
import { ThemeProvider } from "@/hooks/use-theme";
import { ChevronLeft, ChevronRight } from "lucide-react";

function SidebarEdgeTrigger() {
  const { toggleSidebar, state } = useSidebar();
  const isOpen = state === "expanded";
  return (
    <button
      onClick={toggleSidebar}
      data-testid="button-sidebar-toggle"
      aria-label={isOpen ? "Collapse navigation" : "Expand navigation"}
      className="absolute top-1/2 left-0 z-10 flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 bg-background/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-accent"
    >
      {isOpen ? (
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases/:id">{(params) => <CaseDetail id={params.id} />}</Route>
      <Route path="/intake" component={Intake} />
      <Route path="/antibiogram" component={Antibiogram} />
      <Route path="/formulary" component={Formulary} />
      <Route path="/guidance" component={Guidance} />
      <Route path="/ari" component={Ari} />
      <Route path="/account" component={Account} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedApp({ onSignOut }: { onSignOut: () => void }) {
  return (
    <AuthContext.Provider value={{ signOut: onSignOut }}>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-auto">
              <AppRouter />
            </main>
            <SidebarEdgeTrigger />
          </div>
        </div>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}

function AppContent() {
  const [authenticated, setAuthenticated] = useState(true);
  const [location, setLocation] = useLocation();

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Logout is best-effort: drop local state either way.
    }
    queryClient.clear();
    setAuthenticated(false);
    setLocation("/");
  }

  if (location === "/" || location === "/landing") {
    return <Landing />;
  }

  if (location === "/ari-amr" || location === "/amr") {
    return <AriAmr />;
  }

  if (!authenticated || location === "/login") {
    return (
      <Login
        onLogin={() => {
          setAuthenticated(true);
          setLocation("/dashboard");
        }}
        onNavigateToLanding={() => setLocation("/")}
      />
    );
  }

  return <AuthenticatedApp onSignOut={handleSignOut} />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/*
            The standalone build is a single document served from one URL, so it
            routes on the hash. Path routing would rewrite the address bar to a
            location the host has no file for, and a reload would 404.
          */}
          <WouterRouter
            base={STANDALONE ? "" : import.meta.env.BASE_URL.replace(/\/$/, "")}
            hook={STANDALONE ? useHashLocation : undefined}
          >
            <Toaster />
            <AppContent />
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
