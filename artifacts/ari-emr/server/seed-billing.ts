import { db } from "./db";
import { sql, eq, asc } from "drizzle-orm";
import { payers, coverages, charges, claims, payments, encounters } from "@shared/schema";
import { CPT_LIBRARY, DENIAL_REASONS } from "@shared/billing-codes";
import { format, subDays } from "date-fns";

const today = new Date();

const PAYERS = [
  { name: "Blue Cross Blue Shield", payerType: "commercial", electronicPayerId: "BCBS001", phone: "(800) 262-2583" },
  { name: "UnitedHealthcare", payerType: "commercial", electronicPayerId: "UHC87726", phone: "(866) 414-1959" },
  { name: "Aetna", payerType: "commercial", electronicPayerId: "AET60054", phone: "(800) 872-3862" },
  { name: "Cigna Healthcare", payerType: "commercial", electronicPayerId: "CIG62308", phone: "(800) 997-1654" },
  { name: "Medicare Part B", payerType: "medicare", electronicPayerId: "MCARE-B", phone: "(800) 633-4227" },
  { name: "State Medicaid", payerType: "medicaid", electronicPayerId: "MCAID-ST", phone: "(800) 541-2831" },
];

const PLAN_TYPES = ["PPO", "HMO", "EPO", "POS"];
const ICD_BY_PATIENT: Record<string, string[]> = {
  p1: ["E11.9", "I10"], p2: ["J18.9"], p3: ["I71.4", "E78.5"], p5: ["C34.31", "J44.9"],
  p7: ["C25.0"], p8: ["I26.99", "I48.91"], p10: ["C56.9"], p12: ["J32.9"],
  p13: ["C22.0", "K74.60"], p14: ["N20.0"], p15: ["C18.9"], p17: ["J15.9", "J45.909"],
  p18: ["C50.912"], p20: ["I63.9", "I10"],
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function seedBillingData() {
  if (process.env.NODE_ENV === "production") return;

  const isEmpty = async (t: any) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(t))[0].n) === 0;
  if (!(await isEmpty(payers)) || !(await isEmpty(charges))) {
    console.log("[seed] Billing data already present, skipping");
    return;
  }
  console.log("[seed] Seeding billing data...");

  const payerRows = [];
  for (const p of PAYERS) payerRows.push((await db.insert(payers).values(p).returning())[0]);

  const allEncounters = await db.select().from(encounters).orderBy(asc(encounters.encounterDate));
  const patientIds = Array.from(new Set(allEncounters.map((e) => e.patientId)));

  // Coverage per patient
  const coverageByPatient = new Map<string, string>();
  for (let i = 0; i < patientIds.length; i++) {
    const pid = patientIds[i];
    const payer = payerRows[i % payerRows.length];
    const [cov] = await db.insert(coverages).values({
      patientId: pid, payerId: payer.id,
      memberId: `${payer.electronicPayerId ?? "MBR"}-${100000 + i * 37}`,
      groupNumber: `GRP-${4000 + (i % 12)}`,
      planName: payer.payerType === "medicare" ? "Medicare Part B" : payer.payerType === "medicaid" ? "Medicaid Standard" : `${payer.name.split(" ")[0]} ${pick(PLAN_TYPES)} ${pick(["Select", "Choice", "Premier", "Value"])}`,
      planType: payer.payerType === "medicare" ? "Medicare" : payer.payerType === "medicaid" ? "Medicaid" : pick(PLAN_TYPES),
      priority: "primary", status: "active",
      eligibilityStatus: Math.random() < 0.8 ? "verified" : Math.random() < 0.5 ? "pending" : "failed",
      copayCents: pick([1500, 2000, 2500, 3000, 4000]),
      deductibleCents: pick([50000, 100000, 150000, 250000]),
      effectiveDate: format(subDays(today, 200 + Math.floor(Math.random() * 200)), "yyyy-MM-dd"),
      expirationDate: format(new Date(today.getFullYear(), 11, 31), "yyyy-MM-dd"),
    }).returning();
    coverageByPatient.set(pid, cov.id);
    // A few patients also carry secondary coverage
    if (i % 6 === 0) {
      const sec = payerRows[(i + 3) % payerRows.length];
      await db.insert(coverages).values({
        patientId: pid, payerId: sec.id, memberId: `${sec.electronicPayerId ?? "MBR"}-S${9000 + i}`,
        planName: `${sec.name.split(" ")[0]} Secondary`, planType: pick(PLAN_TYPES),
        priority: "secondary", status: "active", eligibilityStatus: "verified",
        copayCents: 1000, deductibleCents: 25000,
        effectiveDate: format(subDays(today, 300), "yyyy-MM-dd"),
      });
    }
  }

  // Charges per closed encounter: an E/M code + 0-2 ancillaries
  const emCodes = CPT_LIBRARY.filter((c) => ["E/M", "Emergency", "Telehealth"].includes(c.category));
  const ancillary = CPT_LIBRARY.filter((c) => ["Lab", "Imaging", "Cardiology", "Procedure"].includes(c.category));
  const chargesByEncounter = new Map<string, string[]>();
  for (const enc of allEncounters) {
    if (enc.status !== "closed") continue;
    const svcDate = format(new Date(enc.encounterDate), "yyyy-MM-dd");
    const icds = ICD_BY_PATIENT[enc.patientId] ?? ["Z00.00"];
    const em = enc.encounterType === "emergency" ? pick(emCodes.filter((c) => c.category === "Emergency"))
      : enc.encounterType === "telehealth" ? pick(emCodes.filter((c) => c.category === "Telehealth"))
      : pick(emCodes.filter((c) => c.category === "E/M"));
    const lines = [em, ...Array.from({ length: Math.floor(Math.random() * 3) }, () => pick(ancillary))];
    const ids: string[] = [];
    for (const line of lines) {
      const [ch] = await db.insert(charges).values({
        patientId: enc.patientId, encounterId: enc.id, cptCode: line.code, description: line.description,
        icd10Codes: icds, units: 1, unitPriceCents: line.priceCents, status: "unbilled",
        serviceDate: svcDate, provider: enc.provider,
      }).returning();
      ids.push(ch.id);
    }
    chargesByEncounter.set(enc.id, ids);
  }

  // Claims across the lifecycle for ~70% of charged encounters
  let ci = 0;
  for (const [encId, chargeIds] of Array.from(chargesByEncounter.entries())) {
    if (Math.random() < 0.3) continue; // leave some encounters unbilled for charge capture demo
    const enc = allEncounters.find((e) => e.id === encId)!;
    const rows = await db.select().from(charges).where(eq(charges.encounterId, encId));
    const total = rows.reduce((s, c) => s + c.unitPriceCents * c.units, 0);
    const roll = Math.random();
    const status = roll < 0.15 ? "draft" : roll < 0.4 ? "submitted" : roll < 0.55 ? "accepted" : roll < 0.72 ? "denied" : "paid";
    const submittedAt = status === "draft" ? null : subDays(today, 5 + Math.floor(Math.random() * 60));
    const paidCents = status === "paid" ? Math.round(total * (0.7 + Math.random() * 0.3)) : 0;
    const [claim] = await db.insert(claims).values({
      claimNumber: `CLM-${today.getFullYear()}-${String(100001 + ci++)}`,
      patientId: enc.patientId, coverageId: coverageByPatient.get(enc.patientId),
      status, totalCents: total, paidCents,
      submittedAt,
      respondedAt: ["accepted", "denied", "paid"].includes(status) ? subDays(today, Math.floor(Math.random() * 10)) : null,
      denialReason: status === "denied" ? pick(DENIAL_REASONS) : null,
    }).returning();
    await db.update(charges)
      .set({ claimId: claim.id, status: status === "paid" ? "paid" : "billed" })
      .where(eq(charges.encounterId, encId));
    if (status === "paid") {
      await db.insert(payments).values({
        patientId: enc.patientId, claimId: claim.id, amountCents: paidCents,
        source: "insurance", method: "eft", reference: claim.claimNumber,
        postedBy: "Remit Processor", postedAt: subDays(today, Math.floor(Math.random() * 8)),
      });
      // Occasional patient copay payment
      if (Math.random() < 0.5) {
        await db.insert(payments).values({
          patientId: enc.patientId, claimId: claim.id, amountCents: pick([1500, 2000, 2500, 3000]),
          source: "patient", method: pick(["card", "cash", "check"]), reference: "Front desk",
          postedBy: "Front Desk", postedAt: subDays(today, Math.floor(Math.random() * 30)),
        });
      }
    }
  }

  console.log("[seed] Billing seed complete");
}
