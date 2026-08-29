import { db } from "./db";
import { and, desc, eq, inArray, sql, asc } from "drizzle-orm";
import {
  patients, appointments, charges, payments, problems, orders,
  patientCrmProfiles, communications, crmTasks, campaigns, campaignMembers, referrals, inBasketMessages,
  type InsertPatientCrmProfile, type InsertCommunication, type InsertCrmTask,
  type InsertCampaign, type InsertCampaignMember, type InsertReferral, type InsertInBasketMessage,
} from "@shared/schema";
import { format, differenceInDays, parseISO } from "date-fns";

export type CareGap = { label: string; kind: string };

export type PanelRow = {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  engagementStatus: string;
  vip: boolean;
  priorityFlag: string | null;
  preferredChannel: string;
  lastVisit: string | null;
  nextVisit: string | null;
  balanceCents: number;
  careGaps: CareGap[];
  openTasks: number;
};

/** Deterministic care-gap rules derived from clinical, order, and scheduling data. */
function computeCareGaps(opts: {
  lastVisit: string | null;
  nextVisit: string | null;
  problemCodes: string[];
  orderHistory: { name: string; orderedAt: Date }[];
  age: number;
  gender: string;
  today: Date;
}): CareGap[] {
  const gaps: CareGap[] = [];
  const { lastVisit, nextVisit, problemCodes, orderHistory, age, gender, today } = opts;
  const daysSinceVisit = lastVisit ? differenceInDays(today, parseISO(lastVisit)) : Infinity;
  const has = (prefix: string) => problemCodes.some((c) => c?.startsWith(prefix));
  const daysSinceOrder = (pattern: RegExp) => {
    const matches = orderHistory.filter((o) => pattern.test(o.name));
    if (!matches.length) return Infinity;
    return Math.min(...matches.map((o) => differenceInDays(today, o.orderedAt)));
  };

  if (daysSinceVisit > 365 && !nextVisit) {
    gaps.push({ kind: "wellness", label: "Annual wellness visit overdue" });
  }
  if (has("E11") && daysSinceOrder(/a1c|hemoglobin a1c|hba1c/i) > 120) {
    gaps.push({ kind: "diabetes", label: "Diabetes: HbA1c overdue" });
  }
  if (has("I10") && daysSinceVisit > 180) gaps.push({ kind: "htn", label: "Hypertension: BP follow-up overdue" });
  if ((has("C") || has("D0")) && daysSinceVisit > 90 && !nextVisit) {
    gaps.push({ kind: "oncology", label: "Oncology surveillance follow-up not scheduled" });
  }
  if (has("J44") && daysSinceVisit > 180) gaps.push({ kind: "copd", label: "COPD: pulmonary follow-up overdue" });
  if (age >= 45 && daysSinceOrder(/colonoscopy|colorectal|fit test|cologuard/i) === Infinity) {
    gaps.push({ kind: "colorectal", label: "Colorectal cancer screening due" });
  }
  if (gender.toLowerCase().startsWith("f") && age >= 40 && daysSinceOrder(/mammogra/i) > 365) {
    gaps.push({ kind: "mammogram", label: "Screening mammogram due" });
  }
  return gaps;
}

export const crmStorage = {
  // ---- Panel ----
  async getPanel(): Promise<PanelRow[]> {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const [pts, profiles, appts, chargeSums, paymentSums, probs, taskCounts, orderRows] = await Promise.all([
      db.select().from(patients).orderBy(asc(patients.name)),
      db.select().from(patientCrmProfiles),
      db.select().from(appointments),
      db.select({ patientId: charges.patientId, total: sql<number>`sum(${charges.units} * ${charges.unitPriceCents})` })
        .from(charges).where(sql`${charges.status} != 'written-off'`).groupBy(charges.patientId),
      db.select({ patientId: payments.patientId, total: sql<number>`sum(${payments.amountCents})` })
        .from(payments).groupBy(payments.patientId),
      db.select({ patientId: problems.patientId, code: problems.icd10Code })
        .from(problems).where(inArray(problems.status, ["active", "chronic"])),
      db.select({ patientId: crmTasks.patientId, n: sql<number>`count(*)` })
        .from(crmTasks).where(eq(crmTasks.status, "open")).groupBy(crmTasks.patientId),
      db.select({ patientId: orders.patientId, name: orders.name, orderedAt: orders.orderedAt }).from(orders),
    ]);
    const ordersBy = new Map<string, { name: string; orderedAt: Date }[]>();
    for (const o of orderRows) {
      if (!ordersBy.has(o.patientId)) ordersBy.set(o.patientId, []);
      ordersBy.get(o.patientId)!.push(o);
    }
    const profileBy = new Map(profiles.map((p) => [p.patientId, p]));
    const chargeBy = new Map(chargeSums.map((c) => [c.patientId, Number(c.total)]));
    const payBy = new Map(paymentSums.map((p) => [p.patientId, Number(p.total)]));
    const probsBy = new Map<string, string[]>();
    for (const pr of probs) {
      if (!probsBy.has(pr.patientId)) probsBy.set(pr.patientId, []);
      if (pr.code) probsBy.get(pr.patientId)!.push(pr.code);
    }
    const tasksBy = new Map(taskCounts.filter((t) => t.patientId).map((t) => [t.patientId as string, Number(t.n)]));

    return pts.map((pt) => {
      const mine = appts.filter((a) => a.patientId === pt.id && a.status !== "cancelled" && a.status !== "no-show");
      const past = mine.filter((a) => a.appointmentDate <= todayStr && ["completed", "checked-in", "in-progress"].includes(a.status))
        .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
      const future = mine.filter((a) =>
        a.appointmentDate > todayStr ||
        (a.appointmentDate === todayStr && !["completed", "checked-in", "in-progress"].includes(a.status)))
        .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
      const lastVisit = past[0]?.appointmentDate ?? null;
      const nextVisit = future[0]?.appointmentDate ?? null;
      const profile = profileBy.get(pt.id);
      return {
        patientId: pt.id,
        name: pt.name,
        age: pt.age,
        gender: pt.gender,
        engagementStatus: profile?.engagementStatus ?? "engaged",
        vip: profile?.vip ?? false,
        priorityFlag: profile?.priorityFlag ?? null,
        preferredChannel: profile?.preferredChannel ?? "phone",
        lastVisit,
        nextVisit,
        balanceCents: (chargeBy.get(pt.id) ?? 0) - (payBy.get(pt.id) ?? 0),
        careGaps: computeCareGaps({
          lastVisit, nextVisit, problemCodes: probsBy.get(pt.id) ?? [],
          orderHistory: ordersBy.get(pt.id) ?? [], age: pt.age, gender: pt.gender, today,
        }),
        openTasks: tasksBy.get(pt.id) ?? 0,
      };
    });
  },

  async upsertProfile(data: InsertPatientCrmProfile) {
    const [existing] = await db.select().from(patientCrmProfiles).where(eq(patientCrmProfiles.patientId, data.patientId));
    if (existing) {
      const [row] = await db.update(patientCrmProfiles).set(data)
        .where(eq(patientCrmProfiles.patientId, data.patientId)).returning();
      return row;
    }
    const [row] = await db.insert(patientCrmProfiles).values(data).returning();
    return row;
  },

  // ---- Communications ----
  async getCommunicationsByPatient(patientId: string) {
    return db.select().from(communications).where(eq(communications.patientId, patientId))
      .orderBy(desc(communications.occurredAt));
  },
  async createCommunication(data: InsertCommunication) {
    const [row] = await db.insert(communications).values(data).returning();
    return row;
  },

  // ---- Tasks ----
  async getTasks(filter?: { patientId?: string; status?: string }) {
    const conds = [];
    if (filter?.patientId) conds.push(eq(crmTasks.patientId, filter.patientId));
    if (filter?.status) conds.push(eq(crmTasks.status, filter.status));
    return db.select().from(crmTasks).where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt));
  },
  async createTask(data: InsertCrmTask) {
    const [row] = await db.insert(crmTasks).values(data).returning();
    return row;
  },
  async completeTask(id: string) {
    const [row] = await db.update(crmTasks).set({ status: "completed", completedAt: new Date() })
      .where(and(eq(crmTasks.id, id), eq(crmTasks.status, "open"))).returning();
    return row;
  },
  async reopenTask(id: string) {
    const [row] = await db.update(crmTasks).set({ status: "open", completedAt: null })
      .where(eq(crmTasks.id, id)).returning();
    return row;
  },

  // ---- Campaigns ----
  async getCampaigns() {
    const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    const members = await db.select({
      campaignId: campaignMembers.campaignId, status: campaignMembers.status, n: sql<number>`count(*)`,
    }).from(campaignMembers).groupBy(campaignMembers.campaignId, campaignMembers.status);
    return rows.map((c) => {
      const mine = members.filter((m) => m.campaignId === c.id);
      const total = mine.reduce((s, m) => s + Number(m.n), 0);
      const byStatus: Record<string, number> = {};
      for (const m of mine) byStatus[m.status] = Number(m.n);
      return { ...c, memberCount: total, membersByStatus: byStatus };
    });
  },
  async getCampaign(id: string) {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!c) return undefined;
    const members = await db.select({
      member: campaignMembers, patientName: patients.name,
    }).from(campaignMembers)
      .innerJoin(patients, eq(campaignMembers.patientId, patients.id))
      .where(eq(campaignMembers.campaignId, id))
      .orderBy(asc(patients.name));
    return { ...c, members: members.map((m) => ({ ...m.member, patientName: m.patientName })) };
  },
  async createCampaign(data: InsertCampaign, patientIds: string[]) {
    return db.transaction(async (tx) => {
      const [c] = await tx.insert(campaigns).values(data).returning();
      if (patientIds.length) {
        await tx.insert(campaignMembers).values(patientIds.map((patientId) => ({ campaignId: c.id, patientId })));
      }
      return c;
    });
  },
  async updateCampaign(id: string, data: Partial<InsertCampaign>) {
    const [row] = await db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning();
    return row;
  },
  async updateCampaignMember(id: string, status: string, note?: string) {
    const [row] = await db.update(campaignMembers)
      .set({ status, note, lastContactAt: new Date() })
      .where(eq(campaignMembers.id, id)).returning();
    return row;
  },

  // ---- Referrals ----
  async getReferrals(status?: string) {
    const rows = await db.select({ referral: referrals, patientName: patients.name })
      .from(referrals).innerJoin(patients, eq(referrals.patientId, patients.id))
      .where(status ? eq(referrals.status, status) : undefined)
      .orderBy(desc(referrals.referredAt));
    return rows.map((r) => ({ ...r.referral, patientName: r.patientName }));
  },
  async getReferralsByPatient(patientId: string) {
    return db.select().from(referrals).where(eq(referrals.patientId, patientId)).orderBy(desc(referrals.referredAt));
  },
  async createReferral(data: InsertReferral) {
    const [row] = await db.insert(referrals).values(data).returning();
    return row;
  },
  async updateReferral(id: string, data: Partial<Pick<InsertReferral, "status" | "scheduledFor" | "notes" | "priority">>) {
    const [row] = await db.update(referrals).set(data).where(eq(referrals.id, id)).returning();
    return row;
  },

  // ---- In Basket ----
  async getInBasketMessages(filter?: { category?: string; status?: string }) {
    const conds = [];
    if (filter?.category) conds.push(eq(inBasketMessages.category, filter.category));
    if (filter?.status) conds.push(eq(inBasketMessages.status, filter.status));
    return db.select().from(inBasketMessages).where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(inBasketMessages.createdAt));
  },
  async getUnreadCounts() {
    const rows = await db.select({ category: inBasketMessages.category, n: sql<number>`count(*)` })
      .from(inBasketMessages)
      .where(and(eq(inBasketMessages.read, false), eq(inBasketMessages.status, "open")))
      .groupBy(inBasketMessages.category);
    const byCategory: Record<string, number> = { staff: 0, results: 0, patient: 0 };
    for (const r of rows) byCategory[r.category] = Number(r.n);
    return { total: Object.values(byCategory).reduce((a, b) => a + b, 0), byCategory };
  },
  async createInBasketMessage(data: InsertInBasketMessage) {
    const [row] = await db.insert(inBasketMessages).values(data).returning();
    return row;
  },
  async markMessageRead(id: string, read: boolean) {
    const [row] = await db.update(inBasketMessages).set({ read }).where(eq(inBasketMessages.id, id)).returning();
    return row;
  },
  async setMessageStatus(id: string, status: "open" | "done") {
    const [row] = await db.update(inBasketMessages).set({ status, read: true }).where(eq(inBasketMessages.id, id)).returning();
    return row;
  },
};
