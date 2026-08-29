import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Sparkles, PenLine, FileSignature, Wand2 } from "lucide-react";
import type { ClinicalNote, Encounter } from "@/shared/schema";
import ariLogo from "@assets/aribot-mark-primary-1024_1785138240677.png";

const CURRENT_PROVIDER = "Dr. Sarah Johnson, MD, PhD";

const TEMPLATES: Record<string, { title: string; fields: Partial<Record<"subjective" | "objective" | "assessment" | "plan" | "content", string>> }[]> = {
  soap: [
    {
      title: "Annual wellness visit",
      fields: {
        subjective: "Patient presents for annual wellness examination. No acute complaints. Reviews of systems negative except as noted.",
        objective: "Vitals reviewed. General: well-appearing, no acute distress.\nHEENT: unremarkable. CV: RRR, no murmurs. Lungs: CTA bilaterally.",
        assessment: "1. Health maintenance — up to date\n2. ",
        plan: "1. Routine labs ordered\n2. Age-appropriate screening discussed\n3. Follow up in 12 months or PRN",
      },
    },
    {
      title: "Follow-up visit",
      fields: {
        subjective: "Patient returns for follow-up of chronic conditions. Reports adherence to current regimen.",
        objective: "Vitals reviewed and stable. Focused exam performed.",
        assessment: "1. Chronic conditions — stable on current therapy",
        plan: "1. Continue current medications\n2. Repeat labs prior to next visit\n3. Follow up in 3 months",
      },
    },
  ],
  progress: [
    {
      title: "Daily progress note",
      fields: { content: "Interval events: \nExam: \nData reviewed: \nImpression & plan: " },
    },
  ],
  consult: [
    {
      title: "Consultation note",
      fields: { content: "Reason for consult: \nHistory of present illness: \nFindings: \nRecommendations: \nThank you for this interesting consult." },
    },
  ],
};

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
  encounters: Encounter[];
  note?: ClinicalNote | null; // existing note to edit/view
}

export default function NoteEditor({ open, onOpenChange, patientId, encounters, note }: NoteEditorProps) {
  const { toast } = useToast();
  const isSigned = note?.status === "signed";

  const [noteType, setNoteType] = useState("soap");
  const [title, setTitle] = useState("");
  const [encounterId, setEncounterId] = useState<string>("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [content, setContent] = useState("");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [showNarrative, setShowNarrative] = useState(false);
  const [addendumText, setAddendumText] = useState("");

  useEffect(() => {
    if (open) {
      setNoteType(note?.noteType ?? "soap");
      setTitle(note?.title ?? "");
      setEncounterId(note?.encounterId ?? "");
      setSubjective(note?.subjective ?? "");
      setObjective(note?.objective ?? "");
      setAssessment(note?.assessment ?? "");
      setPlan(note?.plan ?? "");
      setContent(note?.content ?? "");
      setAiAssisted(note?.aiAssisted ?? false);
      setNarrative("");
      setShowNarrative(false);
      setAddendumText("");
    }
  }, [open, note]);

  const { data: ariStatus } = useQuery<{ available: boolean }>({ queryKey: ["/api/ari/status"] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "notes"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        noteType, title: title || "Untitled note",
        encounterId: encounterId || null,
        subjective, objective, assessment, plan, content,
        author: CURRENT_PROVIDER, aiAssisted,
      };
      if (note) {
        const { encounterId: _e, ...patch } = body as any;
        return (await apiRequest("PATCH", `/api/notes/${note.id}`, patch)).json();
      }
      return (await apiRequest("POST", "/api/notes", { ...body, patientId })).json();
    },
    onSuccess: () => { invalidate(); toast({ title: note ? "Note updated" : "Note saved as draft" }); onOpenChange(false); },
    onError: (e: Error) => toast({ title: "Could not save note", description: e.message, variant: "destructive" }),
  });

  const sign = useMutation({
    mutationFn: async () => {
      let id = note?.id;
      if (!id) {
        const created = await (await apiRequest("POST", "/api/notes", {
          patientId, noteType, title: title || "Untitled note", encounterId: encounterId || null,
          subjective, objective, assessment, plan, content, author: CURRENT_PROVIDER, aiAssisted,
        })).json();
        id = created.id;
      } else {
        await apiRequest("PATCH", `/api/notes/${id}`, { noteType, title, subjective, objective, assessment, plan, content, aiAssisted });
      }
      return (await apiRequest("POST", `/api/notes/${id}/sign`, { signedBy: CURRENT_PROVIDER })).json();
    },
    onSuccess: () => { invalidate(); toast({ title: "Note signed", description: "The note is now locked. Use addendums for changes." }); onOpenChange(false); },
    onError: (e: Error) => toast({ title: "Could not sign note", description: e.message, variant: "destructive" }),
  });

  const addAddendum = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", `/api/notes/${note!.id}/addendum`, { text: addendumText, author: CURRENT_PROVIDER })).json(),
    onSuccess: () => { invalidate(); setAddendumText(""); toast({ title: "Addendum added" }); onOpenChange(false); },
    onError: (e: Error) => toast({ title: "Could not add addendum", description: e.message, variant: "destructive" }),
  });

  const applyDraft = (d: { subjective: string; objective: string; assessment: string; plan: string }, t?: string) => {
    setNoteType("soap");
    setSubjective(d.subjective); setObjective(d.objective); setAssessment(d.assessment); setPlan(d.plan);
    if (t && !title) setTitle(t);
    setAiAssisted(true);
  };

  const ariDraft = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/ari/draft-note", { encounterId })).json(),
    onSuccess: (r) => { applyDraft(r.draft, r.title); toast({ title: "Ari drafted the note", description: r.ai ? "Review and edit before signing." : "Drafted from chart data (AI key not configured)." }); },
    onError: (e: Error) => toast({ title: "Ari couldn't draft the note", description: e.message, variant: "destructive" }),
  });

  const ariStructure = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/ari/structure-narrative", { narrative, patientId })).json(),
    onSuccess: (r) => { applyDraft(r.draft); setShowNarrative(false); setNarrative(""); toast({ title: "Narrative structured into SOAP" }); },
    onError: (e: Error) => toast({ title: "Ari couldn't structure the narrative", description: e.message, variant: "destructive" }),
  });

  const [transformTarget, setTransformTarget] = useState<"subjective" | "objective" | "assessment" | "plan" | "content">("subjective");
  const transform = useMutation({
    mutationFn: async (mode: "summarize" | "expand" | "restructure") => {
      const map = { subjective, objective, assessment, plan, content };
      const text = map[transformTarget];
      if (!text.trim()) throw new Error("That section is empty");
      const r = await (await apiRequest("POST", "/api/ari/transform", { text, mode })).json();
      return { mode, result: r.result as string };
    },
    onSuccess: ({ result }) => {
      const setters = { subjective: setSubjective, objective: setObjective, assessment: setAssessment, plan: setPlan, content: setContent };
      setters[transformTarget](result);
      setAiAssisted(true);
      toast({ title: "Section updated by Ari" });
    },
    onError: (e: Error) => toast({ title: "Transform failed", description: e.message, variant: "destructive" }),
  });

  const applyTemplate = (idx: number) => {
    const t = TEMPLATES[noteType]?.[idx];
    if (!t) return;
    if (!title) setTitle(t.title);
    if (t.fields.subjective !== undefined) setSubjective(t.fields.subjective);
    if (t.fields.objective !== undefined) setObjective(t.fields.objective);
    if (t.fields.assessment !== undefined) setAssessment(t.fields.assessment);
    if (t.fields.plan !== undefined) setPlan(t.fields.plan);
    if (t.fields.content !== undefined) setContent(t.fields.content);
  };

  const busy = save.isPending || sign.isPending || ariDraft.isPending || ariStructure.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            {isSigned ? "Signed note" : note ? "Edit note" : "New clinical note"}
            {isSigned && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">signed</Badge>}
            {(note?.aiAssisted || aiAssisted) && (
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1">
                <img src={ariLogo} alt="" className="w-3 h-3" /> Ari-assisted
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSigned
              ? `Signed by ${note?.signedBy} · locked for editing`
              : "Document the encounter. Ari can draft, structure, or polish sections for you."}
          </DialogDescription>
        </DialogHeader>

        {!isSigned && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Note type</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="w-32" data-testid="select-note-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soap">SOAP</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="consult">Consult</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Encounter</Label>
              <Select value={encounterId || "none"} onValueChange={(v) => setEncounterId(v === "none" ? "" : v)} disabled={!!note}>
                <SelectTrigger className="w-64" data-testid="select-note-encounter"><SelectValue placeholder="Link to encounter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked encounter</SelectItem>
                  {encounters.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {new Date(e.encounterDate).toLocaleDateString()} — {e.reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Template</Label>
              <Select onValueChange={(v) => applyTemplate(Number(v))}>
                <SelectTrigger className="w-48" data-testid="select-note-template"><SelectValue placeholder="Apply template…" /></SelectTrigger>
                <SelectContent>
                  {(TEMPLATES[noteType] ?? []).map((t, i) => (
                    <SelectItem key={i} value={String(i)}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {!isSigned && (
          <div className="flex flex-wrap gap-2 border border-dashed border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-900 rounded-lg p-3 items-center">
            <img src={ariLogo} alt="Ari" className="w-5 h-5" />
            <span className="text-xs font-semibold mr-1">Ari</span>
            <Button size="sm" variant="outline" disabled={!encounterId || ariDraft.isPending} onClick={() => ariDraft.mutate()} data-testid="button-ari-draft">
              {ariDraft.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Draft from encounter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNarrative((s) => !s)} data-testid="button-ari-narrative">
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Narrative → SOAP
            </Button>
            <div className="flex items-center gap-1.5 ml-auto">
              <Select value={transformTarget} onValueChange={(v) => setTransformTarget(v as any)}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(noteType === "soap" ? ["subjective", "objective", "assessment", "plan"] : ["content"]).map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(["summarize", "expand", "restructure"] as const).map((m) => (
                <Button key={m} size="sm" variant="ghost" className="h-8 text-xs" disabled={transform.isPending} onClick={() => transform.mutate(m)}>
                  {m}
                </Button>
              ))}
            </div>
            {ariStatus && !ariStatus.available && (
              <p className="w-full text-[10px] text-muted-foreground">Limited mode: no AI key configured — Ari uses chart data templates.</p>
            )}
          </div>
        )}

        {showNarrative && !isSigned && (
          <div className="space-y-2">
            <Label className="text-xs">Paste or type a rough narrative (ambient dictation)</Label>
            <Textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4}
              placeholder="e.g. Saw the patient today, cough for 3 days, no fever at home, lungs with mild wheeze on the right, started albuterol, follow up next week…"
              data-testid="input-ari-narrative" />
            <Button size="sm" disabled={!narrative.trim() || ariStructure.isPending} onClick={() => ariStructure.mutate()} data-testid="button-ari-structure">
              {ariStructure.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Structure into SOAP
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" disabled={isSigned} data-testid="input-note-title" />
          </div>

          {noteType === "soap" ? (
            <>
              {([["Subjective", subjective, setSubjective], ["Objective", objective, setObjective], ["Assessment", assessment, setAssessment], ["Plan", plan, setPlan]] as const).map(([label, val, set]) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Textarea value={val} onChange={(e) => set(e.target.value)} rows={3} disabled={isSigned}
                    data-testid={`input-note-${label.toLowerCase()}`} />
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Note body</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} disabled={isSigned} data-testid="input-note-content" />
            </div>
          )}
        </div>

        {isSigned && (
          <div className="space-y-3">
            {(note?.addendums ?? []).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Addendums</Label>
                {note!.addendums!.map((a, i) => (
                  <div key={i} className="text-sm bg-muted rounded-md p-3">
                    <p className="whitespace-pre-wrap">{a.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{a.author} · {new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Add addendum</Label>
              <Textarea value={addendumText} onChange={(e) => setAddendumText(e.target.value)} rows={3} placeholder="Addendum text…" data-testid="input-note-addendum" />
              <Button size="sm" disabled={!addendumText.trim() || addAddendum.isPending} onClick={() => addAddendum.mutate()} data-testid="button-note-addendum">
                {addAddendum.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Add addendum
              </Button>
            </div>
          </div>
        )}

        {!isSigned && (
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => save.mutate()} data-testid="button-note-save">
              {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save draft
            </Button>
            <Button disabled={busy} onClick={() => sign.mutate()} data-testid="button-note-sign">
              {sign.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileSignature className="w-4 h-4 mr-1.5" />}
              Sign note
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
