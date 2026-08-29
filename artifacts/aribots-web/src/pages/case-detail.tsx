import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegimenCard, DifferentialList } from "@/components/amr/RegimenCard";
import {
  ActionBadge,
  Callout,
  CategoryBadge,
  DecisionSupportNotice,
  EmptyState,
  Pill,
  ReviewClock,
  SectionHeading,
  SeverityBadge,
  StatusBadge,
  TierBadge,
} from "@/components/amr/primitives";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  SETTING_LABELS,
  amrApi,
  formatDate,
  formatDateTime,
  formatDuration,
} from "@/lib/amr";
import type {
  CultureIsolate,
  CultureResult,
  ClinicalResponse,
  SusceptibilityCategory,
} from "@shared/amr/types";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  MapPin,
  Microscope,
  Plus,
  ScrollText,
  ShieldAlert,
  Siren,
  Trash2,
  Wrench,
} from "lucide-react";

const ACTOR = "Clinician";

/** The three states the 48-72 hour panel can be in. */
type ReviewMode = "not_started" | "entering" | "complete";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CheckList({ items, testId }: { items: string[]; testId: string }) {
  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Susceptibility panel entry.
 *
 * Deliberately mirrors how a laboratory report is read: a list of agents, each
 * marked S, I or R. Anything left unmarked stays unreported, and the engine
 * treats an unreported agent as untested rather than assuming it is active.
 */
function SusceptibilityEntry({
  agents,
  value,
  onChange,
}: {
  agents: { id: string; name: string; shortName: string }[];
  value: Record<string, SusceptibilityCategory>;
  onChange: (next: Record<string, SusceptibilityCategory>) => void;
}) {
  const [filter, setFilter] = useState("");
  const visible = agents.filter((agent) =>
    `${agent.name} ${agent.shortName}`.toLowerCase().includes(filter.toLowerCase()),
  );

  function set(agentId: string, category: SusceptibilityCategory) {
    const next = { ...value };
    if (next[agentId] === category) delete next[agentId];
    else next[agentId] = category;
    onChange(next);
  }

  const reported = Object.keys(value).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={filter}
          placeholder="Filter agents"
          data-testid="input-susceptibility-filter"
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 text-xs"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">{reported} reported</span>
      </div>
      <ScrollArea className="h-56 rounded-md border border-border/60">
        <ul className="divide-y divide-border/50">
          {visible.map((agent) => (
            <li key={agent.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="min-w-0 truncate text-xs text-foreground">{agent.name}</span>
              <div className="flex shrink-0 gap-1">
                {(["S", "I", "R"] as SusceptibilityCategory[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={value[agent.id] === category}
                    aria-label={`${agent.name} ${category}`}
                    data-testid={`susceptibility-${agent.id}-${category}`}
                    onClick={() => set(agent.id, category)}
                    className={cn(
                      "h-6 w-6 rounded border text-[11px] font-semibold transition-colors",
                      value[agent.id] === category
                        ? category === "S"
                          ? "border-susceptible bg-susceptible text-white"
                          : category === "I"
                            ? "border-intermediate bg-intermediate text-white"
                            : "border-resistant bg-resistant text-white"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

export default function CaseDetail({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("empiric");
  const [decisionNote, setDecisionNote] = useState("");

  const { data: record, isLoading, error } = useQuery({
    queryKey: ["amr", "case", id],
    queryFn: () => amrApi.case(id),
  });

  const { data: reference } = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const [cultures, setCultures] = useState<CultureResult | null>(null);
  const [response, setResponse] = useState<ClinicalResponse>({
    afebrile24h: false,
    hemodynamicallyStable: true,
    wbcTrend: "flat",
    tolueratingOral: false,
    sourceControlDone: false,
    improving: true,
    notes: "",
  });

  // Seed the culture form from whatever the laboratory has already sent back.
  const workingCultures: CultureResult =
    cultures ?? record?.cultures ?? { status: "pending", isolates: [], rapidDiagnostics: [], notes: "" };

  function updateCultures(mutator: (draft: CultureResult) => void) {
    const base: CultureResult = JSON.parse(JSON.stringify(workingCultures));
    mutator(base);
    setCultures(base);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["amr", "case", id] });
    queryClient.invalidateQueries({ queryKey: ["amr", "cases"] });
    queryClient.invalidateQueries({ queryKey: ["amr", "metrics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }

  const startTherapy = useMutation({
    mutationFn: (regimenId: string) => amrApi.startTherapy(id, regimenId, ACTOR),
    onSuccess: () => {
      toast({ title: "Therapy started", description: "The 48 hour review is now on the worklist." });
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Could not start therapy", description: err.message, variant: "destructive" }),
  });

  const submitReview = useMutation({
    mutationFn: () => amrApi.submitReview(id, { cultures: workingCultures, response, actor: ACTOR }),
    onSuccess: () => {
      toast({ title: "Review complete", description: "A targeted recommendation is ready." });
      setCultures(null);
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Could not complete the review", description: err.message, variant: "destructive" }),
  });

  const recordDecision = useMutation({
    mutationFn: (outcome: "accepted" | "modified" | "overridden") =>
      amrApi.recordDecision(id, { outcome, by: ACTOR, note: decisionNote }),
    onSuccess: () => {
      toast({ title: "Decision recorded" });
      setDecisionNote("");
      invalidate();
    },
    onError: (err: Error) => toast({ title: "Could not record the decision", description: err.message, variant: "destructive" }),
  });

  const reviewMode: ReviewMode = record?.targeted
    ? "complete"
    : record?.therapyStartedAt
      ? "entering"
      : "not_started";

  const agents = useMemo(() => reference?.agents ?? [], [reference]);
  const organisms = useMemo(() => reference?.organisms ?? [], [reference]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
        <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
        <EmptyState
          title="Case not found"
          description={error instanceof Error ? error.message : "This case is no longer available."}
          action={
            <Button asChild variant="outline">
              <Link href="/cases">Back to cases</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const empiric = record.empiric;
  const targeted = record.targeted;
  const selectedRegimen = empiric?.regimens.find((r) => r.id === record.selectedRegimenId);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2" data-testid="button-back-to-cases">
        <Link href="/cases">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Cases
        </Link>
      </Button>

      <header className="mb-5 rounded-xl border border-card-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="text-patient-label">
              {record.patientLabel}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {record.syndromeName} · {record.mrn} · {record.ward}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={record.status} />
              <SeverityBadge severity={record.severity} />
              <Pill className="border-border bg-muted text-muted-foreground">
                {SETTING_LABELS[record.setting]}
              </Pill>
              {targeted && <ActionBadge action={targeted.action} label={targeted.actionLabel} />}
            </div>
          </div>
          <div className="shrink-0 space-y-1.5 text-right">
            {!["completed", "stopped"].includes(record.status) && (
              <ReviewClock hours={record.hoursToReview} className="justify-end" />
            )}
            <p className="text-[11px] text-muted-foreground">
              Started {record.therapyStartedAt ? formatDateTime(record.therapyStartedAt) : "not yet"}
            </p>
            <p className="text-[11px] text-muted-foreground">Day {record.daysOfTherapy} of therapy</p>
            <p className="text-[11px] text-muted-foreground">Under {record.assignedTo}</p>
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="empiric" data-testid="tab-empiric">
            Empiric therapy
          </TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            48 to 72 hour review
            {record.reviewDue && !targeted && (
              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-resistant" aria-label="due" />
            )}
          </TabsTrigger>
          <TabsTrigger value="screening" data-testid="tab-screening">
            Screening
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="empiric" className="space-y-5">
          {!empiric ? (
            <EmptyState title="No recommendation yet" description="This case has not been through the engine." />
          ) : (
            <>
              {empiric.redFlags.length > 0 && (
                <Callout tone="danger" title="Act on these first" icon={<Siren className="h-4 w-4" />}>
                  <ul className="space-y-1">
                    {empiric.redFlags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              <div className="rounded-xl border border-card-border bg-card p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <h2 className="text-xs font-semibold text-foreground">
                    Antibiogram applied: {empiric.region.name}
                  </h2>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{empiric.region.source}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {empiric.requiredCoverage.map((flag) => (
                    <Pill key={flag} className="border-primary/30 bg-primary/10 text-primary">
                      {reference?.coverageFlagLabels[flag] ?? flag} required
                    </Pill>
                  ))}
                  {empiric.consideredCoverage.map((flag) => (
                    <Pill key={flag} className="border-intermediate/30 bg-intermediate-soft text-intermediate">
                      {reference?.coverageFlagLabels[flag] ?? flag} considered
                    </Pill>
                  ))}
                </div>
                {empiric.nonBacterialConsiderations.length > 0 && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Not addressed by any antibacterial regimen
                    </p>
                    <ul className="space-y-1">
                      {empiric.nonBacterialConsiderations.map((entry) => (
                        <li key={entry.organismId} className="text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">{entry.name}</span>{" "}
                          <span className="font-mono">{Math.round(entry.likelihood * 100)}%</span> - {entry.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {empiric.riskFactors.length > 0 && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Risk factors from the screening answers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {empiric.riskFactors.map((risk) => (
                        <Pill key={risk.id} className="border-border bg-muted text-muted-foreground" title={risk.note}>
                          {risk.label}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0 space-y-4">
                  <SectionHeading
                    title="Ranked empiric options"
                    description={`Narrowest regimen that reaches the ${empiric.coverageTarget}% coverage target for this differential wins.`}
                  />

                  {empiric.safeAlternatives.length > 0 && (
                    <Callout
                      tone="danger"
                      title="Nothing below is being recommended"
                      icon={<ShieldAlert className="h-4 w-4" />}
                    >
                      Every regimen the knowledge base holds for this syndrome is contraindicated for
                      this patient. The agents this patient can still receive, lowest collateral first,
                      are{" "}
                      <strong>{empiric.safeAlternatives.map((a) => a.name).join(", ")}</strong>. Use
                      them as a starting point for an allergy discussion, not as a regimen.
                    </Callout>
                  )}
                  {empiric.regimens.map((regimen) => (
                    <RegimenCard
                      key={regimen.id}
                      regimen={regimen}
                      coverageTarget={empiric.coverageTarget}
                      selected={record.selectedRegimenId === regimen.id}
                      onSelect={
                        record.therapyStartedAt && record.selectedRegimenId
                          ? undefined
                          : (regimenId) => startTherapy.mutate(regimenId)
                      }
                      actionLabel={startTherapy.isPending ? "Starting" : "Start this regimen"}
                    />
                  ))}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-xl border border-card-border bg-card p-4">
                    <DifferentialList differential={empiric.differential} />
                  </div>

                  <div className="rounded-xl border border-card-border bg-card p-4">
                    <SectionHeading title="Send before the first dose" />
                    <div className="mt-2">
                      <CheckList items={empiric.workup} testId="list-workup" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-card-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-intermediate" />
                      <h2 className="text-xs font-semibold text-foreground">Source control</h2>
                    </div>
                    <CheckList items={empiric.sourceControl} testId="list-source-control" />
                  </div>

                  <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-primary" />
                      <h2 className="text-xs font-semibold text-foreground">
                        Reassess by {formatDate(empiric.reassessment.dueAt)}
                      </h2>
                    </div>
                    <CheckList items={empiric.reassessment.checklist} testId="list-reassessment" />
                  </div>
                </aside>
              </div>

              <DecisionSupportNotice lines={empiric.disclaimers} />
            </>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="review" className="space-y-5">
          {reviewMode === "not_started" && (
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6" />}
              title="Therapy has not been started yet"
              description="Choose an empiric regimen first. The 48 to 72 hour clock starts from the first dose."
              action={
                <Button variant="outline" onClick={() => setTab("empiric")} data-testid="button-go-empiric">
                  Go to empiric options
                </Button>
              }
            />
          )}

          {reviewMode === "entering" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-4">
                <div className="rounded-xl border border-card-border bg-card p-5">
                  <SectionHeading
                    title="Culture and susceptibility results"
                    description="Enter exactly what the laboratory reported. An agent left unmarked is treated as untested, never as active."
                  />

                  <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Result status</Label>
                      <Select
                        value={workingCultures.status}
                        onValueChange={(value) =>
                          updateCultures((d) => { d.status = value as CultureResult["status"]; })
                        }
                      >
                        <SelectTrigger data-testid="select-culture-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Still pending</SelectItem>
                          <SelectItem value="no_growth">No growth</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="contaminant">Probable contaminant only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(workingCultures.status === "growth" || workingCultures.status === "contaminant") && (
                      <div className="space-y-3">
                        {workingCultures.isolates.map((isolate, index) => (
                          <div key={index} className="rounded-lg border border-border/60 p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Organism</Label>
                                <Select
                                  value={isolate.organismId || "none"}
                                  onValueChange={(value) =>
                                    updateCultures((d) => {
                                      d.isolates[index].organismId = value === "none" ? "" : value;
                                    })
                                  }
                                >
                                  <SelectTrigger data-testid={`select-isolate-organism-${index}`}>
                                    <SelectValue placeholder="Select the organism" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {organisms.map((organism) => (
                                      <SelectItem key={organism.id} value={organism.id}>
                                        {organism.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Specimen</Label>
                                <Input
                                  data-testid={`input-isolate-specimen-${index}`}
                                  placeholder="Blood, urine, bronchoalveolar lavage"
                                  value={isolate.specimen}
                                  onChange={(e) =>
                                    updateCultures((d) => { d.isolates[index].specimen = e.target.value; })
                                  }
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <Label className="mb-1.5 block text-xs font-medium">
                                Reported susceptibilities
                              </Label>
                              <SusceptibilityEntry
                                agents={agents}
                                value={isolate.susceptibilities}
                                onChange={(next) =>
                                  updateCultures((d) => { d.isolates[index].susceptibilities = next; })
                                }
                              />
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <label className="flex cursor-pointer items-center gap-2">
                                <Switch
                                  checked={isolate.probableContaminant === true}
                                  data-testid={`switch-contaminant-${index}`}
                                  onCheckedChange={(checked) =>
                                    updateCultures((d) => { d.isolates[index].probableContaminant = checked; })
                                  }
                                />
                                <span className="text-xs text-foreground">Flagged as a probable contaminant</span>
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove this isolate"
                                data-testid={`button-remove-isolate-${index}`}
                                onClick={() => updateCultures((d) => { d.isolates.splice(index, 1); })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid="button-add-isolate"
                          onClick={() =>
                            updateCultures((d) => {
                              const isolate: CultureIsolate = {
                                organismId: "",
                                specimen: "",
                                collectedOn: new Date().toISOString(),
                                susceptibilities: {},
                              };
                              d.isolates.push(isolate);
                            })
                          }
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add an isolate
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <Label className="text-xs font-medium">Rapid diagnostics</Label>
                      {workingCultures.rapidDiagnostics.map((diagnostic, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            className="flex-1"
                            placeholder="MRSA nares PCR"
                            data-testid={`input-rapid-name-${index}`}
                            value={diagnostic.name}
                            onChange={(e) =>
                              updateCultures((d) => { d.rapidDiagnostics[index].name = e.target.value; })
                            }
                          />
                          <Input
                            className="flex-1"
                            placeholder="Negative"
                            data-testid={`input-rapid-result-${index}`}
                            value={diagnostic.result}
                            onChange={(e) =>
                              updateCultures((d) => { d.rapidDiagnostics[index].result = e.target.value; })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove this result"
                            data-testid={`button-remove-rapid-${index}`}
                            onClick={() => updateCultures((d) => { d.rapidDiagnostics.splice(index, 1); })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="button-add-rapid"
                        onClick={() =>
                          updateCultures((d) => { d.rapidDiagnostics.push({ name: "", result: "" }); })
                        }
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add a rapid diagnostic
                      </Button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        A negative MRSA nares PCR in pneumonia has a high negative predictive value and
                        lets anti-MRSA therapy stop today.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Laboratory notes</Label>
                      <Textarea
                        rows={2}
                        data-testid="input-culture-notes"
                        value={workingCultures.notes}
                        onChange={(e) => updateCultures((d) => { d.notes = e.target.value; })}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-card-border bg-card p-5">
                  <SectionHeading
                    title="Clinical response"
                    description="These answers decide whether therapy can stop, narrow, or move to oral."
                  />
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {(
                      [
                        ["improving", "Clinically improving"],
                        ["afebrile24h", "Afebrile for 24 hours"],
                        ["hemodynamicallyStable", "Haemodynamically stable"],
                        ["tolueratingOral", "Tolerating oral intake"],
                        ["sourceControlDone", "Source control complete"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2"
                      >
                        <span className="text-xs text-foreground">{label}</span>
                        <Switch
                          checked={response[key]}
                          data-testid={`switch-response-${key}`}
                          onCheckedChange={(checked) => setResponse((r) => ({ ...r, [key]: checked }))}
                        />
                      </label>
                    ))}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">White cell trend</Label>
                      <Select
                        value={response.wbcTrend}
                        onValueChange={(value) =>
                          setResponse((r) => ({ ...r, wbcTrend: value as ClinicalResponse["wbcTrend"] }))
                        }
                      >
                        <SelectTrigger data-testid="select-wbc-trend">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="falling">Falling</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="rising">Rising</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label className="text-xs font-medium">Notes</Label>
                    <Textarea
                      rows={2}
                      data-testid="input-response-notes"
                      value={response.notes}
                      onChange={(e) => setResponse((r) => ({ ...r, notes: e.target.value }))}
                    />
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="mt-4 w-full"
                    disabled={submitReview.isPending}
                    data-testid="button-submit-review"
                    onClick={() => submitReview.mutate()}
                  >
                    {submitReview.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Working it out
                      </>
                    ) : (
                      "Generate the stewardship decision"
                    )}
                  </Button>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-card-border bg-card p-4">
                  <SectionHeading title="Current therapy" />
                  {selectedRegimen ? (
                    <ul className="mt-2 space-y-2">
                      {selectedRegimen.agents.map((agent) => (
                        <li key={agent.agentId}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-foreground">{agent.name}</span>
                            <TierBadge tier={agent.tier} restricted={agent.restricted} />
                          </div>
                          <p className="font-mono text-[11px] text-primary">{agent.dose}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">No regimen recorded.</p>
                  )}
                </div>

                {empiric && (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
                    <SectionHeading title="The four questions" />
                    <div className="mt-2">
                      <CheckList items={empiric.reassessment.checklist} testId="list-review-checklist" />
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}

          {reviewMode === "complete" && targeted && (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-4">
                <div className="rounded-xl border border-card-border bg-card p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <ActionBadge action={targeted.action} label={targeted.actionLabel} />
                    <Pill className="border-border bg-muted text-muted-foreground">
                      {targeted.confidence} confidence
                    </Pill>
                  </div>
                  <h2 className="text-base font-semibold leading-snug text-foreground" data-testid="text-targeted-headline">
                    {targeted.headline}
                  </h2>

                  {targeted.rationale.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {targeted.rationale.map((line) => (
                        <li key={line} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {targeted.warnings.map((warning) => (
                    <Callout key={warning} tone="warning" className="mt-3">
                      {warning}
                    </Callout>
                  ))}
                </div>

                {targeted.regimen.length > 0 && (
                  <div className="rounded-xl border border-card-border bg-card p-5">
                    <SectionHeading title="Continue with" />
                    <ul className="mt-3 space-y-2.5">
                      {targeted.regimen.map((agent) => (
                        <li key={agent.agentId} className="rounded-lg border border-border/60 bg-background/60 p-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                            <Pill className="border-border bg-muted text-muted-foreground">{agent.route}</Pill>
                            <TierBadge tier={agent.tier} restricted={agent.restricted} />
                          </div>
                          <p className="mt-1.5 font-mono text-sm font-medium text-primary">{agent.dose}</p>
                          {agent.renalNote && (
                            <p className="mt-1 text-[11px] text-intermediate">{agent.renalNote}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {targeted.discontinue.length > 0 && (
                  <div className="rounded-xl border border-resistant/25 bg-resistant-soft p-5">
                    <SectionHeading title="Stop today" />
                    <ul className="mt-2.5 space-y-2">
                      {targeted.discontinue.map((item) => (
                        <li key={item.agentId} data-testid={`discontinue-${item.agentId}`}>
                          <p className="text-xs font-semibold text-foreground">{item.name}</p>
                          <p className="text-[11px] leading-snug text-muted-foreground">{item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl border border-card-border bg-card p-5">
                  <SectionHeading title="Record the decision" description="Overrides are as useful to the programme as agreements." />
                  <Textarea
                    rows={2}
                    className="mt-3"
                    placeholder="Reason, if this differs from the recommendation"
                    data-testid="input-decision-note"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={recordDecision.isPending}
                      data-testid="button-accept"
                      onClick={() => recordDecision.mutate("accepted")}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={recordDecision.isPending}
                      data-testid="button-modify"
                      onClick={() => recordDecision.mutate("modified")}
                    >
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={recordDecision.isPending}
                      data-testid="button-override"
                      onClick={() => recordDecision.mutate("overridden")}
                    >
                      Override
                    </Button>
                  </div>
                  {record.decision && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Last recorded: {record.decision.outcome} by {record.decision.by} on{" "}
                      {formatDateTime(record.decision.at)}
                      {record.decision.note ? ` - ${record.decision.note}` : ""}
                    </p>
                  )}
                </div>

                <DecisionSupportNotice lines={targeted.disclaimers} />
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-card-border bg-card p-4">
                  <SectionHeading title="Duration" />
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                    {formatDuration(targeted.totalDuration)}
                  </p>
                  {targeted.stopDate && (
                    <p className="mt-0.5 text-xs text-primary">Stop by {formatDate(targeted.stopDate)}</p>
                  )}
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {targeted.totalDuration.note}
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-xl border p-4",
                    targeted.ivToPo.eligible
                      ? "border-action-oral/30 bg-action-oral/[0.07]"
                      : "border-card-border bg-card",
                  )}
                >
                  <SectionHeading title="Intravenous to oral" />
                  {targeted.ivToPo.eligible && targeted.ivToPo.agent ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-foreground">
                        Eligible: {targeted.ivToPo.agent.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-primary">{targeted.ivToPo.agent.dose}</p>
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {targeted.ivToPo.blockers.map((blocker) => (
                        <li key={blocker} className="text-[11px] leading-snug text-muted-foreground">
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-card-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-primary" />
                    <h2 className="text-xs font-semibold text-foreground">Monitor</h2>
                  </div>
                  <CheckList items={targeted.monitoring} testId="list-monitoring" />
                </div>

                {record.cultures && record.cultures.isolates.length > 0 && (
                  <div className="rounded-xl border border-card-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Microscope className="h-3.5 w-3.5 text-primary" />
                      <h2 className="text-xs font-semibold text-foreground">Isolates</h2>
                    </div>
                    <ul className="space-y-3">
                      {record.cultures.isolates.map((isolate, index) => {
                        const organism = organisms.find((o) => o.id === isolate.organismId);
                        return (
                          <li key={index}>
                            <p className="text-xs font-medium text-foreground">
                              {organism?.shortName ?? isolate.organismId}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{isolate.specimen}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {Object.entries(isolate.susceptibilities).map(([agentId, category]) => (
                                <span key={agentId} className="inline-flex items-center gap-1">
                                  <CategoryBadge category={category} />
                                  <span className="text-[10px] text-muted-foreground">
                                    {agents.find((a) => a.id === agentId)?.shortName ?? agentId}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="screening" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-card-border bg-card p-5">
              <SectionHeading title="Presentation" />
              <dl className="mt-3 space-y-2.5">
                <InfoRow label="Onset" value={record.intake.symptoms.onsetDate} />
                <InfoRow label="Time of day" value={record.intake.symptoms.timeOfDay || "Not recorded"} />
                <InfoRow
                  label="Symptoms"
                  value={record.intake.symptoms.symptoms.join(", ") || "Not recorded"}
                />
                <InfoRow
                  label="Exacerbating"
                  value={record.intake.symptoms.exacerbatingFactors || "Not recorded"}
                />
                <InfoRow
                  label="Alleviating"
                  value={record.intake.symptoms.alleviatingFactors || "Not recorded"}
                />
                <InfoRow label="Suspected source" value={record.intake.sourceNotes || "Not recorded"} />
              </dl>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-5">
              <SectionHeading title="Exposure" />
              <dl className="mt-3 space-y-2.5">
                <InfoRow
                  label="Residence"
                  value={`${record.intake.residenceDetail || "Not recorded"} (${empiric?.region.name ?? record.regionId})`}
                />
                <InfoRow
                  label="Travel"
                  value={
                    record.intake.travel.length
                      ? record.intake.travel
                          .map(
                            (trip) =>
                              `${trip.regionId}${trip.becameSickWhileTravelling ? " (unwell while away)" : ""}`,
                          )
                          .join("; ")
                      : "None recorded"
                  }
                />
                <InfoRow
                  label="Sick contacts"
                  value={
                    record.intake.sickContacts.length
                      ? record.intake.sickContacts.map((c) => `${c.who}: ${c.illness}`).join("; ")
                      : "None recorded"
                  }
                />
                <InfoRow
                  label="Home environment"
                  value={[
                    record.intake.homeEnvironment.carpets ? "Carpets" : null,
                    record.intake.homeEnvironment.pets.length
                      ? `Pets: ${record.intake.homeEnvironment.pets.join(", ")}`
                      : null,
                    record.intake.homeEnvironment.waterExposure ? "Water exposure" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nothing recorded"}
                />
              </dl>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-5">
              <SectionHeading title="Background" />
              <dl className="mt-3 space-y-2.5">
                <InfoRow
                  label="Comorbidities"
                  value={record.intake.comorbidities.join(", ") || "None recorded"}
                />
                <InfoRow label="Medications" value={record.intake.medications.join(", ") || "None recorded"} />
                <InfoRow
                  label="Supplements"
                  value={record.intake.supplements.join(", ") || "None recorded"}
                />
                <InfoRow
                  label="Antibiotics in 90 days"
                  value={record.intake.antibioticsLast90Days.join(", ") || "None recorded"}
                />
                <InfoRow
                  label="Allergies"
                  value={
                    record.intake.allergies.length
                      ? record.intake.allergies
                          .map((a) => `${a.agentOrClass} (${a.reaction}, ${a.severity.replace(/_/g, " ")})`)
                          .join("; ")
                      : "None recorded"
                  }
                />
              </dl>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-5">
              <SectionHeading title="Devices and dosing" />
              <dl className="mt-3 space-y-2.5">
                <InfoRow
                  label="Urinary catheter"
                  value={
                    record.intake.foleyCatheter.present
                      ? `Yes, ${record.intake.foleyCatheter.days ?? "unknown"} days`
                      : "No"
                  }
                />
                <InfoRow
                  label="Tracheostomy"
                  value={record.intake.tracheostomy.present ? "Yes" : "No"}
                />
                <InfoRow
                  label="Ventilated"
                  value={
                    record.intake.ventilator.present
                      ? `Yes, ${record.intake.ventilator.days ?? "unknown"} days`
                      : "No"
                  }
                />
                <InfoRow
                  label="Hardware"
                  value={
                    record.intake.hardware.length
                      ? record.intake.hardware
                          .map((h) => `${h.type} at ${h.site}${h.suspectedFocus ? " (suspected focus)" : ""}`)
                          .join("; ")
                      : "None"
                  }
                />
                <InfoRow
                  label="Dosing parameters"
                  value={`${record.intake.clinical.ageYears} y, ${record.intake.clinical.weightKg} kg, creatinine ${record.intake.clinical.serumCreatinine ?? "not given"}`}
                />
              </dl>
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="timeline">
          <div className="rounded-xl border border-card-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-foreground">Audit trail</h2>
            </div>
            <ol className="space-y-3">
              {[...record.timeline]
                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                .map((event, index) => (
                  <li key={`${event.at}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      {index < record.timeline.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-xs font-medium text-foreground">{event.summary}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(event.at)} · {event.actor}
                      </p>
                      {event.detail && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{event.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
