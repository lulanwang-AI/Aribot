import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRole } from "@/lib/role";
import {
  Users2, BarChart2, ShieldCheck, Flag, MessageSquare,
  Activity, TrendingUp, DollarSign, CheckCircle, AlertTriangle,
  XCircle, Eye, UserCheck, LogIn, CreditCard, Lock,
} from "lucide-react";

function parseTab(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("tab") || "users";
}

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
        <p className="text-sm text-muted-foreground">Platform oversight, analytics, and compliance management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6" data-testid="admin-tabs">
          <TabsTrigger value="users" data-testid="admin-tab-users-btn">
            <Users2 className="h-4 w-4 mr-1.5" />
            User Interactions
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
