import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FlaskConical, Inbox, Loader2, Mail, MailOpen, Plus, RotateCcw, Users } from "lucide-react";
import { Link } from "wouter";
import type { InBasketMessage, Patient } from "@/shared/schema";

const CURRENT_STAFF = "Dr. Sarah Johnson, MD, PhD";

const CATEGORIES = [
  { id: "all", label: "All", icon: Inbox },
  { id: "results", label: "Results to review", icon: FlaskConical },
  { id: "patient", label: "Patient messages", icon: Mail },
  { id: "staff", label: "Staff messages", icon: Users },
] as const;

const priorityColors: Record<string, string> = {
  urgent: "bg-red-50 text-red-700 border-red-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  routine: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function InBasket() {
  const { toast } = useToast();
  const [category, setCategory] = useState<string>("all");
  const [showDone, setShowDone] = useState(false);
  const [active, setActive] = useState<InBasketMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const { data: messages = [] } = useQuery<InBasketMessage[]>({ queryKey: ["/api/inbasket"] });
  const { data: counts } = useQuery<{ total: number; byCategory: Record<string, number> }>({ queryKey: ["/api/inbasket/unread-counts"] });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });
  const patientName = (id: string | null) => (id && patients.find((p) => p.id === id)?.name) || null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inbasket"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inbasket/unread-counts"] });
  };

  const markRead = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) =>
      (await apiRequest("POST", `/api/inbasket/${id}/read`, { read })).json(),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await apiRequest("POST", `/api/inbasket/${id}/status`, { status })).json(),
    onSuccess: (_d, v) => { invalidate(); if (v.status === "done") setActive(null); },
    onError: () => toast({ title: "Could not update message", variant: "destructive" }),
  });

  const open = (m: InBasketMessage) => {
    setActive(m);
    if (!m.read) markRead.mutate({ id: m.id, read: true });
  };

  const filtered = messages.filter((m) =>
    (category === "all" || m.category === category) && (showDone ? true : m.status === "open"));

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" /> In Basket
            {!!counts?.total && <Badge className="ml-1" data-testid="badge-total-unread">{counts.total} unread</Badge>}
          </h1>
        </div>
        <Button onClick={() => setShowCompose(true)} data-testid="button-compose"><Plus className="w-4 h-4 mr-1" /> New message</Button>
      </div>

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {CATEGORIES.map((c) => {
          const unread = c.id === "all" ? counts?.total : counts?.byCategory[c.id];
          return (
            <Button key={c.id} size="sm" variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)} data-testid={`queue-${c.id}`}>
              <c.icon className="w-3.5 h-3.5 mr-1.5" /> {c.label}
              {!!unread && <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 font-bold ${category === c.id ? "bg-white/20" : "bg-primary text-primary-foreground"}`}>{unread}</span>}
            </Button>
          );
        })}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setShowDone(!showDone)} data-testid="toggle-done">
          {showDone ? "Hide completed" : "Show completed"}
        </Button>
      </div>

      <div className="emr-card divide-y">
        {filtered.map((m) => (
          <div key={m.id}
            className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors group ${m.status === "done" ? "opacity-55" : ""}`}
            data-testid={`message-${m.id}`}>
            <button className="shrink-0" onClick={() => open(m)}>
              {m.read ? <MailOpen className="w-4 h-4 text-muted-foreground" /> : <Mail className="w-4 h-4 text-primary" />}
            </button>
            <button className="flex-1 min-w-0 text-left" onClick={() => open(m)}>
              <p className={`text-sm truncate ${m.read ? "" : "font-semibold"}`}>
                {m.subject}
                {patientName(m.patientId) && <span className="ml-2 text-xs text-muted-foreground font-normal">re: {patientName(m.patientId)}</span>}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {m.fromName} → {m.toName}
                {(m as any).body && <span className="ml-2 text-muted-foreground/70">· {String((m as any).body).slice(0, 60)}{String((m as any).body).length > 60 ? "…" : ""}</span>}
              </p>
            </button>
            {m.priority !== "routine" && <Badge variant="outline" className={priorityColors[m.priority]}>{m.priority}</Badge>}
            <Badge variant="outline" className="capitalize hidden sm:inline-flex">{m.category}</Badge>
            <span className="text-xs text-muted-foreground w-20 text-right shrink-0 hidden md:block">{new Date(m.createdAt).toLocaleDateString()}</span>
            {m.status !== "done" && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-emerald-600"
                title="Mark done"
                data-testid={`btn-done-${m.id}`}
                onClick={(e) => { e.stopPropagation(); setStatus.mutate({ id: m.id, status: "done" }); }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
         {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Queue is empty — nice work</p>}
      </div>

      {/* Message detail */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{active.subject}
                  {active.priority !== "routine" && <Badge variant="outline" className={priorityColors[active.priority]}>{active.priority}</Badge>}
                </DialogTitle>
                <DialogDescription>
                  {active.fromName} → {active.toName} · {new Date(active.createdAt).toLocaleString()}
                  {patientName(active.patientId) && (
                    <> · <Link href={`/chart/${active.patientId}`} className="underline">{patientName(active.patientId)}'s chart</Link></>
                  )}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm whitespace-pre-wrap">{active.body}</p>
              <div className="flex gap-2 pt-2 border-t">
                {active.status === "open" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: active.id, status: "done" })} data-testid="button-mark-done">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark done
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setStatus.mutate({ id: active.id, status: "open" }); }} data-testid="button-reopen">
                    <RotateCcw className="w-4 h-4 mr-1" /> Reopen
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { markRead.mutate({ id: active.id, read: false }); setActive(null); }} data-testid="button-mark-unread">
                  Mark unread
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {showCompose && <ComposeDialog patients={patients} onClose={() => setShowCompose(false)} onSent={invalidate} />}
    </div>
  );
}

function ComposeDialog({ patients, onClose, onSent }: { patients: Patient[]; onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("routine");
  const [patientId, setPatientId] = useState<string>("none");

  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/inbasket", {
      category: "staff", fromName: CURRENT_STAFF, toName, subject, body, priority,
      patientId: patientId === "none" ? null : patientId,
    })).json(),
    onSuccess: () => { onSent(); toast({ title: "Message sent to In Basket" }); onClose(); },
    onError: () => toast({ title: "Could not send message", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New staff message</DialogTitle>
          <DialogDescription>Internal only — delivered to the In Basket.</DialogDescription>
        </DialogHeader>
        <Input placeholder="To (staff member or team)" value={toName} onChange={(e) => setToName(e.target.value)} data-testid="input-compose-to" />
        <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="input-compose-subject" />
        <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[90px]" data-testid="input-compose-body" />
        <div className="flex gap-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{["routine", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger data-testid="select-compose-patient"><SelectValue placeholder="Link a patient (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked patient</SelectItem>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => send.mutate()} disabled={!toName.trim() || !subject.trim() || !body.trim() || send.isPending} data-testid="button-send-message">
          {send.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Send
        </Button>
      </DialogContent>
    </Dialog>
  );
}
