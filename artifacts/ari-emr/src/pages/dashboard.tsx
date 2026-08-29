import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Users, FlaskConical, Stethoscope, AlertTriangle, Inbox,
  ChevronRight, Clock, Video, Phone, User, ScanLine,
} from "lucide-react";
import { format } from "date-fns";
import type { Appointment, Patient, Encounter, Order } from "@/shared/schema";
import { useMemo } from "react";

const apptStatusStyle: Record<string, string> = {
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

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { date: today }],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });
  const { data: encounters = [] } = useQuery<Encounter[]>({ queryKey: ["/api/encounters"] });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: unread } = useQuery<{ total: number; byCategory: Record<string, number> }>({
    queryKey: ["/api/inbasket/unread-counts"],
  });

  const patientById = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);

  const openEncounters = encounters.filter((e) => e.status === "open");
  const pendingResults = orders.filter((o) => o.status === "resulted");
  const statOrders = orders.filter((o) => o.priority === "stat" && !["completed", "cancelled"].includes(o.status));
  const criticalPatients = patients.filter((p) => p.status === "critical");
  const remaining = appointments.filter((a) => !["completed", "cancelled", "no-show"].includes(a.status));

  return (
    <div className="p-5 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <Link href="/appointments">
          <Button variant="outline" size="sm" data-testid="button-open-schedule">
            <CalendarDays className="w-4 h-4 mr-1.5" /> Full schedule
          </Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <Link href="/in-basket" className="emr-card p-4 block hover:shadow-md transition-shadow" data-testid="card-inbasket">
          <div className="flex items-center justify-between mb-1">
            <Inbox className="w-4 h-4 text-cyan-600" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">In Basket</span>
          </div>
          <p className="emr-stat-value" data-testid="stat-inbasket-unread">{unread?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unread ? `${unread.byCategory.results ?? 0} results · ${unread.byCategory.patient ?? 0} patient msgs` : "Unread messages"}
          </p>
        </Link>
        <div className="emr-card p-4">
          <div className="flex items-center justify-between mb-1">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Today</span>
          </div>
          <p className="emr-stat-value" data-testid="stat-appointments-today">{appointments.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{remaining.length} visits remaining</p>
        </div>
        <div className="emr-card p-4">
          <div className="flex items-center justify-between mb-1">
            <Stethoscope className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Charting</span>
          </div>
          <p className="emr-stat-value" data-testid="stat-open-encounters">{openEncounters.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Open encounters</p>
        </div>
        <div className="emr-card p-4">
          <div className="flex items-center justify-between mb-1">
            <FlaskConical className="w-4 h-4 text-violet-500" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Results</span>
          </div>
          <p className="emr-stat-value" data-testid="stat-pending-results">{pendingResults.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting review</p>
        </div>
        <div className="emr-card p-4">
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-semibold text-red-500 uppercase">Urgent</span>
          </div>
          <p className="emr-stat-value text-red-600" data-testid="stat-stat-orders">{statOrders.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">STAT orders active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's schedule */}
        <div className="lg:col-span-2">
          <div className="emr-card">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Today's Schedule
              </h2>
              <Link href="/appointments" className="text-xs text-primary font-medium flex items-center hover:underline">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border max-h-[460px] overflow-y-auto">
              {appointments.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No appointments today</p>
              )}
              {appointments.map((a) => {
                const p = patientById[a.patientId];
                return (
                   <div key={a.id} className="px-5 py-2 flex items-center gap-4">
                    <div className="w-12 text-center shrink-0">
                      <p className="text-sm font-bold font-mono-clinical">{a.appointmentTime}</p>
                      <p className="text-[10px] text-muted-foreground">{a.duration}m</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {p ? (
                        <Link href={`/chart/${p.id}`} className="text-sm font-semibold hover:text-primary transition-colors">
                          {p.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold">Unknown</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{a.reason} · {a.provider}</p>
                    </div>
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">{typeIcon(a.visitType)}</span>
                    <Badge variant="outline" className={apptStatusStyle[a.status]}>{a.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Results to review */}
          <div className="emr-card">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-violet-500" /> Results to Review
              </h2>
            </div>
            <div className="divide-y divide-border max-h-56 overflow-y-auto">
              {pendingResults.length === 0 && <p className="p-5 text-xs text-muted-foreground">All caught up</p>}
              {pendingResults.slice(0, 6).map((o) => {
                const p = patientById[o.patientId];
                return (
                  <Link key={o.id} href={p ? `/chart/${p.id}` : "/workspace"} className="block px-5 py-2.5 hover:bg-muted/60 transition-colors">
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p?.name} · {o.orderType}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Open encounters */}
          <div className="emr-card">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Open Encounters
              </h2>
            </div>
            <div className="divide-y divide-border max-h-56 overflow-y-auto">
              {openEncounters.length === 0 && <p className="p-5 text-xs text-muted-foreground">No open encounters</p>}
              {openEncounters.slice(0, 6).map((e) => {
                const p = patientById[e.patientId];
                return (
                  <Link key={e.id} href={p ? `/chart/${p.id}` : "/workspace"} className="block px-5 py-2.5 hover:bg-muted/60 transition-colors">
                    <p className="text-sm font-medium">{p?.name ?? "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground">{e.reason} · {format(new Date(e.encounterDate), "MMM d")}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Critical patients */}
          <div className="emr-card">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Critical Patients
              </h2>
            </div>
            <div className="divide-y divide-border max-h-56 overflow-y-auto">
              {criticalPatients.length === 0 && <p className="p-5 text-xs text-muted-foreground">None flagged</p>}
              {criticalPatients.slice(0, 6).map((p) => (
                <Link key={p.id} href={`/chart/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/60 transition-colors">
                  <span className="status-dot bg-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono-clinical">{p.patientId}</p>
                  </div>
                  <ScanLine className="w-3.5 h-3.5 text-muted-foreground/50" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
