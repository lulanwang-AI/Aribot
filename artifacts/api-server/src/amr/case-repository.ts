/**
 * Postgres-backed stewardship case store for the API server.
 *
 * Records are the same StewardshipCase objects the engine produces; the state
 * transitions come from ./store so the browser build and the server cannot
 * drift. Each mutation reads the row under a row lock, applies the pure
 * transition, and writes the result back inside one transaction, so two
 * clinicians acting on the same case at once cannot lose each other's work.
 */
import { desc, eq, sql } from "drizzle-orm";
import { amrCases, db } from "@workspace/db";
import {
  applyAddNote,
  applyRecordDecision,
  applyStartTherapy,
  applySubmitReview,
  buildSeedCases,
  newCase,
  type DecisionPayload,
  type NewCaseInput,
  type ReviewPayload,
} from "./store";
import type { StewardshipCase } from "./types";

const SEED_LOCK_KEY = 74712202;

export type SeedOutcome = "seeded" | "present" | "disabled";

function toRow(record: StewardshipCase) {
  return {
    mrn: record.mrn,
    patientLabel: record.patientLabel,
    ward: record.ward,
    assignedTo: record.assignedTo,
    status: record.status,
    syndromeId: record.syndromeId,
    record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Loads the demonstration caseload into an empty table. The seed is what the
 * dashboard has always shown on a fresh start; set AMR_SEED_DEMO=false for a
 * tenant that must begin with no cases. A transaction-scoped advisory lock
 * keeps concurrent instances from both seeing an empty table.
 */
export async function seedCasesIfEmpty(): Promise<SeedOutcome> {
  if ((process.env.AMR_SEED_DEMO ?? "").trim().toLowerCase() === "false") return "disabled";
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SEED_LOCK_KEY})`);
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(amrCases);
    if (count > 0) return "present";
    const rows = buildSeedCases().map((record) => ({ id: record.id, ...toRow(record) }));
    await tx.insert(amrCases).values(rows).onConflictDoNothing();
    return "seeded";
  });
}

export async function listCases(): Promise<StewardshipCase[]> {
  const rows = await db
    .select({ record: amrCases.record })
    .from(amrCases)
    .orderBy(desc(amrCases.updatedAt));
  return rows.map((row) => row.record as StewardshipCase);
}

export async function getCase(id: string): Promise<StewardshipCase | undefined> {
  const [row] = await db.select({ record: amrCases.record }).from(amrCases).where(eq(amrCases.id, id));
  return row ? (row.record as StewardshipCase) : undefined;
}

export async function createCase(input: NewCaseInput): Promise<StewardshipCase> {
  const record = newCase(input);
  await db.insert(amrCases).values({ id: record.id, ...toRow(record) });
  return record;
}

async function mutate(
  id: string,
  transition: (record: StewardshipCase) => StewardshipCase | undefined,
): Promise<StewardshipCase | undefined> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ record: amrCases.record })
      .from(amrCases)
      .where(eq(amrCases.id, id))
      .for("update");
    if (!row) return undefined;
    const updated = transition(row.record as StewardshipCase);
    if (!updated) return undefined;
    await tx.update(amrCases).set(toRow(updated)).where(eq(amrCases.id, id));
    return updated;
  });
}

export function startTherapy(id: string, regimenId: string, actor: string) {
  return mutate(id, (record) => applyStartTherapy(record, regimenId, actor));
}

export function submitReview(id: string, payload: ReviewPayload) {
  return mutate(id, (record) => applySubmitReview(record, payload));
}

export function recordDecision(id: string, payload: DecisionPayload) {
  return mutate(id, (record) => applyRecordDecision(record, payload));
}

export function addNote(id: string, note: string, actor: string) {
  return mutate(id, (record) => applyAddNote(record, note, actor));
}
