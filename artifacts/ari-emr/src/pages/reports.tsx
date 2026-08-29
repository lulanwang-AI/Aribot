import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3, Users, FileText, Download, Sparkles, TrendingUp, Activity,
  DollarSign, CalendarX, Loader2, Send, Star,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import ClinicalDocuments from "@/components/clinical-documents";
import { apiRequest } from "@/lib/queryClient";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const usdShort = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

interface Overview {
  volumeTrend: { month: string; encounters: number }[];
  encounterMix: { type: string; count: number }[];
  providerProductivity: { provider: string; encounters: number; signedNotes: number }[];
  appointments: { total: number; byStatus: { status: string; count: number }[]; noShowRate: number };
  revenue: {
    totalChargedCents: number; totalCollectedCents: number; collectionRate: number;
    byMonth: { month: string; chargedCents: number; collectedCents: number }[];
    claimsByStatus: { status: string; count: number; totalCents: number; paidCents: number }[];
  };
  aiImaging: {
    imagingStudies: number; studiesByType: { type: string; count: number }[];
    aiAnalyses: number; aiAssistedNotes: number; aiSuggestedCharges: number;
  };
}

interface CohortPatient {
  patientId: string; name: string; age: number; gender: string; engagementStatus: string;
  vip: boolean; lastVisit: string | null; nextVisit: string | null; balanceCents: number;
  careGaps: { kind: string; label: string }[];
  conditions: { name: string; icd10Code: string | null; status: string }[];
}
interface CohortResult {
  total: number; patients: CohortPatient[];
  breakdown: {
    byEngagement: { key: string; count: number }[];
    byGender: { key: string; count: number }[];
    byCareGap: { key: string; count: number }[];
  };
}

interface ReportResult {
  columns: { key: string; label: string; format?: string }[];
  rows: Record<string, string | number>[];
  detail: Record<string, string | number>[];
}

export default function Reports() {
  return (
    <div className="p-5 max-w-[1280px] mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-primary" /> Reporting & Analytics
        </h1>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="mb-5">
          <TabsTrigger value="analytics" data-testid="tab-analytics"><TrendingUp className="w-4 h-4 mr-1.5" />Analytics hub</TabsTrigger>
          <TabsTrigger value="population" data-testid="tab-population"><Users className="w-4 h-4 mr-1.5" />Population health</TabsTrigger>
          <TabsTrigger value="builder" data-testid="tab-builder"><FileText className="w-4 h-4 mr-1.5" />Report builder</TabsTrigger>
          <TabsTrigger value="ari" data-testid="tab-ari-insights"><Sparkles className="w-4 h-4 mr-1.5" />Ari insights</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Clinical documents</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics"><AnalyticsHub /></TabsContent>
        <TabsContent value="population"><PopulationHealth /></TabsContent>
        <TabsContent value="builder"><ReportBuilder /></TabsContent>
        <TabsContent value="ari"><AriInsights /></TabsContent>
        <TabsContent value="documents"><ClinicalDocuments /></TabsContent>
      </Tabs>
    </div>
  );
}

function ChartCard({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="emr-card p-5" data-testid={testId}>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function AnalyticsHub() {
  const [range, setRange] = useState<"all" | "90" | "30">("all");
  const params = range === "all" ? "" : `?from=${new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10)}`;
  const { data: o, isLoading } = useQuery<Overview>({ queryKey: [`/api/analytics/overview${params}`] });

  if (isLoading || !o) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
       <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {([["all", "All time"], ["90", "Last 90 days"], ["30", "Last 30 days"]] as const).map(([v, l]) => (
          <Button key={v} size="sm" variant={range === v ? "default" : "outline"} onClick={() => setRange(v)} data-testid={`button-range-${v}`}>{l}</Button>
        ))}
      </div>

      {/* KPI strip */}
      <div className="emr-card divide-x divide-border flex flex-wrap">
        <div className="flex-1 min-w-[130px] px-4 py-2.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Encounters</div>
          <p className="text-xl font-bold leading-tight" data-testid="stat-total-encounters">{o.encounterMix.reduce((s, m) => s + m.count, 0)}</p>
          <p className="text-xs text-muted-foreground">{o.encounterMix[0] ? `Most common: ${o.encounterMix[0].type}` : "—"}</p>
        </div>
        <div className="flex-1 min-w-[130px] px-4 py-2.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">No-show rate</div>
          <p className="text-xl font-bold leading-tight" data-testid="stat-noshow-rate">{o.appointments.noShowRate}%</p>
          <p className="text-xs text-muted-foreground">{o.appointments.total} appointments</p>
        </div>
        <div className="flex-1 min-w-[130px] px-4 py-2.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Collected</div>
          <p className="text-xl font-bold leading-tight" data-testid="stat-collected">{usdShort(o.revenue.totalCollectedCents)}</p>
          <p className="text-xs text-muted-foreground">{o.revenue.collectionRate}% of {usdShort(o.revenue.totalChargedCents)} charged</p>
        </div>
        <div className="flex-1 min-w-[130px] px-4 py-2.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">AI & imaging</div>
          <p className="text-xl font-bold leading-tight" data-testid="stat-ai-usage">{o.aiImaging.imagingStudies}</p>
          <p className="text-xs text-muted-foreground">{o.aiImaging.aiAnalyses} AI analyses · {o.aiImaging.aiAssistedNotes + o.aiImaging.aiSuggestedCharges} AI assists</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Patient volume — encounters per month" testId="chart-volume">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={o.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
              <Line type="monotone" dataKey="encounters" stroke="#2563eb" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Encounter mix" testId="chart-mix">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={o.encounterMix} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={85} label={(e) => `${e.type} (${e.count})`} fontSize={11} isAnimationActive={false}>
                {o.encounterMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Provider productivity" testId="chart-providers">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={o.providerProductivity} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="provider" fontSize={11} width={120} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="encounters" name="Encounters" fill="#2563eb" radius={[0, 3, 3, 0]} />
              <Bar dataKey="signedNotes" name="Signed notes" fill="#7c3aed" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appointments by status" testId="chart-appts">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={o.appointments.byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
              <Bar dataKey="count" fill="#0891b2" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue cycle — charged vs collected by month" testId="chart-revenue">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={o.revenue.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => usdShort(v)} width={70} />
              <Tooltip formatter={(v) => usd(Number(v))} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="chargedCents" name="Charged" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collectedCents" name="Collected" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Claims by status" testId="chart-claims">
          <div className="space-y-2 pt-1">
            {o.revenue.claimsByStatus.map((c) => (
              <div key={c.status} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <Badge variant="outline" className="capitalize">{c.status}</Badge>
                <span className="text-muted-foreground">{c.count} claims</span>
                <span className="font-medium">{usd(c.totalCents)}</span>
                <span className="text-xs text-emerald-600">{usd(c.paidCents)} paid</span>
              </div>
            ))}
            {!o.revenue.claimsByStatus.length && <p className="text-sm text-muted-foreground">No claims yet</p>}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function PopulationHealth() {
  const [icd, setIcd] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [gender, setGender] = useState("any");
  const [engagement, setEngagement] = useState("any");
  const [gap, setGap] = useState("any");
  const [selected, setSelected] = useState<CohortPatient | null>(null);

  const qs = new URLSearchParams();
  if (icd.trim()) qs.set("icd10Prefix", icd.trim());
  if (ageMin) qs.set("ageMin", ageMin);
  if (ageMax) qs.set("ageMax", ageMax);
  if (gender !== "any") qs.set("gender", gender);
  if (engagement !== "any") qs.set("engagementStatus", engagement);
  if (gap !== "any") qs.set("careGapKind", gap);
  const url = `/api/analytics/cohort${qs.toString() ? `?${qs}` : ""}`;
  const { data: cohort, isLoading } = useQuery<CohortResult>({ queryKey: [url] });

  return (
       <div className="space-y-4">
      <div className="emr-card p-5">
        <h3 className="text-sm font-semibold mb-3">Cohort criteria</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Input placeholder="ICD-10 prefix (e.g. E11)" value={icd} onChange={(e) => setIcd(e.target.value)} data-testid="input-icd-prefix" />
          <Input placeholder="Min age" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} data-testid="input-age-min" />
          <Input placeholder="Max age" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} data-testid="input-age-max" />
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger data-testid="select-gender"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any gender</SelectItem><SelectItem value="f">Female</SelectItem><SelectItem value="m">Male</SelectItem>
            </SelectContent>
          </Select>
          <Select value={engagement} onValueChange={setEngagement}>
            <SelectTrigger data-testid="select-engagement"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any engagement</SelectItem>
              <SelectItem value="engaged">Engaged</SelectItem><SelectItem value="at-risk">At risk</SelectItem><SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gap} onValueChange={setGap}>
            <SelectTrigger data-testid="select-care-gap"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any care gap</SelectItem>
              <SelectItem value="wellness">Wellness overdue</SelectItem>
              <SelectItem value="diabetes">Diabetes A1c</SelectItem>
              <SelectItem value="htn">Hypertension</SelectItem>
              <SelectItem value="oncology">Oncology follow-up</SelectItem>
              <SelectItem value="copd">COPD</SelectItem>
              <SelectItem value="colorectal">Colorectal screening</SelectItem>
              <SelectItem value="mammogram">Mammogram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading || !cohort ? (
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="emr-card divide-x divide-border flex flex-wrap">
            <div className="flex-1 min-w-[120px] px-4 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Cohort size</p>
              <p className="text-xl font-bold" data-testid="stat-cohort-size">{cohort.total}</p>
            </div>
            <div className="flex-1 min-w-[180px] px-4 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Engagement</p>
              <div className="flex flex-wrap gap-1">{cohort.breakdown.byEngagement.map((b) => <Badge key={b.key} variant="outline" className="text-[10px]">{b.key}: {b.count}</Badge>)}</div>
            </div>
            <div className="flex-1 min-w-[180px] px-4 py-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Top care gaps</p>
              <div className="flex flex-wrap gap-1">{cohort.breakdown.byCareGap.slice(0, 3).map((b) => <Badge key={b.key} className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]" variant="outline">{b.key}: {b.count}</Badge>)}</div>
            </div>
          </div>

          <div className="emr-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Patient</th>
                  <th className="px-4 py-2.5 font-medium">Conditions</th>
                  <th className="px-4 py-2.5 font-medium">Engagement</th>
                  <th className="px-4 py-2.5 font-medium">Care gaps</th>
                  <th className="px-4 py-2.5 font-medium">Last visit</th>
                </tr>
              </thead>
              <tbody>
                {cohort.patients.map((p) => (
                  <tr key={p.patientId} className="border-t border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(p)} data-testid={`row-cohort-${p.patientId}`}>
                    <td className="px-4 py-2.5 font-medium">
                      <span className="flex items-center gap-1.5">{p.vip && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}{p.name}<span className="text-xs text-muted-foreground font-normal">{p.age}{p.gender[0]}</span></span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.conditions.map((c) => c.icd10Code ?? c.name).slice(0, 4).join(", ") || "—"}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{p.engagementStatus}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">{p.careGaps.map((g) => <Badge key={g.kind} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">{g.label}</Badge>)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.lastVisit ?? "—"}</td>
                  </tr>
                ))}
                {!cohort.patients.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No patients match these criteria</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2">{selected.vip && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}{selected.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{selected.age} y/o {selected.gender} · <span className="capitalize">{selected.engagementStatus}</span> · Balance {usd(selected.balanceCents)}</p>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Conditions</p>
                  {selected.conditions.length ? selected.conditions.map((c) => (
                    <p key={c.name}>{c.name} {c.icd10Code && <span className="text-xs text-muted-foreground">({c.icd10Code})</span>} <Badge variant="outline" className="ml-1 text-[10px] capitalize">{c.status}</Badge></p>
                  )) : <p className="text-muted-foreground">None on file</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Care gaps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.careGaps.length ? selected.careGaps.map((g) => <Badge key={g.kind} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{g.label}</Badge>) : <p className="text-muted-foreground text-sm">No open care gaps</p>}
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">Last visit {selected.lastVisit ?? "—"} · Next visit {selected.nextVisit ?? "not scheduled"}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const GROUP_OPTIONS: Record<string, { value: string; label: string }[]> = {
  clinical: [
    { value: "type", label: "Encounter type" }, { value: "provider", label: "Provider" },
    { value: "status", label: "Status" }, { value: "month", label: "Month" }, { value: "department", label: "Department" },
  ],
  operational: [
    { value: "status", label: "Status" }, { value: "provider", label: "Provider" },
    { value: "visitType", label: "Visit type" }, { value: "department", label: "Department" },
    { value: "date", label: "Date" }, { value: "month", label: "Month" },
  ],
  financial: [
    { value: "status", label: "Charge status" }, { value: "cpt", label: "CPT code" },
    { value: "provider", label: "Provider" }, { value: "month", label: "Month" },
  ],
};

function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    let s = String(v ?? "");
    // Neutralize spreadsheet formula injection (=, +, -, @ leading cells)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function downloadCsv(rows: Record<string, string | number>[], name: string) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ReportBuilder() {
  const [domain, setDomain] = useState<"clinical" | "operational" | "financial">("clinical");
  const [groupBy, setGroupBy] = useState("type");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"summary" | "detail">("summary");

  const qs = new URLSearchParams({ domain, groupBy });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const url = `/api/analytics/report?${qs}`;
  const { data: report, isLoading } = useQuery<ReportResult>({ queryKey: [url] });

  const changeDomain = (d: string) => {
    setDomain(d as typeof domain);
    setGroupBy(GROUP_OPTIONS[d][0].value);
  };

  const fmtCell = (col: { key: string; format?: string }, v: string | number) =>
    col.format === "usd" || col.key === "totalCents" ? usd(Number(v)) : v;

  return (
       <div className="space-y-4">
      <div className="emr-card p-5">
        <h3 className="text-sm font-semibold mb-3">Report configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select value={domain} onValueChange={changeDomain}>
            <SelectTrigger data-testid="select-domain"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clinical">Clinical (encounters)</SelectItem>
              <SelectItem value="operational">Operational (appointments)</SelectItem>
              <SelectItem value="financial">Financial (charges)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger data-testid="select-groupby"><SelectValue /></SelectTrigger>
            <SelectContent>{GROUP_OPTIONS[domain].map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="input-from" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="input-to" />
          <Button variant="outline" onClick={() => report && downloadCsv(view === "summary" ? report.rows : report.detail, `${domain}-report.csv`)} disabled={!report} data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading || !report ? (
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Chart" testId="chart-report">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={report.columns[0].key} fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name={report.columns[1].label} fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="emr-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold">{view === "summary" ? "Summary" : `Detail (${report.detail.length} rows)`}</h3>
              <div className="flex gap-1.5">
                <Button size="sm" variant={view === "summary" ? "default" : "outline"} onClick={() => setView("summary")} data-testid="button-view-summary">Summary</Button>
                <Button size="sm" variant={view === "detail" ? "default" : "outline"} onClick={() => setView("detail")} data-testid="button-view-detail">Detail</Button>
              </div>
            </div>
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                {view === "summary" ? (
                  <>
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground sticky top-0">
                      <tr>{report.columns.map((c) => <th key={c.key} className="px-4 py-2 font-medium">{c.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          {report.columns.map((c) => <td key={c.key} className="px-4 py-2">{fmtCell(c, r[c.key])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground sticky top-0">
                      <tr>{report.detail[0] && Object.keys(report.detail[0]).map((k) => <th key={k} className="px-4 py-2 font-medium capitalize">{k.replace("Cents", "")}</th>)}</tr>
                    </thead>
                    <tbody>
                      {report.detail.map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          {Object.entries(r).map(([k, v]) => <td key={k} className="px-4 py-2 text-xs">{k.endsWith("Cents") ? usd(Number(v)) : v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  "How many diabetic patients have an overdue HbA1c?",
  "Which provider had the most encounters?",
  "What is our appointment no-show rate?",
  "How is revenue collection trending?",
  "Which care gaps are most common across the panel?",
];

function AriInsights() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string; ai: boolean }[]>([]);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/ari/analytics-qa", { question: q });
      return (await res.json()) as { answer: string; ai: boolean };
    },
    onSuccess: (data, q) => setHistory((h) => [{ q, a: data.answer, ai: data.ai }, ...h]),
  });

  const submit = (q: string) => {
    const t = q.trim();
    if (!t || ask.isPending) return;
    setQuestion("");
    ask.mutate(t);
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="emr-card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-violet-500" /> Ask Ari about your practice data</h3>
        <p className="text-xs text-muted-foreground mb-3">Natural-language questions over encounters, appointments, revenue, population health, and CRM data.</p>
        <div className="flex gap-2">
          <Textarea placeholder="e.g. How many diabetic patients missed follow-ups this quarter?" value={question}
            onChange={(e) => setQuestion(e.target.value)} rows={2} className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); } }}
            data-testid="input-ari-question" />
          <Button onClick={() => submit(question)} disabled={!question.trim() || ask.isPending} data-testid="button-ask-ari">
            {ask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SUGGESTED_QUESTIONS.map((s) => (
            <button key={s} onClick={() => submit(s)} disabled={ask.isPending}
              className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
              data-testid="button-suggested-question">{s}</button>
          ))}
        </div>
      </div>

      {ask.isPending && (
        <div className="emr-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Ari is analyzing practice data…
        </div>
      )}

      {history.map((h, i) => (
        <div key={i} className="emr-card p-5" data-testid={`card-ari-answer-${i}`}>
          <p className="text-sm font-medium mb-2">{h.q}</p>
          <div className="text-sm whitespace-pre-wrap text-foreground/90">{h.a}</div>
          <p className="text-[10px] text-muted-foreground mt-3">{h.ai ? "Answered by Ari from live practice data" : "Deterministic summary (AI unavailable)"}</p>
        </div>
      ))}
      {!history.length && !ask.isPending && (
        <p className="text-sm text-muted-foreground text-center py-6">Ask a question or pick a suggestion to get started.</p>
      )}
    </div>
  );
}
