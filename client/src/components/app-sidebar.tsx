import { useLocation, Link } from "wouter";
import {
  Home,
  Stethoscope,
  Newspaper,
  Users,
  CalendarDays,
  Bot,
  Shield,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Triage", url: "/triage", icon: Stethoscope },
  { title: "News", url: "/news", icon: Newspaper },
  { title: "Groups", url: "/groups", icon: Users },
  { title: "Events", url: "/events", icon: CalendarDays },
];

const aiItems = [{ title: "Aribot", url: "/aribot", icon: Bot }];

const adminItems = [{ title: "Team", url: "/team", icon: Shield }];

const settingsItems = [{ title: "Account", url: "/account", icon: Settings }];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/me"] });

  const isAdmin = user?.role === "admin";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" data-testid="text-app-name">AriMed</span>
            <span className="text-xs text-muted-foreground">Clinical Platform</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>AI Assistant</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">AI</Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
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
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate" data-testid="text-sidebar-username">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.specialty}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
