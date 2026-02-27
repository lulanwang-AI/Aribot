import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Bot,
  Stethoscope,
  Newspaper,
  Users,
  CalendarDays,
  Settings,
  Shield,
  MessageCircle,
  BookOpen,
  Home,
  ChevronDown,
  Clock,
  FolderOpen,
  UserSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ClickableDoctor } from "@/components/doctor-profile-sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useCallback } from "react";
import type { User } from "@shared/schema";

interface Notifications {
  news: number;
  triage: number;
  events: number;
  chats: number;
}

const mainNavItems = [
  { title: "News", url: "/news", icon: Newspaper, notifKey: "news" as const },
  { title: "Triage", url: "/triage", icon: Stethoscope, notifKey: "triage" as const },
  { title: "Groups", url: "/groups", icon: Users, notifKey: null },
  { title: "Events", url: "/events", icon: CalendarDays, notifKey: "events" as const },
  { title: "Doctors", url: "/doctors", icon: UserSearch, notifKey: null },
];

const secondaryItems = [
  { title: "Chats", url: "/chats", icon: MessageCircle, notifKey: "chats" as const },
  { title: "Training", url: "/training", icon: BookOpen, notifKey: null },
  { title: "My Team", url: "/team", icon: Shield, notifKey: null },
];

const bottomItems = [
  { title: "Dashboard", url: "/home", icon: Home },
  { title: "Account", url: "/account", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: notifs } = useQuery<Notifications>({ queryKey: ["/api/notifications"] });
  const [aribotOpen, setAribotOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismissNotif = useCallback((key: string) => {
    setDismissed(prev => new Set(prev).add(key));
  }, []);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" data-testid="text-app-name">Aribot Portal</span>
            <span className="text-[10px] text-muted-foreground">For Clinicians</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <Collapsible open={aribotOpen} onOpenChange={setAribotOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                data-active={location === "/" || location.startsWith("/aribot")}
                className="w-full"
                data-testid="nav-aribot"
              >
                <Bot className="h-4 w-4" />
                <span className="flex-1">Aribot</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aribotOpen ? "" : "-rotate-90"}`} />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-6 mt-1 space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/"} data-testid="nav-aribot-chat">
                    <Link href="/">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="text-xs">Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/aribot/history"} data-testid="nav-aribot-history">
                    <Link href="/aribot/history">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/aribot/folders"} data-testid="nav-aribot-folders">
                    <Link href="/aribot/folders">
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span className="text-xs">Folders</span>
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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url || location.startsWith(item.url + "/")}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url} onClick={() => notifKey && dismissNotif(notifKey)}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
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
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <div className="px-2 py-2">
            <ClickableDoctor userId={user.id} name={user.name} specialty={user.specialty} size="sm" />
            <p className="text-[10px] text-muted-foreground mt-1 px-1 italic">
              For licensed clinicians only.
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
