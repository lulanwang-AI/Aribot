import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Callout, Pill, SectionHeading } from "@/components/amr/primitives";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SETTING_LABELS, SEVERITY_LABELS, amrApi } from "@/lib/amr";
import type {
  CareSetting,
  DrugAllergy,
  Intake,
  Severity,
  SickContact,
  TravelEpisode,
} from "@shared/amr/types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react";

/**
 * The fourteen screening questions.
 *
 * They are numbered on screen exactly as the stewardship protocol numbers them,
 * because clinicians learn the protocol by number and a wizard that silently
 * reorders or renames them stops matching what they were taught. Dosing
 * parameters sit alongside them: the engine cannot produce a dose without a
 * weight and a renal function, so asking for them is not optional extra.
 */

const SYMPTOM_OPTIONS = [
  "Fever",
  "Rigors",
  "Cough",
  "Increased sputum",
  "Breathlessness",
  "Pleuritic chest pain",
  "Dysuria",
  "Frequency",
  "Flank pain",
  "Abdominal pain",
  "Diarrhoea",
  "Vomiting",
  "Headache",
  "Neck stiffness",
  "Confusion",
  "Wound discharge",
  "Localised erythema",
  "Joint pain or swelling",
  "Rash",
];

const PET_OPTIONS = ["Dog", "Cat", "Bird", "Reptile", "Rodent", "Livestock"];

const ALLERGY_SEVERITIES: { value: DrugAllergy["severity"]; label: string; hint: string }[] = [
  { value: "intolerance", label: "Intolerance", hint: "Nausea, headache: not immune mediated" },
  { value: "mild_rash", label: "Mild rash", hint: "Delayed maculopapular rash" },
  { value: "urticaria", label: "Urticaria", hint: "Hives, immediate onset" },
  { value: "anaphylaxis", label: "Anaphylaxis", hint: "Airway, circulatory compromise" },
  { value: "sjs_ten", label: "SJS or TEN", hint: "Severe mucocutaneous reaction" },
  { value: "dress", label: "DRESS", hint: "Eosinophilia with systemic symptoms" },
];

const STEPS = [
  { id: "patient", label: "Patient", detail: "Identifiers, setting and dosing parameters" },
  { id: "presentation", label: "Presentation", detail: "Questions 1 and 5, plus severity" },
  { id: "exposure", label: "Exposure", detail: "Questions 2, 3, 4 and 10" },
  { id: "background", label: "Background", detail: "Questions 6, 7 and 8" },
  { id: "devices", label: "Devices", detail: "Questions 11 to 14" },
  { id: "review", label: "Review", detail: "Confirm and generate" },
] as const;

function QuestionLabel({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground">
        Q{number}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  testIdPrefix,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            data-testid={`${testIdPrefix}-${option.value}`}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Comma-separated free text mapped onto a string array field. */
function ListInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <Input
      value={value.join(", ")}
      placeholder={placeholder}
      data-testid={testId}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

export default function IntakePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);

  const { data: reference, isLoading: referenceLoading } = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const [identity, setIdentity] = useState({
    mrn: "",
    patientLabel: "",
    ward: "",
    assignedTo: "",
  });
  const [intake, setIntake] = useState<Intake | null>(null);

  // The server owns the empty intake shape, so the form starts from whatever
  // the current knowledge base version considers a blank assessment.
  const working: Intake | null = intake ?? reference?.emptyIntake ?? null;

  function update(mutator: (draft: Intake) => void) {
    setIntake((current) => {
      const base = current ?? reference?.emptyIntake;
      if (!base) return current;
      const next: Intake = JSON.parse(JSON.stringify(base));
      mutator(next);
      return next;
    });
  }

  /**
   * Live explanation of which antibiogram and which risk factors the current
   * answers resolve to. Showing this while the form is being filled is the
   * point: it makes the travel question visibly change the answer.
   */
  const explainKey = working
    ? JSON.stringify({
        residence: working.residenceRegionId,
        travel: working.travel,
        setting: working.setting,
        comorbidities: working.comorbidities,
        antibiotics: working.antibioticsLast90Days,
        devices: [working.foleyCatheter, working.tracheostomy, working.ventilator],
        hardware: working.hardware,
        clinical: {
          age: working.clinical.ageYears,
          pregnant: working.clinical.pregnant,
          immunosuppressed: working.clinical.immunosuppressed,
          neutropenic: working.clinical.neutropenic,
        },
        home: working.homeEnvironment,
        onset: working.symptoms.onsetDate,
      })
    : "";

  const { data: explanation } = useQuery({
    queryKey: ["amr", "explain", explainKey],
    queryFn: () => amrApi.explain(working as Intake),
    enabled: Boolean(working),
  });

  const createCase = useMutation({
    mutationFn: () =>
      amrApi.createCase({
        mrn: identity.mrn,
        patientLabel: identity.patientLabel,
        ward: identity.ward,
        assignedTo: identity.assignedTo,
        intake: working as Intake,
      }),
    onSuccess: (created) => {
      toast({
        title: "Assessment complete",
        description: "Ranked empiric options are ready for review.",
      });
      setLocation(`/cases/${created.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not generate a recommendation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regionsByArea = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof reference>["regions"]>();
    for (const region of reference?.regions ?? []) {
      const list = grouped.get(region.area) ?? [];
      list.push(region);
      grouped.set(region.area, list);
    }
    return [...grouped.entries()];
  }, [reference]);

  const syndromesByCategory = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof reference>["syndromes"]>();
    for (const syndrome of reference?.syndromes ?? []) {
      const list = grouped.get(syndrome.category) ?? [];
      list.push(syndrome);
      grouped.set(syndrome.category, list);
    }
    return [...grouped.entries()];
  }, [reference]);

  if (referenceLoading || !working || !reference) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canSubmit = Boolean(working.suspectedSyndromeId && working.clinical.weightKg > 0 && working.clinical.ageYears > 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New assessment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fourteen screening questions plus the parameters needed to dose. The answers drive which
          organisms are likely and which regional resistance pattern applies.
        </p>
      </header>

      <ol className="mb-6 flex flex-wrap gap-1" aria-label="Assessment steps">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex-1 min-w-[104px]">
            <button
              type="button"
              onClick={() => setStepIndex(index)}
              data-testid={`step-${entry.id}`}
              aria-current={index === stepIndex ? "step" : undefined}
              className={cn(
                "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                index === stepIndex
                  ? "border-primary/40 bg-primary/10"
                  : index < stepIndex
                    ? "border-susceptible/25 bg-susceptible-soft"
                    : "border-border bg-background hover:border-primary/25",
              )}
            >
              <span className="flex items-center gap-1.5">
                {index < stepIndex ? (
                  <Check className="h-3 w-3 shrink-0 text-susceptible" />
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                )}
                <span
                  className={cn(
                    "truncate text-[11px] font-medium",
                    index === stepIndex ? "text-primary" : "text-foreground",
                  )}
                >
                  {entry.label}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-6 rounded-xl border border-card-border bg-card p-5">
          <SectionHeading title={step.label} description={step.detail} />

          {step.id === "patient" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Medical record number" htmlFor="mrn">
                  <Input
                    id="mrn"
                    data-testid="input-mrn"
                    value={identity.mrn}
                    placeholder="MRN-0000"
                    onChange={(e) => setIdentity((v) => ({ ...v, mrn: e.target.value }))}
                  />
                </Field>
                <Field label="Patient label" hint="Age, sex and location. No name or identifiers." htmlFor="label">
                  <Input
                    id="label"
                    data-testid="input-patient-label"
                    value={identity.patientLabel}
                    placeholder="68 y female, ICU bed 4"
                    onChange={(e) => setIdentity((v) => ({ ...v, patientLabel: e.target.value }))}
                  />
                </Field>
                <Field label="Ward or unit" htmlFor="ward">
                  <Input
                    id="ward"
                    data-testid="input-ward"
                    value={identity.ward}
                    placeholder="ICU"
                    onChange={(e) => setIdentity((v) => ({ ...v, ward: e.target.value }))}
                  />
                </Field>
                <Field label="Responsible clinician" htmlFor="clinician">
                  <Input
                    id="clinician"
                    data-testid="input-assigned-to"
                    value={identity.assignedTo}
                    placeholder="Dr. Chea"
                    onChange={(e) => setIdentity((v) => ({ ...v, assignedTo: e.target.value }))}
                  />
                </Field>
              </div>

              <div>
                <QuestionLabel number={9}>Inpatient or outpatient setting</QuestionLabel>
                <ChipGroup
                  testIdPrefix="setting"
                  options={(Object.keys(SETTING_LABELS) as CareSetting[]).map((value) => ({
                    value,
                    label: SETTING_LABELS[value],
                  }))}
                  selected={[working.setting]}
                  onToggle={(value) => update((d) => { d.setting = value as CareSetting; })}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  The setting shifts the differential: long-term care and ICU flora differ from
                  community flora.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-4">
                <p className="text-xs font-semibold text-foreground">Dosing parameters</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Age (years)" htmlFor="age">
                    <Input
                      id="age"
                      type="number"
                      data-testid="input-age"
                      value={working.clinical.ageYears || ""}
                      onChange={(e) => update((d) => { d.clinical.ageYears = Number(e.target.value) || 0; })}
                    />
                  </Field>
                  <Field label="Sex" htmlFor="sex">
                    <Select
                      value={working.clinical.sex}
                      onValueChange={(value) =>
                        update((d) => { d.clinical.sex = value as Intake["clinical"]["sex"]; })
                      }
                    >
                      <SelectTrigger id="sex" data-testid="select-sex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Weight (kg)" htmlFor="weight">
                    <Input
                      id="weight"
                      type="number"
                      data-testid="input-weight"
                      value={working.clinical.weightKg || ""}
                      onChange={(e) => update((d) => { d.clinical.weightKg = Number(e.target.value) || 0; })}
                    />
                  </Field>
                  <Field label="Height (cm)" hint="Used for adjusted body weight" htmlFor="height">
                    <Input
                      id="height"
                      type="number"
                      data-testid="input-height"
                      value={working.clinical.heightCm ?? ""}
                      onChange={(e) =>
                        update((d) => { d.clinical.heightCm = e.target.value ? Number(e.target.value) : undefined; })
                      }
                    />
                  </Field>
                  <Field label="Creatinine (mg/dL)" htmlFor="creatinine">
                    <Input
                      id="creatinine"
                      type="number"
                      step="0.1"
                      data-testid="input-creatinine"
                      value={working.clinical.serumCreatinine ?? ""}
                      onChange={(e) =>
                        update((d) => {
                          d.clinical.serumCreatinine = e.target.value ? Number(e.target.value) : undefined;
                        })
                      }
                    />
                  </Field>
                  <Field
                    label="Creatinine clearance (mL/min)"
                    hint="Leave blank to calculate from the values above"
                    htmlFor="crcl"
                  >
                    <Input
                      id="crcl"
                      type="number"
                      data-testid="input-crcl"
                      value={working.clinical.creatinineClearance ?? ""}
                      onChange={(e) =>
                        update((d) => {
                          d.clinical.creatinineClearance = e.target.value ? Number(e.target.value) : undefined;
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["onDialysis", "On dialysis"],
                      ["pregnant", "Pregnant"],
                      ["breastfeeding", "Breastfeeding"],
                      ["immunosuppressed", "Immunosuppressed"],
                      ["neutropenic", "Neutropenic"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2"
                    >
                      <span className="text-xs text-foreground">{label}</span>
                      <Switch
                        checked={working.clinical[key]}
                        data-testid={`switch-${key}`}
                        onCheckedChange={(checked) => update((d) => { d.clinical[key] = checked; })}
                      />
                    </label>
                  ))}
                  <Field label="Hepatic impairment" htmlFor="hepatic">
                    <Select
                      value={working.clinical.hepaticImpairment}
                      onValueChange={(value) =>
                        update((d) => {
                          d.clinical.hepaticImpairment = value as Intake["clinical"]["hepaticImpairment"];
                        })
                      }
                    >
                      <SelectTrigger id="hepatic" data-testid="select-hepatic">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step.id === "presentation" && (
            <div className="space-y-6">
              <div>
                <QuestionLabel number={1}>Symptoms</QuestionLabel>
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Onset date" htmlFor="onset">
                      <Input
                        id="onset"
                        type="date"
                        data-testid="input-onset"
                        value={working.symptoms.onsetDate}
                        onChange={(e) => update((d) => { d.symptoms.onsetDate = e.target.value; })}
                      />
                    </Field>
                    <Field label="Time of day" hint="When it started, or when it peaks" htmlFor="timeofday">
                      <Input
                        id="timeofday"
                        data-testid="input-time-of-day"
                        placeholder="Woke with it around 03:00"
                        value={working.symptoms.timeOfDay}
                        onChange={(e) => update((d) => { d.symptoms.timeOfDay = e.target.value; })}
                      />
                    </Field>
                  </div>
                  <Field label="Symptoms present">
                    <ChipGroup
                      testIdPrefix="symptom"
                      options={SYMPTOM_OPTIONS.map((s) => ({ value: s, label: s }))}
                      selected={working.symptoms.symptoms}
                      onToggle={(value) =>
                        update((d) => {
                          d.symptoms.symptoms = d.symptoms.symptoms.includes(value)
                            ? d.symptoms.symptoms.filter((s) => s !== value)
                            : [...d.symptoms.symptoms, value];
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Exacerbating factors" htmlFor="exacerbating">
                      <Input
                        id="exacerbating"
                        data-testid="input-exacerbating"
                        value={working.symptoms.exacerbatingFactors}
                        onChange={(e) => update((d) => { d.symptoms.exacerbatingFactors = e.target.value; })}
                      />
                    </Field>
                    <Field label="Alleviating factors" htmlFor="alleviating">
                      <Input
                        id="alleviating"
                        data-testid="input-alleviating"
                        value={working.symptoms.alleviatingFactors}
                        onChange={(e) => update((d) => { d.symptoms.alleviatingFactors = e.target.value; })}
                      />
                    </Field>
                  </div>
                  <Field label="Other notes" htmlFor="symptom-notes">
                    <Textarea
                      id="symptom-notes"
                      rows={2}
                      data-testid="input-symptom-notes"
                      value={working.symptoms.notes}
                      onChange={(e) => update((d) => { d.symptoms.notes = e.target.value; })}
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={5}>Suspected or known source of infection</QuestionLabel>
                <div className="space-y-3">
                  <Field label="Suspected source" htmlFor="syndrome">
                    <Select
                      value={working.suspectedSyndromeId}
                      onValueChange={(value) => update((d) => { d.suspectedSyndromeId = value; })}
                    >
                      <SelectTrigger id="syndrome" data-testid="select-syndrome">
                        <SelectValue placeholder="Select the suspected source" />
                      </SelectTrigger>
                      <SelectContent>
                        {syndromesByCategory.map(([category, syndromes]) => (
                          <SelectGroup key={category}>
                            <SelectLabel>{category}</SelectLabel>
                            {syndromes.map((syndrome) => (
                              <SelectItem key={syndrome.id} value={syndrome.id}>
                                {syndrome.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {(() => {
                    const chosen = reference.syndromes.find((s) => s.id === working.suspectedSyndromeId);
                    if (!chosen) return null;
                    return (
                      <Callout tone="info" icon={<Stethoscope className="h-4 w-4" />}>
                        <span className="block">{chosen.description}</span>
                        <span className="mt-1 block text-[11px]">Anchored to {chosen.guideline}.</span>
                      </Callout>
                    );
                  })()}

                  <Field
                    label="Organism already identified"
                    hint="Only when a culture or rapid test has already named it. This collapses the differential onto that organism."
                    htmlFor="known-organism"
                  >
                    <Select
                      value={working.knownOrganismId ?? "none"}
                      onValueChange={(value) =>
                        update((d) => { d.knownOrganismId = value === "none" ? undefined : value; })
                      }
                    >
                      <SelectTrigger id="known-organism" data-testid="select-known-organism">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not yet identified</SelectItem>
                        {reference.organisms.map((organism) => (
                          <SelectItem key={organism.id} value={organism.id}>
                            {organism.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Source notes" htmlFor="source-notes">
                    <Textarea
                      id="source-notes"
                      rows={2}
                      data-testid="input-source-notes"
                      placeholder="Imaging findings, examination findings, what has been sampled"
                      value={working.sourceNotes}
                      onChange={(e) => update((d) => { d.sourceNotes = e.target.value; })}
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Severity and observations</h3>
                <ChipGroup
                  testIdPrefix="severity"
                  options={(Object.keys(SEVERITY_LABELS) as Severity[]).map((value) => ({
                    value,
                    label: SEVERITY_LABELS[value],
                  }))}
                  selected={[working.clinical.severity]}
                  onToggle={(value) => update((d) => { d.clinical.severity = value as Severity; })}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Severity sets the coverage target: 85 percent for mild, 90 for moderate, 95 for
                  severe and septic shock.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      ["temperatureC", "Temperature (C)", "0.1"],
                      ["heartRate", "Heart rate", "1"],
                      ["systolicBp", "Systolic BP", "1"],
                      ["respiratoryRate", "Respiratory rate", "1"],
                      ["wbc", "White cells (x10^9/L)", "0.1"],
                      ["lactate", "Lactate (mmol/L)", "0.1"],
                    ] as const
                  ).map(([key, label, stepValue]) => (
                    <Field key={key} label={label} htmlFor={key}>
                      <Input
                        id={key}
                        type="number"
                        step={stepValue}
                        data-testid={`input-${key}`}
                        value={working.clinical[key] ?? ""}
                        onChange={(e) =>
                          update((d) => {
                            d.clinical[key] = e.target.value ? Number(e.target.value) : undefined;
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step.id === "exposure" && (
            <div className="space-y-6">
              <div>
                <QuestionLabel number={2}>Where does the patient live</QuestionLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Region" htmlFor="region">
                    <Select
                      value={working.residenceRegionId}
                      onValueChange={(value) => update((d) => { d.residenceRegionId = value; })}
                    >
                      <SelectTrigger id="region" data-testid="select-region">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regionsByArea.map(([area, regions]) => (
                          <SelectGroup key={area}>
                            <SelectLabel>{area}</SelectLabel>
                            {regions.map((region) => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="City or facility" htmlFor="residence-detail">
                    <Input
                      id="residence-detail"
                      data-testid="input-residence-detail"
                      value={working.residenceDetail}
                      onChange={(e) => update((d) => { d.residenceDetail = e.target.value; })}
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={3}>Travel before becoming unwell</QuestionLabel>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  A patient who fell ill while travelling carries the flora of where they were, not
                  where they live. Recording it switches the antibiogram the engine applies.
                </p>
                <div className="space-y-3">
                  {working.travel.map((trip, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Region visited">
                          <Select
                            value={trip.regionId || "none"}
                            onValueChange={(value) =>
                              update((d) => { d.travel[index].regionId = value === "none" ? "" : value; })
                            }
                          >
                            <SelectTrigger data-testid={`select-travel-region-${index}`}>
                              <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regionsByArea.map(([area, regions]) => (
                                <SelectGroup key={area}>
                                  <SelectLabel>{area}</SelectLabel>
                                  {regions.map((region) => (
                                    <SelectItem key={region.id} value={region.id}>
                                      {region.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Departed">
                            <Input
                              type="date"
                              data-testid={`input-travel-departed-${index}`}
                              value={trip.departed.slice(0, 10)}
                              onChange={(e) => update((d) => { d.travel[index].departed = e.target.value; })}
                            />
                          </Field>
                          <Field label="Returned">
                            <Input
                              type="date"
                              data-testid={`input-travel-returned-${index}`}
                              value={trip.returned.slice(0, 10)}
                              onChange={(e) => update((d) => { d.travel[index].returned = e.target.value; })}
                            />
                          </Field>
                        </div>
                      </div>
                      <label className="mt-3 flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={trip.becameSickWhileTravelling}
                          data-testid={`checkbox-sick-travelling-${index}`}
                          onCheckedChange={(checked) =>
                            update((d) => { d.travel[index].becameSickWhileTravelling = checked === true; })
                          }
                        />
                        <span className="text-xs text-foreground">Became unwell while travelling</span>
                      </label>
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <Field label="Exposures">
                            <Input
                              data-testid={`input-travel-exposures-${index}`}
                              placeholder="Hospital contact, food and water, animal contact"
                              value={trip.exposures}
                              onChange={(e) => update((d) => { d.travel[index].exposures = e.target.value; })}
                            />
                          </Field>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove this trip"
                          data-testid={`button-remove-travel-${index}`}
                          onClick={() => update((d) => { d.travel.splice(index, 1); })}
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
                    data-testid="button-add-travel"
                    onClick={() =>
                      update((d) => {
                        const trip: TravelEpisode = {
                          regionId: "",
                          departed: "",
                          returned: "",
                          becameSickWhileTravelling: false,
                          exposures: "",
                        };
                        d.travel.push(trip);
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add a trip
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={4}>Sick contacts</QuestionLabel>
                <div className="space-y-3">
                  {working.sickContacts.map((contact, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Who">
                          <Input
                            data-testid={`input-contact-who-${index}`}
                            placeholder="Household member"
                            value={contact.who}
                            onChange={(e) => update((d) => { d.sickContacts[index].who = e.target.value; })}
                          />
                        </Field>
                        <Field label="Where">
                          <Input
                            data-testid={`input-contact-where-${index}`}
                            placeholder="Home, workplace, ward"
                            value={contact.where}
                            onChange={(e) => update((d) => { d.sickContacts[index].where = e.target.value; })}
                          />
                        </Field>
                        <Field label="Illness">
                          <Input
                            data-testid={`input-contact-illness-${index}`}
                            value={contact.illness}
                            onChange={(e) => update((d) => { d.sickContacts[index].illness = e.target.value; })}
                          />
                        </Field>
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <Field
                            label="Confirmed organism in that contact"
                            hint="A confirmed organism in a close contact is weighted directly into the differential."
                          >
                            <Select
                              value={contact.confirmedOrganism ?? "none"}
                              onValueChange={(value) =>
                                update((d) => {
                                  d.sickContacts[index].confirmedOrganism = value === "none" ? undefined : value;
                                })
                              }
                            >
                              <SelectTrigger data-testid={`select-contact-organism-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not confirmed</SelectItem>
                                {reference.organisms.map((organism) => (
                                  <SelectItem key={organism.id} value={organism.id}>
                                    {organism.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove this contact"
                          data-testid={`button-remove-contact-${index}`}
                          onClick={() => update((d) => { d.sickContacts.splice(index, 1); })}
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
                    data-testid="button-add-contact"
                    onClick={() =>
                      update((d) => {
                        const contact: SickContact = { who: "", where: "", illness: "" };
                        d.sickContacts.push(contact);
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add a sick contact
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={10}>Home living conditions</QuestionLabel>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <span className="text-xs text-foreground">Carpets or rugs throughout</span>
                      <Switch
                        checked={working.homeEnvironment.carpets}
                        data-testid="switch-carpets"
                        onCheckedChange={(checked) => update((d) => { d.homeEnvironment.carpets = checked; })}
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <span className="text-xs text-foreground">Fresh water, hot tub or soil exposure</span>
                      <Switch
                        checked={working.homeEnvironment.waterExposure}
                        data-testid="switch-water-exposure"
                        onCheckedChange={(checked) => update((d) => { d.homeEnvironment.waterExposure = checked; })}
                      />
                    </label>
                  </div>
                  <Field label="Pets in the household">
                    <ChipGroup
                      testIdPrefix="pet"
                      options={PET_OPTIONS.map((p) => ({ value: p, label: p }))}
                      selected={working.homeEnvironment.pets}
                      onToggle={(value) =>
                        update((d) => {
                          d.homeEnvironment.pets = d.homeEnvironment.pets.includes(value)
                            ? d.homeEnvironment.pets.filter((p) => p !== value)
                            : [...d.homeEnvironment.pets, value];
                        })
                      }
                    />
                  </Field>
                  <Field label="Other environmental notes" htmlFor="home-notes">
                    <Input
                      id="home-notes"
                      data-testid="input-home-notes"
                      value={working.homeEnvironment.notes}
                      onChange={(e) => update((d) => { d.homeEnvironment.notes = e.target.value; })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step.id === "background" && (
            <div className="space-y-6">
              <div>
                <QuestionLabel number={6}>Comorbidities</QuestionLabel>
                <ChipGroup
                  testIdPrefix="comorbidity"
                  options={reference.comorbidities.map((c) => ({ value: c.value, label: c.label }))}
                  selected={working.comorbidities}
                  onToggle={(value) =>
                    update((d) => {
                      d.comorbidities = d.comorbidities.includes(value)
                        ? d.comorbidities.filter((c) => c !== value)
                        : [...d.comorbidities, value];
                    })
                  }
                />
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={7}>Medications, vitamins and supplements</QuestionLabel>
                <div className="space-y-3">
                  <Field label="Current medications" hint="Comma separated">
                    <ListInput
                      testId="input-medications"
                      value={working.medications}
                      placeholder="metformin, apixaban, pantoprazole"
                      onChange={(next) => update((d) => { d.medications = next; })}
                    />
                  </Field>
                  <Field label="Vitamins and supplements" hint="Comma separated">
                    <ListInput
                      testId="input-supplements"
                      value={working.supplements}
                      placeholder="vitamin D, iron"
                      onChange={(next) => update((d) => { d.supplements = next; })}
                    />
                  </Field>
                  <Field
                    label="Antibiotics in the last 90 days"
                    hint="The strongest single predictor of a resistant organism on the next culture."
                  >
                    <ListInput
                      testId="input-recent-antibiotics"
                      value={working.antibioticsLast90Days}
                      placeholder="ciprofloxacin, ceftriaxone"
                      onChange={(next) => update((d) => { d.antibioticsLast90Days = next; })}
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={8}>Allergies</QuestionLabel>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  Record the reaction, not just the label. A childhood rash and an anaphylaxis are
                  different decisions, and an unexamined penicillin label pushes patients onto worse
                  agents. An allergic reaction to a medication can also be mistaken for infection.
                </p>
                <div className="space-y-3">
                  {working.allergies.map((allergy, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Agent or class">
                          <Input
                            data-testid={`input-allergy-agent-${index}`}
                            placeholder="penicillin"
                            value={allergy.agentOrClass}
                            onChange={(e) => update((d) => { d.allergies[index].agentOrClass = e.target.value; })}
                          />
                        </Field>
                        <Field label="Reaction">
                          <Input
                            data-testid={`input-allergy-reaction-${index}`}
                            placeholder="urticarial rash at age 20"
                            value={allergy.reaction}
                            onChange={(e) => update((d) => { d.allergies[index].reaction = e.target.value; })}
                          />
                        </Field>
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <Field label="Severity">
                            <Select
                              value={allergy.severity}
                              onValueChange={(value) =>
                                update((d) => {
                                  d.allergies[index].severity = value as DrugAllergy["severity"];
                                })
                              }
                            >
                              <SelectTrigger data-testid={`select-allergy-severity-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALLERGY_SEVERITIES.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label} - {option.hint}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove this allergy"
                          data-testid={`button-remove-allergy-${index}`}
                          onClick={() => update((d) => { d.allergies.splice(index, 1); })}
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
                    data-testid="button-add-allergy"
                    onClick={() =>
                      update((d) => {
                        const allergy: DrugAllergy = {
                          agentOrClass: "",
                          reaction: "",
                          severity: "mild_rash",
                        };
                        d.allergies.push(allergy);
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add an allergy
                  </Button>

                  <Field label="Food and environmental allergies" hint="Comma separated">
                    <ListInput
                      testId="input-environmental-allergies"
                      value={working.environmentalAllergies}
                      placeholder="dust mite, shellfish"
                      onChange={(next) => update((d) => { d.environmentalAllergies = next; })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step.id === "devices" && (
            <div className="space-y-6">
              {(
                [
                  [11, "Urinary catheter", "foleyCatheter", "Catheter biofilm selects for Pseudomonas, Proteus and enterococci. Removal matters more than the antibiotic choice."],
                  [12, "Tracheostomy", "tracheostomy", "Tracheal colonisation with gram negatives is near universal. Colonisation is not infection."],
                  [13, "Intubation or ventilator", "ventilator", "Risk of Pseudomonas and Acinetobacter rises sharply after five ventilator days."],
                ] as const
              ).map(([number, label, key, note]) => (
                <div key={key} className={number === 11 ? "" : "border-t border-border/60 pt-5"}>
                  <QuestionLabel number={number}>{label}</QuestionLabel>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <span className="text-xs text-foreground">Present</span>
                      <Switch
                        checked={working[key].present}
                        data-testid={`switch-${key}`}
                        onCheckedChange={(checked) => update((d) => { d[key].present = checked; })}
                      />
                    </label>
                    {working[key].present && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Days in situ">
                          <Input
                            type="number"
                            data-testid={`input-${key}-days`}
                            value={working[key].days ?? ""}
                            onChange={(e) =>
                              update((d) => { d[key].days = e.target.value ? Number(e.target.value) : undefined; })
                            }
                          />
                        </Field>
                        <Field label="Note">
                          <Input
                            data-testid={`input-${key}-note`}
                            value={working[key].note ?? ""}
                            onChange={(e) => update((d) => { d[key].note = e.target.value; })}
                          />
                        </Field>
                      </div>
                    )}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{note}</p>
                  </div>
                </div>
              ))}

              <div className="border-t border-border/60 pt-5">
                <QuestionLabel number={14}>Implanted hardware</QuestionLabel>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  Spinal instrumentation, hernia mesh, prosthetic joints, fixation plates. Biofilm on
                  hardware makes cure without device removal or a rifampin-based combination unlikely.
                </p>
                <div className="space-y-3">
                  {working.hardware.map((item, index) => (
                    <div key={index} className="rounded-lg border border-border/60 p-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Type">
                          <Input
                            data-testid={`input-hardware-type-${index}`}
                            placeholder="Polypropylene hernia mesh"
                            value={item.type}
                            onChange={(e) => update((d) => { d.hardware[index].type = e.target.value; })}
                          />
                        </Field>
                        <Field label="Site">
                          <Input
                            data-testid={`input-hardware-site-${index}`}
                            placeholder="Anterior abdominal wall"
                            value={item.site}
                            onChange={(e) => update((d) => { d.hardware[index].site = e.target.value; })}
                          />
                        </Field>
                        <Field label="Implanted on">
                          <Input
                            type="date"
                            data-testid={`input-hardware-date-${index}`}
                            value={item.implantedOn.slice(0, 10)}
                            onChange={(e) => update((d) => { d.hardware[index].implantedOn = e.target.value; })}
                          />
                        </Field>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={item.suspectedFocus}
                            data-testid={`checkbox-hardware-focus-${index}`}
                            onCheckedChange={(checked) =>
                              update((d) => { d.hardware[index].suspectedFocus = checked === true; })
                            }
                          />
                          <span className="text-xs text-foreground">This is the suspected focus</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove this hardware entry"
                          data-testid={`button-remove-hardware-${index}`}
                          onClick={() => update((d) => { d.hardware.splice(index, 1); })}
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
                    data-testid="button-add-hardware"
                    onClick={() =>
                      update((d) => {
                        d.hardware.push({ type: "", site: "", implantedOn: "", suspectedFocus: false });
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add hardware
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step.id === "review" && (
            <div className="space-y-4">
              {!canSubmit && (
                <Callout tone="warning" title="Missing information">
                  A suspected source, an age and a weight are all required before the engine can
                  produce a dose. Go back and complete them.
                </Callout>
              )}

              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Patient", identity.patientLabel || "Unlabelled"],
                  ["Record number", identity.mrn || "Unassigned"],
                  ["Ward", identity.ward || "Unassigned"],
                  ["Setting", SETTING_LABELS[working.setting]],
                  [
                    "Suspected source",
                    reference.syndromes.find((s) => s.id === working.suspectedSyndromeId)?.name ?? "Not set",
                  ],
                  ["Severity", SEVERITY_LABELS[working.clinical.severity]],
                  [
                    "Age and weight",
                    `${working.clinical.ageYears || "?"} years, ${working.clinical.weightKg || "?"} kg`,
                  ],
                  ["Allergies recorded", working.allergies.length ? String(working.allergies.length) : "None"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/60 bg-background/60 p-3">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-xs font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={!canSubmit || createCase.isPending}
                data-testid="button-generate"
                onClick={() => createCase.mutate()}
              >
                {createCase.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    Generate empiric recommendation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepIndex === 0}
              data-testid="button-back"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <Button
              type="button"
              variant={isLastStep ? "ghost" : "default"}
              size="sm"
              disabled={isLastStep}
              data-testid="button-next"
              onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              Next
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-xs font-semibold text-foreground">Antibiogram applied</h2>
            </div>
            {explanation ? (
              <>
                <p className="text-xs font-medium text-primary">
                  {reference.regions.find((r) => r.id === explanation.region.regionId)?.name ??
                    explanation.region.regionId}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {explanation.region.reason}
                </p>
              </>
            ) : (
              <div className="h-12 animate-pulse rounded bg-muted" />
            )}
          </div>

          <div className="rounded-xl border border-card-border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-intermediate" />
              <h2 className="text-xs font-semibold text-foreground">Risk factors firing</h2>
            </div>
            {explanation?.riskFactors.length ? (
              <ul className="space-y-1.5">
                {explanation.riskFactors.map((risk) => (
                  <li key={risk.id} data-testid={`risk-${risk.id}`}>
                    <Pill className="border-intermediate/30 bg-intermediate-soft text-intermediate">
                      {risk.label}
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                None yet. Answers about devices, recent antibiotics, travel and comorbidities appear
                here as they change the differential.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
