import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePatientStore } from "@/store/patientStore";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, User, Stethoscope, Activity, Pill, FileText, Sparkles, ArrowRight, Loader2, CheckCircle2, Download } from "lucide-react";

const preChartSchema = z.object({
  name: z.string().min(1, "Patient name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  mrn: z.string().optional(),
  sex: z.string().min(1, "Biological sex is required"),
  preferredLanguage: z.string().default("English"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  visitType: z.string().min(1, "Visit type is required"),
  specialty: z.string().min(1, "Specialty is required"),
  bp: z.string().optional(),
  hr: z.string().optional(),
  temp: z.string().optional(),
  o2sat: z.string().optional(),
  rr: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  painScore: z.number().min(0).max(10).default(0),
  lmp: z.string().optional(),
  smokingStatus: z.string().optional(),
  alcoholUse: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  pmh: z.string().optional(),
  psh: z.string().optional(),
  familyHistory: z.string().optional(),
  recentResults: z.string().optional(),
});

type PreChartForm = z.infer<typeof preChartSchema>;

function calculateBMI(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (!w || !h || h === 0) return "";
  const bmi = (w / ((h * 0.0254) ** 2)).toFixed(1);
  return bmi;
}

export default function PreCharting() {
  const [, setLocation] = useLocation();
  const store = usePatientStore();
  const { toast } = useToast();
  const [generatingPrimer, setGeneratingPrimer] = useState(false);
  const [primer, setPrimer] = useState(store.encounterPrimer || "");

  const form = useForm<PreChartForm>({
    resolver: zodResolver(preChartSchema),
    defaultValues: {
      name: store.name || "",
      dob: store.dob || "",
      mrn: store.mrn || "",
      sex: store.sex || "",
      preferredLanguage: store.preferredLanguage || "English",
      chiefComplaint: store.chiefComplaint || "",
      visitType: store.visitType || "",
      specialty: store.specialty || "Primary Care",
      bp: store.vitals?.bp || "",
      hr: store.vitals?.hr || "",
      temp: store.vitals?.temp || "",
      o2sat: store.vitals?.o2sat || "",
      rr: store.vitals?.rr || "",
      weight: store.vitals?.weight || "",
      height: store.vitals?.height || "",
      painScore: store.painScore || 0,
      lmp: store.lmp || "",
      smokingStatus: store.smokingStatus || "",
      alcoholUse: store.alcoholUse || "",
      medications: store.medications || "",
      allergies: store.allergies || "",
      pmh: store.pmh || "",
      psh: store.psh || "",
      familyHistory: store.familyHistory || "",
      recentResults: store.recentResults || "",
    },
  });

  const weight = form.watch("weight") || "";
  const height = form.watch("height") || "";
  const bmi = calculateBMI(weight, height);

  function saveToStore(data: PreChartForm) {
    store.setPatient({
      name: data.name,
      dob: data.dob,
      mrn: data.mrn || "",
      sex: data.sex,
      preferredLanguage: data.preferredLanguage,
      chiefComplaint: data.chiefComplaint,
      visitType: data.visitType,
      specialty: data.specialty,
      vitals: {
        bp: data.bp || "",
        hr: data.hr || "",
        temp: data.temp || "",
        o2sat: data.o2sat || "",
        rr: data.rr || "",
        weight: data.weight || "",
        height: data.height || "",
        bmi,
      },
      painScore: data.painScore,
      lmp: data.lmp || "",
      smokingStatus: data.smokingStatus || "",
      alcoholUse: data.alcoholUse || "",
      medications: data.medications || "",
      allergies: data.allergies || "",
      pmh: data.pmh || "",
      psh: data.psh || "",
      familyHistory: data.familyHistory || "",
      recentResults: data.recentResults || "",
      encounterPrimer: primer,
      preChartComplete: true,
    });
  }

  async function importFromEHR() {
    const sampleData = {
      name: "Margaret Thompson",
      dob: "1962-08-14",
      mrn: "MRN-2026-4491",
      sex: "Female",
      preferredLanguage: "English",
      chiefComplaint: "Persistent chest tightness and shortness of breath on exertion for the past 3 weeks, worsening with physical activity. Occasional palpitations at rest.",
      visitType: "Follow-up",
      specialty: "Cardiology",
      bp: "148/92",
      hr: "88",
      temp: "98.4",
      o2sat: "96",
      rr: "18",
      weight: "172",
      height: "64",
      painScore: 3,
      lmp: "",
      smokingStatus: "Former",
      alcoholUse: "Social / occasional",
      medications: "Lisinopril 20mg daily\nMetoprolol succinate 50mg daily\nAtorvastatin 40mg daily\nAspirin 81mg daily\nMetformin 1000mg twice daily",
      allergies: "Sulfa drugs — rash and hives\nIodinated contrast — anaphylactoid reaction (premedicate with steroids)",
      pmh: "Hypertension (diagnosed 2014)\nType 2 Diabetes Mellitus (diagnosed 2018, A1c 7.2% last check)\nHyperlipidemia\nOsteoarthritis — bilateral knees\nMild mitral regurgitation on prior echo (2024)",
      psh: "Cholecystectomy (2019)\nRight knee arthroscopy (2021)",
      familyHistory: "Father — MI at age 58, deceased at 72 from CHF\nMother — Type 2 DM, HTN, alive at 84\nSister — breast cancer at 52, in remission",
      recentResults: "ECG (3 weeks ago): Normal sinus rhythm, LVH by voltage criteria\nEcho (6 months ago): EF 55%, mild MR, mild LVH, grade I diastolic dysfunction\nLabs (2 weeks ago): BMP normal, Cr 0.9, BNP 180 pg/mL (mildly elevated), A1c 7.2%, LDL 98\nStress test ordered — pending",
    };

    form.reset(sampleData);
    toast({ title: "EHR data imported", description: "Sample patient data loaded from EHR system" });

    setGeneratingPrimer(true);
    try {
      const bmiVal = sampleData.weight && sampleData.height
        ? ((Number(sampleData.weight) / (Number(sampleData.height) * Number(sampleData.height))) * 703).toFixed(1)
        : undefined;
      const res = await fetch("/api/prechart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sampleData, bmi: bmiVal }),
      });
      const json = await res.json();
      setPrimer(json.primer);
      store.setPatient({ encounterPrimer: json.primer });
      toast({ title: "Encounter primer generated" });
    } catch {
      toast({ title: "Failed to generate primer", variant: "destructive" });
    } finally {
      setGeneratingPrimer(false);
    }
  }

  async function generatePrimer() {
    const data = form.getValues();
    const errors = await form.trigger();
    if (!errors) return;
    setGeneratingPrimer(true);
    try {
      const res = await fetch("/api/prechart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, bmi }),
      });
      const json = await res.json();
      setPrimer(json.primer);
      store.setPatient({ encounterPrimer: json.primer });
      toast({ title: "Encounter primer generated" });
    } catch {
      toast({ title: "Failed to generate primer", variant: "destructive" });
    } finally {
      setGeneratingPrimer(false);
    }
  }

  function onSubmit(data: PreChartForm) {
    saveToStore(data);
    toast({ title: "Pre-charting saved" });
    setLocation("/clinical-chat");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-prechart-title">
            <ClipboardList className="h-6 w-6 text-primary" />
            Pre-Charting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Structured patient intake before encounter</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={importFromEHR}
            className="gap-2"
            data-testid="button-import-ehr"
          >
            <Download className="h-4 w-4" />
            Import from EHR
          </Button>
          {store.preChartComplete && (
            <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
        </div>
      </div>

      {(primer || generatingPrimer) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Encounter Primer
              {generatingPrimer && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatingPrimer && !primer ? (
              <p className="text-sm text-muted-foreground animate-pulse" data-testid="text-primer-loading">Generating encounter primer from imported data...</p>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-line" data-testid="text-encounter-primer">{primer}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Patient Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="Jane Doe" {...field} data-testid="input-patient-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-dob" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mrn" render={({ field }) => (
                <FormItem>
                  <FormLabel>MRN</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} data-testid="input-mrn" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Biological Sex *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-sex"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferredLanguage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["English", "Spanish", "Mandarin", "Cantonese", "Vietnamese", "Korean", "Tagalog", "Arabic", "French", "Portuguese", "Russian", "Hindi", "Other"].map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" /> Visit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint *</FormLabel>
                  <FormControl><Textarea placeholder="Patient's primary reason for visit" {...field} data-testid="input-chief-complaint" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="visitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-visit-type"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["New Patient", "Follow-up", "Urgent", "Telehealth"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="specialty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-specialty"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["Primary Care", "Cardiology", "Orthopedics", "Neurology", "Psychiatry", "Pediatrics", "OB-GYN", "Oncology", "Pulmonology", "Endocrinology", "Gastroenterology", "Nephrology", "Other"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "bp" as const, label: "BP (mmHg)", placeholder: "120/80" },
                  { name: "hr" as const, label: "HR (bpm)", placeholder: "72" },
                  { name: "temp" as const, label: "Temp (°F)", placeholder: "98.6" },
                  { name: "o2sat" as const, label: "O₂ Sat (%)", placeholder: "98" },
                  { name: "rr" as const, label: "RR (breaths/min)", placeholder: "16" },
                  { name: "weight" as const, label: "Weight (lbs)", placeholder: "150" },
                  { name: "height" as const, label: "Height (in)", placeholder: "67" },
                ].map(v => (
                  <FormField key={v.name} control={form.control} name={v.name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{v.label}</FormLabel>
                      <FormControl><Input placeholder={v.placeholder} {...field} data-testid={`input-${v.name}`} /></FormControl>
                    </FormItem>
                  )} />
                ))}
                <div>
                  <p className="text-xs font-medium mb-1.5">BMI</p>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm" data-testid="text-bmi">
                    {bmi || "—"}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <FormField control={form.control} name="painScore" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Pain Score: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={0} max={10} step={1}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        data-testid="slider-pain"
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <FormField control={form.control} name="lmp" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Last Menstrual Period</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-lmp" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="smokingStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tobacco Use</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-smoking"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["Never", "Former", "Current — light", "Current — moderate", "Current — heavy"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="alcoholUse" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Alcohol Use</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-alcohol"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["None", "Social / occasional", "Moderate", "Heavy", "In recovery"].map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" /> History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="medications" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Medications</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="One medication per line" {...field} data-testid="input-medications" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="allergies" render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies &amp; Reactions</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="e.g., Penicillin — rash, Sulfa — anaphylaxis" {...field} data-testid="input-allergies" /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="pmh" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Medical History</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Active and resolved conditions" {...field} data-testid="input-pmh" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="psh" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Past Surgical History</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Prior surgeries and dates" {...field} data-testid="input-psh" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="familyHistory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Family History</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Relevant family medical history" {...field} data-testid="input-family-hx" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="recentResults" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recent Labs / Imaging</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Paste summary of recent results" {...field} data-testid="input-recent-results" /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Encounter Primer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={generatePrimer} disabled={generatingPrimer} className="gap-2" data-testid="button-generate-primer">
                {generatingPrimer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generatingPrimer ? "Generating..." : primer ? "Regenerate Encounter Primer" : "Generate Encounter Primer"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button type="submit" className="gap-2" data-testid="button-save-continue">
              Save &amp; Continue to AI Consult
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
