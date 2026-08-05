import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Bot,
  CalendarDays,
  Settings,
  Shield,
  MessageCircle,
  Home,
  ChevronDown,
  BarChart2,
  ShieldCheck,
  Users2,
  Lock,
  ClipboardList,
  FileText,
  FilePlus,
  CheckCircle2,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ClickableDoctor } from "@/components/doctor-profile-sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useCallback } from "react";
import type { User } from "@shared/schema";
import { useRole, type AppRole } from "@/lib/role";

interface Notifications {
  news: number;
  triage: number;
  events: number;
  chats: number;
}

const mainNavItems = [
  { title: "Events", url: "/events", icon: CalendarDays, notifKey: "events" as const },
];

const secondaryItems = [
  { title: "Chats", url: "/chats", icon: MessageCircle, notifKey: "chats" as const },
  { title: "My Team", url: "/team", icon: Shield, notifKey: null },
];

const bottomItems = [
  { title: "Dashboard", url: "/home", icon: Home },
  { title: "Account", url: "/account", icon: Settings },
];

const adminItems = [
  { title: "User Interactions", url: "/admin?tab=users", icon: Users2 },
  { title: "Revenue", url: "/admin?tab=revenue", icon: BarChart2 },
  { title: "Compliance", url: "/admin?tab=compliance", icon: ShieldCheck },
];

const MED_STUDENT_RESTRICTED = new Set<string>([]);

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: notifs } = useQuery<Notifications>({ queryKey: ["/api/notifications"] });
  const [aribotOpen, setAribotOpen] = useState(true);
  const [clinicalOpen, setClinicalOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [role] = useRole();

  const dismissNotif = useCallback((key: string) => {
    setDismissed(prev => new Set(prev).add(key));
  }, []);

  const isMedStudent = role === "medstudent";
  const isAdmin = role === "admin";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-9 w-9 shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-white/40">
            <img src={aribotLogoPath} alt="ARIbots" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" data-testid="text-app-name">ARIbots</span>
            <span className="text-[10px] text-muted-foreground">built by physicians for physicians</span>
          </div>
        </div>

        {isMedStudent && (
          <p className="text-[9px] text-amber-400 text-center px-1 pb-1">
            Observer mode — some features restricted
          </p>
        )}
        {isAdmin && (
          <p className="text-[9px] text-sky-300 text-center px-1 pb-1">
            Admin view — elevated access
          </p>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuButton
            asChild
            data-active={location === "/aribot"}
            className="w-full"
            data-testid="nav-aribot"
          >
            <Link href="/aribot">
              <Bot className="h-4 w-4" />
              <span className="flex-1">Aribots AI</span>
            </Link>
          </SidebarMenuButton>

          <Collapsible open={clinicalOpen} onOpenChange={setClinicalOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                data-active={["/pre-charting", "/clinical-chat", "/soap", "/visit-summary", "/workflow-history"].includes(location)}
                className="w-full"
                data-testid="nav-clinical"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="flex-1">Clinical Workflow</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${clinicalOpen ? "" : "-rotate-90"}`} />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-6 mt-1 space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/pre-charting"} data-testid="nav-pre-charting">
                    <Link href="/pre-charting">
                      <FilePlus className="h-3.5 w-3.5" />
                      <span className="text-xs">Pre-Charting</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/clinical-chat"} data-testid="nav-clinical-chat">
                    <Link href="/clinical-chat">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="text-xs">ARIbot Consult</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/soap"} data-testid="nav-soap">
                    <Link href="/soap">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">SOAP Note</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/visit-summary"} data-testid="nav-visit-summary">
                    <Link href="/visit-summary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Visit Summary</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/workflow-history"} data-testid="nav-workflow-history">
                    <Link href="/workflow-history">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-xs">Workflow History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>

          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const notifKey = item.notifKey;
                const count = notifKey && notifs ? notifs[notifKey] : 0;
                const showBadge = count > 0 && notifKey && !dismissed.has(notifKey);
                const isRestricted = isMedStudent && MED_STUDENT_RESTRICTED.has(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url || location.startsWith(item.url + "/")}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url} onClick={() => notifKey && dismissNotif(notifKey)}>
                        <item.icon className={`h-4 w-4 ${isRestricted ? "text-muted-foreground/60" : ""}`} />
                        <span className={`flex-1 ${isRestricted ? "text-muted-foreground" : ""}`}>{item.title}</span>
                        {isRestricted && (
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                        {!isRestricted && showBadge && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center bg-sky-400 hover:bg-sky-500 text-white border-0" data-testid={`badge-${item.title.toLowerCase()}`}>
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => {
                const notifKey = item.notifKey;
                const count = notifKey && notifs ? notifs[notifKey] : 0;
                const showBadge = count > 0 && notifKey && !dismissed.has(notifKey);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
                    >
                      <Link href={item.url} onClick={() => notifKey && dismissNotif(notifKey)}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center bg-sky-400 hover:bg-sky-500 text-white border-0" data-testid={`badge-${item.title.toLowerCase().replace(/ /g, "-")}`}>
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] text-primary font-semibold uppercase tracking-wider px-2">
                Admin Panels
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    const urlBase = item.url.split("?")[0];
                    const isActive = location === urlBase || location === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          data-active={isActive}
                          data-testid={`nav-admin-${item.title.toLowerCase().replace(/ /g, "-")}`}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <div className="px-2 py-2 [&_span]:text-sidebar-foreground">
            <ClickableDoctor userId={user.id} name={user.name} credential={user.credential} avatarUrl={user.avatarUrl} />
            <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
              {isMedStudent ? "Observer access — MD/DO only features locked." : "For licensed clinicians only."}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
