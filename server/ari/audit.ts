import crypto from "crypto";

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
 * In-memory audit log for Ari chat requests. Backed by a process-local array
 * for now; swap to a Drizzle table when Postgres comes online.
 *
 * IMPORTANT: this MUST NOT log query content or response content. Only the
 * sha256 hash of the query is recorded so we can de-duplicate session
 * patterns and reason about reliability without storing PHI-adjacent prose.
 */
class AriAuditLog {
  private rows: AriAuditRow[] = [];
  private MAX = 5000;

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
    this.rows.push(entry);
    if (this.rows.length > this.MAX) {
      this.rows.splice(0, this.rows.length - this.MAX);
    }
    return entry;
  }

  list(limit = 200): AriAuditRow[] {
    return this.rows.slice(-limit).reverse();
  }
}

export const ariAudit = new AriAuditLog();
