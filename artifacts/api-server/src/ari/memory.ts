import { and, desc, eq, sql } from "drizzle-orm";
import { ariMemory, db } from "@workspace/db";
import { redactPhi } from "./phi";

export interface AriMemoryStore {
  isWritable(): boolean;
  read(topic: string, slug: string): Promise<string | null>;
  appendOrCreate(
    topic: string,
    slug: string,
    contentMarkdown: string,
    metadata?: object
  ): Promise<void>;
  list(topic: string): Promise<Array<{ slug: string; updatedAt: number }>>;
  /** Read every entry for an admin GET. */
  listAll(topic?: string): Promise<
    Array<{
      id: string;
      topic: string;
      slug: string;
      contentMarkdown: string;
      metadata?: object;
      updatedAt: number;
    }>
  >;
}

class NullMemoryStore implements AriMemoryStore {
  isWritable() {
    return false;
  }
  async read() {
    return null;
  }
  async appendOrCreate() {
    /* no-op */
  }
  async list() {
    return [];
  }
  async listAll() {
    return [];
  }
}

const TOKEN_LIMIT = 25000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * Memory store backed by the ari_memory table, one row per (topic, slug).
 *
 * Appends are a single upsert: a new topic/slug inserts the content as is, an
 * existing one gets a timestamped section added, and both paths merge the
 * metadata objects. A file that would pass the token budget spills into a
 * date-suffixed slug instead of growing without bound.
 */
class PostgresMemoryStore implements AriMemoryStore {
  isWritable() {
    return true;
  }

  async read(topic: string, slug: string): Promise<string | null> {
    const [row] = await db
      .select({ contentMarkdown: ariMemory.contentMarkdown })
      .from(ariMemory)
      .where(and(eq(ariMemory.topic, topic), eq(ariMemory.slug, slug)));
    return row ? row.contentMarkdown : null;
  }

  async appendOrCreate(
    topic: string,
    slug: string,
    contentMarkdown: string,
    metadata?: object
  ): Promise<void> {
    // Defense-in-depth: redact PHI again here. If redaction strips >30% of
    // the content, abort entirely.
    const { redacted, redactionRatio } = redactPhi(contentMarkdown);
    if (redactionRatio > 0.3) {
      console.warn(
        `[ari/memory] aborting write: redaction ratio ${(redactionRatio * 100).toFixed(0)}% exceeds 30% threshold`
      );
      return;
    }

    const ts = new Date().toISOString();
    const stamp = `\n\n---\n_${ts}_\n\n`;

    const [existing] = await db
      .select({ length: sql<number>`length(${ariMemory.contentMarkdown})::int` })
      .from(ariMemory)
      .where(and(eq(ariMemory.topic, topic), eq(ariMemory.slug, slug)));
    const projected = (existing?.length ?? 0) + stamp.length + redacted.length;
    const targetSlug =
      existing && projected / CHARS_PER_TOKEN_ESTIMATE > TOKEN_LIMIT
        ? `${slug}-${ts.slice(0, 10)}`
        : slug;

    await db
      .insert(ariMemory)
      .values({ topic, slug: targetSlug, contentMarkdown: redacted, metadata: metadata ?? null })
      .onConflictDoUpdate({
        target: [ariMemory.topic, ariMemory.slug],
        set: {
          contentMarkdown: sql`${ariMemory.contentMarkdown} || ${stamp} || excluded.content_markdown`,
          metadata: sql`coalesce(${ariMemory.metadata}, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb)`,
          updatedAt: new Date(),
        },
      });
  }

  async list(topic: string) {
    const rows = await db
      .select({ slug: ariMemory.slug, updatedAt: ariMemory.updatedAt })
      .from(ariMemory)
      .where(eq(ariMemory.topic, topic))
      .orderBy(desc(ariMemory.updatedAt));
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.getTime() }));
  }

  async listAll(topic?: string) {
    const query = db.select().from(ariMemory).orderBy(desc(ariMemory.updatedAt));
    const rows = topic ? await query.where(eq(ariMemory.topic, topic)) : await query;
    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      slug: r.slug,
      contentMarkdown: r.contentMarkdown,
      metadata: (r.metadata ?? undefined) as object | undefined,
      updatedAt: r.updatedAt.getTime(),
    }));
  }
}

let _store: AriMemoryStore | null = null;

export function getMemoryStore(): AriMemoryStore {
  if (_store) return _store;
  const enabled = process.env.ARI_MEMORY_ENABLED === "true";
  _store = enabled ? new PostgresMemoryStore() : new NullMemoryStore();
  console.info(
    `Ari memory: ${enabled ? "enabled (Postgres ari_memory table)" : "disabled (NullMemoryStore)"}`
  );
  return _store;
}
