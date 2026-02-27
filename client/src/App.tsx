import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProfileSheetProvider } from "@/components/doctor-profile-sheet";
import { FloatingAribot } from "@/components/floating-aribot";
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
import Login from "@/pages/login";
import { AuthContext } from "@/lib/auth";

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
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center gap-2 p-2 border-b shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <span className="text-sm font-medium text-muted-foreground">Aribot Portal</span>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
          <FloatingAribot />
        </SidebarProvider>
        <Toaster />
      </ProfileSheetProvider>
    </AuthContext.Provider>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem("aribot_authenticated") === "true";
  });

  function handleSignOut() {
    localStorage.removeItem("aribot_authenticated");
    queryClient.clear();
    setAuthenticated(false);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {authenticated ? (
          <AuthenticatedApp onSignOut={handleSignOut} />
        ) : (
          <Login onLogin={() => setAuthenticated(true)} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
