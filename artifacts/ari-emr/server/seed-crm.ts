import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  patientCrmProfiles, communications, crmTasks, campaigns, campaignMembers, referrals, inBasketMessages,
} from "@shared/schema";
import { format, subDays, addDays, subHours } from "date-fns";
import { demoSeedAllowed } from "./seed-policy";

const today = new Date();
const d = (days: number) => format(subDays(today, days), "yyyy-MM-dd");
const fd = (days: number) => format(addDays(today, days), "yyyy-MM-dd");
const pids = Array.from({ length: 20 }, (_, i) => `p${i + 1}`);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function seedCrmData() {
  if (!demoSeedAllowed()) return;

  const isEmpty = async (t: any) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(t))[0].n) === 0;

  // ---- CRM profiles ----
  if (await isEmpty(patientCrmProfiles)) {
    console.log("[seed] Seeding CRM profiles...");
    const statuses = ["engaged", "engaged", "engaged", "at-risk", "inactive"];
    await db.insert(patientCrmProfiles).values(pids.map((patientId, i) => ({
      patientId,
      engagementStatus: statuses[i % statuses.length],
      vip: [2, 7, 13].includes(i),
      priorityFlag: i % 6 === 0 ? "care-management" : i % 9 === 0 ? "high-touch" : null,
      preferredChannel: pick(["phone", "email", "sms", "portal"]),
      notes: i % 5 === 0 ? "Prefers afternoon calls. Daughter is primary contact for scheduling." : null,
    })));
  }

  // ---- Communications ----
  if (await isEmpty(communications)) {
    console.log("[seed] Seeding communications...");
    const staff = ["Front Desk — Maria Lopez", "RN Kelly Tran", "Scheduler — Devon Price", "Dr. Sarah Johnson, MD, PhD"];
    const templates = [
      { channel: "call", direction: "outbound", subject: "Appointment reminder", body: "Reminded patient of upcoming visit; confirmed attendance.", outcome: "reached" },
      { channel: "call", direction: "outbound", subject: "Follow-up on recent visit", body: "Checked in post-visit; patient reports doing well.", outcome: "reached" },
      { channel: "call", direction: "outbound", subject: "Recall outreach", body: "Left voicemail regarding overdue follow-up.", outcome: "voicemail" },
      { channel: "email", direction: "outbound", subject: "Lab results available", body: "Notified patient that results are ready and reviewed.", outcome: "replied" },
      { channel: "sms", direction: "outbound", subject: "Appointment confirmation", body: "SMS confirmation sent for upcoming appointment.", outcome: "replied" },
      { channel: "portal", direction: "inbound", subject: "Medication refill request", body: "Patient requested refill via portal.", outcome: "scheduled" },
      { channel: "portal", direction: "inbound", subject: "Question about symptoms", body: "Patient messaged about ongoing symptoms; routed to nurse line.", outcome: "replied" },
      { channel: "call", direction: "inbound", subject: "Billing question", body: "Patient called about statement balance; explained coverage breakdown.", outcome: "reached" },
    ];
    const rows = [];
    for (const pid of pids) {
      const n = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const t = pick(templates);
        rows.push({ patientId: pid, ...t, staff: pick(staff), occurredAt: subHours(today, 6 + Math.floor(Math.random() * 24 * 45)) });
      }
    }
    await db.insert(communications).values(rows);
  }

  // ---- Follow-up tasks ----
  if (await isEmpty(crmTasks)) {
    console.log("[seed] Seeding CRM tasks...");
    await db.insert(crmTasks).values([
      { patientId: "p1", title: "Schedule HbA1c recheck", details: "Diabetic — last A1c over 4 months ago.", dueDate: fd(3), priority: "high", assignee: "RN Kelly Tran" },
      { patientId: "p5", title: "Confirm oncology follow-up", details: "Verify patient scheduled surveillance CT.", dueDate: fd(1), priority: "urgent", assignee: "Scheduler — Devon Price" },
      { patientId: "p8", title: "Anticoagulation check-in call", details: "Post-PE follow-up call re: medication adherence.", dueDate: fd(2), priority: "high", assignee: "RN Kelly Tran" },
      { patientId: "p12", title: "Send statement reminder", details: "Outstanding balance over 60 days.", dueDate: fd(7), priority: "routine", assignee: "Front Desk — Maria Lopez" },
      { patientId: "p17", title: "Asthma action plan review", details: "Patient requested updated plan via portal.", dueDate: fd(5), priority: "routine", assignee: "RN Kelly Tran" },
      { patientId: "p3", title: "Vascular surgery coordination", details: "Coordinate pre-op testing dates.", dueDate: d(1), priority: "urgent", assignee: "Scheduler — Devon Price" },
      { title: "Update recall letter template", details: "Wellness recall letter needs new clinic hours.", dueDate: fd(10), priority: "routine", assignee: "Front Desk — Maria Lopez" },
    ]);
  }

  // ---- Campaigns ----
  if (await isEmpty(campaigns)) {
    console.log("[seed] Seeding campaigns...");
    const [wellness] = await db.insert(campaigns).values({
      name: "Annual Wellness Visit Recall — Q3",
      description: "Outreach to patients without a wellness visit in the past 12 months.",
      campaignType: "recall", channel: "phone", status: "active",
      startDate: d(14), endDate: fd(45), createdBy: "Front Desk — Maria Lopez",
    }).returning();
    const [flu] = await db.insert(campaigns).values({
      name: "Fall Flu Shot Reminders",
      description: "Seasonal flu vaccination reminders for all active patients.",
      campaignType: "wellness", channel: "sms", status: "draft",
      startDate: fd(30), endDate: fd(90), createdBy: "RN Kelly Tran",
    }).returning();
    const [onco] = await db.insert(campaigns).values({
      name: "Oncology Surveillance Follow-up",
      description: "Ensure oncology patients have surveillance imaging scheduled.",
      campaignType: "follow-up", channel: "phone", status: "completed",
      startDate: d(90), endDate: d(30), createdBy: "Dr. Sarah Johnson, MD, PhD",
    }).returning();
    const memberStatuses = ["pending", "contacted", "scheduled", "completed", "declined"];
    await db.insert(campaignMembers).values([
      ...["p2", "p4", "p6", "p9", "p11", "p16", "p19"].map((patientId, i) => ({
        campaignId: wellness.id, patientId,
        status: memberStatuses[i % memberStatuses.length],
        lastContactAt: i % memberStatuses.length === 0 ? null : subDays(today, 2 + i),
        note: i % memberStatuses.length === 4 ? "Patient declined — recently seen elsewhere." : null,
      })),
      ...["p1", "p3", "p5", "p7", "p8", "p10", "p12", "p14", "p17", "p20"].map((patientId) => ({
        campaignId: flu.id, patientId, status: "pending" as const, lastContactAt: null, note: null,
      })),
      ...["p5", "p7", "p10", "p13", "p15", "p18"].map((patientId, i) => ({
        campaignId: onco.id, patientId,
        status: i === 5 ? "declined" : "completed",
        lastContactAt: subDays(today, 30 + i * 3),
        note: i === 5 ? "Transferred care to outside oncology center." : null,
      })),
    ]);
  }

  // ---- Referrals ----
  if (await isEmpty(referrals)) {
    console.log("[seed] Seeding referrals...");
    await db.insert(referrals).values([
      { patientId: "p3", direction: "outbound", specialty: "Vascular Surgery", referringProvider: "Dr. Sarah Johnson, MD, PhD", referredTo: "Dr. Alan Reyes — Bayview Vascular", reason: "6.2cm infrarenal AAA — surgical evaluation", priority: "urgent", status: "scheduled", referredAt: subDays(today, 9), scheduledFor: fd(4) },
      { patientId: "p5", direction: "outbound", specialty: "Oncology", referringProvider: "Dr. Sarah Johnson, MD, PhD", referredTo: "Dr. Lisa Wang — Regional Cancer Center", reason: "RUL mass with mediastinal adenopathy — treatment planning", priority: "urgent", status: "completed", referredAt: subDays(today, 40), scheduledFor: d(25), notes: "Patient established with oncology; chemo initiated." },
      { patientId: "p8", direction: "outbound", specialty: "Cardiology", referringProvider: "Dr. Sarah Johnson, MD, PhD", referredTo: "Dr. Michael Chen — Heart & Vascular Institute", reason: "New-onset AFib post-PE — rhythm management", priority: "routine", status: "pending", referredAt: subDays(today, 5) },
      { patientId: "p14", direction: "outbound", specialty: "Urology", referringProvider: "Dr. Sarah Johnson, MD, PhD", referredTo: "Dr. Priya Nair — Lakeside Urology", reason: "Recurrent nephrolithiasis — metabolic workup", priority: "routine", status: "new", referredAt: subDays(today, 2) },
      { patientId: "p20", direction: "inbound", specialty: "Neurology", referringProvider: "Dr. James Wilson — City General ED", referredTo: "Dr. Sarah Johnson, MD, PhD", reason: "Post-stroke imaging follow-up and rehab coordination", priority: "urgent", status: "scheduled", referredAt: subDays(today, 6), scheduledFor: fd(2) },
      { patientId: "p12", direction: "inbound", specialty: "ENT", referringProvider: "Dr. Emily Davis — Westside Family Medicine", referredTo: "Dr. Sarah Johnson, MD, PhD", reason: "Chronic sinusitis — imaging review requested", priority: "routine", status: "completed", referredAt: subDays(today, 30), scheduledFor: d(12), notes: "Sinus CT reviewed; report sent to referring provider." },
      { patientId: "p18", direction: "inbound", specialty: "Breast Surgery", referringProvider: "Dr. Maria Rodriguez — Northgate Clinic", referredTo: "Dr. Sarah Johnson, MD, PhD", reason: "Abnormal mammogram — diagnostic imaging consult", priority: "stat", status: "pending", referredAt: subDays(today, 1) },
    ]);
  }

  // ---- In Basket ----
  if (await isEmpty(inBasketMessages)) {
    console.log("[seed] Seeding in-basket messages...");
    await db.insert(inBasketMessages).values([
      { category: "results", fromName: "Lab — Quest Diagnostics", toName: "Dr. Sarah Johnson, MD, PhD", patientId: "p1", subject: "CMP + HbA1c resulted", body: "HbA1c 8.1% (prior 7.4%). CMP within normal limits. Flagged for review.", priority: "high", read: false, status: "open" },
      { category: "results", fromName: "Radiology", toName: "Dr. Sarah Johnson, MD, PhD", patientId: "p5", subject: "Surveillance CT chest — resulted", body: "Interval decrease in RUL mass (3.8 → 2.9 cm). No new lesions.", priority: "routine", read: false, status: "open" },
      { category: "results", fromName: "Lab — Quest Diagnostics", toName: "Dr. Sarah Johnson, MD, PhD", patientId: "p8", subject: "INR result — critical", body: "INR 4.8 on warfarin. Please advise dosing.", priority: "urgent", read: false, status: "open" },
      { category: "results", fromName: "Pathology", toName: "Dr. Sarah Johnson, MD, PhD", patientId: "p18", subject: "Core biopsy pathology final", body: "Invasive ductal carcinoma, grade 2, ER/PR positive, HER2 negative.", priority: "urgent", read: true, status: "open" },
      { category: "patient", fromName: "Patricia Brown (portal)", toName: "Nurse Line", patientId: "p8", subject: "Bruising on arms", body: "I've noticed more bruising this week — is this from the blood thinner?", priority: "high", read: false, status: "open" },
      { category: "patient", fromName: "Michael Chen (portal)", toName: "Front Desk", patientId: "p3", subject: "Reschedule pre-op visit", body: "I have a conflict Thursday — can we move my pre-op appointment?", priority: "routine", read: false, status: "open" },
      { category: "patient", fromName: "Jennifer Garcia (portal)", toName: "Dr. Sarah Johnson, MD, PhD", patientId: "p12", subject: "Sinus symptoms returning", body: "Congestion and pressure are back after finishing antibiotics.", priority: "routine", read: true, status: "open" },
      { category: "staff", fromName: "RN Kelly Tran", toName: "Dr. Sarah Johnson, MD, PhD", subject: "Vaccine fridge temperature log", body: "Fridge #2 read 46°F this morning — moved stock to fridge #1 and called maintenance.", priority: "high", read: false, status: "open" },
      { category: "staff", fromName: "Front Desk — Maria Lopez", toName: "All Providers", subject: "Holiday schedule reminder", body: "Clinic closes at noon Friday — please finish notes before the weekend.", priority: "routine", read: true, status: "done" },
      { category: "staff", fromName: "Scheduler — Devon Price", toName: "Dr. Sarah Johnson, MD, PhD", subject: "Double-booked slot next Tuesday", body: "You have two 9:00 AM visits on Tuesday — which should I move?", priority: "routine", read: false, status: "open" },
    ]);
  }
}
