import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, AlertTriangle, CalendarClock, ChevronRight, Activity, FileText } from "lucide-react";
import type { Patient } from "@/shared/schema";

const STATUS_SORT: Record<string, number> = { critical: 0, pending: 1, active: 2, completed: 3 };

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Patients() {
  const searchString = useSearch();
  const urlSearch = new URLSearchParams(searchString).get("search") ?? "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState("all");

  // Sync URL search param into local state when it changes (e.g. header navigation)
  useEffect(() => { setSearchTerm(urlSearch); }, [urlSearch]);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filtered = patients
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9));

  const criticalCount = patients.filter((p) => p.status === "critical").length;

  return (
    <div className="p-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Patients</h1>
          <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
            <span data-testid="stat-total-patients"><span className="font-semibold text-foreground">{patients.length}</span> total</span>
            <span className="text-border">·</span>
            <span data-testid="stat-critical-patients"><span className="font-semibold text-red-600">{criticalCount}</span> critical</span>
            <span className="text-border">·</span>
            <span><span className="font-semibold text-emerald-600">{patients.filter((p) => p.status === "active").length}</span> active</span>
          </div>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-patient-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patient list */}
      <div className="emr-card divide-y divide-border overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading patients…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No patients match your search</p>
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-4 px-5 py-2 hover:bg-muted/60 transition-colors group ${p.status === "critical" ? "border-l-2 border-red-400" : ""}`}
            data-testid={`row-patient-${p.id}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${p.status === "critical" ? "bg-red-100 text-red-700" : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700"}`}>
              {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground font-mono-clinical">
                {p.patientId} · {p.age} yrs · {p.gender}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5" />
              DOB {p.dateOfBirth}
            </div>
            <Badge variant="outline" className={statusStyle[p.status] ?? statusStyle.completed}>
              {p.status}
            </Badge>
            <Link href={`/chart/${p.id}`}>
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 text-xs h-7" data-testid={`btn-open-chart-${p.id}`}>
                <FileText className="w-3.5 h-3.5" /> Open chart
              </Button>
            </Link>
            <Link href={`/chart/${p.id}`}>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
