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
import { apiRequest, queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientChart from "@/pages/patient-chart";
import PatientDetail from "@/pages/patient-detail";
import AITools from "@/pages/ai-tools";
import Settings from "@/pages/settings";
import RadiologyHub from "@/pages/radiology-hub";
import AuditDashboard from "@/pages/audit-dashboard";
import Appointments from "@/pages/appointments";
import Reports from "@/pages/reports";
import Billing from "@/pages/billing";
import Crm from "@/pages/crm";
import InBasket from "@/pages/in-basket";
import Clinic from "@/pages/clinic";
import Staff from "@/pages/staff";
import Consultation from "@/pages/consultation";
import DicomManager from "@/pages/dicom-manager";
import ThreeDViewer from "@/pages/3d-viewer";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MedicalAIChat from "@/components/ai/medical-ai-chat";
import LandingPage from "@/pages/landing";
import { ClerkAuthScreen } from "@/components/auth/clerk-auth-screen";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-access";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPublishableKey = publishableKeyFromHost(
  window.location.host,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function clerkDestination(to: string) {
  const url = new URL(to, window.location.origin);
  const pathname = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length) || "/"
    : url.pathname;
  return `${pathname}${url.search}${url.hash}`;
}

function Router() {
  const [location, setLocation] = useLocation();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useAuth();
  const { signOut } = useClerk();
  const isAuthRoute =
    location.startsWith("/sign-in") || location.startsWith("/sign-up");
  const requiresAuth = location !== "/" && location !== "/login" && !isAuthRoute;

  useEffect(() => {
    if (!requiresAuth || !clerkLoaded) return;
    let cancelled = false;
    setAuthState("loading");
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => {
        if (!cancelled) setAuthState(response.ok ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (!cancelled) setAuthState("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, [requiresAuth, clerkLoaded, clerkSignedIn]);

  async function handleDemoLogin() {
    await apiRequest("POST", "/api/auth/login", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    setAuthState("authenticated");
    setLocation("/workspace");
  }

  async function handleSignOut() {
    queryClient.clear();
    await apiRequest("POST", "/api/auth/logout").catch(() => undefined);
    if (clerkSignedIn) {
      setAuthState("anonymous");
      await signOut({ redirectUrl: `${basePath}/` });
    } else {
      setAuthState("anonymous");
      setLocation("/");
    }
  }
  
  // Public landing page bypasses layout
  if (location === "/") {
    return <LandingPage />;
  }
  if (location === "/login") return <Redirect to="/sign-in" />;
  if (isAuthRoute) {
    return (
      <ClerkAuthScreen
        mode={location.startsWith("/sign-up") ? "sign-up" : "sign-in"}
        basePath={basePath}
        onDemoLogin={handleDemoLogin}
        onBack={() => setLocation("/")}
      />
    );
  }
  if (requiresAuth && (!clerkLoaded || authState === "loading")) {
    return (
      <div className="dark flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        Checking account access…
      </div>
    );
  }
  if (requiresAuth && authState === "anonymous") {
    return <Redirect to="/sign-in" />;
  }

  // Check if we're on a patient detail page
  const isPatientDetail = location.startsWith("/patient/") || location.startsWith("/patients/");
  
  // If on patient detail page, render the viewer without sidebar/header
  if (isPatientDetail) {
    return (
      <Switch>
        <Route path="/patient/:id" component={PatientDetail} />
        <Route path="/patients/:id" component={PatientDetail} />
      </Switch>
    );
  }
  
  // Otherwise, render with sidebar and header
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:block h-screen sticky top-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/workspace" component={Patients} />
            <Route path="/chart/:id" component={PatientChart} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/radiology-hub" component={RadiologyHub} />
            <Route path="/ai-tools" component={AITools} />
            <Route path="/audit" component={AuditDashboard} />
            <Route path="/appointments" component={Appointments} />
            <Route path="/billing" component={Billing} />
            <Route path="/crm" component={Crm} />
            <Route path="/in-basket" component={InBasket} />
            <Route path="/reports" component={Reports} />
            <Route path="/clinic" component={Clinic} />
            <Route path="/staff" component={Staff} />
            <Route path="/consultation" component={Consultation} />
            <Route path="/dicom" component={DicomManager} />
            <Route path="/3d-viewer" component={ThreeDViewer} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      {/* Global AI Assistant - floating widget accessible from anywhere */}
      <MedicalAIChat embedded={true} />
    </div>
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
      <Router />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Toaster />
          <ClerkApp />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
