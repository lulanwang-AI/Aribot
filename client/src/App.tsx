import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProfileSheetProvider } from "@/components/doctor-profile-sheet";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Aribot from "@/pages/aribot";
import Triage from "@/pages/triage";
import TriageDetail from "@/pages/triage-detail";
import News from "@/pages/news";
import Groups from "@/pages/groups";
import Events from "@/pages/events";
import Account from "@/pages/account";
import Team from "@/pages/team";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/aribot" component={Aribot} />
      <Route path="/triage" component={Triage} />
      <Route path="/triage/:id">
        {(params) => <TriageDetail id={params.id} />}
      </Route>
      <Route path="/news" component={News} />
      <Route path="/groups" component={Groups} />
      <Route path="/events" component={Events} />
      <Route path="/account" component={Account} />
      <Route path="/team" component={Team} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProfileSheetProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center gap-2 p-2 border-b shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <span className="text-sm font-medium text-muted-foreground">AriMed</span>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ProfileSheetProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
