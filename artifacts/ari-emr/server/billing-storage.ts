import { db } from "./db";
import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import {
  payers, coverages, charges, claims, payments,
  type Payer, type InsertPayer,
  type Coverage, type InsertCoverage,
  type Charge, type InsertCharge,
  type Claim, type InsertClaim,
  type Payment, type InsertPayment,
} from "@shared/schema";

function newClaimNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CLM-${new Date().getFullYear()}-${n}`;
}

export const billingStorage = {
  // Payers
  async getPayers(): Promise<Payer[]> {
    return db.select().from(payers).orderBy(asc(payers.name));
  },
  async createPayer(data: InsertPayer): Promise<Payer> {
    const [p] = await db.insert(payers).values(data).returning();
    return p;
  },

  // Coverages
  async getCoveragesByPatient(patientId: string): Promise<(Coverage & { payer: Payer | null })[]> {
    const rows = await db.select().from(coverages)
      .leftJoin(payers, eq(coverages.payerId, payers.id))
      .where(eq(coverages.patientId, patientId))
      .orderBy(asc(coverages.priority));
    return rows.map((r) => ({ ...r.coverages, payer: r.payers }));
  },
  async getCoverage(id: string): Promise<Coverage | undefined> {
    const [c] = await db.select().from(coverages).where(eq(coverages.id, id));
    return c;
  },
  async createCoverage(data: InsertCoverage): Promise<Coverage> {
    const [c] = await db.insert(coverages).values(data).returning();
    return c;
  },
  async updateCoverage(id: string, updates: Partial<InsertCoverage>): Promise<Coverage | undefined> {
    const [c] = await db.update(coverages).set(updates).where(eq(coverages.id, id)).returning();
    return c;
  },

  // Charges
  async getChargesByPatient(patientId: string): Promise<Charge[]> {
    return db.select().from(charges).where(eq(charges.patientId, patientId)).orderBy(desc(charges.serviceDate));
  },
  async getChargesByEncounter(encounterId: string): Promise<Charge[]> {
    return db.select().from(charges).where(eq(charges.encounterId, encounterId)).orderBy(desc(charges.createdAt));
  },
  async getCharge(id: string): Promise<Charge | undefined> {
    const [c] = await db.select().from(charges).where(eq(charges.id, id));
    return c;
  },
  async getChargesByIds(ids: string[]): Promise<Charge[]> {
    if (ids.length === 0) return [];
    return db.select().from(charges).where(inArray(charges.id, ids));
  },
  async getChargesByClaim(claimId: string): Promise<Charge[]> {
    return db.select().from(charges).where(eq(charges.claimId, claimId));
  },
  async createCharge(data: InsertCharge): Promise<Charge> {
    const [c] = await db.insert(charges).values(data).returning();
    return c;
  },
  async deleteCharge(id: string): Promise<boolean> {
    const res = await db.delete(charges).where(and(eq(charges.id, id), eq(charges.status, "unbilled"))).returning();
    return res.length > 0;
  },

  // Claims
  async getClaims(status?: string): Promise<Claim[]> {
    if (status) return db.select().from(claims).where(eq(claims.status, status)).orderBy(desc(claims.createdAt));
    return db.select().from(claims).orderBy(desc(claims.createdAt));
  },
  async getClaimsByPatient(patientId: string): Promise<Claim[]> {
    return db.select().from(claims).where(eq(claims.patientId, patientId)).orderBy(desc(claims.createdAt));
  },
  async getClaim(id: string): Promise<Claim | undefined> {
    const [c] = await db.select().from(claims).where(eq(claims.id, id));
    return c;
  },
  /** Creates a draft claim from unbilled charges; marks charges billed and attaches them. */
  async createClaimFromCharges(data: InsertClaim, chargeIds: string[]): Promise<Claim> {
    return db.transaction(async (tx) => {
      const chargeRows = await tx.select().from(charges).where(inArray(charges.id, chargeIds));
      const eligible = chargeRows.filter(
        (c) => c.status === "unbilled" && !c.claimId && c.patientId === data.patientId,
      );
      if (eligible.length === 0 || eligible.length !== chargeIds.length) {
        throw new Error("INELIGIBLE_CHARGES");
      }
      const total = eligible.reduce((s, c) => s + c.unitPriceCents * c.units, 0);
      const [claim] = await tx.insert(claims).values({
        ...data, claimNumber: newClaimNumber(), status: "draft", totalCents: total,
      }).returning();
      // Conditional update guards against concurrent claim creation grabbing the
      // same charges: only rows still unbilled and unattached are claimed.
      const updated = await tx.update(charges)
        .set({ claimId: claim.id, status: "billed" })
        .where(and(
          inArray(charges.id, eligible.map((c) => c.id)),
          eq(charges.status, "unbilled"),
          sql`${charges.claimId} IS NULL`,
        ))
        .returning({ id: charges.id });
      if (updated.length !== eligible.length) throw new Error("INELIGIBLE_CHARGES");
      return claim;
    });
  },
  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | undefined> {
    const [c] = await db.update(claims).set(updates).where(eq(claims.id, id)).returning();
    return c;
  },
  /**
   * Posts a remittance atomically: validates the amount against the claim total,
   * marks the claim and its charges paid, and records the payment — all in one
   * transaction so a failure leaves no half-paid state.
   * Amounts below the billed total are treated as paid-with-contractual-adjustment.
   */
  async payClaim(
    id: string,
    input: { amountCents: number; postedBy: string; method: string; reference?: string },
  ): Promise<Claim | { error: "NOT_FOUND" | "BAD_STATUS" | "BAD_AMOUNT" }> {
    return db.transaction(async (tx) => {
      const [claim] = await tx.select().from(claims).where(eq(claims.id, id)).for("update");
      if (!claim) return { error: "NOT_FOUND" as const };
      if (!["submitted", "accepted"].includes(claim.status)) return { error: "BAD_STATUS" as const };
      if (input.amountCents <= 0 || input.amountCents > claim.totalCents) return { error: "BAD_AMOUNT" as const };
      const [c] = await tx.update(claims)
        .set({ status: "paid", paidCents: input.amountCents, respondedAt: new Date() })
        .where(eq(claims.id, id)).returning();
      await tx.update(charges).set({ status: "paid" }).where(eq(charges.claimId, id));
      await tx.insert(payments).values({
        patientId: claim.patientId, claimId: claim.id, amountCents: input.amountCents,
        source: "insurance", method: input.method, reference: input.reference ?? claim.claimNumber,
        postedBy: input.postedBy,
      });
      return c;
    });
  },
  /** Resubmit a denied claim: new draft claim carrying the same charges. */
  async resubmitClaim(deniedClaimId: string): Promise<Claim | undefined> {
    return db.transaction(async (tx) => {
      const [old] = await tx.select().from(claims).where(eq(claims.id, deniedClaimId));
      if (!old || old.status !== "denied") return undefined;
      const claimCharges = await tx.select().from(charges).where(eq(charges.claimId, deniedClaimId));
      const total = claimCharges.reduce((s, c) => s + c.unitPriceCents * c.units, 0);
      const [next] = await tx.insert(claims).values({
        patientId: old.patientId, coverageId: old.coverageId, claimNumber: newClaimNumber(),
        status: "draft", totalCents: total, resubmittedFromId: old.id, notes: old.notes,
      }).returning();
      await tx.update(charges).set({ claimId: next.id, status: "billed" })
        .where(eq(charges.claimId, deniedClaimId));
      return next;
    });
  },

  // Payments
  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.patientId, patientId)).orderBy(desc(payments.postedAt));
  },
  async getPaymentsByClaim(claimId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.claimId, claimId)).orderBy(desc(payments.postedAt));
  },
  async createPayment(data: InsertPayment): Promise<Payment> {
    const [p] = await db.insert(payments).values(data).returning();
    return p;
  },

  // Revenue-cycle metrics for the billing dashboard
  async getRevenueSummary() {
    const [chargeAgg] = await db.select({
      totalCents: sql<number>`coalesce(sum(unit_price_cents * units), 0)`,
      outstandingCents: sql<number>`coalesce(sum(unit_price_cents * units) filter (where status in ('unbilled','billed')), 0)`,
      unbilledCents: sql<number>`coalesce(sum(unit_price_cents * units) filter (where status = 'unbilled'), 0)`,
      count: sql<number>`count(*)`,
    }).from(charges);

    const claimsByStatus = await db.select({
      status: claims.status,
      count: sql<number>`count(*)`,
      totalCents: sql<number>`coalesce(sum(total_cents), 0)`,
    }).from(claims).groupBy(claims.status);

    const [paymentAgg] = await db.select({
      collectedCents: sql<number>`coalesce(sum(amount_cents), 0)`,
      patientCents: sql<number>`coalesce(sum(amount_cents) filter (where source = 'patient'), 0)`,
      insuranceCents: sql<number>`coalesce(sum(amount_cents) filter (where source = 'insurance'), 0)`,
    }).from(payments);

    const denied = Number(claimsByStatus.find((c) => c.status === "denied")?.count ?? 0);
    const adjudicated = claimsByStatus
      .filter((c) => ["accepted", "denied", "paid"].includes(c.status))
      .reduce((s, c) => s + Number(c.count), 0);

    return {
      charges: {
        totalCents: Number(chargeAgg.totalCents),
        outstandingCents: Number(chargeAgg.outstandingCents),
        unbilledCents: Number(chargeAgg.unbilledCents),
        count: Number(chargeAgg.count),
      },
      claimsByStatus: claimsByStatus.map((c) => ({ status: c.status, count: Number(c.count), totalCents: Number(c.totalCents) })),
      collections: {
        collectedCents: Number(paymentAgg.collectedCents),
        patientCents: Number(paymentAgg.patientCents),
        insuranceCents: Number(paymentAgg.insuranceCents),
      },
      denialRate: adjudicated > 0 ? denied / adjudicated : 0,
    };
  },
};
