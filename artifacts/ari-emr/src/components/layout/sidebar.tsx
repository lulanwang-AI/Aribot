import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  ScanLine,
  Box,
  Brain,
  Inbox,
  Receipt,
  HeartHandshake,
  BarChart3,
  Building2,
  UserCog,
  MessageSquare,
  Shield,
  Settings,
  HelpCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import logoUrl from "@assets/aribot-mark-primary-1024_1785138240677.png";

type NavItem = { icon: any; label: string; path: string; soon?: boolean };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: "Clinical",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: CalendarDays, label: "Schedule", path: "/appointments" },
      { icon: Users, label: "Patients", path: "/" },
      { icon: Stethoscope, label: "Consults", path: "/consultation" },
    ],
  },
  {
    title: "Imaging",
    items: [
      { icon: Brain, label: "Radiology Hub", path: "/radiology-hub" },
      { icon: ScanLine, label: "Ari Diagnostics", path: "/dicom" },
      { icon: Box, label: "3D Viewer", path: "/3d-viewer" },
    ],
  },
  {
    title: "Practice",
    items: [
      { icon: Inbox, label: "In Basket", path: "/in-basket" },
      { icon: Receipt, label: "Billing", path: "/billing" },
      { icon: HeartHandshake, label: "CRM", path: "/crm" },
      { icon: BarChart3, label: "Reports", path: "/reports" },
    ],
  },
  {
    title: "Administration",
    items: [
      { icon: Building2, label: "Clinic", path: "/clinic" },
      { icon: UserCog, label: "Staff", path: "/staff" },
      { icon: Shield, label: "Compliance", path: "/audit" },
    ],
  },
];

const bottomItems: NavItem[] = [
  { icon: HelpCircle, label: "Help Center", path: "/help" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

function NavLink({ item, location, badge, onNavigate }: { item: NavItem; location: string; badge?: number; onNavigate?: () => void }) {
  const active = location === item.path;
  return (
    <Link
      href={item.path}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium",
        active
          ? "bg-white/10 text-white"
          : "text-[color:var(--sidebar-foreground)] hover:bg-white/5 hover:text-white"
      )}
      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <item.icon
        className={cn("w-[18px] h-[18px]", active && "text-[color:var(--sidebar-active)]")}
      />
      <span className="flex-1">{item.label}</span>
      {!!badge && (
        <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" data-testid="badge-inbasket-unread">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {item.soon && (
        <span className="text-[9px] font-semibold uppercase tracking-wide bg-white/10 text-white/60 rounded px-1.5 py-0.5">
          Soon
        </span>
      )}
      {active && <span className="w-1 h-4 rounded-full bg-[color:var(--sidebar-active)]" />}
    </Link>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { data: unread } = useQuery<{ total: number }>({
    queryKey: ["/api/inbasket/unread-counts"],
    refetchInterval: 60_000,
  });

  return (
    <div className="w-60 shrink-0 h-full flex flex-col" style={{ background: "var(--sidebar)" }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white shadow-lg shadow-black/20 p-1">
            <img src={logoUrl} alt="ARI logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-[15px] leading-tight tracking-tight">ARI</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 font-semibold">EMR Platform</div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto px-3 space-y-5 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
              {section.title}
            </h3>
            <nav className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.path} item={item} location={location} onNavigate={onNavigate}
                  badge={item.path === "/in-basket" ? unread?.total : undefined} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10">
        <nav className="space-y-0.5">
          {bottomItems.map((item) => (
            <NavLink key={item.path} item={item} location={location} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </div>
  );
}
