import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRole } from "@/lib/role";
import {
  Users2, BarChart2, ShieldCheck, Flag, MessageSquare,
  Activity, TrendingUp, DollarSign, CheckCircle, AlertTriangle,
  XCircle, Eye, UserCheck, LogIn, CreditCard, Lock,
  UserPlus, Pencil, Newspaper, Video, Calendar, Globe,
  Settings, Crown, ChevronDown, ChevronUp, MoreHorizontal,
  Check, Ban, RefreshCw, Mail, Stethoscope, LineChart,
  ArrowUpRight, ArrowDownRight, Clock, Flame, UserMinus,
} from "lucide-react";

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_POSTS = [
  { id: 1, author: "Dr. James Liu", specialty: "Neurology", content: "Reviewing LP results in suspected SAH — any updated protocols?", time: "2m ago", flags: 0, status: "active" },
  { id: 2, author: "Dr. Priya Nair", specialty: "Cardiology", content: "STEMI equivalent patterns — high lateral MI with osborn waves?", time: "14m ago", flags: 0, status: "active" },
  { id: 3, author: "Unknown User", specialty: "–", content: "Sharing patient name for second opinion...", time: "1h ago", flags: 3, status: "flagged" },
  { id: 4, author: "Dr. Marcus Webb", specialty: "Emergency Medicine", content: "Post-COVID long-hauler dyspnea workup algorithm?", time: "2h ago", flags: 0, status: "active" },
  { id: 5, author: "User #4412", specialty: "–", content: "Advertising external service to physicians — discount code...", time: "3h ago", flags: 5, status: "removed" },
];

const MOCK_ACTIVITY = [
  { user: "Dr. Sarah Chen", action: "Created triage case", time: "3m ago", icon: MessageSquare },
  { user: "Dr. James Liu", action: "Joined group: Neurology Network", time: "11m ago", icon: Users2 },
  { user: "Dr. Priya Nair", action: "Completed telemedicine session", time: "28m ago", icon: CheckCircle },
  { user: "Dr. Marcus Webb", action: "Updated profile credentials", time: "45m ago", icon: UserCheck },
  { user: "Dr. Aisha Torres", action: "Logged in", time: "1h ago", icon: LogIn },
  { user: "User #4412", action: "Account suspended by admin", time: "3h ago", icon: XCircle },
];

const MOCK_REVENUE = {
  mrr: 48200,
  arr: 578400,
  activeSubscriptions: 1847,
  trialUsers: 312,
  churnRate: 2.1,
  growth: 14.3,
  recentLogins: [
    { date: "Today", count: 342 },
    { date: "Yesterday", count: 298 },
    { date: "Mon", count: 401 },
    { date: "Sun", count: 187 },
    { date: "Sat", count: 163 },
    { date: "Fri", count: 388 },
    { date: "Thu", count: 415 },
  ],
  plans: [
    { name: "Individual MD", users: 1204, revenue: 36120, price: 30 },
    { name: "Group Practice", users: 487, revenue: 97400, price: 200 },
    { name: "Hospital System", users: 156, revenue: 156000, price: 1000 },
  ],
};

const MOCK_COMPLIANCE = [
  {
    framework: "HIPAA",
    status: "compliant",
    score: 98,
    lastAudit: "Mar 15, 2026",
    nextAudit: "Sep 15, 2026",
    controls: 42,
    passed: 41,
    findings: ["Encryption key rotation due Q3 2026"],
  },
  {
    framework: "GDPR",
    status: "compliant",
    score: 95,
    lastAudit: "Feb 1, 2026",
    nextAudit: "Aug 1, 2026",
    controls: 28,
    passed: 27,
    findings: ["Data retention policy update in review"],
  },
  {
    framework: "SOC 2 Type II",
    status: "in-review",
    score: 87,
    lastAudit: "Jan 10, 2026",
    nextAudit: "Jul 10, 2026",
    controls: 64,
    passed: 56,
    findings: ["Vendor access review pending", "Incident response drill scheduled"],
  },
];

// ─── Analytics mock data ─────────────────────────────────────────────────────

const TOTAL_ONBOARDED = 131;

type RangeKey = "7D" | "30D" | "90D" | "YTD" | "1Y";

interface RangeBucket { label: string; value: number }

interface RangeDataset {
  chartTitle: string;
  chartSub: string;
  buckets: RangeBucket[];
  barColor: string;
  kpi: {
    primaryLabel: string;
    primaryValue: number;
    primaryPrev: number;
    secondaryLabel: string;
    secondaryValue: number;
    churnPct: string;
    churnCount: number;
    atRisk: number;
    newMembers: number;
    totalPosts: string;
    flagged: number;
    activeUsers: number;
    newSignups: number;
  };
}

const ANALYTICS_RANGES: Record<RangeKey, RangeDataset> = {
  "7D": {
    chartTitle: "Daily Active Users — Last 7 Days",
    chartSub: "Mar 24 – Mar 30",
    barColor: "bg-orange-400",
    buckets: [
      { label: "Mar 24", value: 82 }, { label: "Mar 25", value: 88 },
      { label: "Mar 26", value: 91 }, { label: "Mar 27", value: 86 },
      { label: "Mar 28", value: 93 }, { label: "Mar 29", value: 87 }, { label: "Mar 30", value: 89 },
    ],
    kpi: { primaryLabel: "Avg. Daily Active", primaryValue: 88, primaryPrev: 83, secondaryLabel: "Peak DAU (7-day)", secondaryValue: 93, churnPct: "0.8%", churnCount: 1, atRisk: 12, newMembers: 6, totalPosts: "847", flagged: 8, activeUsers: 342, newSignups: 6 },
  },
  "30D": {
    chartTitle: "Daily Active Users — Last 30 Days",
    chartSub: "Mar 1 – Mar 30",
    barColor: "bg-blue-400",
    buckets: [
      { label: "Mar 1", value: 61 }, { label: "Mar 2", value: 58 }, { label: "Mar 3", value: 64 }, { label: "Mar 4", value: 67 },
      { label: "Mar 5", value: 72 }, { label: "Mar 6", value: 69 }, { label: "Mar 7", value: 66 }, { label: "Mar 8", value: 74 },
      { label: "Mar 9", value: 77 }, { label: "Mar 10", value: 75 }, { label: "Mar 11", value: 71 }, { label: "Mar 12", value: 78 },
      { label: "Mar 13", value: 80 }, { label: "Mar 14", value: 76 }, { label: "Mar 15", value: 73 }, { label: "Mar 16", value: 81 },
      { label: "Mar 17", value: 71 }, { label: "Mar 18", value: 63 }, { label: "Mar 19", value: 58 }, { label: "Mar 20", value: 79 },
      { label: "Mar 21", value: 84 }, { label: "Mar 22", value: 76 }, { label: "Mar 23", value: 68 }, { label: "Mar 24", value: 82 },
      { label: "Mar 25", value: 88 }, { label: "Mar 26", value: 91 }, { label: "Mar 27", value: 86 }, { label: "Mar 28", value: 93 },
      { label: "Mar 29", value: 87 }, { label: "Mar 30", value: 89 },
    ],
    kpi: { primaryLabel: "Avg. Daily Active (30D)", primaryValue: 76, primaryPrev: 71, secondaryLabel: "Peak DAU (30-day)", secondaryValue: 93, churnPct: "3.1%", churnCount: 4, atRisk: 12, newMembers: 23, totalPosts: "22.4k", flagged: 41, activeUsers: 389, newSignups: 23 },
  },
  "90D": {
    chartTitle: "Weekly Active Users — Last 90 Days",
    chartSub: "Jan 1 – Mar 30 (weekly)",
    barColor: "bg-green-500",
    buckets: [
      { label: "Jan 6", value: 44 }, { label: "Jan 13", value: 51 }, { label: "Jan 20", value: 58 }, { label: "Jan 27", value: 62 },
      { label: "Feb 3", value: 74 }, { label: "Feb 10", value: 81 }, { label: "Feb 17", value: 88 }, { label: "Feb 24", value: 99 },
      { label: "Mar 3", value: 107 }, { label: "Mar 10", value: 113 }, { label: "Mar 17", value: 116 }, { label: "Mar 24", value: 118 }, { label: "Mar 30", value: 119 },
    ],
    kpi: { primaryLabel: "Avg. WAU (90 Days)", primaryValue: 87, primaryPrev: 61, secondaryLabel: "Peak WAU", secondaryValue: 119, churnPct: "8.4%", churnCount: 11, atRisk: 19, newMembers: 67, totalPosts: "68.2k", flagged: 124, activeUsers: 112, newSignups: 67 },
  },
  "YTD": {
    chartTitle: "Monthly Active Users — Year to Date",
    chartSub: "Jan 2026 – Mar 2026",
    barColor: "bg-violet-500",
    buckets: [
      { label: "January", value: 65 }, { label: "February", value: 78 }, { label: "March", value: 87 },
    ],
    kpi: { primaryLabel: "Avg. MAU (YTD)", primaryValue: 77, primaryPrev: 0, secondaryLabel: "Members Onboarded", secondaryValue: TOTAL_ONBOARDED, churnPct: "8.2%", churnCount: 11, atRisk: 19, newMembers: 89, totalPosts: "73.1k", flagged: 134, activeUsers: 118, newSignups: 89 },
  },
  "1Y": {
    chartTitle: "Monthly Active Users — Last 12 Months",
    chartSub: "Apr 2025 – Mar 2026",
    barColor: "bg-rose-400",
    buckets: [
      { label: "Apr '25", value: 8 }, { label: "May '25", value: 14 }, { label: "Jun '25", value: 21 }, { label: "Jul '25", value: 29 },
      { label: "Aug '25", value: 37 }, { label: "Sep '25", value: 44 }, { label: "Oct '25", value: 53 }, { label: "Nov '25", value: 58 },
      { label: "Dec '25", value: 62 }, { label: "Jan '26", value: 65 }, { label: "Feb '26", value: 78 }, { label: "Mar '26", value: 87 },
    ],
    kpi: { primaryLabel: "Peak MAU (12-month)", primaryValue: 87, primaryPrev: 8, secondaryLabel: "Total Onboarded", secondaryValue: TOTAL_ONBOARDED, churnPct: "12.1%", churnCount: 16, atRisk: 19, newMembers: 131, totalPosts: "112k", flagged: 192, activeUsers: 131, newSignups: 131 },
  },
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "90D", label: "90D" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1Y" },
];

const ONBOARDING_FUNNEL = [
  { stage: "Invited", count: 200, pct: 100 },
  { stage: "Email Verified", count: 178, pct: 89 },
  { stage: "NPI Verified", count: 158, pct: 79 },
  { stage: "Profile Complete", count: 142, pct: 71 },
  { stage: "Onboarded (Active)", count: TOTAL_ONBOARDED, pct: 65.5 },
  { stage: "Retained (30-day)", count: 108, pct: 82.4 },
];

const CHURN_REASONS = [
  { reason: "Insufficient time / workflow fit", pct: 37, color: "bg-blue-400" },
  { reason: "Found alternative platform", pct: 28, color: "bg-purple-400" },
  { reason: "EHR integration gaps", pct: 22, color: "bg-amber-400" },
  { reason: "Pricing concerns", pct: 13, color: "bg-rose-400" },
];

const COHORT_RETENTION = [
  { cohort: "Jan 2026", size: 28, w1: 96, w2: 86, w4: 79, m3: 71 },
  { cohort: "Feb 2026", size: 53, w1: 94, w2: 88, w4: 82, m3: 75 },
  { cohort: "Mar 2026", size: 50, w1: 98, w2: 91, w4: 86, m3: null },
];

const FEATURE_ADOPTION = [
  { feature: "ARI Assistant", adopted: 116, pct: 89, icon: Stethoscope },
  { feature: "Clinical Triage", adopted: 97, pct: 74, icon: Activity },
  { feature: "Medical News AI", adopted: 89, pct: 68, icon: Newspaper },
  { feature: "Doctor Directory", adopted: 72, pct: 55, icon: Users2 },
  { feature: "Groups & Forums", adopted: 61, pct: 47, icon: MessageSquare },
  { feature: "Telemedicine", adopted: 54, pct: 41, icon: Video },
];

// ─── Permission definitions ──────────────────────────────────────────────────

type PermKey =
  | "content_moderation"
  | "user_management"
  | "community_management"
  | "news_publishing"
  | "telemedicine"
  | "analytics"
  | "compliance"
  | "event_management";

const PERMISSIONS: { key: PermKey; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { key: "content_moderation", label: "Content Moderation", icon: Flag, color: "text-orange-500", desc: "Flag, remove, or restore posts and comments" },
  { key: "user_management", label: "User Management", icon: UserCheck, color: "text-blue-500", desc: "Suspend users, verify credentials, manage profiles" },
  { key: "community_management", label: "Community", icon: Globe, color: "text-violet-500", desc: "Manage groups, approve members, resolve disputes" },
  { key: "news_publishing", label: "News & Content", icon: Newspaper, color: "text-sky-500", desc: "Publish news, edit articles, manage sources" },
  { key: "telemedicine", label: "Telemedicine", icon: Video, color: "text-teal-500", desc: "Approve providers, manage sessions and schedules" },
  { key: "analytics", label: "Analytics", icon: BarChart2, color: "text-emerald-500", desc: "View usage stats, revenue reports, and dashboards" },
  { key: "compliance", label: "Compliance", icon: ShieldCheck, color: "text-red-500", desc: "Access HIPAA reports, audit logs, and PHI controls" },
  { key: "event_management", label: "Events", icon: Calendar, color: "text-amber-500", desc: "Create, edit, and cancel medical events" },
];

type ModeratorStatus = "active" | "inactive" | "suspended";

type Moderator = {
  id: string;
  name: string;
  title: string;
  email: string;
  initials: string;
  avatarBg: string;
  status: ModeratorStatus;
  lastActive: string;
  joinedDate: string;
  permissions: Record<PermKey, boolean>;
};

const INITIAL_MODERATORS: Moderator[] = [
  {
    id: "m1",
    name: "Dr. Dana Nguyen",
    title: "Senior Moderator",
    email: "d.nguyen@aribots.com",
    initials: "DN",
    avatarBg: "bg-violet-100 text-violet-700",
    status: "active",
    lastActive: "Just now",
    joinedDate: "Jan 2025",
    permissions: {
      content_moderation: true,
      user_management: true,
      community_management: true,
      news_publishing: true,
      telemedicine: false,
      analytics: true,
      compliance: false,
      event_management: true,
    },
  },
  {
    id: "m2",
    name: "Dr. Marcus Webb",
    title: "Clinical Content Lead",
    email: "m.webb@aribots.com",
    initials: "MW",
    avatarBg: "bg-blue-100 text-blue-700",
    status: "active",
    lastActive: "12m ago",
    joinedDate: "Mar 2025",
    permissions: {
      content_moderation: true,
      user_management: false,
      community_management: true,
      news_publishing: true,
      telemedicine: true,
      analytics: false,
      compliance: false,
      event_management: true,
    },
  },
  {
    id: "m3",
    name: "Britta Denman",
    title: "Compliance Officer",
    email: "b.denman@aribots.com",
    initials: "BD",
    avatarBg: "bg-rose-100 text-rose-700",
    status: "active",
    lastActive: "1h ago",
    joinedDate: "Nov 2024",
    permissions: {
      content_moderation: false,
      user_management: true,
      community_management: false,
      news_publishing: false,
      telemedicine: false,
      analytics: true,
      compliance: true,
      event_management: false,
    },
  },
  {
    id: "m4",
    name: "James Okafor",
    title: "Community Manager",
    email: "j.okafor@aribots.com",
    initials: "JO",
    avatarBg: "bg-emerald-100 text-emerald-700",
    status: "inactive",
    lastActive: "3 days ago",
    joinedDate: "Jun 2025",
    permissions: {
      content_moderation: true,
      user_management: false,
      community_management: true,
      news_publishing: false,
      telemedicine: false,
      analytics: false,
      compliance: false,
      event_management: true,
    },
  },
  {
    id: "m5",
    name: "Dr. Priya Nair",
    title: "Telemedicine Coordinator",
    email: "p.nair@aribots.com",
    initials: "PN",
    avatarBg: "bg-amber-100 text-amber-700",
    status: "suspended",
    lastActive: "2 weeks ago",
    joinedDate: "Apr 2025",
    permissions: {
      content_moderation: false,
      user_management: false,
      community_management: false,
      news_publishing: false,
      telemedicine: true,
      analytics: false,
      compliance: false,
      event_management: false,
    },
  },
];

// ─── Permission Toggle ───────────────────────────────────────────────────────

function PermToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      data-testid="perm-toggle"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Add Moderator Form ──────────────────────────────────────────────────────

function AddModeratorPanel({ onAdd, onCancel }: { onAdd: (m: Moderator) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<Record<PermKey, boolean>>({
    content_moderation: false,
    user_management: false,
    community_management: false,
    news_publishing: false,
    telemedicine: false,
    analytics: false,
    compliance: false,
    event_management: false,
  });

  function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    const initials = name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700"];
    const mod: Moderator = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      title: title.trim() || "Moderator",
      email: email.trim(),
      initials,
      avatarBg: colors[Math.floor(Math.random() * colors.length)],
      status: "active",
      lastActive: "Just now",
      joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      permissions: perms,
    };
    onAdd(mod);
  }

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="add-moderator-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Add New Team Member
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Dr. Jane Smith"
              className="h-8 text-sm"
              data-testid="input-mod-name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title / Role</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Senior Moderator"
              className="h-8 text-sm"
              data-testid="input-mod-title"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@aribots.com"
              className="h-8 text-sm"
              data-testid="input-mod-email"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Initial Permissions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERMISSIONS.map(p => {
              const Icon = p.icon;
              const on = perms[p.key];
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                    on
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                  data-testid={`new-perm-${p.key}`}
                >
                  <Icon className={`h-3 w-3 ${on ? "text-primary" : p.color}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim()}
            data-testid="button-add-mod-submit"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add to Team
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} data-testid="button-add-mod-cancel">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Moderator Card ──────────────────────────────────────────────────────────

function ModeratorCard({
  mod,
  onUpdate,
  onRemove,
}: {
  mod: Moderator;
  onUpdate: (m: Moderator) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const statusBadgeClass: Record<ModeratorStatus, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    suspended: "bg-red-100 text-red-700 border-red-200",
  };

  const activePermsCount = Object.values(mod.permissions).filter(Boolean).length;

  function togglePerm(key: PermKey) {
    onUpdate({ ...mod, permissions: { ...mod.permissions, [key]: !mod.permissions[key] } });
  }

  function setStatus(s: ModeratorStatus) {
    onUpdate({ ...mod, status: s });
    setMenuOpen(false);
  }

  return (
    <Card
      className={`transition-all duration-200 ${mod.status === "suspended" ? "opacity-60" : ""}`}
      data-testid={`moderator-card-${mod.id}`}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className={`text-sm font-semibold ${mod.avatarBg}`}>{mod.initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{mod.name}</p>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${statusBadgeClass[mod.status]} capitalize`}>
                {mod.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{mod.title}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{mod.email}</span>
              <span>Active: {mod.lastActive}</span>
              <span>Joined: {mod.joinedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {activePermsCount}/{PERMISSIONS.length} perms
            </span>
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setMenuOpen(v => !v)}
                data-testid={`mod-menu-${mod.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border bg-popover shadow-lg p-1">
                  {mod.status !== "active" && (
                    <button
                      className="w-full flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-muted text-green-700"
                      onClick={() => setStatus("active")}
                      data-testid={`mod-activate-${mod.id}`}
                    >
                      <Check className="h-3 w-3" />Activate
                    </button>
                  )}
                  {mod.status !== "inactive" && (
                    <button
                      className="w-full flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-muted text-muted-foreground"
                      onClick={() => setStatus("inactive")}
                      data-testid={`mod-deactivate-${mod.id}`}
                    >
                      <RefreshCw className="h-3 w-3" />Set Inactive
                    </button>
                  )}
                  {mod.status !== "suspended" && (
                    <button
                      className="w-full flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-muted text-red-600"
                      onClick={() => setStatus("suspended")}
                      data-testid={`mod-suspend-${mod.id}`}
                    >
                      <Ban className="h-3 w-3" />Suspend
                    </button>
                  )}
                  <div className="border-t my-1" />
                  <button
                    className="w-full flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-muted text-red-600"
                    onClick={() => { onRemove(mod.id); setMenuOpen(false); }}
                    data-testid={`mod-remove-${mod.id}`}
                  >
                    <XCircle className="h-3 w-3" />Remove
                  </button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 gap-1"
              onClick={() => setExpanded(v => !v)}
              data-testid={`mod-expand-${mod.id}`}
            >
              <Pencil className="h-3 w-3" />
              Permissions
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Active permission pills */}
        {!expanded && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PERMISSIONS.filter(p => mod.permissions[p.key]).map(p => {
              const Icon = p.icon;
              return (
                <span
                  key={p.key}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border`}
                  data-testid={`perm-chip-${mod.id}-${p.key}`}
                >
                  <Icon className={`h-2.5 w-2.5 ${p.color}`} />
                  {p.label}
                </span>
              );
            })}
            {activePermsCount === 0 && (
              <span className="text-[10px] text-muted-foreground italic">No permissions assigned</span>
            )}
          </div>
        )}

        {/* Expanded permission editor */}
        {expanded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map(p => {
              const Icon = p.icon;
              const on = mod.permissions[p.key];
              return (
                <div
                  key={p.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    on ? "border-primary/30 bg-primary/5" : "border-border bg-card/50"
                  }`}
                  data-testid={`perm-row-${mod.id}-${p.key}`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${on ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-3.5 w-3.5 ${on ? "text-primary" : p.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{p.desc}</p>
                  </div>
                  <PermToggle
                    enabled={on}
                    onChange={() => togglePerm(p.key)}
                    disabled={mod.status === "suspended"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Team Management Tab ─────────────────────────────────────────────────────

function TeamManagementTab() {
  const [moderators, setModerators] = useState<Moderator[]>(INITIAL_MODERATORS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | ModeratorStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = moderators.filter(m => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  function handleUpdate(updated: Moderator) {
    setModerators(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  function handleRemove(id: string) {
    setModerators(prev => prev.filter(m => m.id !== id));
  }

  function handleAdd(mod: Moderator) {
    setModerators(prev => [mod, ...prev]);
    setShowAddForm(false);
  }

  const counts = {
    total: moderators.length,
    active: moderators.filter(m => m.status === "active").length,
    inactive: moderators.filter(m => m.status === "inactive").length,
    suspended: moderators.filter(m => m.status === "suspended").length,
  };

  return (
    <div className="space-y-6" data-testid="admin-tab-team">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: counts.total, icon: Crown, color: "text-primary" },
          { label: "Active", value: counts.active, icon: CheckCircle, color: "text-green-600" },
          { label: "Inactive", value: counts.inactive, icon: RefreshCw, color: "text-gray-500" },
          { label: "Suspended", value: counts.suspended, icon: Ban, color: "text-red-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Permission Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERMISSIONS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${p.color}`} />
                  <div>
                    <p className="font-medium text-foreground">{p.label}</p>
                    <p className="text-[10px]">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input
          placeholder="Search by name, title, or email…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-8 text-sm max-w-xs"
          data-testid="input-search-mods"
        />
        <div className="flex gap-1">
          {(["all", "active", "inactive", "suspended"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`text-xs px-3 py-1 rounded-md capitalize transition-colors ${
                filterStatus === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`filter-status-${f}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => setShowAddForm(v => !v)}
          data-testid="button-show-add-mod"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Member
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddModeratorPanel onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Moderator cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No team members match your filter.</p>
        )}
        {filtered.map(mod => (
          <ModeratorCard
            key={mod.id}
            mod={mod}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function RetentionCell({ value }: { value: number | null }) {
  if (value === null) return <td className="px-3 py-2 text-center text-muted-foreground text-xs">—</td>;
  const bg =
    value >= 90 ? "bg-green-100 text-green-800" :
    value >= 80 ? "bg-blue-100 text-blue-800" :
    value >= 70 ? "bg-amber-100 text-amber-800" :
    "bg-red-100 text-red-800";
  return (
    <td className="px-3 py-2 text-center">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${bg}`}>{value}%</span>
    </td>
  );
}

function AnalyticsTab() {
  const [range, setRange] = useState<RangeKey>("30D");
  const d = ANALYTICS_RANGES[range];
  const barMax = Math.max(...d.buckets.map(b => b.value));
  const primaryDelta = d.kpi.primaryValue - d.kpi.primaryPrev;

  return (
    <div className="space-y-6" data-testid="admin-tab-analytics">

      {/* Time range selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground font-medium">Showing data for <span className="text-foreground font-semibold">{d.chartSub}</span></p>
        <div className="flex gap-1 p-1 bg-muted rounded-lg" data-testid="analytics-range-selector">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              data-testid={`range-btn-${opt.key}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <UserCheck className="h-7 w-7 text-blue-600 opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{TOTAL_ONBOARDED}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Onboarded Physicians</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Total platform members</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <Flame className="h-7 w-7 text-orange-500 opacity-80" />
              {range !== "YTD" && range !== "1Y" && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${primaryDelta >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {primaryDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(primaryDelta)}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-2">{d.kpi.primaryValue}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{d.kpi.primaryLabel}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{d.kpi.secondaryLabel}: {d.kpi.secondaryValue}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <UserPlus className="h-7 w-7 text-purple-500 opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{d.kpi.newMembers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">New Members</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Joined in this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <UserMinus className="h-7 w-7 text-rose-600 opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{d.kpi.churnPct}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Churn Rate</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{d.kpi.churnCount} churned · {d.kpi.atRisk} at-risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Unified active users chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className={`h-4 w-4 ${range === "7D" ? "text-orange-500" : range === "30D" ? "text-blue-500" : range === "90D" ? "text-green-600" : "text-violet-500"}`} />
            {d.chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-0.5" style={{ height: 96 }}>
            {d.buckets.map((b, i) => (
              <div key={i} className="flex-1 relative group" style={{ height: 80 }}>
                <div
                  className={`absolute bottom-0 left-0 right-0 ${d.barColor} rounded-t-sm transition-all`}
                  style={{ height: `${Math.round((b.value / barMax) * 100)}%` }}
                />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap z-10 shadow-sm">
                  {b.label}: {b.value}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 border-t pt-1">
            <span className="text-[10px] text-muted-foreground">{d.buckets[0].label}</span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Latest: <span className="text-foreground">{d.buckets[d.buckets.length - 1].value}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">{d.buckets[d.buckets.length - 1].label}</span>
          </div>
        </CardContent>
      </Card>

      {/* User interaction summary for selected range */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: d.kpi.totalPosts, icon: MessageSquare, color: "text-blue-600" },
          { label: "Flagged Content", value: d.kpi.flagged, icon: Flag, color: "text-orange-600" },
          { label: "Active Users", value: d.kpi.activeUsers, icon: Users2, color: "text-green-600" },
          { label: "New Signups", value: d.kpi.newSignups, icon: UserCheck, color: "text-purple-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onboarding funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Onboarding Funnel
            <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">{TOTAL_ONBOARDED} onboarded</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ONBOARDING_FUNNEL.map((row, i) => {
              const barWidth = i === 0 ? 100 : Math.round((row.count / ONBOARDING_FUNNEL[0].count) * 100);
              const isActive = row.stage.includes("Onboarded");
              return (
                <div key={row.stage} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <p className={`text-xs font-medium ${isActive ? "text-blue-700" : "text-foreground"}`}>{row.stage}</p>
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isActive ? "bg-blue-500" : i === ONBOARDING_FUNNEL.length - 1 ? "bg-green-500" : "bg-primary/60"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className={`text-sm font-bold ${isActive ? "text-blue-700" : ""}`}>{row.count}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {i === 0 ? "(100%)" : i < 5 ? `(${row.pct}% of invited)` : `(${row.pct}% of onboarded)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-6 text-xs text-muted-foreground border-t pt-3">
            <span>⚡ Avg. time to onboard: <strong>3.2 days</strong></span>
            <span>📧 Email → NPI verification drop: <strong>11%</strong></span>
            <span>✅ 30-day retention: <strong>82.4%</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Churn breakdown + Feature adoption */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-rose-600" />
              Churn Analysis
              <span className="ml-auto text-xs text-muted-foreground font-normal">{range} view</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Churn rate", value: d.kpi.churnPct, bg: "bg-rose-50", text: "text-rose-700" },
                { label: "Churned", value: String(d.kpi.churnCount), bg: "bg-orange-50", text: "text-orange-700" },
                { label: "At-risk", value: String(d.kpi.atRisk), bg: "bg-amber-50", text: "text-amber-700" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-lg p-3`}>
                  <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Churn reasons (exit survey)</p>
              <div className="space-y-2">
                {CHURN_REASONS.map(r => (
                  <div key={r.reason} className="flex items-center gap-2">
                    <div className={`h-2 rounded-full shrink-0 ${r.color}`} style={{ width: `${r.pct * 1.5}px`, minWidth: 8 }} />
                    <span className="text-xs text-foreground flex-1">{r.reason}</span>
                    <span className="text-xs font-semibold tabular-nums">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Feature Adoption
              <span className="ml-auto text-xs text-muted-foreground font-normal">of {TOTAL_ONBOARDED} onboarded</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {FEATURE_ADOPTION.map(f => (
              <div key={f.feature} className="flex items-center gap-3">
                <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium w-36 shrink-0">{f.feature}</span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${f.pct}%` }} />
                </div>
                <span className="text-xs font-bold tabular-nums w-12 text-right">{f.adopted} <span className="text-muted-foreground font-normal">({f.pct}%)</span></span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Cohort retention table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Retention Cohorts
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Cohort</th>
                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">Size</th>
                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">Week 1</th>
                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">Week 2</th>
                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">Week 4</th>
                <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium">Month 3</th>
              </tr>
            </thead>
            <tbody>
              {COHORT_RETENTION.map(row => (
                <tr key={row.cohort} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium text-xs">{row.cohort}</td>
                  <td className="px-3 py-2 text-center text-xs">{row.size}</td>
                  <RetentionCell value={row.w1} />
                  <RetentionCell value={row.w2} />
                  <RetentionCell value={row.w4} />
                  <RetentionCell value={row.m3} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-3">
            Color key: <span className="text-green-700 font-semibold">≥90%</span> · <span className="text-blue-700 font-semibold">≥80%</span> · <span className="text-amber-700 font-semibold">≥70%</span> · <span className="text-red-600 font-semibold">&lt;70%</span> · — data pending
          </p>
        </CardContent>
      </Card>

      {/* At-risk user table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            At-Risk Members (Inactive ≥ 7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "Dr. Daniel Park", specialty: "Rheumatology", lastSeen: "8 days ago", risk: "medium" },
              { name: "Dr. Keiko Tanaka", specialty: "Nephrology", lastSeen: "11 days ago", risk: "high" },
              { name: "Dr. Amara Diallo", specialty: "Geriatrics", lastSeen: "14 days ago", risk: "high" },
              { name: "Dr. Marcus Webb", specialty: "Emergency Medicine", lastSeen: "9 days ago", risk: "medium" },
            ].map(u => (
              <div key={u.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-muted">{u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-medium">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Last seen {u.lastSeen}</span>
                  <Badge className={u.risk === "high" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                    {u.risk === "high" ? "High risk" : "Medium risk"}
                  </Badge>
                  <Button variant="outline" size="sm" className="h-6 text-xs" data-testid={`btn-nudge-${u.name.replace(/\s/g, "-")}`}>
                    Send nudge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// ─── Existing tabs ───────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === "compliant") return <Badge className="bg-green-100 text-green-800 border-green-200">Compliant</Badge>;
  if (status === "in-review") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Review</Badge>;
  return <Badge variant="destructive">Non-Compliant</Badge>;
}

function UserInteractionsTab() {
  const [filter, setFilter] = useState<"all" | "flagged" | "removed">("all");
  const filtered = filter === "all" ? MOCK_POSTS : MOCK_POSTS.filter(p => p.status === filter);

  return (
    <div className="space-y-6" data-testid="admin-tab-users">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts (24h)", value: "847", icon: MessageSquare, color: "text-blue-600" },
          { label: "Flagged Content", value: "8", icon: Flag, color: "text-orange-600" },
          { label: "Active Users", value: "342", icon: Users2, color: "text-green-600" },
          { label: "New Signups", value: "23", icon: UserCheck, color: "text-purple-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Posts
              </CardTitle>
              <div className="flex gap-1">
                {(["all", "flagged", "removed"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-0.5 rounded capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map(post => (
              <div key={post.id} className="flex gap-3 p-2 rounded-md border bg-card/50" data-testid={`admin-post-${post.id}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{post.author[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{post.author}</span>
                    <span className="text-[10px] text-muted-foreground">{post.specialty}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{post.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {post.status === "flagged" && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{post.flags} flags</Badge>}
                    {post.status === "removed" && <Badge className="bg-gray-100 text-gray-700 text-[10px] px-1 py-0 h-4 border border-gray-200">Removed</Badge>}
                    {post.status === "flagged" && (
                      <Button size="sm" variant="outline" className="h-5 text-[10px] px-2 ml-auto">Review</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              User Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors" data-testid={`activity-item-${i}`}>
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.user}</p>
                  <p className="text-[10px] text-muted-foreground">{item.action}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RevenueTab() {
  const maxLogins = Math.max(...MOCK_REVENUE.recentLogins.map(d => d.count));

  return (
    <div className="space-y-6" data-testid="admin-tab-revenue">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "MRR", value: `$${(MOCK_REVENUE.mrr / 1000).toFixed(1)}k`, icon: DollarSign, color: "text-green-600" },
          { label: "ARR", value: `$${(MOCK_REVENUE.arr / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Subscriptions", value: MOCK_REVENUE.activeSubscriptions.toLocaleString(), icon: CreditCard, color: "text-purple-600" },
          { label: "Trial Users", value: MOCK_REVENUE.trialUsers.toString(), icon: Users2, color: "text-orange-600" },
          { label: "Churn Rate", value: `${MOCK_REVENUE.churnRate}%`, icon: XCircle, color: "text-red-500" },
          { label: "MoM Growth", value: `+${MOCK_REVENUE.growth}%`, icon: BarChart2, color: "text-emerald-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} opacity-80 mb-1`} />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              Daily Logins (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {MOCK_REVENUE.recentLogins.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" data-testid={`login-bar-${i}`}>
                  <span className="text-[9px] text-muted-foreground">{d.count}</span>
                  <div
                    className="w-full rounded-t-sm bg-primary/80 transition-all"
                    style={{ height: `${(d.count / maxLogins) * 96}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_REVENUE.plans.map((plan, i) => (
              <div key={i} className="space-y-1" data-testid={`plan-${i}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-muted-foreground">{plan.users} users · ${(plan.revenue / 1000).toFixed(0)}k/mo</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(plan.users / MOCK_REVENUE.activeSubscriptions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ComplianceTab() {
  return (
    <div className="space-y-4" data-testid="admin-tab-compliance">
      <div className="grid md:grid-cols-3 gap-4">
        {MOCK_COMPLIANCE.map((item) => (
          <Card key={item.framework} data-testid={`compliance-${item.framework.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">{item.framework}</CardTitle>
                {statusBadge(item.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.score >= 95 ? "bg-green-500" : item.score >= 85 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{item.score}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2 text-center">
                  <p className="font-semibold text-green-600">{item.passed}</p>
                  <p className="text-muted-foreground">Passed</p>
                </div>
                <div className="bg-muted/50 rounded p-2 text-center">
                  <p className="font-semibold text-red-500">{item.controls - item.passed}</p>
                  <p className="text-muted-foreground">Open</p>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Last audit: <span className="text-foreground">{item.lastAudit}</span></p>
                <p>Next audit: <span className="text-foreground">{item.nextAudit}</span></p>
              </div>

              {item.findings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Findings
                  </p>
                  {item.findings.map((f, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded px-2 py-1">{f}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Data Governance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "PHI Audit Logs", status: "Active", ok: true },
              { label: "Data Encryption (AES-256)", status: "Enforced", ok: true },
              { label: "Access Reviews", status: "Quarterly", ok: true },
              { label: "Breach Response Plan", status: "Current", ok: true },
              { label: "BAA Agreements", status: "18 signed", ok: true },
              { label: "User Consent Tracking", status: "Active", ok: true },
              { label: "Cookie Compliance", status: "GDPR + CCPA", ok: true },
              { label: "Penetration Testing", status: "Due Q2 2026", ok: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md border bg-card/50" data-testid={`governance-${i}`}>
                {item.ok
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                }
                <div>
                  <p className="text-[10px] font-medium">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── App Settings Panel ──────────────────────────────────────────────────────

function AppSettingsPanel() {
  const [features, setFeatures] = useState({
    ari_assistant: true, clinical_triage: true, medical_news: true,
    telemedicine: true, groups: true, events: true, doctor_directory: true,
    peer_messaging: true,
  });
  const [platform, setPlatform] = useState({
    new_member_approval: true, maintenance_mode: false,
    phi_safe_mode: true, allow_medstudents: true,
  });
  const [notifications, setNotifications] = useState({
    compliance_alerts: true, new_signups: true, flagged_content: true,
    weekly_digest: false,
  });

  const toggle = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) =>
    setter(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      {/* Feature toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Feature Toggles
            <span className="ml-auto text-xs text-muted-foreground font-normal">Enable / disable platform features globally</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.entries(features) as [keyof typeof features, boolean][]).map(([key, val]) => {
              const labels: Record<keyof typeof features, string> = {
                ari_assistant: "ARI Assistant (Chatbot)",
                clinical_triage: "Clinical Triage Cases",
                medical_news: "Medical News AI",
                telemedicine: "Telemedicine Module",
                groups: "Groups & Forums",
                events: "Medical Events",
                doctor_directory: "Doctor Directory",
                peer_messaging: "Peer Messaging",
              };
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <span className="text-sm font-medium">{labels[key]}</span>
                  <PermToggle enabled={val} onChange={() => toggle(setFeatures, key)} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform settings + Notifications side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Platform Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(platform) as [keyof typeof platform, boolean][]).map(([key, val]) => {
              const labels: Record<keyof typeof platform, { label: string; desc: string; danger?: boolean }> = {
                new_member_approval: { label: "Manual Member Approval", desc: "Review each signup before granting access" },
                maintenance_mode: { label: "Maintenance Mode", desc: "Take platform offline for all non-admins", danger: true },
                phi_safe_mode: { label: "PHI Safe Mode (global)", desc: "Enforce PHI redaction in all posts" },
                allow_medstudents: { label: "Allow Medical Students", desc: "Med students can request access" },
              };
              const info = labels[key];
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-medium ${info.danger ? "text-red-600" : ""}`}>{info.label}</p>
                    <p className="text-[10px] text-muted-foreground">{info.desc}</p>
                  </div>
                  <PermToggle enabled={val} onChange={() => toggle(setPlatform, key)} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Admin Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(notifications) as [keyof typeof notifications, boolean][]).map(([key, val]) => {
              const labels: Record<keyof typeof notifications, { label: string; desc: string }> = {
                compliance_alerts: { label: "Compliance Alerts", desc: "Immediate alert on compliance failures" },
                new_signups: { label: "New Signup Alerts", desc: "Email when a new member joins" },
                flagged_content: { label: "Flagged Content", desc: "Notify when content is flagged" },
                weekly_digest: { label: "Weekly Digest", desc: "Summary report every Monday" },
              };
              const info = labels[key];
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">{info.label}</p>
                    <p className="text-[10px] text-muted-foreground">{info.desc}</p>
                  </div>
                  <PermToggle enabled={val} onChange={() => toggle(setNotifications, key)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Role access matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Role Access Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Feature</th>
                {["Physician", "Nurse / NP", "Med Student", "Admin"].map(r => (
                  <th key={r} className="text-center py-2 px-3 text-muted-foreground font-medium">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "ARI Assistant", physician: true, nurse: true, student: true, admin: true },
                { feature: "Clinical Triage", physician: true, nurse: true, student: false, admin: true },
                { feature: "Telemedicine", physician: true, nurse: false, student: false, admin: true },
                { feature: "Doctor Directory", physician: true, nurse: true, student: true, admin: true },
                { feature: "Groups & Events", physician: true, nurse: true, student: true, admin: true },
                { feature: "Admin Console", physician: false, nurse: false, student: false, admin: true },
                { feature: "Revenue Data", physician: false, nurse: false, student: false, admin: true },
              ].map(row => (
                <tr key={row.feature} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{row.feature}</td>
                  {[row.physician, row.nurse, row.student, row.admin].map((has, i) => (
                    <td key={i} className="py-2 px-3 text-center">
                      {has
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                        : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "compliance", label: "Compliance & Revenue", icon: ShieldCheck },
] as const;

type AdminTabId = typeof ADMIN_TABS[number]["id"];

export default function AdminPage() {
  const [role] = useRole();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTabId>("analytics");

  useEffect(() => {
    if (role !== "admin") setLocation("/home");
  }, [role, setLocation]);

  if (role !== "admin") return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" data-testid="page-admin">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">Platform oversight, settings, analytics, and compliance</p>
      </div>

      {/* Custom tab nav — avoids shadcn multi-highlight bug */}
      <div className="flex gap-1 border-b mb-6" data-testid="admin-tabs">
        {ADMIN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`admin-tab-${tab.id}-btn`}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "analytics" && (
        <div className="space-y-8">
          <AnalyticsTab />
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Users2 className="h-4 w-4 text-primary" />
              User Interactions
            </h2>
            <UserInteractionsTab />
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4 text-primary" />
              Team & Moderators
            </h2>
            <TeamManagementTab />
          </div>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-primary" />
              App Configuration
            </h2>
            <AppSettingsPanel />
          </div>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-primary" />
              Revenue
            </h2>
            <RevenueTab />
          </div>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Compliance
            </h2>
            <ComplianceTab />
          </div>
        </div>
      )}
    </div>
  );
}
