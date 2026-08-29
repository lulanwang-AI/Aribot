import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, CheckCircle2, ClipboardList,
  HeartHandshake, Loader2, Mail, Megaphone, MessageSquare, Phone, Plus, Search, Send, Star, UserRound,
} from "lucide-react";
import { Link } from "wouter";
import type { Communication, CrmTask, Campaign, CampaignMember, Referral } from "@/shared/schema";

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const CURRENT_STAFF = "Dr. Sarah Johnson, MD, PhD";

type CareGap = { label: string; kind: string };
type PanelRow = {
  patientId: string; name: string; age: number; gender: string;
  engagementStatus: string; vip: boolean; priorityFlag: string | null; preferredChannel: string;
  lastVisit: string | null; nextVisit: string | null; balanceCents: number;
  careGaps: CareGap[]; openTasks: number;
};
type CampaignWithCounts = Campaign & { memberCount: number; membersByStatus: Record<string, number> };
type CampaignDetail = Campaign & { members: (CampaignMember & { patientName: string })[] };
type ReferralRow = Referral & { patientName: string };

const engagementColors: Record<string, string> = {
  engaged: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "at-risk": "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
};
const referralStatusColors: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-slate-100 text-slate-600 border-slate-200",
};
const memberStatusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 border-slate-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  scheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-red-50 text-red-600 border-red-200",
};
const channelIcon = (channel: string) =>
  channel === "call" || channel === "phone" ? Phone : channel === "email" ? Mail : channel === "sms" ? MessageSquare : Send;

export default function Crm() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [engFilter, setEngFilter] = useState("all");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [activePatient, setActivePatient] = useState<PanelRow | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewReferral, setShowNewReferral] = useState(false);
  const [refStatusFilter, setRefStatusFilter] = useState("all");

  const { data: panel = [], isLoading } = useQuery<PanelRow[]>({ queryKey: ["/api/crm/panel"] });
  const { data: campaigns = [] } = useQuery<CampaignWithCounts[]>({ queryKey: ["/api/campaigns"] });
  const { data: referrals = [] } = useQuery<ReferralRow[]>({ queryKey: ["/api/referrals"] });
  const { data: campaign } = useQuery<CampaignDetail>({
    queryKey: ["/api/campaigns", activeCampaignId],
    enabled: !!activeCampaignId,
  });

  const toggleVip = useMutation({
    mutationFn: async (row: PanelRow) => {
      const res = await apiRequest("PUT", `/api/crm/profiles/${row.patientId}`, {
        engagementStatus: row.engagementStatus, vip: !row.vip,
        priorityFlag: row.priorityFlag, preferredChannel: row.preferredChannel,
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/panel"] }),
    onError: () => toast({ title: "Could not update VIP flag", variant: "destructive" }),
  });

  const filtered = useMemo(() => panel.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (engFilter !== "all" && r.engagementStatus !== engFilter) return false;
    if (gapsOnly && r.careGaps.length === 0) return false;
    return true;
  }), [panel, search, engFilter, gapsOnly]);

  const stats = [
    { label: "Panel size", value: panel.length, icon: UserRound },
    { label: "At risk / inactive", value: panel.filter((r) => r.engagementStatus !== "engaged").length, icon: AlertTriangle },
    { label: "Open care gaps", value: panel.reduce((s, r) => s + r.careGaps.length, 0), icon: ClipboardList },
    { label: "Active campaigns", value: campaigns.filter((c) => c.status === "active").length, icon: Megaphone },
  ];

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-primary" /> CRM & Patient Engagement
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-sm text-muted-foreground">
          {stats.map((s, i) => (
            <>
              {i > 0 && <span key={`sep-${i}`} className="text-border">·</span>}
              <span key={s.label}>
                <span
                  className="font-semibold text-foreground"
                  data-testid={`stat-${s.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >{s.value}</span>{" "}{s.label.toLowerCase()}
              </span>
            </>
          ))}
        </div>
      </div>

      <Tabs defaultValue="panel">
        <TabsList className="mb-5">
          <TabsTrigger value="panel" data-testid="tab-crm-panel">Patient panel</TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-crm-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="referrals" data-testid="tab-crm-referrals">Referrals</TabsTrigger>
        </TabsList>

        {/* ---------- PANEL ---------- */}
        <TabsContent value="panel">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-56" data-testid="input-panel-search" />
            </div>
            {["all", "engaged", "at-risk", "inactive"].map((s) => (
              <Button key={s} size="sm" variant={engFilter === s ? "default" : "outline"} onClick={() => setEngFilter(s)} data-testid={`filter-eng-${s}`}>
                {s === "all" ? "All" : s}
              </Button>
            ))}
            <label className="flex items-center gap-2 text-sm ml-1 cursor-pointer">
              <Checkbox checked={gapsOnly} onCheckedChange={(v) => setGapsOnly(!!v)} data-testid="checkbox-gaps-only" /> Care gaps only
            </label>
          </div>

          <div className="emr-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="px-4 py-2.5 font-semibold">Patient</th>
                  <th className="px-4 py-2.5 font-semibold">Engagement</th>
                  <th className="px-4 py-2.5 font-semibold">Last visit</th>
                  <th className="px-4 py-2.5 font-semibold">Next visit</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Balance</th>
                  <th className="px-4 py-2.5 font-semibold">Care gaps</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.patientId} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => setActivePatient(r)} data-testid={`panel-row-${r.patientId}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); toggleVip.mutate(r); }} title={r.vip ? "Remove VIP" : "Mark VIP"} data-testid={`vip-${r.patientId}`}>
                          <Star className={`w-4 h-4 ${r.vip ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-400"}`} />
                        </button>
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.age}{r.gender[0]?.toUpperCase()}</span>
                        {r.priorityFlag && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">{r.priorityFlag}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2"><Badge variant="outline" className={engagementColors[r.engagementStatus]}>{r.engagementStatus}</Badge></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.lastVisit ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{r.nextVisit ?? <span className="text-muted-foreground">none scheduled</span>}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${r.balanceCents > 0 ? "" : "text-muted-foreground"}`}>{usd(Math.max(r.balanceCents, 0))}</td>
                    <td className="px-4 py-2">
                      {r.careGaps.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {r.careGaps.map((g) => (
                            <Badge key={g.kind} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{g.label}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{r.openTasks > 0 ? <Badge variant="secondary">{r.openTasks}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No patients match these filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---------- CAMPAIGNS ---------- */}
        <TabsContent value="campaigns">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNewCampaign(true)} data-testid="button-new-campaign"><Plus className="w-4 h-4 mr-1" /> New campaign</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => {
              const done = (c.membersByStatus.completed ?? 0) + (c.membersByStatus.declined ?? 0);
              const pct = c.memberCount ? Math.round((done / c.memberCount) * 100) : 0;
              return (
                <button key={c.id} className="emr-card p-4 text-left hover:shadow-md transition-shadow" onClick={() => setActiveCampaignId(c.id)} data-testid={`campaign-${c.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                    <Badge variant="outline" className={c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : c.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-700 border-indigo-200"}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{c.campaignType} · {c.channel}</span>
                    <span>{c.memberCount} patients</span>
                    {c.startDate && <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{c.startDate}</span>}
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{pct}% worked</p>
                </button>
              );
            })}
            {campaigns.length === 0 && <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">No campaigns yet</p>}
          </div>
        </TabsContent>

        {/* ---------- REFERRALS ---------- */}
        <TabsContent value="referrals">
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {["all", "new", "pending", "scheduled", "completed", "declined"].map((s) => (
              <Button key={s} size="sm" variant={refStatusFilter === s ? "default" : "outline"} onClick={() => setRefStatusFilter(s)} data-testid={`filter-ref-${s}`}>
                {s}{s !== "all" && ` (${referrals.filter((r) => r.status === s).length})`}
              </Button>
            ))}
            <div className="flex-1" />
            <Button onClick={() => setShowNewReferral(true)} data-testid="button-new-referral"><Plus className="w-4 h-4 mr-1" /> New referral</Button>
          </div>
          <div className="emr-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="px-4 py-2.5 font-semibold">Patient</th>
                  <th className="px-4 py-2.5 font-semibold">Direction</th>
                  <th className="px-4 py-2.5 font-semibold">Specialty</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(refStatusFilter === "all" ? referrals : referrals.filter((r) => r.status === refStatusFilter)).map((r) => (
                  <ReferralRowView key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {activePatient && <PatientCrmDialog row={activePatient} onClose={() => setActivePatient(null)} />}
      {campaign && activeCampaignId && <CampaignDialog campaign={campaign} onClose={() => setActiveCampaignId(null)} />}
      {showNewCampaign && <NewCampaignDialog panel={panel} onClose={() => setShowNewCampaign(false)} />}
      {showNewReferral && <NewReferralDialog panel={panel} onClose={() => setShowNewReferral(false)} />}
    </div>
  );
}

function ReferralRowView({ r }: { r: ReferralRow }) {
  const { toast } = useToast();
  const update = useMutation({
    mutationFn: async (status: string) => (await apiRequest("PATCH", `/api/referrals/${r.id}`, { status })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/referrals"] }),
    onError: () => toast({ title: "Could not update referral", variant: "destructive" }),
  });
  const Dir = r.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40" data-testid={`referral-row-${r.id}`}>
      <td className="px-4 py-2.5">
        <Link href={`/chart/${r.patientId}`} className="hover:underline font-medium">{r.patientName}</Link>
      </td>
      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1 text-xs capitalize"><Dir className="w-3.5 h-3.5 text-muted-foreground" />{r.direction}</span></td>
      <td className="px-4 py-2.5">{r.specialty}<p className="text-[11px] text-muted-foreground">{r.direction === "inbound" ? `from ${r.referringProvider}` : `to ${r.referredTo}`}</p></td>
      <td className="px-4 py-2.5 text-xs max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
      <td className="px-4 py-2.5"><Badge variant="outline" className={r.priority === "stat" ? "bg-red-50 text-red-700 border-red-200" : r.priority === "urgent" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}>{r.priority}</Badge></td>
      <td className="px-4 py-2.5">
        <Select value={r.status} onValueChange={(v) => update.mutate(v)}>
          <SelectTrigger className="w-32 h-8" data-testid={`select-ref-status-${r.id}`}>
            <Badge variant="outline" className={referralStatusColors[r.status]}>{r.status}</Badge>
          </SelectTrigger>
          <SelectContent>
            {["new", "pending", "scheduled", "completed", "declined"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
    </tr>
  );
}

/* ---------- Patient CRM drawer: communications + tasks ---------- */
function PatientCrmDialog({ row, onClose }: { row: PanelRow; onClose: () => void }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState("call");
  const [direction, setDirection] = useState("outbound");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("reached");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const { data: comms = [] } = useQuery<Communication[]>({ queryKey: ["/api/patients", row.patientId, "communications"] });
  const { data: tasks = [] } = useQuery<CrmTask[]>({
    queryKey: ["/api/crm/tasks", { patientId: row.patientId }],
    queryFn: async () => {
      const res = await fetch(`/api/crm/tasks?patientId=${encodeURIComponent(row.patientId)}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients", row.patientId, "communications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks", { patientId: row.patientId }] });
    queryClient.invalidateQueries({ queryKey: ["/api/crm/panel"] });
  };

  const logComm = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/communications", {
      patientId: row.patientId, channel, direction, subject, body: body || null, outcome, staff: CURRENT_STAFF,
    })).json(),
    onSuccess: () => { invalidate(); setSubject(""); setBody(""); toast({ title: "Communication logged" }); },
    onError: () => toast({ title: "Could not log communication", variant: "destructive" }),
  });
  const addTask = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/crm/tasks", {
      patientId: row.patientId, title: taskTitle, dueDate: taskDue || null, priority: "routine", assignee: CURRENT_STAFF,
    })).json(),
    onSuccess: () => { invalidate(); setTaskTitle(""); setTaskDue(""); toast({ title: "Follow-up task created" }); },
    onError: () => toast({ title: "Could not create task", variant: "destructive" }),
  });
  const completeTask = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/crm/tasks/${id}/complete`)).json(),
    onSuccess: invalidate,
    onError: () => toast({ title: "Could not complete task", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.name}
            {row.vip && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
            <Badge variant="outline" className={engagementColors[row.engagementStatus]}>{row.engagementStatus}</Badge>
          </DialogTitle>
          <DialogDescription>
            Prefers {row.preferredChannel} · balance {usd(Math.max(row.balanceCents, 0))} ·{" "}
            <Link href={`/chart/${row.patientId}`} className="underline">open chart</Link>
          </DialogDescription>
        </DialogHeader>

        {row.careGaps.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 space-y-0.5">
            {row.careGaps.map((g) => <p key={g.kind} className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{g.label}</p>)}
          </div>
        )}

        {/* Log communication */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-semibold">Log a communication</p>
          <div className="flex gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-28" data-testid="select-comm-channel"><SelectValue /></SelectTrigger>
              <SelectContent>{["call", "email", "sms", "portal"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{["outbound", "inbound"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{["reached", "voicemail", "no-answer", "replied", "scheduled"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="input-comm-subject" />
          <Textarea placeholder="Notes (optional)" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[56px]" />
          <Button size="sm" onClick={() => logComm.mutate()} disabled={!subject.trim() || logComm.isPending} data-testid="button-log-comm">
            {logComm.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Log (not sent — record only)
          </Button>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-sm font-semibold mb-2">Communication timeline</p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {comms.map((c) => {
              const Icon = channelIcon(c.channel);
              return (
                <div key={c.id} className="flex gap-2.5 rounded-lg border px-3 py-2">
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.subject}
                      <span className="ml-2 text-[11px] text-muted-foreground capitalize">{c.direction} {c.channel}{c.outcome ? ` · ${c.outcome}` : ""}</span>
                    </p>
                    {c.body && <p className="text-xs text-muted-foreground truncate">{c.body}</p>}
                    <p className="text-[11px] text-muted-foreground">{new Date(c.occurredAt).toLocaleString()} · {c.staff}</p>
                  </div>
                </div>
              );
            })}
            {comms.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No communications logged yet</p>}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <p className="text-sm font-semibold mb-2">Follow-up tasks</p>
          <div className="space-y-1.5">
            {tasks.filter((t) => t.status === "open").map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <button onClick={() => completeTask.mutate(t.id)} title="Mark complete" data-testid={`complete-task-${t.id}`}>
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-emerald-600" />
                </button>
                <span className="flex-1">{t.title}</span>
                {t.priority !== "routine" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t.priority}</Badge>}
                {t.dueDate && <span className="text-xs text-muted-foreground">due {t.dueDate}</span>}
              </div>
            ))}
            {tasks.filter((t) => t.status === "open").length === 0 && <p className="text-xs text-muted-foreground">No open tasks</p>}
          </div>
          <div className="flex gap-2 mt-2">
            <Input placeholder="New follow-up task…" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} data-testid="input-new-task" />
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-40" />
            <Button size="sm" onClick={() => addTask.mutate()} disabled={!taskTitle.trim() || addTask.isPending} data-testid="button-add-task">Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Campaign detail ---------- */
function CampaignDialog({ campaign, onClose }: { campaign: CampaignDetail; onClose: () => void }) {
  const { toast } = useToast();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id] });
  };
  const setMember = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await apiRequest("PATCH", `/api/campaign-members/${id}`, { status })).json(),
    onSuccess: invalidate,
    onError: () => toast({ title: "Could not update member", variant: "destructive" }),
  });
  const setStatus = useMutation({
    mutationFn: async (status: string) => (await apiRequest("PATCH", `/api/campaigns/${campaign.id}`, { status })).json(),
    onSuccess: () => { invalidate(); toast({ title: "Campaign updated" }); },
    onError: () => toast({ title: "Could not update campaign", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{campaign.name}
            <Badge variant="outline">{campaign.status}</Badge>
          </DialogTitle>
          <DialogDescription>{campaign.description} · {campaign.campaignType} via {campaign.channel}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {campaign.status === "draft" && <Button size="sm" onClick={() => setStatus.mutate("active")} data-testid="button-activate-campaign">Activate campaign</Button>}
          {campaign.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate("completed")} data-testid="button-complete-campaign">Mark completed</Button>}
        </div>
        <div className="rounded-lg border divide-y">
          {campaign.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Link href={`/chart/${m.patientId}`} className="flex-1 font-medium hover:underline">{m.patientName}</Link>
              {m.lastContactAt && <span className="text-[11px] text-muted-foreground">last contact {new Date(m.lastContactAt).toLocaleDateString()}</span>}
              <Select value={m.status} onValueChange={(v) => setMember.mutate({ id: m.id, status: v })}>
                <SelectTrigger className="w-32 h-8" data-testid={`select-member-${m.id}`}>
                  <Badge variant="outline" className={memberStatusColors[m.status]}>{m.status}</Badge>
                </SelectTrigger>
                <SelectContent>
                  {["pending", "contacted", "scheduled", "completed", "declined"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          {campaign.members.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No patients in this campaign</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- New campaign ---------- */
function NewCampaignDialog({ panel, onClose }: { panel: PanelRow[]; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState("outreach");
  const [channel, setChannel] = useState("phone");
  const [cohort, setCohort] = useState<"gaps" | "at-risk" | "manual">("gaps");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cohortIds = cohort === "gaps"
    ? panel.filter((r) => r.careGaps.length > 0).map((r) => r.patientId)
    : cohort === "at-risk"
      ? panel.filter((r) => r.engagementStatus !== "engaged").map((r) => r.patientId)
      : Array.from(selected);

  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/campaigns", {
      name, description: description || null, campaignType, channel, status: "draft", createdBy: CURRENT_STAFF,
      startDate: null, endDate: null, patientIds: cohortIds,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created as draft" });
      onClose();
    },
    onError: () => toast({ title: "Could not create campaign", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New outreach campaign</DialogTitle>
          <DialogDescription>Outreach is recorded, not actually sent.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-campaign-name" />
        <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[56px]" />
        <div className="flex gap-2">
          <Select value={campaignType} onValueChange={setCampaignType}>
            <SelectTrigger data-testid="select-campaign-type"><SelectValue /></SelectTrigger>
            <SelectContent>{["outreach", "recall", "wellness", "follow-up"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["phone", "email", "sms", "portal"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm font-semibold mb-1.5">Target cohort</p>
          <div className="flex gap-1.5 mb-2">
            {([["gaps", "With care gaps"], ["at-risk", "At-risk / inactive"], ["manual", "Pick manually"]] as const).map(([v, l]) => (
              <Button key={v} size="sm" variant={cohort === v ? "default" : "outline"} onClick={() => setCohort(v)} data-testid={`cohort-${v}`}>{l}</Button>
            ))}
          </div>
          {cohort === "manual" ? (
            <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
              {panel.map((r) => (
                <label key={r.patientId} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.has(r.patientId)} onCheckedChange={(v) => {
                    const next = new Set(selected); v ? next.add(r.patientId) : next.delete(r.patientId); setSelected(next);
                  }} /> {r.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{cohortIds.length} patients match this cohort</p>
          )}
        </div>
        <Button onClick={() => create.mutate()} disabled={!name.trim() || cohortIds.length === 0 || create.isPending} data-testid="button-create-campaign">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Megaphone className="w-4 h-4 mr-1" />} Create campaign ({cohortIds.length} patients)
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- New referral ---------- */
function NewReferralDialog({ panel, onClose }: { panel: PanelRow[]; onClose: () => void }) {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState("");
  const [direction, setDirection] = useState("outbound");
  const [specialty, setSpecialty] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("routine");

  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/referrals", {
      patientId, direction, specialty, reason, priority,
      referringProvider: direction === "outbound" ? CURRENT_STAFF : otherParty,
      referredTo: direction === "outbound" ? otherParty : CURRENT_STAFF,
      status: "new", scheduledFor: null, notes: null,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      toast({ title: "Referral created" });
      onClose();
    },
    onError: () => toast({ title: "Could not create referral", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New referral</DialogTitle></DialogHeader>
        <Select value={patientId} onValueChange={setPatientId}>
          <SelectTrigger data-testid="select-referral-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
          <SelectContent>{panel.map((r) => <SelectItem key={r.patientId} value={r.patientId}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2">
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{["outbound", "inbound"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Specialty (e.g. Cardiology)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} data-testid="input-referral-specialty" />
        </div>
        <Input placeholder={direction === "outbound" ? "Referred to (provider / practice)" : "Referring provider"} value={otherParty} onChange={(e) => setOtherParty(e.target.value)} data-testid="input-referral-party" />
        <Textarea placeholder="Reason for referral" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[56px]" data-testid="input-referral-reason" />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{["routine", "urgent", "stat"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => create.mutate()} disabled={!patientId || !specialty.trim() || !otherParty.trim() || !reason.trim() || create.isPending} data-testid="button-create-referral">
          Create referral
        </Button>
      </DialogContent>
    </Dialog>
  );
}
