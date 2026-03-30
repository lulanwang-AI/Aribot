import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Check, Ban, RefreshCw, Mail, Stethoscope,
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

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [role] = useRole();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "users";
    }
    return "users";
  });

  useEffect(() => {
    if (role !== "admin") {
      setLocation("/home");
    }
  }, [role, setLocation]);

  if (role !== "admin") return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" data-testid="page-admin">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">Platform oversight, team management, analytics, and compliance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1" data-testid="admin-tabs">
          <TabsTrigger value="users" data-testid="admin-tab-users-btn">
            <Users2 className="h-4 w-4 mr-1.5" />
            User Interactions
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="admin-tab-team-btn">
            <Crown className="h-4 w-4 mr-1.5" />
            Team & Moderators
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="admin-tab-revenue-btn">
            <BarChart2 className="h-4 w-4 mr-1.5" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="admin-tab-compliance-btn">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserInteractionsTab />
        </TabsContent>
        <TabsContent value="team">
          <TeamManagementTab />
        </TabsContent>
        <TabsContent value="revenue">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
