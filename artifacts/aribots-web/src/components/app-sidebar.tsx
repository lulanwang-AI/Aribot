import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Activity,
  BookOpen,
  ClipboardPlus,
  FlaskConical,
  Grid3x3,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BRAND_NAME, BRAND_TAGLINE, BrandMark } from "@/components/brand-mark";
import { formatReviewClock } from "@/lib/amr";
import type { User } from "@shared/schema";

interface Notifications {
  reviewsDue: number;
  reviewsOverdue: number;
  alerts: number;
  activeCases: number;
  nextReviewHours: number | null;
}

const WORKLIST = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, badge: null },
  { title: "Cases", url: "/cases", icon: Activity, badge: "activeCases" as const },
  { title: "Reviews due", url: "/cases?filter=review", icon: ShieldCheck, badge: "reviewsDue" as const },
];

const TOOLS = [
  { title: "New assessment", url: "/intake", icon: ClipboardPlus },
  { title: "Antibiogram", url: "/antibiogram", icon: Grid3x3 },
  { title: "Formulary", url: "/formulary", icon: FlaskConical },
  { title: "Ask Ari", url: "/ari", icon: MessageSquare },
];

const FOOTER = [
  { title: "Guidance", url: "/guidance", icon: BookOpen },
  { title: "Account", url: "/ari-amr/account", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: notifs } = useQuery<Notifications>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60_000,
  });

  const isActive = (url: string) => {
    const base = url.split("?")[0];
    if (base === "/cases") return location === "/cases" || location.startsWith("/cases/");
    return location === base;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <BrandMark />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold leading-tight" data-testid="text-app-name">
              {BRAND_NAME}
            </span>
            <span className="truncate text-[10px] leading-tight text-muted-foreground">
              {BRAND_TAGLINE}
            </span>
          </div>
        </div>

        {notifs && (
          <div className="mx-2 mb-2 rounded-lg border border-card-border bg-card p-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Next review
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-semibold tabular-nums",
                  notifs.reviewsOverdue > 0 ? "text-resistant" : "text-primary",
                )}
              >
                {notifs.reviewsDue > 0
                  ? `${notifs.reviewsDue} due`
                  : notifs.nextReviewHours !== null
                    ? formatReviewClock(notifs.nextReviewHours)
                    : "none"}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
              Every empiric course gets a 48-72 hour decision.
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Worklist
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKLIST.map((item) => {
                const count = item.badge && notifs ? notifs[item.badge] : 0;
                const urgent = item.badge === "reviewsDue" && (notifs?.reviewsOverdue ?? 0) > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive(item.url)}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {count > 0 && (
                          <Badge
                            className={cn(
                              "flex h-4 min-w-[18px] items-center justify-center border-0 px-1.5 py-0 text-[10px]",
                              urgent
                                ? "bg-resistant text-white hover:bg-resistant"
                                : "bg-primary text-primary-foreground hover:bg-primary",
                            )}
                          >
                            {count}
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
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOLS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {FOOTER.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={isActive(item.url)}
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
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .filter(Boolean)
                  .slice(-2)
                  .join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {user.credential} · {user.subspecialty || user.specialty}
                </p>
              </div>
            </div>
            <p className="mt-2 px-0.5 text-[10px] leading-snug text-muted-foreground">
              For licensed clinicians. Recommendations are advisory; the prescriber remains responsible.
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
