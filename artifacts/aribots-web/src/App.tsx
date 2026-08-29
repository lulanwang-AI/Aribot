import { useEffect, useState } from "react";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import {
  Redirect,
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { apiRequest, queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar as AmrSidebar } from "@/components/app-sidebar";
import { AppSidebar as AribotsSidebar } from "@/components/aribots-sidebar";
import { ProfileSheetProvider } from "@/components/doctor-profile-sheet";
import { FloatingAribot } from "@/components/floating-aribot";
import { NetworkBackground } from "@/components/network-background";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import CaseDetail from "@/pages/case-detail";
import Intake from "@/pages/intake";
import Antibiogram from "@/pages/antibiogram";
import Formulary from "@/pages/formulary";
import Guidance from "@/pages/guidance";
import AmrAri from "@/pages/aribot";
import AmrAccount from "@/pages/account";
import AribotsAssistant from "@/pages/aribots-assistant";
import AribotsAccount from "@/pages/aribots-account";
import AribotOnboarding from "@/pages/aribot-onboarding";
import AribotDevBlocks from "@/pages/aribot-dev-blocks";
import Home from "@/pages/home";
import Triage from "@/pages/triage";
import TriageDetail from "@/pages/triage-detail";
import News from "@/pages/news";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import Events from "@/pages/events";
import Chats from "@/pages/chats";
import Training from "@/pages/training";
import Doctors from "@/pages/doctors";
import Team from "@/pages/team";
import Telemed from "@/pages/telemed";
import Admin from "@/pages/admin";
import PreCharting from "@/pages/pre-charting";
import ClinicalChat from "@/pages/clinical-chat";
import SoapNote from "@/pages/soap";
import VisitSummary from "@/pages/visit-summary";
import WorkflowHistory from "@/pages/workflow-history";
import Landing from "@/pages/landing";
import AriAmr from "@/pages/ari-amr";
import Whitepaper from "@/pages/whitepaper";
import { ClerkAuthScreen } from "@/components/auth/clerk-auth-screen";
import { AuthContext } from "@/lib/auth";
import { STANDALONE } from "@/lib/amr";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-access";
import { ThemeProvider } from "@/hooks/use-theme";
import { ChevronLeft, ChevronRight } from "lucide-react";

const basePath = STANDALONE
  ? ""
  : import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPublishableKey = publishableKeyFromHost(
  window.location.host,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type AuthState = "loading" | "authenticated" | "anonymous";
type AuthProduct = "aribots" | "amr";

function resolveAuthProduct(location: string): AuthProduct {
  const requestedProduct = new URLSearchParams(window.location.search).get(
    "product",
  );
  if (requestedProduct === "amr") {
    window.sessionStorage.setItem("ari-auth-product", "amr");
    return "amr";
  }
  if (location.startsWith("/sign-in/") || location.startsWith("/sign-up/")) {
    return window.sessionStorage.getItem("ari-auth-product") === "amr"
      ? "amr"
      : "aribots";
  }
  window.sessionStorage.setItem("ari-auth-product", "aribots");
  return "aribots";
}

function clerkDestination(to: string) {
  if (!basePath) return to;
  const url = new URL(to, window.location.origin);
  const pathname = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length) || "/"
    : url.pathname;
  return `${pathname}${url.search}${url.hash}`;
}

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

function AmrRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases/:id">{(params) => <CaseDetail id={params.id} />}</Route>
      <Route path="/intake" component={Intake} />
      <Route path="/antibiogram" component={Antibiogram} />
      <Route path="/formulary" component={Formulary} />
      <Route path="/guidance" component={Guidance} />
      <Route path="/ari" component={AmrAri} />
      <Route path="/ari-amr/account" component={AmrAccount} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AribotsRouter() {
  return (
    <Switch>
      <Route path="/aribot/onboarding" component={AribotOnboarding} />
      <Route path="/aribot/dev/blocks" component={AribotDevBlocks} />
      <Route path="/aribot" component={AribotsAssistant} />
      <Route path="/home" component={Home} />
      <Route path="/triage" component={Triage} />
      <Route path="/triage/:id">{(params) => <TriageDetail id={params.id} />}</Route>
      <Route path="/news" component={News} />
      <Route path="/groups" component={Groups} />
      <Route path="/groups/:id">{(params) => <GroupDetail id={params.id} />}</Route>
      <Route path="/events" component={Events} />
      <Route path="/chats" component={Chats} />
      <Route path="/training" component={Training} />
      <Route path="/doctors" component={Doctors} />
      <Route path="/account" component={AribotsAccount} />
      <Route path="/team" component={Team} />
      <Route path="/telemed" component={Telemed} />
      <Route path="/admin" component={Admin} />
      <Route path="/pre-charting" component={PreCharting} />
      <Route path="/clinical-chat" component={ClinicalChat} />
      <Route path="/soap" component={SoapNote} />
      <Route path="/visit-summary" component={VisitSummary} />
      <Route path="/workflow-history" component={WorkflowHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15.5rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedAmrApp({ onSignOut }: { onSignOut: () => void }) {
  return (
    <AuthContext.Provider value={{ signOut: onSignOut }}>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AmrSidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-auto">
              <AmrRouter />
            </main>
            <SidebarEdgeTrigger />
          </div>
        </div>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}

function AuthenticatedAribotsApp({ onSignOut }: { onSignOut: () => void }) {
  return (
    <AuthContext.Provider value={{ signOut: onSignOut }}>
      <ProfileSheetProvider>
        <NetworkBackground />
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AribotsSidebar />
            <div className="relative flex min-w-0 flex-1 flex-col">
              <main className="flex-1 overflow-auto">
                <AribotsRouter />
              </main>
              <SidebarEdgeTrigger />
            </div>
          </div>
          <FloatingAribot />
        </SidebarProvider>
      </ProfileSheetProvider>
    </AuthContext.Provider>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const [authState, setAuthState] = useState<AuthState>(
    STANDALONE ? "authenticated" : "loading",
  );
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useAuth();
  const { signOut } = useClerk();
  const isAmrWorkspace =
    location === "/dashboard" ||
    location === "/intake" ||
    location === "/antibiogram" ||
    location === "/formulary" ||
    location === "/guidance" ||
    location === "/ari" ||
    location === "/ari-amr/account" ||
    location === "/cases" ||
    location.startsWith("/cases/");
  const isAuthRoute =
    location.startsWith("/sign-in") || location.startsWith("/sign-up");
  const isLegacyLoginRoute =
    location === "/login" || location === "/ari-amr/login";
  const isPublicRoute =
    location === "/" ||
    location === "/landing" ||
    location === "/ari-amr" ||
    location === "/amr" ||
    location === "/whitepaper" ||
    isAuthRoute ||
    isLegacyLoginRoute;
  const requiresAuth = !isPublicRoute;
  const authProduct = resolveAuthProduct(location);

  useEffect(() => {
    if (!requiresAuth || STANDALONE || !clerkLoaded) return;
    let cancelled = false;
    setAuthState("loading");
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => {
        if (!cancelled) {
          setAuthState(response.ok ? "authenticated" : "anonymous");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, [requiresAuth, clerkLoaded, clerkSignedIn]);

  async function handleDemoLogin(product: AuthProduct) {
    if (!STANDALONE) {
      await apiRequest("POST", "/api/auth/login", {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
    }
    setAuthState("authenticated");
    setLocation(product === "amr" ? "/dashboard" : "/aribot");
  }

  async function handleSignOut(product: AuthProduct) {
    queryClient.clear();
    const destination = product === "amr" ? "/ari-amr" : "/";
    if (!STANDALONE) {
      await apiRequest("POST", "/api/auth/logout").catch(() => undefined);
    }
    if (clerkSignedIn) {
      setAuthState("anonymous");
      await signOut({ redirectUrl: `${basePath}${destination}` });
    } else {
      setAuthState("anonymous");
      setLocation(destination);
    }
  }

  if (location === "/" || location === "/landing") {
    return <Landing />;
  }

  if (location === "/ari-amr" || location === "/amr") {
    return <AriAmr />;
  }

  if (location === "/whitepaper") {
    return <Whitepaper />;
  }

  if (location === "/login") return <Redirect to="/sign-in" />;
  if (location === "/ari-amr/login") {
    return <Redirect to="/sign-in?product=amr" />;
  }

  if (isAuthRoute) {
    return (
      <ClerkAuthScreen
        mode={location.startsWith("/sign-up") ? "sign-up" : "sign-in"}
        product={authProduct}
        basePath={basePath}
        onDemoLogin={() => handleDemoLogin(authProduct)}
        onBack={() => setLocation(authProduct === "amr" ? "/ari-amr" : "/")}
      />
    );
  }

  if (requiresAuth && (!clerkLoaded || authState === "loading")) {
    return (
      <div className="amr-public-theme dark flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking account access…
      </div>
    );
  }

  if (requiresAuth && authState === "anonymous") {
    return (
      <Redirect
        to={isAmrWorkspace ? "/sign-in?product=amr" : "/sign-in"}
      />
    );
  }

  return isAmrWorkspace ? (
    <AuthenticatedAmrApp onSignOut={() => handleSignOut("amr")} />
  ) : (
    <AuthenticatedAribotsApp onSignOut={() => handleSignOut("aribots")} />
  );
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(clerkDestination(to))}
      routerReplace={(to) =>
        setLocation(clerkDestination(to), { replace: true })
      }
    >
      <AppContent />
    </ClerkProvider>
  );
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
            base={basePath}
            hook={STANDALONE ? useHashLocation : undefined}
          >
            <Toaster />
            <ClerkApp />
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
