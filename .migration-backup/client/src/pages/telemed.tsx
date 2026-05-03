import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role";
import type { TelemedConsultation, TelemedEarnings } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Video, Phone, PhoneOff, Mic, MicOff, Monitor, Camera, CameraOff,
  Clock, DollarSign, Activity, User, Heart, Thermometer, AlertCircle,
  CheckCircle, XCircle, Filter, Calendar, FileText, Stethoscope, Plus,
  Send, Timer, GraduationCap,
} from "lucide-react";

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const mins = Math.floor(absDiff / 60000);
    if (mins < 60) return `in ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `in ${hrs}h`;
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function urgencyVariant(urgency: string): "default" | "secondary" | "destructive" | "outline" {
  switch (urgency) {
    case "urgent": return "destructive";
    default: return "secondary";
  }
}

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case "low": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "accepted": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "in-progress": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "";
  }
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case "paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "processing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default: return "";
  }
}

type TelemedStats = {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  todayCount: number;
};

export default function Telemed() {
  const [activeTab, setActiveTab] = useState("inquiries");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [role] = useRole();
  const isMedStudent = role === "medstudent";

  function handleJoinCall(consultationId: string) {
    if (isMedStudent) return;
    setActiveCallId(consultationId);
    setActiveTab("video");
  }

  function handleEndCall() {
    setActiveCallId(null);
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-telemed">
      {isMedStudent && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30 p-3" data-testid="banner-medstudent-telemed">
          <GraduationCap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Observer Access — Med Student Mode</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              You can view telemedicine consultations and inquiries, but joining video calls requires a verified MD/DO license. Switch to Physician mode in the sidebar if you hold a license.
            </p>
          </div>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4 pt-4 pb-0">
          <TabsList data-testid="tabs-telemed">
            <TabsTrigger value="inquiries" data-testid="tab-inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="my-consultations" data-testid="tab-my-consultations">My Consultations</TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-video">
              <Video className="h-4 w-4 mr-1.5" />
              Video Call
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings">
              <DollarSign className="h-4 w-4 mr-1.5" />
              Earnings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inquiries" className="flex-1 overflow-auto mt-0 p-4 md:p-6">
          <InquiriesTab onJoinCall={handleJoinCall} />
        </TabsContent>

        <TabsContent value="my-consultations" className="flex-1 overflow-auto mt-0 p-4 md:p-6">
          <MyConsultationsTab />
        </TabsContent>

        <TabsContent value="video" className="flex-1 overflow-hidden mt-0">
          <VideoCallTab activeCallId={activeCallId} onEndCall={handleEndCall} />
        </TabsContent>

        <TabsContent value="earnings" className="flex-1 overflow-auto mt-0 p-4 md:p-6">
          <EarningsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InquiriesTab({ onJoinCall }: { onJoinCall: (id: string) => void }) {
  const [available, setAvailable] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (urgencyFilter !== "all") queryParams.set("urgency", urgencyFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const qs = queryParams.toString();

  const { data: consultations, isLoading } = useQuery<TelemedConsultation[]>({
    queryKey: ["/api/telemed/consultations", qs],
    queryFn: () => fetch(`/api/telemed/consultations${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });

  const { data: stats } = useQuery<TelemedStats>({
    queryKey: ["/api/telemed/stats"],
  });

  const { data: earnings } = useQuery<TelemedEarnings>({
    queryKey: ["/api/telemed/earnings"],
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/telemed/consultations/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemed/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telemed/stats"] });
      toast({ title: "Consultation accepted", description: "You can now join the video call." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = consultations?.filter(c =>
    c.status === "pending" || c.status === "accepted"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-telemed-title">
            <Stethoscope className="h-5 w-5 text-primary" />
            Telemedicine
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage virtual consultations and patient inquiries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="availability-toggle" className="text-sm">
            {available ? "Available" : "Unavailable"}
          </Label>
          <Switch
            id="availability-toggle"
            checked={available}
            onCheckedChange={setAvailable}
            data-testid="switch-availability"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="stat-pending">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-pending-count">
              {stats?.pending ?? <Skeleton className="h-7 w-8 inline-block" />}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="stat-today">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-today-count">
              {stats?.todayCount ?? <Skeleton className="h-7 w-8 inline-block" />}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="stat-completed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-completed-count">
              {stats?.completed ?? <Skeleton className="h-7 w-8 inline-block" />}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="stat-weekly-earnings">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-weekly-earnings">
              {earnings ? formatCurrency(earnings.thisWeek) : <Skeleton className="h-7 w-16 inline-block" />}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-40" data-testid="select-urgency-filter">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      )}

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No consultations found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered?.map(consultation => (
          <ConsultationCard
            key={consultation.id}
            consultation={consultation}
            onAccept={() => acceptMutation.mutate(consultation.id)}
            onJoinCall={() => onJoinCall(consultation.id)}
            isAccepting={acceptMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ConsultationCard({
  consultation,
  onAccept,
  onJoinCall,
  isAccepting,
}: {
  consultation: TelemedConsultation;
  onAccept: () => void;
  onJoinCall: () => void;
  isAccepting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [role] = useRole();
  const isMedStudent = role === "medstudent";
  const v = consultation.vitals;
  const hasVitals = v && (v.bp || v.heartRate || v.temp || v.spo2 || v.weight);

  return (
    <Card className="hover-elevate" data-testid={`card-consultation-${consultation.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {consultation.patientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold" data-testid={`text-patient-name-${consultation.id}`}>
                {consultation.patientName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {consultation.patientAge}y / {consultation.patientGender}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`no-default-hover-elevate no-default-active-elevate ${urgencyColor(consultation.urgency)}`} data-testid={`badge-urgency-${consultation.id}`}>
              {consultation.urgency.charAt(0).toUpperCase() + consultation.urgency.slice(1)}
            </Badge>
            <Badge className={`no-default-hover-elevate no-default-active-elevate ${statusColor(consultation.status)}`} data-testid={`badge-status-${consultation.id}`}>
              {consultation.status}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium" data-testid={`text-complaint-${consultation.id}`}>
            {consultation.chiefComplaint}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {consultation.symptoms.map((symptom, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px]">
                {symptom}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(consultation.scheduledAt)}
          </span>
          {consultation.insuranceProvider && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {consultation.insuranceProvider}
            </span>
          )}
          {consultation.duration > 0 && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {consultation.duration} min
            </span>
          )}
        </div>

        {hasVitals && (
          <div className="flex items-center gap-4 text-xs flex-wrap p-2 rounded-md bg-muted/50">
            {v.bp && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                BP: {v.bp}
              </span>
            )}
            {v.heartRate && (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-red-500" />
                HR: {v.heartRate}
              </span>
            )}
            {v.temp && (
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-orange-500" />
                {v.temp}
              </span>
            )}
            {v.spo2 && (
              <span className="flex items-center gap-1">
                SpO2: {v.spo2}%
              </span>
            )}
            {v.weight && (
              <span className="flex items-center gap-1">
                Wt: {v.weight}
              </span>
            )}
          </div>
        )}

        {consultation.patientHistory && (
          <div>
            <button
              className="text-xs text-primary font-medium flex items-center gap-1"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-history-${consultation.id}`}
            >
              <FileText className="h-3 w-3" />
              {expanded ? "Hide" : "Show"} Patient History
            </button>
            {expanded && (
              <p className="text-xs text-muted-foreground mt-2 p-2 rounded-md bg-muted/50 whitespace-pre-line">
                {consultation.patientHistory}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          {consultation.status === "pending" && (
            <Button
              onClick={onAccept}
              disabled={isAccepting}
              data-testid={`button-accept-${consultation.id}`}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              {isAccepting ? "Accepting..." : "Accept"}
            </Button>
          )}
          {consultation.status === "accepted" && (
            <Button
              onClick={onJoinCall}
              data-testid={`button-join-call-${consultation.id}`}
              disabled={isMedStudent}
              title={isMedStudent ? "Joining calls requires MD/DO verification" : undefined}
            >
              <Video className="h-4 w-4 mr-1.5" />
              Join Call
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyConsultationsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConsultation, setSelectedConsultation] = useState<TelemedConsultation | null>(null);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const qs = queryParams.toString();

  const { data: consultations, isLoading } = useQuery<TelemedConsultation[]>({
    queryKey: ["/api/telemed/consultations", "my", qs],
    queryFn: () => fetch(`/api/telemed/consultations${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });

  const myConsultations = consultations?.filter(c =>
    c.status === "accepted" || c.status === "in-progress" || c.status === "completed"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          My Consultations
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-my-status-filter">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {!isLoading && myConsultations?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No consultations yet</p>
        </div>
      )}

      <div className="space-y-3">
        {myConsultations?.map(c => (
          <Card
            key={c.id}
            className="hover-elevate cursor-pointer"
            onClick={() => setSelectedConsultation(c)}
            data-testid={`card-my-consultation-${c.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {c.patientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{c.patientName}</p>
                    <p className="text-xs text-muted-foreground">{c.chiefComplaint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${statusColor(c.status)}`}>
                    {c.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(c.scheduledAt)}
                  </span>
                  {c.earnings > 0 && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(c.earnings)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!selectedConsultation} onOpenChange={(open) => { if (!open) setSelectedConsultation(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg" data-testid="sheet-consultation-detail">
          {selectedConsultation && (
            <ConsultationDetailSheet consultation={selectedConsultation} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ConsultationDetailSheet({ consultation }: { consultation: TelemedConsultation }) {
  const c = consultation;
  const v = c.vitals;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {c.patientName}
        </SheetTitle>
      </SheetHeader>
      <div className="space-y-5 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`no-default-hover-elevate no-default-active-elevate ${statusColor(c.status)}`}>{c.status}</Badge>
          <Badge className={`no-default-hover-elevate no-default-active-elevate ${urgencyColor(c.urgency)}`}>{c.urgency}</Badge>
          {c.paymentStatus && (
            <Badge className={`no-default-hover-elevate no-default-active-elevate ${paymentStatusColor(c.paymentStatus)}`}>{c.paymentStatus}</Badge>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Patient Info</p>
          <p className="text-sm">{c.patientAge}y / {c.patientGender}</p>
          {c.insuranceProvider && <p className="text-sm">Insurance: {c.insuranceProvider}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Chief Complaint</p>
          <p className="text-sm font-medium">{c.chiefComplaint}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.symptoms.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>

        {v && (v.bp || v.heartRate || v.temp || v.spo2 || v.weight) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Vitals</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {v.bp && <span>BP: {v.bp}</span>}
              {v.heartRate && <span>HR: {v.heartRate} bpm</span>}
              {v.temp && <span>Temp: {v.temp}</span>}
              {v.spo2 && <span>SpO2: {v.spo2}%</span>}
              {v.weight && <span>Weight: {v.weight}</span>}
            </div>
          </div>
        )}

        {c.notes && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-line">{c.notes}</p>
          </div>
        )}

        {c.diagnosis && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Diagnosis</p>
            <p className="text-sm font-medium">{c.diagnosis}</p>
          </div>
        )}

        {c.prescriptions && c.prescriptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Prescriptions</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {c.prescriptions.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {c.patientHistory && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Patient History</p>
            <p className="text-sm whitespace-pre-line">{c.patientHistory}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Scheduled: {formatTimeAgo(c.scheduledAt)}</span>
          {c.duration > 0 && <span>Duration: {c.duration} min</span>}
          {c.earnings > 0 && <span>Earnings: {formatCurrency(c.earnings)}</span>}
        </div>
      </div>
    </>
  );
}

function VideoCallTab({ activeCallId, onEndCall }: { activeCallId: string | null; onEndCall: () => void }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [notes, setNotes] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const { data: consultation } = useQuery<TelemedConsultation>({
    queryKey: ["/api/telemed/consultations", activeCallId],
    enabled: !!activeCallId,
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/telemed/consultations/${activeCallId}/notes`, { notes }),
    onSuccess: () => {
      toast({ title: "Notes saved" });
    },
  });

  useEffect(() => {
    if (activeCallId) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCallId]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!activeCallId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Video className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold mb-2" data-testid="text-no-active-call">No Active Call</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Accept a consultation from the Inquiries tab and click "Join Call" to start a video consultation with your patient.
        </p>
      </div>
    );
  }

  const v = consultation?.vitals;

  return (
    <>
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-gray-900 dark:bg-black relative flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Video Feed</p>
              {consultation && (
                <p className="text-gray-400 text-xs mt-1">{consultation.patientName}</p>
              )}
            </div>

            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded-md border border-gray-700 flex items-center justify-center" data-testid="self-view">
              <div className="text-center">
                <User className="h-6 w-6 text-gray-500 mx-auto" />
                <p className="text-gray-500 text-[10px] mt-1">You</p>
              </div>
            </div>

            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-md px-3 py-1.5">
              <Timer className="h-4 w-4 text-red-400" />
              <span className="text-white text-sm font-mono" data-testid="text-call-timer">
                {formatDuration(callDuration)}
              </span>
            </div>
          </div>

          <div className="bg-gray-900 dark:bg-black border-t border-gray-800 p-3 flex items-center justify-center gap-3">
            <Button
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              onClick={() => setIsMuted(!isMuted)}
              data-testid="button-mute"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant={!isVideoOn ? "destructive" : "secondary"}
              onClick={() => setIsVideoOn(!isVideoOn)}
              data-testid="button-video-toggle"
            >
              {isVideoOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant={isScreenSharing ? "default" : "secondary"}
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              data-testid="button-screen-share"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={() => setShowEndDialog(true)}
              data-testid="button-end-call"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="w-80 border-l bg-background overflow-y-auto shrink-0 hidden md:block">
          <div className="p-4 space-y-4">
            {consultation && (
              <>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Patient Info
                  </h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="font-medium">{consultation.patientName}</p>
                    <p className="text-muted-foreground">{consultation.patientAge}y / {consultation.patientGender}</p>
                    <p className="text-muted-foreground">{consultation.chiefComplaint}</p>
                    {consultation.insuranceProvider && (
                      <p className="text-muted-foreground text-xs">{consultation.insuranceProvider}</p>
                    )}
                  </div>
                </div>

                {v && (v.bp || v.heartRate || v.temp || v.spo2 || v.weight) && (
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Vitals
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {v.bp && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> BP</span>
                          <span>{v.bp}</span>
                        </div>
                      )}
                      {v.heartRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> HR</span>
                          <span>{v.heartRate} bpm</span>
                        </div>
                      )}
                      {v.temp && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temp</span>
                          <span>{v.temp}</span>
                        </div>
                      )}
                      {v.spo2 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">SpO2</span>
                          <span>{v.spo2}%</span>
                        </div>
                      )}
                      {v.weight && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Weight</span>
                          <span>{v.weight}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Notes
                  </h3>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add consultation notes..."
                    className="min-h-[120px] text-sm"
                    data-testid="textarea-call-notes"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveNotesMutation.mutate()}
                    disabled={saveNotesMutation.isPending}
                    data-testid="button-save-notes"
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <EndCallDialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        consultationId={activeCallId}
        onCompleted={() => {
          setShowEndDialog(false);
          onEndCall();
          if (timerRef.current) clearInterval(timerRef.current);
        }}
      />
    </>
  );
}

function EndCallDialog({
  open,
  onClose,
  consultationId,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  consultationId: string;
  onCompleted: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/telemed/consultations/${consultationId}/complete`, {
        notes,
        diagnosis,
        prescriptions: prescriptions.split("\n").map(p => p.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telemed/consultations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telemed/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telemed/earnings"] });
      toast({ title: "Consultation completed", description: "Notes and diagnosis saved." });
      onCompleted();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="dialog-end-call">
        <DialogHeader>
          <DialogTitle>Complete Consultation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Consultation notes..."
              className="min-h-[80px]"
              data-testid="input-end-notes"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="Primary diagnosis..."
              data-testid="input-end-diagnosis"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Prescriptions (one per line)</Label>
            <Textarea
              value={prescriptions}
              onChange={e => setPrescriptions(e.target.value)}
              placeholder="Amoxicillin 500mg TID x 7 days&#10;Ibuprofen 400mg PRN"
              className="min-h-[80px]"
              data-testid="input-end-prescriptions"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-end"
            >
              Cancel
            </Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="flex-1"
              variant="destructive"
              data-testid="button-confirm-complete"
            >
              <PhoneOff className="h-4 w-4 mr-1.5" />
              {completeMutation.isPending ? "Completing..." : "End & Complete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EarningsTab() {
  const { data: earnings, isLoading: earningsLoading } = useQuery<TelemedEarnings>({
    queryKey: ["/api/telemed/earnings"],
  });

  const { data: consultations, isLoading: consultationsLoading } = useQuery<TelemedConsultation[]>({
    queryKey: ["/api/telemed/consultations", "completed"],
    queryFn: () => fetch("/api/telemed/consultations?status=completed").then(r => r.json()),
  });

  const weeklyData = [
    { day: "Mon", amount: earnings ? earnings.thisWeek * 0.12 : 0 },
    { day: "Tue", amount: earnings ? earnings.thisWeek * 0.18 : 0 },
    { day: "Wed", amount: earnings ? earnings.thisWeek * 0.22 : 0 },
    { day: "Thu", amount: earnings ? earnings.thisWeek * 0.15 : 0 },
    { day: "Fri", amount: earnings ? earnings.thisWeek * 0.2 : 0 },
    { day: "Sat", amount: earnings ? earnings.thisWeek * 0.08 : 0 },
    { day: "Sun", amount: earnings ? earnings.thisWeek * 0.05 : 0 },
  ];
  const maxAmount = Math.max(...weeklyData.map(d => d.amount), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        Earnings Overview
      </h2>

      {earningsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : earnings ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card data-testid="stat-total-earnings">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-earnings">
                {formatCurrency(earnings.totalEarnings)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-month-earnings">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-xl font-bold" data-testid="text-month-earnings">
                {formatCurrency(earnings.thisMonth)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-week-earnings">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">This Week</p>
              <p className="text-xl font-bold" data-testid="text-week-earnings">
                {formatCurrency(earnings.thisWeek)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-payout">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-payout">
                {formatCurrency(earnings.pendingPayout)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-avg-per-consultation">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Avg / Consult</p>
              <p className="text-xl font-bold" data-testid="text-avg-earnings">
                {formatCurrency(earnings.avgPerConsultation)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Weekly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{formatCurrency(d.amount)}</span>
                <div
                  className="w-full bg-primary/20 rounded-t-sm relative overflow-visible"
                  style={{ height: `${(d.amount / maxAmount) * 100}%`, minHeight: "4px" }}
                >
                  <div
                    className="absolute inset-0 bg-primary rounded-t-sm"
                    style={{ opacity: 0.7 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Completed Consultations</h3>
        {consultationsLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        )}
        {!consultationsLoading && consultations?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No completed consultations yet</p>
        )}
        <div className="space-y-2">
          {consultations?.slice(0, 10).map(c => (
            <Card key={c.id} data-testid={`card-earning-${c.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {c.patientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{c.patientName}</p>
                    <p className="text-xs text-muted-foreground">{c.chiefComplaint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(c.scheduledAt)}
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(c.earnings)}
                  </span>
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${paymentStatusColor(c.paymentStatus)}`}>
                    {c.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
