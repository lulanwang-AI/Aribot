import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const ariMemoryEntries = pgTable(
  "ari_memory_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topic: text("topic").notNull(), // antibiotic_stewardship | pharmacy | protocols | clinical_context | corrections
    slug: text("slug").notNull(), // location_slug | drug_slug | protocol_slug | session_date | "general"
    contentMarkdown: text("content_markdown").notNull(),
    metadata: jsonb("metadata").$type<{
      capability?: string;
      locationConfirmed?: string;
      clinicianId?: string;
      sourceMessageId?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    topicSlugIdx: index("ari_memory_topic_slug_idx").on(t.topic, t.slug),
  }),
);

export type AriMemoryEntry = typeof ariMemoryEntries.$inferSelect;
export type InsertAriMemoryEntry = typeof ariMemoryEntries.$inferInsert;

export const MEMORY_TOPICS = [
  "antibiotic_stewardship",
  "pharmacy",
  "protocols",
  "clinical_context",
  "corrections",
] as const;
export type AriMemoryTopic = (typeof MEMORY_TOPICS)[number];
