import { db } from "./db";
import {
  patients, encounters, appointments, clinicalNotes, charges, claims, payments,
  problems, communications, campaigns, referrals,
} from "@shared/schema";
import { crmStorage } from "./crm-storage";
import { storage as imagingStorage } from "./storage";
import { format, parseISO, differenceInDays } from "date-fns";

// Organization-wide analytics. The dataset is a small demo panel (20 patients),
// so aggregation happens in JS after narrow selects — simpler and flexible.

const monthKey = (d: Date | string) =>
  typeof d === "string" ? d.slice(0, 7) : format(d, "yyyy-MM");

function inRange(dateStr: string, from?: string, to?: string) {
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

const dateOf = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : format(d, "yyyy-MM-dd"));

export interface OverviewFilters { from?: string; to?: string }

export const analyticsStorage = {
  async getOverview({ from, to }: OverviewFilters = {}) {
    const [encs, appts, notes, chgs, clms, pays, studies, analyses] = await Promise.all([
      db.select().from(encounters),
      db.select().from(appointments),
      db.select({ author: clinicalNotes.author, status: clinicalNotes.status, aiAssisted: clinicalNotes.aiAssisted, createdAt: clinicalNotes.createdAt }).from(clinicalNotes),
      db.select({ serviceDate: charges.serviceDate, units: charges.units, unitPriceCents: charges.unitPriceCents, status: charges.status, aiSuggested: charges.aiSuggested }).from(charges),
      db.select({ status: claims.status, totalCents: claims.totalCents, paidCents: claims.paidCents }).from(claims),
      db.select({ postedAt: payments.postedAt, amountCents: payments.amountCents, source: payments.source }).from(payments),
      // Imaging & AI analyses live in the in-memory imaging store, not Postgres.
      imagingStorage.getAllImagingStudies(),
      imagingStorage.getAllAiAnalyses(),
    ]);

    const fEncs = encs.filter((e) => inRange(dateOf(e.encounterDate), from, to));
    const fNotes = notes.filter((n) => !n.createdAt || inRange(dateOf(n.createdAt), from, to));
    const fAppts = appts.filter((a) => inRange(a.appointmentDate, from, to));
    const fChgs = chgs.filter((c) => inRange(c.serviceDate, from, to));
    const fPays = pays.filter((p) => inRange(dateOf(p.postedAt), from, to));

    // Patient volume trend: encounters per month
    const volumeByMonth = new Map<string, number>();
    for (const e of fEncs) {
      const k = monthKey(dateOf(e.encounterDate));
      volumeByMonth.set(k, (volumeByMonth.get(k) ?? 0) + 1);
    }

    // Encounter mix
    const mix = new Map<string, number>();
    for (const e of fEncs) mix.set(e.encounterType, (mix.get(e.encounterType) ?? 0) + 1);

    // Provider productivity: encounters + signed notes per provider
    const prod = new Map<string, { encounters: number; signedNotes: number }>();
    for (const e of fEncs) {
      const p = prod.get(e.provider) ?? { encounters: 0, signedNotes: 0 };
      p.encounters++; prod.set(e.provider, p);
    }
    for (const n of fNotes) {
      if (n.status !== "signed") continue;
      const p = prod.get(n.author) ?? { encounters: 0, signedNotes: 0 };
      p.signedNotes++; prod.set(n.author, p);
    }

    // Appointment stats
    const apptByStatus = new Map<string, number>();
    for (const a of fAppts) apptByStatus.set(a.status, (apptByStatus.get(a.status) ?? 0) + 1);
    const concluded = (apptByStatus.get("completed") ?? 0) + (apptByStatus.get("no-show") ?? 0) + (apptByStatus.get("cancelled") ?? 0);
    const noShowRate = concluded ? Math.round(((apptByStatus.get("no-show") ?? 0) / concluded) * 1000) / 10 : 0;

    // Revenue cycle
    const chargedByMonth = new Map<string, number>();
    for (const c of fChgs) {
      const k = monthKey(c.serviceDate);
      chargedByMonth.set(k, (chargedByMonth.get(k) ?? 0) + c.units * c.unitPriceCents);
    }
    const collectedByMonth = new Map<string, number>();
    for (const p of fPays) {
      const k = monthKey(dateOf(p.postedAt));
      collectedByMonth.set(k, (collectedByMonth.get(k) ?? 0) + p.amountCents);
    }
    const claimsByStatus = new Map<string, { count: number; totalCents: number; paidCents: number }>();
    for (const c of clms) {
      const cur = claimsByStatus.get(c.status) ?? { count: 0, totalCents: 0, paidCents: 0 };
      cur.count++; cur.totalCents += c.totalCents; cur.paidCents += c.paidCents;
      claimsByStatus.set(c.status, cur);
    }
    const totalChargedCents = fChgs.reduce((s, c) => s + c.units * c.unitPriceCents, 0);
    const totalCollectedCents = fPays.reduce((s, p) => s + p.amountCents, 0);

    // AI & imaging utilization
    const studiesByType = new Map<string, number>();
    for (const s of studies) studiesByType.set(s.studyType, (studiesByType.get(s.studyType) ?? 0) + 1);

    const months = Array.from(new Set([
      ...Array.from(volumeByMonth.keys()),
      ...Array.from(chargedByMonth.keys()),
      ...Array.from(collectedByMonth.keys()),
    ])).sort();
    // Fill gaps so trend charts show months with zero activity
    if (months.length > 1) {
      const filled: string[] = [];
      let [y, m] = months[0].split("-").map(Number);
      const [endY, endM] = months[months.length - 1].split("-").map(Number);
      while (y < endY || (y === endY && m <= endM)) {
        filled.push(`${y}-${String(m).padStart(2, "0")}`);
        m++; if (m > 12) { m = 1; y++; }
      }
      months.splice(0, months.length, ...filled);
    }

    return {
      volumeTrend: months.map((m) => ({ month: m, encounters: volumeByMonth.get(m) ?? 0 })),
      encounterMix: Array.from(mix, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      providerProductivity: Array.from(prod, ([provider, v]) => ({ provider, ...v })).sort((a, b) => b.encounters - a.encounters),
      appointments: {
        total: fAppts.length,
        byStatus: Array.from(apptByStatus, ([status, count]) => ({ status, count })),
        noShowRate,
      },
      revenue: {
        totalChargedCents,
        totalCollectedCents,
        collectionRate: totalChargedCents ? Math.round((totalCollectedCents / totalChargedCents) * 1000) / 10 : 0,
        byMonth: months.map((m) => ({ month: m, chargedCents: chargedByMonth.get(m) ?? 0, collectedCents: collectedByMonth.get(m) ?? 0 })),
        claimsByStatus: Array.from(claimsByStatus, ([status, v]) => ({ status, ...v })),
      },
      aiImaging: {
        imagingStudies: studies.length,
        studiesByType: Array.from(studiesByType, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        aiAnalyses: analyses.length,
        aiAssistedNotes: fNotes.filter((n) => n.aiAssisted).length,
        aiSuggestedCharges: fChgs.filter((c) => c.aiSuggested).length,
      },
    };
  },

  // ---- Population health cohort explorer ----
  async getCohort(filters: {
    icd10Prefix?: string; ageMin?: number; ageMax?: number; gender?: string;
    engagementStatus?: string; careGapKind?: string;
  }) {
    const panel = await crmStorage.getPanel();
    const probs = await db.select({ patientId: problems.patientId, name: problems.name, icd10Code: problems.icd10Code, status: problems.status }).from(problems);
    const probsBy = new Map<string, { name: string; icd10Code: string | null; status: string }[]>();
    for (const p of probs) {
      if (!probsBy.has(p.patientId)) probsBy.set(p.patientId, []);
      probsBy.get(p.patientId)!.push(p);
    }
    const rows = panel
      .map((r) => ({ ...r, conditions: (probsBy.get(r.patientId) ?? []).filter((p) => p.status !== "resolved") }))
      .filter((r) => {
        if (filters.ageMin != null && r.age < filters.ageMin) return false;
        if (filters.ageMax != null && r.age > filters.ageMax) return false;
        if (filters.gender && !r.gender.toLowerCase().startsWith(filters.gender.toLowerCase())) return false;
        if (filters.engagementStatus && r.engagementStatus !== filters.engagementStatus) return false;
        if (filters.icd10Prefix && !r.conditions.some((c) => c.icd10Code?.toUpperCase().startsWith(filters.icd10Prefix!.toUpperCase()))) return false;
        if (filters.careGapKind && !r.careGaps.some((g) => g.kind === filters.careGapKind)) return false;
        return true;
      });
    return {
      total: rows.length,
      patients: rows,
      breakdown: {
        byEngagement: countBy(rows, (r) => r.engagementStatus),
        byGender: countBy(rows, (r) => r.gender),
        byCareGap: countBy(rows.flatMap((r) => r.careGaps), (g) => g.label),
      },
    };
  },

  // ---- Report builder ----
  async runReport(opts: { domain: "clinical" | "operational" | "financial"; groupBy: string; from?: string; to?: string }) {
    const { domain, groupBy, from, to } = opts;
    const pts = await db.select({ id: patients.id, name: patients.name }).from(patients);
    const nameOf = new Map(pts.map((p) => [p.id, p.name]));

    if (domain === "clinical") {
      const encs = (await db.select().from(encounters)).filter((e) => inRange(dateOf(e.encounterDate), from, to));
      const keyFn: Record<string, (e: typeof encs[number]) => string> = {
        type: (e) => e.encounterType, provider: (e) => e.provider, status: (e) => e.status,
        month: (e) => monthKey(dateOf(e.encounterDate)), department: (e) => e.department ?? "—",
      };
      const fn = keyFn[groupBy] ?? keyFn.type;
      const grouped = countBy(encs, fn);
      return {
        columns: [col(groupBy), { key: "count", label: "Encounters" }],
        rows: grouped.map((g) => ({ [groupBy]: g.key, count: g.count })),
        detail: encs.map((e) => ({
          date: dateOf(e.encounterDate), patient: nameOf.get(e.patientId) ?? e.patientId,
          type: e.encounterType, provider: e.provider, status: e.status, reason: e.reason,
        })),
      };
    }
    if (domain === "operational") {
      const appts = (await db.select().from(appointments)).filter((a) => inRange(a.appointmentDate, from, to));
      const keyFn: Record<string, (a: typeof appts[number]) => string> = {
        status: (a) => a.status, provider: (a) => a.provider, visitType: (a) => a.visitType,
        department: (a) => a.department, date: (a) => a.appointmentDate, month: (a) => monthKey(a.appointmentDate),
      };
      const fn = keyFn[groupBy] ?? keyFn.status;
      const grouped = countBy(appts, fn);
      return {
        columns: [col(groupBy), { key: "count", label: "Appointments" }],
        rows: grouped.map((g) => ({ [groupBy]: g.key, count: g.count })),
        detail: appts.map((a) => ({
          date: a.appointmentDate, time: a.appointmentTime, patient: nameOf.get(a.patientId) ?? a.patientId,
          provider: a.provider, visitType: a.visitType, status: a.status, reason: a.reason,
        })),
      };
    }
    // financial
    const chgs = (await db.select().from(charges)).filter((c) => inRange(c.serviceDate, from, to));
    const keyFn: Record<string, (c: typeof chgs[number]) => string> = {
      status: (c) => c.status, cpt: (c) => `${c.cptCode} — ${c.description}`, provider: (c) => c.provider,
      month: (c) => monthKey(c.serviceDate),
    };
    const fn = keyFn[groupBy] ?? keyFn.status;
    const groups = new Map<string, { count: number; totalCents: number }>();
    for (const c of chgs) {
      const k = fn(c);
      const cur = groups.get(k) ?? { count: 0, totalCents: 0 };
      cur.count++; cur.totalCents += c.units * c.unitPriceCents;
      groups.set(k, cur);
    }
    return {
      columns: [col(groupBy), { key: "count", label: "Charges" }, { key: "totalCents", label: "Total", format: "usd" }],
      rows: Array.from(groups, ([k, v]) => ({ [groupBy]: k, count: v.count, totalCents: v.totalCents })).sort((a: any, b: any) => b.totalCents - a.totalCents),
      detail: chgs.map((c) => ({
        serviceDate: c.serviceDate, patient: nameOf.get(c.patientId) ?? c.patientId, cptCode: c.cptCode,
        description: c.description, units: c.units, totalCents: c.units * c.unitPriceCents, status: c.status, provider: c.provider,
      })),
    };
  },

  /** Compact org-wide snapshot for Ari analytics Q&A. */
  async getSnapshotText(): Promise<string> {
    const [overview, panel, refs, camps, comms] = await Promise.all([
      this.getOverview(),
      crmStorage.getPanel(),
      db.select({ status: referrals.status }).from(referrals),
      db.select({ status: campaigns.status }).from(campaigns),
      db.select({ channel: communications.channel }).from(communications),
    ]);
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const gapCounts = countBy(panel.flatMap((p) => p.careGaps), (g) => g.label);
    const diabetics = panel.filter((p) => p.careGaps.some((g) => g.kind === "diabetes"));
    return [
      `PANEL: ${panel.length} patients — engagement: ${countBy(panel, (p) => p.engagementStatus).map((c) => `${c.key} ${c.count}`).join(", ")}; VIPs: ${panel.filter((p) => p.vip).length}`,
      `ENCOUNTERS BY MONTH: ${overview.volumeTrend.map((v) => `${v.month}: ${v.encounters}`).join(", ")}`,
      `ENCOUNTER MIX: ${overview.encounterMix.map((m) => `${m.type} ${m.count}`).join(", ")}`,
      `PROVIDER PRODUCTIVITY (encounters/signed notes): ${overview.providerProductivity.map((p) => `${p.provider}: ${p.encounters}/${p.signedNotes}`).join("; ")}`,
      `APPOINTMENTS: ${overview.appointments.total} total — ${overview.appointments.byStatus.map((s) => `${s.status} ${s.count}`).join(", ")}; no-show rate ${overview.appointments.noShowRate}%`,
      `REVENUE: charged ${usd(overview.revenue.totalChargedCents)}, collected ${usd(overview.revenue.totalCollectedCents)} (${overview.revenue.collectionRate}%); claims: ${overview.revenue.claimsByStatus.map((c) => `${c.status} ${c.count} (${usd(c.totalCents)})`).join(", ")}`,
      `CARE GAPS: ${gapCounts.map((g) => `${g.key}: ${g.count}`).join("; ") || "none"}`,
      `DIABETIC PATIENTS WITH OVERDUE HbA1c: ${diabetics.length}${diabetics.length ? ` (${diabetics.map((d) => d.name).join(", ")})` : ""}`,
      `IMAGING/AI: ${overview.aiImaging.imagingStudies} imaging studies, ${overview.aiImaging.aiAnalyses} AI analyses, ${overview.aiImaging.aiAssistedNotes} AI-assisted notes, ${overview.aiImaging.aiSuggestedCharges} AI-suggested charges`,
      `REFERRALS: ${countBy(refs, (r) => r.status).map((c) => `${c.key} ${c.count}`).join(", ") || "none"}`,
      `CAMPAIGNS: ${countBy(camps, (c) => c.status).map((c) => `${c.key} ${c.count}`).join(", ") || "none"}; COMMUNICATIONS LOGGED: ${comms.length}`,
    ].join("\n");
  },
};

function countBy<T>(items: T[], fn: (t: T) => string): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(fn(i), (m.get(fn(i)) ?? 0) + 1);
  return Array.from(m, ([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

function col(groupBy: string) {
  const labels: Record<string, string> = {
    type: "Encounter type", provider: "Provider", status: "Status", month: "Month", department: "Department",
    visitType: "Visit type", date: "Date", cpt: "CPT code",
  };
  return { key: groupBy, label: labels[groupBy] ?? groupBy };
}
