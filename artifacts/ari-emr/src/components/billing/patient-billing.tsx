import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, FilePlus2, Loader2, Receipt, ShieldCheck, Stethoscope } from "lucide-react";
import ChargeCapture from "./charge-capture";
import type { Charge, Claim, Coverage, Encounter, Payer, Payment, Problem } from "@/shared/schema";

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const CURRENT_PROVIDER = "Dr. Sarah Johnson, MD, PhD";

const eligColors: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

interface Props {
  patientId: string;
  encounters: Encounter[];
  problems: Problem[];
}

export default function PatientBilling({ patientId, encounters, problems }: Props) {
  const { toast } = useToast();
  const [captureEnc, setCaptureEnc] = useState<Encounter | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [claimCoverage, setClaimCoverage] = useState<string>("");
  const [claimCharges, setClaimCharges] = useState<string[]>([]);

  const { data: coverages = [] } = useQuery<(Coverage & { payer: Payer | null })[]>({
    queryKey: ["/api/patients", patientId, "coverages"],
  });
  const { data: charges = [] } = useQuery<Charge[]>({ queryKey: ["/api/patients", patientId, "charges"] });
  const { data: payments = [] } = useQuery<Payment[]>({ queryKey: ["/api/patients", patientId, "payments"] });
  const { data: claims = [] } = useQuery<Claim[]>({ queryKey: ["/api/patients", patientId, "claims"] });

  const totalCharges = charges.reduce((s, c) => s + c.unitPriceCents * c.units, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amountCents, 0);
  const balance = Math.max(0, totalCharges - totalPaid);
  const unbilled = charges.filter((c) => c.status === "unbilled");

  const invalidateAll = () => {
    ["charges", "payments", "claims"].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, k] }),
    );
    queryClient.invalidateQueries({ queryKey: ["/api/billing/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
  };

  const recordPayment = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(payAmount) * 100);
      const res = await apiRequest("POST", "/api/payments", {
        patientId, amountCents: cents, source: "patient", method: payMethod,
        postedBy: CURRENT_PROVIDER, note: "Recorded from patient chart",
      });
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setPayOpen(false); setPayAmount(""); toast({ title: "Payment recorded" }); },
    onError: () => toast({ title: "Couldn't record payment", variant: "destructive" }),
  });

  const createClaim = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/claims", {
        patientId, coverageId: claimCoverage || undefined, chargeIds: claimCharges,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll(); setClaimOpen(false); setClaimCharges([]);
      toast({ title: "Draft claim created", description: "Submit it from the Billing workbench" });
    },
    onError: () => toast({ title: "Couldn't create claim", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total charges", value: usd(totalCharges), icon: Receipt },
          { label: "Payments received", value: usd(totalPaid), icon: CreditCard },
          { label: "Patient balance", value: usd(balance), icon: Stethoscope, accent: balance > 0 },
        ].map((s) => (
          <div key={s.label} className="emr-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </div>
            <p className={`mt-1 text-2xl font-bold ${s.accent ? "text-red-600" : ""}`} data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setPayOpen(true)} data-testid="button-record-payment">
          <CreditCard className="w-4 h-4 mr-1.5" /> Record payment
        </Button>
        <Button size="sm" variant="outline" onClick={() => setClaimOpen(true)} disabled={unbilled.length === 0} data-testid="button-create-claim">
          <FilePlus2 className="w-4 h-4 mr-1.5" /> Create claim ({unbilled.length} unbilled)
        </Button>
      </div>

      {/* Coverage */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Insurance & coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coverages.map((c) => (
            <div key={c.id} className="emr-card p-4" data-testid={`coverage-${c.id}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{c.payer?.name ?? "Unknown payer"}</p>
                <Badge variant="outline" className={eligColors[c.eligibilityStatus] ?? ""}>{c.eligibilityStatus}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{c.planName} · {c.planType} · {c.priority}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Member ID</span><span className="font-mono">{c.memberId}</span>
                {c.groupNumber && (<><span className="text-muted-foreground">Group</span><span className="font-mono">{c.groupNumber}</span></>)}
                <span className="text-muted-foreground">Copay</span><span>{usd(c.copayCents ?? 0)}</span>
                <span className="text-muted-foreground">Deductible</span><span>{usd(c.deductibleCents ?? 0)}</span>
              </div>
            </div>
          ))}
          {coverages.length === 0 && <p className="text-sm text-muted-foreground">No coverage on file — self-pay</p>}
        </div>
      </div>

      {/* Charge capture per encounter */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Encounter charge capture</h3>
        <div className="emr-card divide-y divide-border">
          {encounters.slice(0, 6).map((e) => {
            const encCharges = charges.filter((c) => c.encounterId === e.id);
            const sum = encCharges.reduce((s, c) => s + c.unitPriceCents * c.units, 0);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.encounterDate).toLocaleDateString()} · {e.encounterType} · {e.provider}</p>
                </div>
                <span className="text-xs text-muted-foreground">{encCharges.length} charge{encCharges.length === 1 ? "" : "s"} · {usd(sum)}</span>
                <Button size="sm" variant="outline" onClick={() => setCaptureEnc(e)} data-testid={`button-capture-${e.id}`}>Code visit</Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Itemized statement */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Itemized statement</h3>
        <div className="emr-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">CPT</th>
                <th className="px-4 py-2 font-semibold">Description</th>
                <th className="px-4 py-2 font-semibold">Dx</th>
                <th className="px-4 py-2 font-semibold text-right">Amount</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className="border-b last:border-0" data-testid={`stmt-row-${c.id}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{c.serviceDate}</td>
                  <td className="px-4 py-2 font-mono text-xs">{c.cptCode}</td>
                  <td className="px-4 py-2">{c.description}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.icd10Codes.join(", ")}</td>
                  <td className="px-4 py-2 text-right font-semibold">{usd(c.unitPriceCents * c.units)}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{c.status}</Badge></td>
                </tr>
              ))}
              {charges.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No charges on file</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Payments</h3>
        <div className="emr-card divide-y divide-border">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(p.postedAt).toLocaleDateString()}</span>
              <Badge variant="outline" className="text-[10px]">{p.source}</Badge>
              <span className="flex-1 text-xs text-muted-foreground truncate">{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
              <span className="font-semibold text-emerald-700">{usd(p.amountCents)}</span>
            </div>
          ))}
          {payments.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground text-center">No payments recorded</p>}
        </div>
      </div>

      <ChargeCapture
        open={!!captureEnc}
        onOpenChange={(o) => !o && setCaptureEnc(null)}
        patientId={patientId}
        encounter={captureEnc}
        problems={problems}
      />

      {/* Record payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record patient payment</DialogTitle>
            <DialogDescription>Manual entry — no card is charged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number" min="0.01" step="0.01" placeholder="Amount (USD)"
              value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              data-testid="input-payment-amount"
            />
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={!payAmount || parseFloat(payAmount) <= 0 || recordPayment.isPending}
              onClick={() => recordPayment.mutate()}
              data-testid="button-confirm-payment"
            >
              {recordPayment.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Post payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create claim dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create claim from unbilled charges</DialogTitle>
            <DialogDescription>Select the charges and coverage to bill.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={claimCoverage} onValueChange={setClaimCoverage}>
              <SelectTrigger data-testid="select-claim-coverage"><SelectValue placeholder="Select coverage" /></SelectTrigger>
              <SelectContent>
                {coverages.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.payer?.name} · {c.planName} ({c.priority})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
              {unbilled.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={claimCharges.includes(c.id)}
                    onCheckedChange={(v) =>
                      setClaimCharges((prev) => (v ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                    }
                    data-testid={`checkbox-claim-charge-${c.id}`}
                  />
                  <span className="font-mono text-xs">{c.cptCode}</span>
                  <span className="flex-1 truncate">{c.description}</span>
                  <span className="font-semibold">{usd(c.unitPriceCents * c.units)}</span>
                </label>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={claimCharges.length === 0 || createClaim.isPending}
              onClick={() => createClaim.mutate()}
              data-testid="button-confirm-claim"
            >
              {createClaim.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Create draft claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claims summary */}
      {claims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Claims for this patient</h3>
          <div className="emr-card divide-y divide-border">
            {claims.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{c.claimNumber}</span>
                <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                {c.denialReason && <span className="flex-1 text-xs text-red-600 truncate">{c.denialReason}</span>}
                {!c.denialReason && <span className="flex-1" />}
                <span className="font-semibold">{usd(c.totalCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
