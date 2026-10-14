import crypto from "crypto";
import { desc } from "drizzle-orm";
import { ariAuditLog, db } from "@workspace/db";

export interface AriAuditRow {
  id: string;
  userId: string;
  licenseType: string;
  mode: "ari" | "er";
  capability: string;
  queryHash: string;
  attachmentCount: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  createdAt: number;
}

/**
 * Audit trail for Ari chat requests, persisted in the ari_audit_log table.
 *
 * IMPORTANT: this MUST NOT log query content or response content. Only the
 * sha256 hash of the query is recorded so we can de-duplicate session
 * patterns and reason about reliability without storing PHI-adjacent prose.
 *
 * Writes are fire-and-forget: a chat response is never delayed or failed by
 * the audit insert, and a failed insert is logged for operators.
 */
class AriAuditLog {
  hashQuery(query: string): string {
    return crypto.createHash("sha256").update(query).digest("hex");
  }

  write(row: Omit<AriAuditRow, "id" | "createdAt" | "queryHash"> & { query: string }): AriAuditRow {
    const { query, ...rest } = row;
    const entry: AriAuditRow = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      queryHash: this.hashQuery(query),
      ...rest,
    };
    void db
      .insert(ariAuditLog)
      .values({
        id: entry.id,
        userId: entry.userId,
        licenseType: entry.licenseType,
        mode: entry.mode,
        capability: entry.capability,
        queryHash: entry.queryHash,
        attachmentCount: entry.attachmentCount,
        latencyMs: Math.round(entry.latencyMs),
        success: entry.success,
        errorCode: entry.errorCode ?? null,
        createdAt: new Date(entry.createdAt),
      })
      .catch((err: unknown) => {
        console.error("[ari/audit] write failed:", err instanceof Error ? err.message : err);
      });
    return entry;
  }

  async list(limit = 200): Promise<AriAuditRow[]> {
    const rows = await db.select().from(ariAuditLog).orderBy(desc(ariAuditLog.createdAt)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      licenseType: r.licenseType,
      mode: r.mode as "ari" | "er",
      capability: r.capability,
      queryHash: r.queryHash,
      attachmentCount: r.attachmentCount,
      latencyMs: r.latencyMs,
      success: r.success,
      errorCode: r.errorCode ?? undefined,
      createdAt: r.createdAt.getTime(),
    }));
  }
}

export const ariAudit = new AriAuditLog();
