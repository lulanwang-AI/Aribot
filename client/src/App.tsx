import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProfileSheetProvider } from "@/components/doctor-profile-sheet";
import { FloatingAribot } from "@/components/floating-aribot";
import { NetworkBackground } from "@/components/network-background";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Aribot from "@/pages/aribot";
import AribotHistoryPage from "@/pages/aribot-history";
import AribotFoldersPage from "@/pages/aribot-folders";
import Triage from "@/pages/triage";
import TriageDetail from "@/pages/triage-detail";
import News from "@/pages/news";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import Events from "@/pages/events";
import Account from "@/pages/account";
import Team from "@/pages/team";
import Chats from "@/pages/chats";
import Training from "@/pages/training";
import Doctors from "@/pages/doctors";
import Telemed from "@/pages/telemed";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import { AuthContext } from "@/lib/auth";
import { ChevronLeft, ChevronRight } from "lucide-react";

function SidebarEdgeTrigger() {
  const { toggleSidebar, state } = useSidebar();
  const isOpen = state === "expanded";
  return (
    <button
      onClick={toggleSidebar}
      data-testid="button-sidebar-toggle"
      className="absolute top-1/2 left-0 -translate-y-1/2 z-10 h-12 w-5 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-l-0 rounded-r-md shadow-sm hover:bg-accent transition-colors"
    >
      {isOpen ? <ChevronLeft className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Aribot} />
      <Route path="/aribot/history" component={AribotHistoryPage} />
      <Route path="/aribot/folders" component={AribotFoldersPage} />
      <Route path="/home" component={Home} />
      <Route path="/triage" component={Triage} />
      <Route path="/triage/:id">
        {(params) => <TriageDetail id={params.id} />}
      </Route>
      <Route path="/news" component={News} />
      <Route path="/groups" component={Groups} />
      <Route path="/groups/:id">
        {(params) => <GroupDetail id={params.id} />}
      </Route>
      <Route path="/events" component={Events} />
      <Route path="/chats" component={Chats} />
      <Route path="/training" component={Training} />
      <Route path="/doctors" component={Doctors} />
      <Route path="/account" component={Account} />
      <Route path="/team" component={Team} />
      <Route path="/telemed" component={Telemed} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedApp({ onSignOut }: { onSignOut: () => void }) {
  return (
    <AuthContext.Provider value={{ signOut: onSignOut }}>
      <ProfileSheetProvider>
        <NetworkBackground />
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0 relative">
              <main className="flex-1 overflow-auto">
                <Router />
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
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem("aribot_authenticated") === "true";
  });
  const [location, setLocation] = useLocation();

  function handleSignOut() {
    localStorage.removeItem("aribot_authenticated");
    queryClient.clear();
    setAuthenticated(false);
  }

  if (location === "/landing") {
    return <Landing />;
  }

  if (authenticated) {
    return <AuthenticatedApp onSignOut={handleSignOut} />;
  }

  return (
    <Login
      onLogin={() => setAuthenticated(true)}
      onNavigateToLanding={() => setLocation("/landing")}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
