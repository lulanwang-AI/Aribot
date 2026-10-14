import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "./api";
import type {
  Allergy,
  Appointment,
  ClinicalNote,
  Encounter,
  InBasketMessage,
  Medication,
  Order,
  Patient,
  Problem,
  Vital,
} from "../../ari-emr/shared/schema";

/**
 * Typed client for the EMR API plus the formatting vocabulary the screens
 * share. Record types are the server's own Drizzle row types (type-only import,
 * erased at build time).
 */

export type { Allergy, Appointment, ClinicalNote, Encounter, InBasketMessage, Medication, Order, Patient, Problem, Vital };

export interface SoapDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface DifferentialItem {
  diagnosis: string;
  likelihood: "high" | "moderate" | "low" | string;
  rationale: string;
  nextSteps?: string[];
}

export const emrApi = {
  patients: () => api<Patient[]>("/api/patients"),
  patient: (id: string) => api<Patient>(`/api/patients/${encodeURIComponent(id)}`),
  encounters: () => api<Encounter[]>("/api/encounters"),
  patientEncounters: (id: string) => api<Encounter[]>(`/api/patients/${encodeURIComponent(id)}/encounters`),
  problems: (id: string) => api<Problem[]>(`/api/patients/${encodeURIComponent(id)}/problems`),
  medications: (id: string) => api<Medication[]>(`/api/patients/${encodeURIComponent(id)}/medications`),
  allergies: (id: string) => api<Allergy[]>(`/api/patients/${encodeURIComponent(id)}/allergies`),
  vitals: (id: string) => api<Vital[]>(`/api/patients/${encodeURIComponent(id)}/vitals`),
  orders: (id: string) => api<Order[]>(`/api/patients/${encodeURIComponent(id)}/orders`),
  appointments: (date?: string) => api<Appointment[]>(`/api/appointments${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  patientAppointments: (id: string) => api<Appointment[]>(`/api/patients/${encodeURIComponent(id)}/appointments`),
  updateAppointment: (id: string, patch: Partial<Appointment>) =>
    api<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  patientNotes: (id: string) => api<ClinicalNote[]>(`/api/patients/${encodeURIComponent(id)}/notes`),
  encounterNotes: (id: string) => api<ClinicalNote[]>(`/api/encounters/${encodeURIComponent(id)}/notes`),
  note: (id: string) => api<ClinicalNote>(`/api/notes/${encodeURIComponent(id)}`),
  createNote: (body: {
    patientId: string;
    encounterId?: string | null;
    noteType: "soap" | "progress" | "consult";
    title: string;
    author: string;
    aiAssisted: boolean;
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    content?: string | null;
  }) => api<ClinicalNote>("/api/notes", { method: "POST", body }),
  updateNote: (id: string, patch: Partial<SoapDraft> & { title?: string; content?: string }) =>
    api<ClinicalNote>(`/api/notes/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  signNote: (id: string, signedBy: string) => api<ClinicalNote>(`/api/notes/${encodeURIComponent(id)}/sign`, { method: "POST", body: { signedBy } }),
  addAddendum: (id: string, text: string, author: string) =>
    api<ClinicalNote>(`/api/notes/${encodeURIComponent(id)}/addendum`, { method: "POST", body: { text, author } }),
  inbasket: (filter?: { category?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filter?.category) params.set("category", filter.category);
    if (filter?.status) params.set("status", filter.status);
    const qs = params.toString();
    return api<InBasketMessage[]>(`/api/inbasket${qs ? `?${qs}` : ""}`);
  },
  unreadCounts: () => api<{ total: number; byCategory: Record<string, number> }>("/api/inbasket/unread-counts"),
  markRead: (id: string, read = true) => api<InBasketMessage>(`/api/inbasket/${encodeURIComponent(id)}/read`, { method: "POST", body: { read } }),
  setMessageStatus: (id: string, status: "open" | "done") =>
    api<InBasketMessage>(`/api/inbasket/${encodeURIComponent(id)}/status`, { method: "POST", body: { status } }),
  ariStatus: () => api<{ available: boolean }>("/api/ari/status"),
  draftNote: (encounterId: string) => api<{ draft: SoapDraft; title: string; ai: boolean }>("/api/ari/draft-note", { method: "POST", body: { encounterId } }),
  structureNarrative: (narrative: string, patientId?: string) =>
    api<{ draft: SoapDraft; ai: boolean }>("/api/ari/structure-narrative", { method: "POST", body: { narrative, patientId } }),
  transform: (text: string, mode: "summarize" | "expand" | "restructure") =>
    api<{ result: string; ai: boolean }>("/api/ari/transform", { method: "POST", body: { text, mode } }),
  differential: (patientId: string, presentation: string) =>
    api<{ differentials: DifferentialItem[]; disclaimer: string; ai: boolean }>("/api/ari/differential", { method: "POST", body: { patientId, presentation } }),
  chartQA: (patientId: string, question: string) =>
    api<{ answer: string; ai: boolean }>("/api/ari/chart-qa", { method: "POST", body: { patientId, question } }),
};

/* ------------------------------------------------------------------ */
/* Shared queries                                                      */
/* ------------------------------------------------------------------ */

export function usePatients() {
  const q = useQuery({ queryKey: ["patients"], queryFn: emrApi.patients, staleTime: 60_000 });
  const byId = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of q.data ?? []) map.set(p.id, p);
    return map;
  }, [q.data]);
  return { ...q, byId };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "-";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "09:30" → "9:30 AM" in the device locale. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function patientLine(p: Patient | undefined): string {
  if (!p) return "Unknown patient";
  return `${p.age} y, ${p.gender} · MRN ${p.patientId}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export type Tone = "default" | "primary" | "good" | "warn" | "bad" | "muted";

export function appointmentTone(status: string): Tone {
  switch (status) {
    case "checked-in":
    case "in-progress":
      return "primary";
    case "completed":
    case "confirmed":
      return "good";
    case "cancelled":
    case "no-show":
      return "bad";
    default:
      return "muted";
  }
}

export function encounterTone(status: string): Tone {
  if (status === "open" || status === "in-progress") return "primary";
  if (status === "closed") return "muted";
  return "muted";
}

export function priorityTone(priority: string): Tone {
  if (priority === "urgent" || priority === "stat") return "bad";
  if (priority === "high") return "warn";
  return "muted";
}

export function severityTone(severity: string | null | undefined): Tone {
  if (severity === "severe" || severity === "life-threatening") return "bad";
  if (severity === "moderate") return "warn";
  if (severity === "mild") return "good";
  return "muted";
}

export function titleCase(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function vitalSummary(v: Vital | undefined): string {
  if (!v) return "No vitals recorded";
  const parts: string[] = [];
  if (v.systolic && v.diastolic) parts.push(`BP ${v.systolic}/${v.diastolic}`);
  if (v.heartRate) parts.push(`HR ${v.heartRate}`);
  if (v.temperature) parts.push(`T ${v.temperature}°F`);
  if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}`);
  if (v.oxygenSaturation) parts.push(`SpO₂ ${v.oxygenSaturation}%`);
  if (v.pain != null) parts.push(`Pain ${v.pain}/10`);
  return parts.join(" · ") || "No vitals recorded";
}
