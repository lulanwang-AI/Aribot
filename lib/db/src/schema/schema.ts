import { z } from "zod";
import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  specialty: string;
  subspecialty: string;
  interests: string[];
  hospital: string;
  city: string;
  state: string;
  role: string;
  verified: boolean;
  phiSafeMode: boolean;
  yearsExperience: number;
  rankingScore: number;
  badges: string[];
  bio: string;
  avatarUrl: string;
  credential: string;
  // Ari clinical-context fields. Optional so existing users aren't broken;
  // /api/ari/* gates access on these being set.
  email?: string;
  licenseType?: "MD" | "DO" | "NP" | "PA" | "RN" | "PharmD" | "OTHER";
  licenseNumber?: string;
  licenseState?: string;
  licenseVerifiedAt?: number | null;
  acceptedAriTermsAt?: number | null;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  specialty: z.string().default(""),
  subspecialty: z.string().default(""),
  interests: z.array(z.string()).default([]),
  hospital: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  role: z.string().default("physician"),
  verified: z.boolean().default(false),
  phiSafeMode: z.boolean().default(true),
  yearsExperience: z.number().default(0),
  rankingScore: z.number().default(50),
  badges: z.array(z.string()).default([]),
  bio: z.string().default(""),
  avatarUrl: z.string().default(""),
  credential: z.string().default("MD"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface TriagePost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  tags: string[];
  likes: string[];
  images: string[];
  flagged: boolean;
  createdAt: string;
}

export const insertTriagePostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  noIdentifiersConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm no patient identifiers" }),
  }),
});

export type InsertTriagePost = z.infer<typeof insertTriagePostSchema>;

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  anonymous: boolean;
  likes: string[];
  flagged: boolean;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  abstract: string;
  researcherName: string;
  source: string;
  url: string;
  tags: string[];
  publishedAt: string;
  readingTime: number;
  likes: string[];
  commentCount: number;
}

export interface NewsComment {
  id: string;
  newsId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  likes: string[];
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  topic: string;
  type: "hospital" | "interest";
  hospital: string;
  city: string;
  memberCount: number;
  members: string[];
}

export interface MedEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  location: string;
  hostGroup: string;
  hostHospital: string;
  capacity: number;
  rsvps: string[];
  imageUrl: string;
}

export interface FlaggedItem {
  id: string;
  contentType: "post" | "comment";
  contentId: string;
  content: string;
  authorName: string;
  reason: string;
  reportedBy: string;
  status: "pending" | "safe" | "edit_requested" | "removed";
  createdAt: string;
}

export interface ChatThread {
  id: string;
  type: "direct" | "group";
  name: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  attachments: { name: string; type: string; url: string }[];
  createdAt: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  outline: string[];
  duration: string;
  completedBy: string[];
}

export interface AribotHistory {
  id: string;
  title: string;
  tags: string[];
  folderId: string | null;
  createdAt: string;
}

export interface AribotFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: { userId: string; role: "admin" | "member" }[];
}

export const insertCommentSchema = z.object({
  content: z.string().min(1, "Comment is required"),
  parentId: z.string().nullable().default(null),
  anonymous: z.boolean().default(false),
});

export const insertChatMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string(),
  })).default([]),
});

export interface TelemedConsultation {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  symptoms: string[];
  urgency: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in-progress" | "completed" | "cancelled";
  scheduledAt: string;
  createdAt: string;
  duration: number;
  earnings: number;
  doctorId: string | null;
  notes: string;
  diagnosis: string;
  prescriptions: string[];
  vitals: {
    bp?: string;
    heartRate?: number;
    temp?: string;
    spo2?: number;
    weight?: string;
  };
  insuranceProvider: string;
  paymentStatus: "pending" | "paid" | "processing";
  followUp: boolean;
  patientHistory: string;
  attachments: string[];
}

export interface TelemedEarnings {
  totalEarnings: number;
  thisMonth: number;
  thisWeek: number;
  pendingPayout: number;
  completedConsultations: number;
  avgPerConsultation: number;
}

export const demoRequests = pgTable("demo_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  message: text("message").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDemoRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().min(1, "Organization is required"),
  role: z.string().min(1, "Role is required"),
  message: z.string().default(""),
});

export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;
export type DemoRequest = typeof demoRequests.$inferSelect;

/**
 * Antimicrobial stewardship cases. The complete case record is stored as JSON
 * because it is a deep engine output that the API returns verbatim; the scalar
 * columns exist so worklists can sort and filter without unpacking it.
 */
export const amrCases = pgTable(
  "amr_cases",
  {
    id: varchar("id").primaryKey(),
    mrn: text("mrn").notNull(),
    patientLabel: text("patient_label").notNull(),
    ward: text("ward").notNull(),
    assignedTo: text("assigned_to").notNull(),
    status: text("status").notNull(),
    syndromeId: text("syndrome_id").notNull(),
    record: jsonb("record").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("amr_cases_updated_at_idx").on(t.updatedAt)],
);

/** Ari chat audit trail. Holds a hash of each query, never its text. */
export const ariAuditLog = pgTable(
  "ari_audit_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    licenseType: text("license_type").notNull(),
    mode: text("mode").notNull(),
    capability: text("capability").notNull(),
    queryHash: text("query_hash").notNull(),
    attachmentCount: integer("attachment_count").notNull().default(0),
    latencyMs: integer("latency_ms").notNull(),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ari_audit_log_created_at_idx").on(t.createdAt)],
);

/** Verified-claim memory written by Ari when ARI_MEMORY_ENABLED is true. */
export const ariMemory = pgTable(
  "ari_memory",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    topic: text("topic").notNull(),
    slug: text("slug").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    metadata: jsonb("metadata"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ari_memory_topic_slug_idx").on(t.topic, t.slug)],
);

/**
 * express-session storage in exactly the shape connect-pg-simple reads and
 * writes. Declared here so schema pushes keep the table rather than treating it
 * as foreign.
 */
export const sessions = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (t) => [index("IDX_session_expire").on(t.expire)],
);
