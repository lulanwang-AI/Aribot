import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Clock, Video, Phone, User, MapPin, Plus, Search, CheckCircle2, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Appointment, Patient } from "@/shared/schema";
import { useToast } from "@/hooks/use-toast";

const statusStyle: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-600 border-slate-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  "checked-in": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  "no-show": "bg-orange-50 text-orange-700 border-orange-200",
};

const typeIcon = (t: string) =>
  t === "video" ? <Video className="w-3.5 h-3.5" /> : t === "phone" ? <Phone className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />;

export default function Appointments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "", provider: "Dr. Sarah Johnson", department: "Internal Medicine",
    appointmentTime: "09:00", duration: 30, visitType: "in-person", reason: "",
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { date: dateStr }],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });
  const patientById = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/appointments", {
        ...form,
        appointmentDate: dateStr,
        status: "scheduled",
        location: "Suite 100, Main Campus",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setDialogOpen(false);
      toast({ title: "Appointment scheduled" });
    },
    onError: () => toast({ title: "Failed to schedule appointment", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }),
  });

  const filtered = appointments.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    const name = patientById[a.patientId]?.name ?? "";
    if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !a.provider.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a) => ["confirmed", "checked-in"].includes(a.status)).length,
    inProgress: appointments.filter((a) => a.status === "in-progress").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="p-5 max-w-[1280px] mx-auto">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-appointment">
              <Plus className="w-4 h-4 mr-1.5" /> New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule appointment — {format(selectedDate, "MMM d")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Patient</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger data-testid="select-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.patientId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} data-testid="input-time" />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provider</Label>
                  <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Dr. Sarah Johnson", "Dr. Michael Reyes", "Dr. Lisa Wang", "Dr. James Osei", "Dr. Priya Nair"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visit type</Label>
                  <Select value={form.visitType} onValueChange={(v) => setForm({ ...form, visitType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">In person</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" data-testid="input-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.patientId || !form.reason || createMutation.isPending}
                data-testid="button-save-appointment"
              >
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      <div className="flex gap-6">
        {/* Calendar */}
        <div className="w-72 shrink-0">
          <div className="emr-card p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search patient or provider…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-appointments" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(statusStyle).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="emr-card divide-y divide-border">
            {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && filtered.length === 0 && (
              <div className="p-10 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No appointments for this day</p>
              </div>
            )}
            {filtered.map((a) => {
              const patient = patientById[a.patientId];
              return (
                 <div key={a.id} className="px-5 py-2 flex items-center gap-4" data-testid={`row-appointment-${a.id}`}>
                  <div className="w-14 text-center shrink-0">
                    <p className="text-sm font-bold font-mono-clinical">{a.appointmentTime}</p>
                    <p className="text-[10px] text-muted-foreground">{a.duration} min</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{patient?.name ?? "Unknown patient"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.reason} · {a.provider} · {a.department}
                    </p>
                  </div>
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                    {typeIcon(a.visitType)} {a.visitType}
                  </div>
                  <Badge variant="outline" className={statusStyle[a.status]}>{a.status}</Badge>
                  {["scheduled", "confirmed"].includes(a.status) && (
                    <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => statusMutation.mutate({ id: a.id, status: "checked-in" })} data-testid={`button-checkin-${a.id}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                  {!["completed", "cancelled", "no-show"].includes(a.status) && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => statusMutation.mutate({ id: a.id, status: "cancelled" })} data-testid={`button-cancel-${a.id}`}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
