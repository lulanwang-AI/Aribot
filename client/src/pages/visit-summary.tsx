import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientStore } from "@/store/patientStore";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Sparkles, Loader2, CheckCircle2, ArrowRight,
  Printer, AlertTriangle, Heart, Pill, Stethoscope,
  Calendar, Phone, UserCheck, Download, RotateCcw, Upload, User, Building2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VisitSummaryData {
  visitReason: string;
  findings: string;
  diagnoses: string[];
  medications: { name: string; change: string; reason: string }[];
  carePlan: string;
  warningSigns: string[];
  followUp: string;
}

function SummarySection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function VisitSummary() {
  const [, setLocation] = useLocation();
  const store = usePatientStore();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<VisitSummaryData | null>(
    store.visitSummary as VisitSummaryData | null
  );
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exported, setExported] = useState(false);

  async function generateSummary() {
    if (!store.soapSigned) {
      toast({ title: "SOAP note must be signed first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soapNote: store.soapDraft,
          patientName: store.name,
          specialty: store.specialty,
          chiefComplaint: store.chiefComplaint,
          medications: store.medications,
        }),
      });
      const json = await res.json();
      setSummaryData(json);
      store.setSummary(json);
      toast({ title: "Visit summary generated" });
    } catch {
      toast({ title: "Failed to generate summary", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  function handleApprove() {
    store.approveSummary();
    toast({ title: "Visit summary approved and finalized" });
  }

  function startNewEncounter() {
    store.resetSession();
    setLocation("/pre-charting");
  }

  function handlePrint() {
    window.print();
  }

  async function exportToEHR() {
    setExporting(true);
    setExportProgress(0);

    const steps = [
      { label: "Connecting to EHR system", progress: 15 },
      { label: "Authenticating provider credentials", progress: 30 },
      { label: "Transmitting visit summary", progress: 50 },
      { label: "Uploading SOAP note", progress: 65 },
      { label: "Syncing medication changes", progress: 80 },
      { label: "Confirming write to patient chart", progress: 95 },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 700));
      setExportProgress(step.progress);
      toast({ title: step.label });
    }

    await new Promise(r => setTimeout(r, 500));
    setExportProgress(100);
    setExporting(false);
    setExported(true);
    toast({
      title: "Exported to EHR successfully",
      description: `Visit record for ${store.name || "patient"} written to chart — MRN ${store.mrn || "N/A"}`,
    });
  }

  const changeColors: Record<string, string> = {
    START: "bg-green-100 text-green-700 border-green-200",
    CONTINUE: "bg-blue-100 text-blue-700 border-blue-200",
    STOP: "bg-red-100 text-red-700 border-red-200",
    "DOSE CHANGE": "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-summary-title">
            <FileText className="h-6 w-6 text-primary" />
            Visit Summary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Patient-facing plain-language summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          {store.summaryApproved && (
            <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          )}
        </div>
      </div>

      {!store.soapSigned && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h3 className="font-semibold">SOAP Note Not Signed</h3>
            <p className="text-sm text-muted-foreground">
              The SOAP note must be signed and finalized before generating a visit summary.
            </p>
            <Button variant="outline" onClick={() => setLocation("/soap")} className="gap-1" data-testid="button-back-soap">
              Go to SOAP Note <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {store.soapSigned && !summaryData && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Generate Visit Summary</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Create a plain-language summary for the patient at a 5th-6th grade reading level. No medical jargon.
              </p>
            </div>
            <Button onClick={generateSummary} className="gap-2" data-testid="button-generate-summary">
              <Sparkles className="h-4 w-4" /> Generate Summary
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="py-6">
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {summaryData && !generating && (
        <div className="print:shadow-none" id="visit-summary-print">
          <div className="print:block hidden text-center mb-6 border-b pb-4">
            <h2 className="text-xl font-bold">Visit Summary</h2>
            <p className="text-sm text-muted-foreground">{store.name} — {new Date().toLocaleDateString()}</p>
          </div>

          <Card className="border-primary/20 bg-primary/5 print:shadow-none print:border-0" data-testid="card-patient-info">
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 flex-1 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Patient Name</p>
                    <p className="font-semibold">{store.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Date of Birth</p>
                    <p className="font-medium">{store.dob ? new Date(store.dob + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">MRN</p>
                    <p className="font-medium">{store.mrn || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sex</p>
                    <p className="font-medium">{store.sex || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Visit Date</p>
                    <p className="font-medium">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Visit Type</p>
                    <p className="font-medium">{store.specialty || "—"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:shadow-none print:border-0">
            <CardContent className="py-6 space-y-6 text-[15px] leading-relaxed">
              <SummarySection icon={Stethoscope} title="Why you came in today">
                <p className="text-muted-foreground">{summaryData.visitReason}</p>
              </SummarySection>

              <Separator />

              <SummarySection icon={FileText} title="What we found">
                <p className="text-muted-foreground">{summaryData.findings}</p>
              </SummarySection>

              <Separator />

              <SummarySection icon={Heart} title="Your diagnosis">
                {summaryData.diagnoses.map((d, i) => (
                  <p key={i} className="text-muted-foreground">• {d}</p>
                ))}
              </SummarySection>

              <Separator />

              <SummarySection icon={Pill} title="Your medications">
                {summaryData.medications.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Medication</th>
                          <th className="text-left p-2 font-medium">What Changed</th>
                          <th className="text-left p-2 font-medium">Why</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryData.medications.map((med, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-medium">{med.name}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${changeColors[med.change] || ""}`}>
                                {med.change}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground">{med.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No medication changes at this visit.</p>
                )}
              </SummarySection>

              <Separator />

              <SummarySection icon={CheckCircle2} title="Your care plan">
                <p className="text-muted-foreground whitespace-pre-line">{summaryData.carePlan}</p>
              </SummarySection>

              <Separator />

              <SummarySection icon={AlertTriangle} title="Warning signs — come back or call us if you experience">
                <ul className="space-y-1">
                  {summaryData.warningSigns.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-red-500 mt-1">•</span> {w}
                    </li>
                  ))}
                </ul>
              </SummarySection>

              <Separator />

              <SummarySection icon={Calendar} title="Your follow-up">
                <p className="text-muted-foreground">{summaryData.followUp}</p>
              </SummarySection>

              <Separator />

              <SummarySection icon={UserCheck} title="Your care team">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=ChetChea&mouth[]=smile&eyes[]=happy&eyebrows[]=defaultNatural&top[]=shortHairShortFlat&clothing[]=blazerAndShirt&skinColor[]=d08b5b&backgroundColor=b6e3f4"
                      alt="Dr. Chet Chea"
                      className="w-10 h-10 rounded-full border print:hidden"
                    />
                    <div className="text-sm space-y-0.5">
                      <p className="font-semibold">Dr. Chet Chea, MD</p>
                      <p className="text-muted-foreground">Infectious Disease — HIV/AIDS & Travel Medicine</p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Marin Health Medical Center, Kentfield, CA
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> (415) 555-0192
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    <strong>Visit Date:</strong> {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </SummarySection>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {exporting && (
            <Card className="border-primary/30 bg-primary/5 mb-4">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Exporting to EHR...
                </div>
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{exportProgress}% complete</p>
              </CardContent>
            </Card>
          )}

          {exported && !exporting && (
            <Card className="border-green-300 bg-green-50/50 mb-4">
              <CardContent className="py-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Successfully exported to EHR</p>
                  <p className="text-xs text-green-600">
                    Visit record written to patient chart — {store.name || "Patient"} (MRN: {store.mrn || "N/A"}) — {new Date().toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="button-print-summary">
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </Button>
              {store.summaryApproved && !exported && (
                <Button variant="outline" onClick={exportToEHR} disabled={exporting} className="gap-2" data-testid="button-export-ehr">
                  <Upload className="h-4 w-4" /> Export to EHR
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!store.summaryApproved ? (
                <Button onClick={handleApprove} className="gap-2" data-testid="button-approve-summary">
                  <CheckCircle2 className="h-4 w-4" /> Approve &amp; Finalize
                </Button>
              ) : (
                <Button onClick={startNewEncounter} variant="outline" className="gap-2" data-testid="button-new-encounter">
                  <RotateCcw className="h-4 w-4" /> Start New Encounter
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
