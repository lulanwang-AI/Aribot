import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePatientStore, type UploadedDocument } from "@/store/patientStore";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, User, Stethoscope, Activity, Pill, Sparkles, ArrowRight,
  Loader2, CheckCircle2, Download, Upload, FileText, Image, X, Search,
  Eye, File, Trash2
} from "lucide-react";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PreCharting() {
  const [, setLocation] = useLocation();
  const store = usePatientStore();
  const { toast } = useToast();
  const [generatingPrimer, setGeneratingPrimer] = useState(false);
  const [primer, setPrimer] = useState(store.encounterPrimer || "");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingDoc, setViewingDoc] = useState<UploadedDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      name: "John Doe",
      dob: "1962-08-14",
      mrn: "MRN-2026-4491",
      sex: "Male",
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
    toast({ title: "EHR data imported" });

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
    } catch {
      toast({ title: "Failed to generate primer", variant: "destructive" });
    } finally {
      setGeneratingPrimer(false);
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload-document", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          toast({ title: `Upload failed: ${err.error}`, variant: "destructive" });
          continue;
        }

        const doc = await res.json() as UploadedDocument;
        store.addDocument(doc);
        toast({ title: `Uploaded: ${doc.name}` });

        if (doc.type !== "image") {
          setParsing(true);
          try {
            const parseRes = await fetch("/api/parse-document", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: doc.content, documentName: doc.name }),
            });
            const parsed = await parseRes.json();

            if (parsed.fields && Object.keys(parsed.fields).length > 0) {
              const f = parsed.fields;
              const currentValues = form.getValues();
              if (f.name && !currentValues.name) form.setValue("name", f.name);
              if (f.dob && !currentValues.dob) form.setValue("dob", f.dob);
              if (f.mrn && !currentValues.mrn) form.setValue("mrn", f.mrn);
              if (f.sex && !currentValues.sex) form.setValue("sex", f.sex);
              if (f.chiefComplaint && !currentValues.chiefComplaint) form.setValue("chiefComplaint", f.chiefComplaint);
              if (f.medications) {
                const existing = currentValues.medications || "";
                form.setValue("medications", existing ? existing + "\n" + f.medications : f.medications);
              }
              if (f.allergies) {
                const existing = currentValues.allergies || "";
                form.setValue("allergies", existing ? existing + "\n" + f.allergies : f.allergies);
              }
              if (f.pmh) {
                const existing = currentValues.pmh || "";
                form.setValue("pmh", existing ? existing + "\n" + f.pmh : f.pmh);
              }
              if (f.psh) {
                const existing = currentValues.psh || "";
                form.setValue("psh", existing ? existing + "\n" + f.psh : f.psh);
              }
              if (f.familyHistory) {
                const existing = currentValues.familyHistory || "";
                form.setValue("familyHistory", existing ? existing + "\n" + f.familyHistory : f.familyHistory);
              }
              if (f.recentResults) {
                const existing = currentValues.recentResults || "";
                form.setValue("recentResults", existing ? existing + "\n" + f.recentResults : f.recentResults);
              }
              if (f.bp && !currentValues.bp) form.setValue("bp", f.bp);
              if (f.hr && !currentValues.hr) form.setValue("hr", f.hr);
              if (f.temp && !currentValues.temp) form.setValue("temp", f.temp);
              if (f.o2sat && !currentValues.o2sat) form.setValue("o2sat", f.o2sat);
              if (f.rr && !currentValues.rr) form.setValue("rr", f.rr);
              if (f.weight && !currentValues.weight) form.setValue("weight", f.weight);
              if (f.height && !currentValues.height) form.setValue("height", f.height);

              toast({ title: "Document parsed", description: "Patient data extracted and populated into the form." });
            }
          } catch {
            toast({ title: "Could not auto-parse document" });
          } finally {
            setParsing(false);
          }
        }
      } catch {
        toast({ title: "Upload failed", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const filteredDocs = store.uploadedDocuments.filter(doc =>
    !searchQuery || doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.type !== "image" && doc.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const searchResults = searchQuery
    ? store.uploadedDocuments.flatMap(doc => {
        if (doc.type === "image") return [];
        const lines = doc.content.split("\n");
        const matches: { doc: UploadedDocument; line: string; lineNum: number }[] = [];
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
            matches.push({ doc, line: line.trim(), lineNum: idx + 1 });
          }
        });
        return matches;
      }).slice(0, 20)
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-prechart-title">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pre-Charting
          </h1>
          <p className="text-xs text-muted-foreground">Structured patient intake before encounter</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={importFromEHR}
            className="gap-1.5 text-xs"
            data-testid="button-import-ehr"
          >
            <Download className="h-3.5 w-3.5" />
            Import from EHR
          </Button>
          {store.preChartComplete && (
            <Badge variant="outline" className="text-green-600 border-green-300 gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-4">

          {(primer || generatingPrimer) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Encounter Primer
                  {generatingPrimer && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                {generatingPrimer && !primer ? (
                  <p className="text-xs text-muted-foreground animate-pulse" data-testid="text-primer-loading">Generating encounter primer from imported data...</p>
                ) : (
                  <div className="text-xs leading-relaxed whitespace-pre-line" data-testid="text-encounter-primer">{primer}</div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-3.5 w-3.5 text-primary" /> Upload Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 space-y-3">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv,.md,.rtf,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || parsing}
                  className="gap-1.5 text-xs"
                  data-testid="button-upload-file"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading..." : parsing ? "Parsing..." : "Upload PDF, Text, or Image"}
                </Button>
                {parsing && (
                  <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-300">
                    <Loader2 className="h-3 w-3 animate-spin" /> AI extracting data...
                  </Badge>
                )}
              </div>

              {store.uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search uploaded documents..."
                      className="pl-8 h-8 text-xs"
                      data-testid="input-search-docs"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  {searchQuery && searchResults.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardContent className="p-2 space-y-1">
                        <p className="text-[10px] font-medium text-amber-700">{searchResults.length} match{searchResults.length !== 1 ? "es" : ""} found</p>
                        {searchResults.map((r, i) => (
                          <div
                            key={i}
                            className="text-[11px] p-1.5 rounded bg-white border cursor-pointer hover:bg-amber-50"
                            onClick={() => setViewingDoc(r.doc)}
                          >
                            <span className="font-medium text-amber-800">{r.doc.name}</span>
                            <span className="text-muted-foreground ml-1">line {r.lineNum}:</span>
                            <p className="text-foreground truncate">{r.line}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {filteredDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-muted/30 text-xs group"
                      >
                        {doc.type === "pdf" && <FileText className="h-3 w-3 text-red-500 flex-shrink-0" />}
                        {doc.type === "text" && <File className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                        {doc.type === "image" && <Image className="h-3 w-3 text-green-500 flex-shrink-0" />}
                        <span className="max-w-[120px] truncate" title={doc.name}>{doc.name}</span>
                        <span className="text-muted-foreground text-[10px]">({formatFileSize(doc.size)})</span>
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-0.5 hover:bg-accent rounded"
                          data-testid={`button-view-doc-${doc.id}`}
                        >
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            store.removeDocument(doc.id);
                            toast({ title: `Removed: ${doc.name}` });
                          }}
                          className="p-0.5 hover:bg-destructive/10 rounded"
                          data-testid={`button-remove-doc-${doc.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" /> Patient Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Full Name *</FormLabel>
                      <FormControl><Input placeholder="Jane Doe" className="h-8 text-sm" {...field} data-testid="input-patient-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date of Birth *</FormLabel>
                      <FormControl><Input type="date" className="h-8 text-sm" {...field} data-testid="input-dob" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mrn" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">MRN</FormLabel>
                      <FormControl><Input placeholder="Optional" className="h-8 text-sm" {...field} data-testid="input-mrn" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sex" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Biological Sex *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-sm" data-testid="select-sex"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                      <FormLabel className="text-xs">Preferred Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-8 text-sm" data-testid="select-language"><SelectValue /></SelectTrigger></FormControl>
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
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" /> Visit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 space-y-3">
                  <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Chief Complaint *</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="Patient's primary reason for visit" className="text-sm min-h-[48px]" {...field} data-testid="input-chief-complaint" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField control={form.control} name="visitType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Visit Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-8 text-sm" data-testid="select-visit-type"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                        <FormLabel className="text-xs">Specialty *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-8 text-sm" data-testid="select-specialty"><SelectValue /></SelectTrigger></FormControl>
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
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          <FormLabel className="text-[11px]">{v.label}</FormLabel>
                          <FormControl><Input placeholder={v.placeholder} className="h-7 text-xs" {...field} data-testid={`input-${v.name}`} /></FormControl>
                        </FormItem>
                      )} />
                    ))}
                    <div>
                      <p className="text-[11px] font-medium mb-1">BMI</p>
                      <div className="h-7 flex items-center px-2 rounded-md border bg-muted/50 text-xs" data-testid="text-bmi">
                        {bmi || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <FormField control={form.control} name="painScore" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Pain Score: {field.value}/10</FormLabel>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <FormField control={form.control} name="lmp" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Last Menstrual Period</FormLabel>
                        <FormControl><Input type="date" className="h-7 text-xs" {...field} data-testid="input-lmp" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smokingStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Tobacco Use</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-7 text-xs" data-testid="select-smoking"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                        <FormLabel className="text-[11px]">Alcohol Use</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-7 text-xs" data-testid="select-alcohol"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="h-3.5 w-3.5 text-primary" /> History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 space-y-3">
                  <FormField control={form.control} name="medications" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Current Medications</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="One medication per line" className="text-sm min-h-[40px]" {...field} data-testid="input-medications" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="allergies" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Allergies & Reactions</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="e.g., Penicillin — rash, Sulfa — anaphylaxis" className="text-sm min-h-[40px]" {...field} data-testid="input-allergies" /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField control={form.control} name="pmh" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Past Medical History</FormLabel>
                        <FormControl><Textarea rows={2} placeholder="Active and resolved conditions" className="text-sm min-h-[40px]" {...field} data-testid="input-pmh" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="psh" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Past Surgical History</FormLabel>
                        <FormControl><Textarea rows={2} placeholder="Prior surgeries and dates" className="text-sm min-h-[40px]" {...field} data-testid="input-psh" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="familyHistory" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Family History</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="Relevant family medical history" className="text-sm min-h-[40px]" {...field} data-testid="input-family-hx" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="recentResults" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Recent Labs / Imaging</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="Paste summary of recent results" className="text-sm min-h-[40px]" {...field} data-testid="input-recent-results" /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pb-4">
                <Button type="submit" size="sm" className="gap-2" data-testid="button-save-continue">
                  Save & Continue to ARIbot Consult
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ScrollArea>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {viewingDoc?.type === "pdf" && <FileText className="h-4 w-4 text-red-500" />}
              {viewingDoc?.type === "text" && <File className="h-4 w-4 text-blue-500" />}
              {viewingDoc?.type === "image" && <Image className="h-4 w-4 text-green-500" />}
              {viewingDoc?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Uploaded {viewingDoc ? new Date(viewingDoc.uploadedAt).toLocaleString() : ""} — {viewingDoc ? formatFileSize(viewingDoc.size) : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {viewingDoc?.type === "image" ? (
              <img src={viewingDoc.content} alt={viewingDoc.name} className="max-w-full rounded" />
            ) : (
              <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded font-mono leading-relaxed" data-testid="text-doc-content">
                {viewingDoc?.content}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
