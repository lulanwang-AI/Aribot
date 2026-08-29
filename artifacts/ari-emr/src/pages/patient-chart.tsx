import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AriPanel from "@/components/ai/ari-panel";
import NoteEditor from "@/components/notes/note-editor";
import PatientBilling from "@/components/billing/patient-billing";
import ariLogo from "@assets/aribot-mark-primary-1024_1785138240677.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, AlertTriangle, Pill, HeartPulse, ClipboardList, FlaskConical,
  ScanLine, CalendarDays, Stethoscope, FileText, Clock, ChevronDown,
  PenLine, TestTube, Pill as PillIcon, Plus,
} from "lucide-react";
import { format } from "date-fns";
import type {
  Patient, Encounter, Problem, Medication, Allergy, Vital, Order, Appointment, ImagingStudy, ClinicalNote,
} from "@/shared/schema";

const sevStyle: Record<string, string> = {
  mild: "bg-slate-100 text-slate-600",
  moderate: "bg-amber-50 text-amber-700",
  severe: "bg-red-50 text-red-700",
  "life-threatening": "bg-red-600 text-white",
};

const orderStatusStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  resulted: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

function fmtDate(v: string | Date | null | undefined, f = "MMM d, yyyy") {
  if (!v) return "—";
  try { return format(new Date(v), f); } catch { return String(v); }
}

function SectionCard({ title, icon: Icon, children, count }: any) {
  return (
    <div className="emr-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function PatientChart() {
  const [, params] = useRoute("/chart/:id");
  const [, setLocation] = useLocation();
  const patientId = params?.id;

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId,
  });
  const { data: encounters = [] } = useQuery<Encounter[]>({
    queryKey: ["/api/patients", patientId, "encounters"],
    enabled: !!patientId,
  });
  const { data: problems = [] } = useQuery<Problem[]>({
    queryKey: ["/api/patients", patientId, "problems"],
    enabled: !!patientId,
  });
  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ["/api/patients", patientId, "medications"],
    enabled: !!patientId,
  });
  const { data: allergies = [] } = useQuery<Allergy[]>({
    queryKey: ["/api/patients", patientId, "allergies"],
    enabled: !!patientId,
  });
  const { data: vitals = [] } = useQuery<Vital[]>({
    queryKey: ["/api/patients", patientId, "vitals"],
    enabled: !!patientId,
  });
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/patients", patientId, "orders"],
    enabled: !!patientId,
  });
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/patients", patientId, "appointments"],
    enabled: !!patientId,
  });
  const { data: studies = [] } = useQuery<ImagingStudy[]>({
    queryKey: ["/api/patients", patientId, "studies"],
    enabled: !!patientId,
  });
  const { data: notes = [] } = useQuery<ClinicalNote[]>({
    queryKey: ["/api/patients", patientId, "notes"],
    enabled: !!patientId,
  });

  const [ariOpen, setAriOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<ClinicalNote | null>(null);

  if (!patient) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading chart…</div>;
  }

  const latestVital = vitals[0];
  const activeProblems = problems.filter((p) => p.status !== "resolved");
  const activeMeds = medications.filter((m) => m.status === "active");
  const upcoming = appointments.filter((a) => a.appointmentDate >= format(new Date(), "yyyy-MM-dd") && !["cancelled", "completed", "no-show"].includes(a.status));

  return (
    <div className="min-h-full">
      {/* Demographics banner */}
      <div className="bg-card border-b border-border px-4 sm:px-8 py-5">
        <div className="max-w-[1280px] mx-auto">
          <Link href="/workspace" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to patients
          </Link>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-cyan-500/20">
                {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-patient-name">{patient.name}</h1>
                <p className="text-xs text-muted-foreground font-mono-clinical">
                  {patient.patientId} · {patient.age} yrs · {patient.gender} · DOB {patient.dateOfBirth}
                </p>
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden lg:block" />

            {/* Allergy banner */}
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${allergies.length ? "text-red-500" : "text-muted-foreground/40"}`} />
              <div>
                <p className="emr-section-title">Allergies</p>
                <p className="text-xs font-medium" data-testid="text-allergies">
                  {allergies.length
                    ? allergies.map((a) => a.allergen).join(", ")
                    : "No known allergies"}
                </p>
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden lg:block" />

            {/* Latest vitals strip */}
            {latestVital && (
              <div className="flex items-center gap-5 text-xs">
                {[
                  ["BP", latestVital.systolic && latestVital.diastolic ? `${latestVital.systolic}/${latestVital.diastolic}` : "—"],
                  ["HR", latestVital.heartRate ? `${latestVital.heartRate} bpm` : "—"],
                  ["Temp", latestVital.temperature ? `${latestVital.temperature}°F` : "—"],
                  ["SpO₂", latestVital.oxygenSaturation ? `${latestVital.oxygenSaturation}%` : "—"],
                  ["BMI", latestVital.bmi ?? "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="emr-section-title">{label}</p>
                    <p className="font-semibold font-mono-clinical">{value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className={patient.status === "critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                {patient.status}
              </Badge>
              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="default" data-testid="button-quick-actions">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Quick actions <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => { setEditorOpen(true); setActiveNote(null); }} data-testid="action-new-note">
                    <PenLine className="w-4 h-4 mr-2 text-primary" /> New note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setLocation(`/chart/${patient.id}?tab=results`); }} data-testid="action-new-order">
                    <TestTube className="w-4 h-4 mr-2 text-primary" /> New order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setLocation(`/chart/${patient.id}?tab=results`); }} data-testid="action-new-rx">
                    <PillIcon className="w-4 h-4 mr-2 text-primary" /> New Rx
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAriOpen(true)} data-testid="action-ask-ari">
                    <img src={ariLogo} alt="" className="w-4 h-4 mr-2" /> Ask Ari
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" onClick={() => setAriOpen(true)} data-testid="button-ask-ari" className="hidden">
                <img src={ariLogo} alt="" className="w-4 h-4 mr-1.5" /> Ask Ari
              </Button>
              <Link href={`/patient/${patient.id}`}>
                <Button size="sm" variant="outline" data-testid="button-open-imaging">
                  <ScanLine className="w-4 h-4 mr-1.5" /> Imaging
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6">
        <Tabs defaultValue="summary">
          <TabsList className="mb-5 max-w-full overflow-x-auto justify-start">
            <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            <TabsTrigger value="encounters" data-testid="tab-encounters">Encounters</TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
            <TabsTrigger value="results" data-testid="tab-results">Orders & Results</TabsTrigger>
            <TabsTrigger value="vitals" data-testid="tab-vitals">Vitals</TabsTrigger>
            <TabsTrigger value="imaging" data-testid="tab-imaging">Imaging</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-5">
              <SectionCard title="Problem List" icon={ClipboardList} count={activeProblems.length}>
                <div className="space-y-2.5">
                  {activeProblems.length === 0 && <p className="text-xs text-muted-foreground">No active problems</p>}
                  {activeProblems.map((p) => (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono-clinical">
                          {p.icd10Code} · onset {p.onsetDate ?? "unknown"}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${sevStyle[p.severity ?? "mild"]}`}>
                        {p.status === "chronic" ? "chronic" : p.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Allergies" icon={AlertTriangle} count={allergies.length}>
                <div className="space-y-2.5">
                  {allergies.length === 0 && <p className="text-xs text-muted-foreground">No known allergies</p>}
                  {allergies.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{a.allergen}</p>
                        <p className="text-[11px] text-muted-foreground">{a.allergyType} · {a.reaction}</p>
                      </div>
                      <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${sevStyle[a.severity]}`}>{a.severity}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-5">
              <SectionCard title="Medications" icon={Pill} count={activeMeds.length}>
                <div className="space-y-3">
                  {activeMeds.length === 0 && <p className="text-xs text-muted-foreground">No active medications</p>}
                  {activeMeds.map((m) => (
                    <div key={m.id}>
                      <p className="text-sm font-medium">{m.name} <span className="text-muted-foreground font-normal">{m.dosage}</span></p>
                      <p className="text-[11px] text-muted-foreground">{m.frequency} · {m.route} · by {m.prescribedBy}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Upcoming Visits" icon={CalendarDays} count={upcoming.length}>
                <div className="space-y-2.5">
                  {upcoming.length === 0 && <p className="text-xs text-muted-foreground">Nothing scheduled</p>}
                  {upcoming.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-9 text-center">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">{fmtDate(a.appointmentDate, "MMM")}</p>
                        <p className="text-sm font-bold leading-none">{fmtDate(a.appointmentDate, "d")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.reason}</p>
                        <p className="text-[11px] text-muted-foreground">{a.appointmentTime} · {a.provider}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-5">
              <SectionCard title="Recent Encounters" icon={Stethoscope} count={encounters.length}>
                <div className="space-y-3">
                  {encounters.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className={`status-dot mt-1.5 ${e.status === "open" ? "bg-blue-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-sm font-medium">{e.reason}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmtDate(e.encounterDate)} · {e.encounterType} · {e.provider}
                        </p>
                      </div>
                      {e.status === "open" && (
                        <Badge variant="outline" className="ml-auto text-[10px] bg-blue-50 text-blue-700 border-blue-200">open</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Recent Results" icon={FlaskConical} count={orders.filter((o) => o.status === "resulted").length}>
                <div className="space-y-2.5">
                  {orders.filter((o) => o.status === "resulted").slice(0, 4).map((o) => (
                    <div key={o.id}>
                      <p className="text-sm font-medium">{o.name}</p>
                      <p className="text-[11px] text-muted-foreground">{o.resultSummary} · {fmtDate(o.resultedAt)}</p>
                    </div>
                  ))}
                  {orders.filter((o) => o.status === "resulted").length === 0 && (
                    <p className="text-xs text-muted-foreground">No new results</p>
                  )}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="encounters">
            <div className="emr-card divide-y divide-border">
              {encounters.map((e) => (
                <div key={e.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-11 text-center shrink-0">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">{fmtDate(e.encounterDate, "MMM")}</p>
                    <p className="text-lg font-bold leading-none">{fmtDate(e.encounterDate, "d")}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(e.encounterDate, "yyyy")}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{e.reason}</p>
                    <p className="text-xs text-muted-foreground">{e.encounterType} · {e.department} · {e.provider}</p>
                  </div>
                  <Badge variant="outline" className={e.status === "open" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
                    {e.status}
                  </Badge>
                </div>
              ))}
              {encounters.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No encounters on file</p>}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => { setActiveNote(null); setEditorOpen(true); }} data-testid="button-new-note">
                <FileText className="w-4 h-4 mr-1.5" /> New note
              </Button>
            </div>
            <div className="emr-card divide-y divide-border">
              {notes.map((n) => (
                <button
                  key={n.id}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/60 transition-colors"
                  onClick={() => { setActiveNote(n); setEditorOpen(true); }}
                  data-testid={`note-row-${n.id}`}
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.noteType.toUpperCase()} · {n.author} · {fmtDate(n.createdAt)}
                      {n.signedAt ? ` · signed ${fmtDate(n.signedAt)}` : ""}
                      {(n.addendums?.length ?? 0) > 0 ? ` · ${n.addendums!.length} addendum${n.addendums!.length > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  {n.aiAssisted && (
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1">
                      <img src={ariLogo} alt="" className="w-3 h-3" /> Ari
                    </Badge>
                  )}
                  <Badge variant="outline" className={n.status === "signed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                    {n.status}
                  </Badge>
                </button>
              ))}
              {notes.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">No notes yet — create one, or let Ari draft it from an encounter</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="emr-card divide-y divide-border">
              {orders.map((o) => (
                <div key={o.id} className="px-5 py-3.5 flex items-center gap-4">
                  <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.orderType} · ordered {fmtDate(o.orderedAt)} by {o.orderedBy}
                      {o.resultSummary ? ` · ${o.resultSummary}` : ""}
                    </p>
                  </div>
                  {o.priority !== "routine" && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase text-[10px]">{o.priority}</Badge>
                  )}
                  <Badge variant="outline" className={orderStatusStyle[o.status] ?? ""}>{o.status}</Badge>
                </div>
              ))}
              {orders.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No orders on file</p>}
            </div>
          </TabsContent>

          <TabsContent value="vitals">
            <div className="emr-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    {["Recorded", "BP", "HR", "Temp", "RR", "SpO₂", "Weight", "BMI", "Pain"].map((h) => (
                      <th key={h} className="px-4 py-3 emr-section-title">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono-clinical text-[13px]">
                  {vitals.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2.5 font-inter">{fmtDate(v.recordedAt, "MMM d, yyyy")}</td>
                      <td className="px-4 py-2.5">{v.systolic}/{v.diastolic}</td>
                      <td className="px-4 py-2.5">{v.heartRate}</td>
                      <td className="px-4 py-2.5">{v.temperature}°F</td>
                      <td className="px-4 py-2.5">{v.respiratoryRate}</td>
                      <td className="px-4 py-2.5">{v.oxygenSaturation}%</td>
                      <td className="px-4 py-2.5">{v.weight} lb</td>
                      <td className="px-4 py-2.5">{v.bmi}</td>
                      <td className="px-4 py-2.5">{v.pain}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vitals.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No vitals recorded</p>}
            </div>
          </TabsContent>

          <TabsContent value="imaging">
            <div className="emr-card divide-y divide-border">
              {studies.map((s) => (
                <Link key={s.id} href={`/patient/${patient.id}`} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/60 transition-colors">
                  <ScanLine className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{s.studyType}</p>
                    <p className="text-xs text-muted-foreground">{s.description} · {s.studyDate} · {s.sliceCount} slices</p>
                  </div>
                  <Badge variant="outline">{s.status}</Badge>
                </Link>
              ))}
              {studies.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">No imaging studies — open the Imaging Viewer for DICOM tools</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="billing">
            <PatientBilling patientId={patient.id} encounters={encounters} problems={problems} />
          </TabsContent>
        </Tabs>
      </div>

      <AriPanel patientId={patient.id} patientName={patient.name} open={ariOpen} onOpenChange={setAriOpen} />
      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        patientId={patient.id}
        encounters={encounters}
        note={activeNote}
      />
    </div>
  );
}
