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
