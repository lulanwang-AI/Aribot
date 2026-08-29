import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
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

function Router() {
  const [location] = useLocation();
  
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
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Patients} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Toaster />
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
