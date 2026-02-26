import { z } from "zod";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
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
  role: string;
  verified: boolean;
  phiSafeMode: boolean;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  specialty: z.string().default(""),
  subspecialty: z.string().default(""),
  interests: z.array(z.string()).default([]),
  hospital: z.string().default(""),
  role: z.string().default("physician"),
  verified: z.boolean().default(false),
  phiSafeMode: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface TriagePost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  tags: string[];
  likes: string[];
  flagged: boolean;
  createdAt: string;
}

export const insertTriagePostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).default([]),
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
  flagged: boolean;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  tags: string[];
  publishedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  topic: string;
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
  rsvps: string[];
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
