import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, ArrowUpRight, BadgeDollarSign, CheckCircle2, CircleDollarSign, Loader2, RefreshCcw, Send, XCircle } from "lucide-react";
import { DENIAL_REASONS } from "@/shared/billing-codes";
import { Link } from "wouter";
import type { Charge, Claim, Patient, Payment } from "@/shared/schema";

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const CURRENT_PROVIDER = "Dr. Sarah Johnson, MD, PhD";

interface Summary {
  charges: { totalCents: number; outstandingCents: number; unbilledCents: number; count: number };
  claimsByStatus: { status: string; count: number; totalCents: number }[];
  collections: { collectedCents: number; patientCents: number; insuranceCents: number };
  denialRate: number;
}

type ClaimDetail = Claim & { charges: Charge[]; payments: Payment[] };

const STATUS_ORDER = ["draft", "submitted", "accepted", "denied", "paid"];
const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  denied: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const chartColors: Record<string, string> = {
  draft: "#94a3b8", submitted: "#3b82f6", accepted: "#6366f1", denied: "#ef4444", paid: "#10b981",
};

export default function Billing() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState(DENIAL_REASONS[0]);
  const [payAmount, setPayAmount] = useState("");

  const { data: summary } = useQuery<Summary>({ queryKey: ["/api/billing/summary"] });
  const { data: claims = [] } = useQuery<Claim[]>({ queryKey: ["/api/claims"] });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });
  const { data: claim } = useQuery<ClaimDetail>({
    queryKey: ["/api/claims", activeClaimId],
    enabled: !!activeClaimId,
  });

  const patientName = (id: string) => patients.find((p) => p.id === id)?.name ?? id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
    queryClient.invalidateQueries({ queryKey: ["/api/claims", activeClaimId] });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/summary"] });
  };

  const transition = useMutation({
    mutationFn: async ({ action, body }: { action: string; body?: any }) => {
      const res = await apiRequest("POST", `/api/claims/${activeClaimId}/${action}`, body);
      return res.json();
    },
    onSuccess: (_d, v) => {
      invalidate();
      setPayAmount("");
      if (v.action === "resubmit") setActiveClaimId(null);
      toast({ title: `Claim ${v.action === "pay" ? "paid" : v.action === "resubmit" ? "resubmitted as new draft" : v.action + (v.action.endsWith("t") ? "ted" : "ed")}` });
    },
    onError: () => toast({ title: "Claim action failed", variant: "destructive" }),
  });

  const filtered = statusFilter === "all" ? claims : claims.filter((c) => c.status === statusFilter);
  const chartData = STATUS_ORDER.map((s) => ({
    status: s,
    count: summary?.claimsByStatus.find((c) => c.status === s)?.count ?? 0,
  }));

  const stats = summary ? [
    { label: "Charges outstanding", value: usd(summary.charges.outstandingCents), sub: `${usd(summary.charges.unbilledCents)} not yet billed`, icon: CircleDollarSign },
    { label: "Collections", value: usd(summary.collections.collectedCents), sub: `${usd(summary.collections.insuranceCents)} insurance · ${usd(summary.collections.patientCents)} patient`, icon: BadgeDollarSign },
    { label: "Open claims", value: String(claims.filter((c) => ["draft", "submitted", "accepted"].includes(c.status)).length), sub: `${claims.length} total claims`, icon: Send },
    { label: "Denial rate", value: `${(summary.denialRate * 100).toFixed(1)}%`, sub: "of adjudicated claims", icon: AlertTriangle, warn: summary.denialRate > 0.15 },
  ] : [];

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Billing & Revenue Cycle</h1>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5">
          <TabsTrigger value="overview" data-testid="tab-billing-overview">Revenue dashboard</TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-billing-claims">Claims workbench</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="emr-card divide-x divide-border flex flex-wrap mb-0">
            {stats.map((s) => (
              <div key={s.label} className="flex-1 min-w-[140px] px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                  <s.icon className={`w-3 h-3 ${s.warn ? "text-red-500" : ""}`} /> {s.label}
                </div>
                <p className={`text-xl font-bold leading-tight ${s.warn ? "text-red-600" : ""}`} data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="emr-card p-5">
              <h3 className="text-sm font-semibold mb-4">Claims by status</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="status" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((d) => <Cell key={d.status} fill={chartColors[d.status]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="emr-card p-5">
              <h3 className="text-sm font-semibold mb-3">Needs attention</h3>
              <div className="space-y-2">
                {claims.filter((c) => c.status === "denied").slice(0, 4).map((c) => (
                  <button key={c.id} className="w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveClaimId(c.id)} data-testid={`attention-claim-${c.id}`}>
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.claimNumber} · {patientName(c.patientId)}</p>
                      <p className="text-xs text-red-600 truncate">{c.denialReason}</p>
                    </div>
                    <span className="text-sm font-semibold">{usd(c.totalCents)}</span>
                  </button>
                ))}
                {claims.filter((c) => c.status === "draft").slice(0, 3).map((c) => (
                  <button key={c.id} className="w-full text-left flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveClaimId(c.id)} data-testid={`attention-draft-${c.id}`}>
                    <Send className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.claimNumber} · {patientName(c.patientId)}</p>
                      <p className="text-xs text-muted-foreground">Draft — ready to submit</p>
                    </div>
                    <span className="text-sm font-semibold">{usd(c.totalCents)}</span>
                  </button>
                ))}
                {claims.filter((c) => ["denied", "draft"].includes(c.status)).length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nothing waiting — revenue cycle is clean</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {["all", ...STATUS_ORDER].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)} data-testid={`filter-${s}`}>
                {s}{s !== "all" && ` (${claims.filter((c) => c.status === s).length})`}
              </Button>
            ))}
          </div>
          <div className="emr-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="px-4 py-2.5 font-semibold">Claim</th>
                  <th className="px-4 py-2.5 font-semibold">Patient</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Billed</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                  <th className="px-4 py-2.5 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => setActiveClaimId(c.id)} data-testid={`claim-row-${c.id}`}>
                    <td className="px-4 py-1.5 font-mono text-xs">{c.claimNumber}</td>
                    <td className="px-4 py-1.5">
                      <Link href={`/chart/${c.patientId}`} onClick={(e) => e.stopPropagation()} className="hover:underline inline-flex items-center gap-1">
                        {patientName(c.patientId)} <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    </td>
                    <td className="px-4 py-1.5"><Badge variant="outline" className={statusColors[c.status]}>{c.status}</Badge></td>
                    <td className="px-4 py-1.5 text-right font-semibold">{usd(c.totalCents)}</td>
                    <td className="px-4 py-1.5 text-right">{c.paidCents ? usd(c.paidCents) : "—"}</td>
                    <td className="px-4 py-1.5 text-xs text-muted-foreground">{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-5 text-center text-muted-foreground">No claims in this status</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Claim detail */}
      <Dialog open={!!activeClaimId} onOpenChange={(o) => !o && setActiveClaimId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {claim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {claim.claimNumber}
                  <Badge variant="outline" className={statusColors[claim.status]}>{claim.status}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {patientName(claim.patientId)} · billed {usd(claim.totalCents)}
                  {claim.submittedAt && ` · submitted ${new Date(claim.submittedAt).toLocaleDateString()}`}
                  {claim.resubmittedFromId && " · resubmission"}
                </DialogDescription>
              </DialogHeader>

              {claim.denialReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {claim.denialReason}
                </div>
              )}

              <div className="rounded-lg border divide-y">
                {claim.charges.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-mono text-xs font-semibold">{c.cptCode}</span>
                    <span className="flex-1 truncate">{c.description}</span>
                    <span className="text-xs text-muted-foreground">{c.icd10Codes.join(", ")}</span>
                    <span className="font-semibold">{usd(c.unitPriceCents * c.units)}</span>
                  </div>
                ))}
              </div>

              {claim.payments.length > 0 && (
                <div className="text-sm space-y-1">
                  {claim.payments.map((p) => (
                    <p key={p.id} className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> {usd(p.amountCents)} received ({p.source}, {p.method}) on {new Date(p.postedAt).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              )}

              {/* Lifecycle actions */}
              <div className="space-y-3 border-t pt-3">
                {claim.status === "draft" && (
                  <Button onClick={() => transition.mutate({ action: "submit" })} disabled={transition.isPending} data-testid="button-submit-claim">
                    {transition.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />} Submit to payer
                  </Button>
                )}
                {claim.status === "submitted" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => transition.mutate({ action: "accept" })} disabled={transition.isPending} data-testid="button-accept-claim">
                        <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Mark accepted
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={denialReason} onValueChange={setDenialReason}>
                        <SelectTrigger className="flex-1" data-testid="select-denial-reason"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DENIAL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => transition.mutate({ action: "deny", body: { denialReason } })} disabled={transition.isPending} data-testid="button-deny-claim">
                        <XCircle className="w-4 h-4 mr-1 text-red-500" /> Deny
                      </Button>
                    </div>
                  </div>
                )}
                {["submitted", "accepted"].includes(claim.status) && (
                  <div className="flex gap-2 items-center">
                    <Input type="number" min="0.01" step="0.01" placeholder={`Remit amount (billed ${usd(claim.totalCents)})`}
                      value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="flex-1" data-testid="input-remit-amount" />
                    <Button
                      onClick={() => transition.mutate({ action: "pay", body: { amountCents: Math.round(parseFloat(payAmount) * 100), postedBy: CURRENT_PROVIDER, method: "eft" } })}
                      disabled={!payAmount || parseFloat(payAmount) <= 0 || transition.isPending}
                      data-testid="button-pay-claim"
                    >
                      <BadgeDollarSign className="w-4 h-4 mr-1" /> Post remit
                    </Button>
                  </div>
                )}
                {claim.status === "denied" && (
                  <Button onClick={() => transition.mutate({ action: "resubmit" })} disabled={transition.isPending} data-testid="button-resubmit-claim">
                    {transition.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCcw className="w-4 h-4 mr-1" />} Resubmit as new claim
                  </Button>
                )}
                {claim.status === "paid" && (
                  <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Paid {usd(claim.paidCents)} of {usd(claim.totalCents)}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
