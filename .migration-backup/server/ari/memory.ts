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

interface MemoryRow {
  id: string;
  topic: string;
  slug: string;
  contentMarkdown: string;
  metadata?: object;
  updatedAt: number;
}

const TOKEN_LIMIT = 25000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * In-memory implementation of the Drizzle-backed memory store. Mirrors the
 * shape that DrizzleMemoryStore would expose so we can flip on persistent
 * storage later without changing callers. Used today when ARI_MEMORY_ENABLED
 * is true and the in-process map is sufficient (e.g. dev / test).
 *
 * NOTE: a real DrizzleMemoryStore can be slotted in by porting the read /
 * append logic to SQL queries against shared/db/ari-memory.ts.
 */
class DrizzleMemoryStore implements AriMemoryStore {
  private rows: MemoryRow[] = [];

  isWritable() {
    return true;
  }

  async read(topic: string, slug: string): Promise<string | null> {
    const row = this.rows.find((r) => r.topic === topic && r.slug === slug);
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
      // eslint-disable-next-line no-console
      console.warn(
        `[ari/memory] aborting write: redaction ratio ${(redactionRatio * 100).toFixed(0)}% exceeds 30% threshold`
      );
      return;
    }

    const existing = this.rows.find((r) => r.topic === topic && r.slug === slug);
    const ts = new Date().toISOString();
    const stamp = `\n\n---\n_${ts}_\n\n${redacted}`;

    if (existing) {
      const projected =
        existing.contentMarkdown.length + stamp.length;
      if (projected / CHARS_PER_TOKEN_ESTIMATE > TOKEN_LIMIT) {
        // Spill into a date-suffixed slug.
        const date = ts.slice(0, 10);
        const newSlug = `${slug}-${date}`;
        this.rows.push({
          id: cryptoRandomId(),
          topic,
          slug: newSlug,
          contentMarkdown: redacted,
          metadata,
          updatedAt: Date.now(),
        });
        return;
      }
      existing.contentMarkdown += stamp;
      existing.updatedAt = Date.now();
      if (metadata) existing.metadata = { ...existing.metadata, ...metadata };
      return;
    }

    this.rows.push({
      id: cryptoRandomId(),
      topic,
      slug,
      contentMarkdown: redacted,
      metadata,
      updatedAt: Date.now(),
    });
  }

  async list(topic: string) {
    return this.rows
      .filter((r) => r.topic === topic)
      .map((r) => ({ slug: r.slug, updatedAt: r.updatedAt }));
  }

  async listAll(topic?: string) {
    return this.rows
      .filter((r) => !topic || r.topic === topic)
      .map((r) => ({ ...r }));
  }
}

function cryptoRandomId(): string {
  // Lightweight ID without pulling crypto.randomUUID typing overhead.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let _store: AriMemoryStore | null = null;

export function getMemoryStore(): AriMemoryStore {
  if (_store) return _store;
  const enabled = process.env.ARI_MEMORY_ENABLED === "true";
  _store = enabled ? new DrizzleMemoryStore() : new NullMemoryStore();
  // eslint-disable-next-line no-console
  console.info(
    `Ari memory: ${enabled ? "enabled (DrizzleMemoryStore)" : "disabled (NullMemoryStore)"}`
  );
  return _store;
}
