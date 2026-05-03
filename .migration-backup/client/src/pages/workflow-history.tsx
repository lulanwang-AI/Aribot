import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { useWorkflowHistory, type WorkflowRecord } from "@/store/workflowHistory";
import { useToast } from "@/hooks/use-toast";
import {
  History, User, FileText, Stethoscope, CheckCircle2,
  Upload, Trash2, Eye, Calendar, Pill, AlertTriangle,
  ClipboardList, ChevronDown, ChevronUp
} from "lucide-react";

function RecordCard({ record }: { record: WorkflowRecord }) {
  const [expanded, setExpanded] = useState(false);
  const history = useWorkflowHistory();
  const { toast } = useToast();
  const completedDate = new Date(record.completedAt);

  function handleDelete() {
    history.deleteRecord(record.id);
    toast({ title: "Record deleted" });
  }

  return (
    <Card data-testid={`card-workflow-${record.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{record.patientName || "Unknown Patient"}</h3>
                <Badge variant="outline" className="text-xs shrink-0">{record.mrn || "No MRN"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{record.specialty} — {record.visitType}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {completedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {completedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {record.summaryApproved && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Approved
                  </Badge>
                )}
                {record.exportedToEHR && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] gap-1">
                    <Upload className="h-2.5 w-2.5" /> Exported to EHR
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-${record.id}`}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              data-testid={`button-delete-${record.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <ClipboardList className="h-3.5 w-3.5 text-primary" /> Patient Details
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Date of Birth</p>
                  <p className="font-medium">{record.dob ? new Date(record.dob + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Sex</p>
                  <p className="font-medium">{record.sex || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Chief Complaint</p>
                  <p className="font-medium line-clamp-2">{record.chiefComplaint || "—"}</p>
                </div>
              </div>
            </div>

            {record.medications && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                  <Pill className="h-3.5 w-3.5 text-primary" /> Medications
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{record.medications}</p>
              </div>
            )}

            {record.allergies && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Allergies
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{record.allergies}</p>
              </div>
            )}

            {record.soapDraft.S && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-primary" /> SOAP Note
                </h4>
                <div className="space-y-2 text-sm">
                  {(["S", "O", "A", "P"] as const).map((section) => (
                    <div key={section} className="rounded-md border p-3 bg-muted/30">
                      <p className="font-semibold text-xs text-primary mb-1">
                        {section === "S" ? "Subjective" : section === "O" ? "Objective" : section === "A" ? "Assessment" : "Plan"}
                      </p>
                      <p className="text-muted-foreground whitespace-pre-line text-xs leading-relaxed">{record.soapDraft[section] || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.visitSummary && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" /> Visit Summary
                </h4>
                <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-2">
                  {record.visitSummary.visitReason && (
                    <div>
                      <p className="font-semibold text-xs">Reason for Visit</p>
                      <p className="text-muted-foreground text-xs">{record.visitSummary.visitReason}</p>
                    </div>
                  )}
                  {record.visitSummary.diagnoses && (
                    <div>
                      <p className="font-semibold text-xs">Diagnoses</p>
                      {record.visitSummary.diagnoses.map((d: string, i: number) => (
                        <p key={i} className="text-muted-foreground text-xs">• {d}</p>
                      ))}
                    </div>
                  )}
                  {record.visitSummary.carePlan && (
                    <div>
                      <p className="font-semibold text-xs">Care Plan</p>
                      <p className="text-muted-foreground text-xs whitespace-pre-line">{record.visitSummary.carePlan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkflowHistory() {
  const history = useWorkflowHistory();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-history-title">
            <History className="h-6 w-6 text-primary" />
            Workflow History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Past clinical workflow sessions and approved records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {history.records.length} record{history.records.length !== 1 ? "s" : ""}
          </Badge>
          {history.records.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" data-testid="button-clear-history">
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear all workflow history?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">This will permanently delete all {history.records.length} workflow records. This action cannot be undone.</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      history.clearAll();
                      toast({ title: "All records cleared" });
                    }}
                    data-testid="button-confirm-clear"
                  >
                    Delete All Records
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {history.records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No completed workflows yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Completed clinical workflow sessions will appear here after you approve and finalize a visit summary.
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/pre-charting")} className="gap-2" data-testid="button-start-workflow">
              <ClipboardList className="h-4 w-4" /> Start a Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
