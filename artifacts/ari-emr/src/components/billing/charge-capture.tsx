import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { CPT_LIBRARY, CPT_MAP, ICD10_COMMON } from "@/shared/billing-codes";
import type { Charge, Encounter, Problem } from "@/shared/schema";

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId: string;
  encounter: Encounter | null;
  problems: Problem[];
}

type Suggestion = {
  suggestion: {
    cptCodes: { code: string; description: string; rationale: string }[];
    icd10Codes: { code: string; description: string; rationale: string }[];
  };
  ai: boolean;
};

export default function ChargeCapture({ open, onOpenChange, patientId, encounter, problems }: Props) {
  const { toast } = useToast();
  const [cptCode, setCptCode] = useState<string>("");
  const [selectedIcds, setSelectedIcds] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [fromAi, setFromAi] = useState(false);

  const { data: charges = [] } = useQuery<Charge[]>({
    queryKey: ["/api/encounters", encounter?.id, "charges"],
    enabled: !!encounter && open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/encounters", encounter?.id, "charges"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "charges"] });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/summary"] });
  };

  const icdOptions = [
    ...problems.filter((p) => p.icd10Code).map((p) => ({ code: p.icd10Code!, description: p.name, fromChart: true })),
    ...ICD10_COMMON.filter((c) => !problems.some((p) => p.icd10Code === c.code)).map((c) => ({ ...c, fromChart: false })),
  ];

  const suggest = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ari/suggest-codes", { encounterId: encounter!.id });
      return (await res.json()) as Suggestion;
    },
    onSuccess: (data) => setSuggestion(data),
    onError: () => toast({ title: "Ari couldn't suggest codes", variant: "destructive" }),
  });

  const addCharge = useMutation({
    mutationFn: async (input: { cptCode: string; icd10Codes: string[]; aiSuggested: boolean }) => {
      const entry = CPT_MAP.get(input.cptCode)!;
      const res = await apiRequest("POST", "/api/charges", {
        patientId,
        encounterId: encounter!.id,
        cptCode: entry.code,
        description: entry.description,
        icd10Codes: input.icd10Codes,
        units: 1,
        unitPriceCents: entry.priceCents,
        serviceDate: new Date(encounter!.encounterDate).toISOString().slice(0, 10),
        provider: encounter!.provider,
        aiSuggested: input.aiSuggested,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setCptCode("");
      setFromAi(false);
      toast({ title: "Charge added" });
    },
    onError: () => toast({ title: "Couldn't add charge", variant: "destructive" }),
  });

  const removeCharge = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/charges/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ title: "Only unbilled charges can be removed", variant: "destructive" }),
  });

  const toggleIcd = (code: string) =>
    setSelectedIcds((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  if (!encounter) return null;
  const categories = Array.from(new Set(CPT_LIBRARY.map((c) => c.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charge capture</DialogTitle>
          <DialogDescription>
            {encounter.encounterType} · {new Date(encounter.encounterDate).toLocaleDateString()} · {encounter.reason}
          </DialogDescription>
        </DialogHeader>

        {/* Ari suggestions */}
        <div className="rounded-lg border bg-violet-50/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-600" /> Ari code suggestions</p>
            <Button size="sm" variant="outline" onClick={() => suggest.mutate()} disabled={suggest.isPending} data-testid="button-suggest-codes">
              {suggest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suggest from note"}
            </Button>
          </div>
          {suggestion && (
            <div className="mt-2 space-y-2">
              {!suggestion.ai && <p className="text-xs text-muted-foreground">Ari limited mode — suggestions derived from chart data.</p>}
              {suggestion.suggestion.cptCodes.map((c) => (
                <div key={c.code} className="flex items-start gap-2 text-sm">
                  <Button
                    size="sm" variant="secondary" className="h-6 px-2 shrink-0"
                    onClick={() => { setCptCode(c.code); setFromAi(true); }}
                    data-testid={`button-use-cpt-${c.code}`}
                  >
                    CPT {c.code}
                  </Button>
                  <span className="text-xs text-muted-foreground">{c.description} — {c.rationale}</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5">
                {suggestion.suggestion.icd10Codes.map((c) => (
                  <Badge
                    key={c.code} variant="outline"
                    className={`cursor-pointer ${selectedIcds.includes(c.code) ? "bg-violet-100 border-violet-300" : ""}`}
                    onClick={() => toggleIcd(c.code)}
                    title={c.rationale}
                  >
                    {c.code} · {c.description}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">CPT code</p>
            <Select value={cptCode} onValueChange={(v) => { setCptCode(v); setFromAi(false); }}>
              <SelectTrigger data-testid="select-cpt"><SelectValue placeholder="Select procedure code" /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{cat}</p>
                    {CPT_LIBRARY.filter((c) => c.category === cat).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.description} ({usd(c.priceCents)})
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">ICD-10 diagnoses (tap to toggle)</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {icdOptions.map((o) => (
                <Badge
                  key={o.code} variant="outline"
                  className={`cursor-pointer ${selectedIcds.includes(o.code) ? "bg-primary/10 border-primary/40 text-primary" : ""}`}
                  onClick={() => toggleIcd(o.code)}
                  data-testid={`icd-${o.code}`}
                >
                  {o.code} · {o.description}{o.fromChart ? " ★" : ""}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">★ from this patient's problem list</p>
          </div>
          <Button
            onClick={() => addCharge.mutate({ cptCode, icd10Codes: selectedIcds, aiSuggested: fromAi })}
            disabled={!cptCode || selectedIcds.length === 0 || addCharge.isPending}
            data-testid="button-add-charge"
          >
            {addCharge.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Add charge {cptCode && CPT_MAP.get(cptCode) ? `· ${usd(CPT_MAP.get(cptCode)!.priceCents)}` : ""}
          </Button>
        </div>

        {/* Existing charges */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Charges on this encounter</p>
          <div className="rounded-lg border divide-y">
            {charges.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid={`charge-row-${c.id}`}>
                <span className="font-mono text-xs font-semibold">{c.cptCode}</span>
                <span className="flex-1 truncate">{c.description}</span>
                <span className="text-xs text-muted-foreground">{c.icd10Codes.join(", ")}</span>
                <span className="font-semibold">{usd(c.unitPriceCents * c.units)}</span>
                <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                {c.status === "unbilled" && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCharge.mutate(c.id)} data-testid={`button-delete-charge-${c.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {charges.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">No charges captured yet</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
