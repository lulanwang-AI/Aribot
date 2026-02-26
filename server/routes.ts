import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
});

const flagSchema = z.object({
  reason: z.string().default("Flagged by user"),
});

const updateUserSchema = z.object({
  phiSafeMode: z.boolean().optional(),
  name: z.string().optional(),
  specialty: z.string().optional(),
  subspecialty: z.string().optional(),
  interests: z.array(z.string()).optional(),
  hospital: z.string().optional(),
});

const moderationSchema = z.object({
  status: z.enum(["pending", "safe", "edit_requested", "removed"]),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/me", async (_req, res) => {
    const user = await storage.getUser("u1");
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  app.patch("/api/me", async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateUser("u1", parsed.data);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(({ password: _, ...u }) => u));
  });

  app.get("/api/triage", async (_req, res) => {
    const posts = await storage.getTriagePosts();
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = posts.map(p => ({
      ...p,
      author: userMap[p.authorId] ? { name: userMap[p.authorId].name, specialty: userMap[p.authorId].specialty } : null,
      commentCount: 0,
    }));
    res.json(enriched);
  });

  app.get("/api/triage/:id", async (req, res) => {
    const post = await storage.getTriagePost(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comments = await storage.getComments(req.params.id);
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    res.json({
      ...post,
      author: userMap[post.authorId] ? { name: userMap[post.authorId].name, specialty: userMap[post.authorId].specialty } : null,
      comments: comments.map(c => ({
        ...c,
        author: userMap[c.authorId] ? { name: userMap[c.authorId].name, specialty: userMap[c.authorId].specialty } : null,
      })),
    });
  });

  app.post("/api/triage", async (req, res) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const { title, content, tags } = parsed.data;
    const post = await storage.createTriagePost({
      authorId: "u1",
      title,
      content,
      tags,
      likes: [],
      flagged: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(post);
  });

  app.post("/api/triage/:id/like", async (req, res) => {
    const post = await storage.likeTriagePost(req.params.id, "u1");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  });

  app.post("/api/triage/:id/flag", async (req, res) => {
    const parsed = flagSchema.safeParse(req.body);
    const post = await storage.flagTriagePost(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    await storage.createFlaggedItem({
      contentType: "post",
      contentId: req.params.id,
      content: post.content.substring(0, 200),
      authorName: "Unknown",
      reason: parsed.success ? parsed.data.reason : "Flagged by user",
      reportedBy: "u1",
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    res.json(post);
  });

  app.post("/api/triage/:id/comments", async (req, res) => {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const comment = await storage.createComment({
      postId: req.params.id,
      authorId: "u1",
      content: parsed.data.content,
      flagged: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(comment);
  });

  app.post("/api/comments/:id/flag", async (req, res) => {
    const parsed = flagSchema.safeParse(req.body);
    const comment = await storage.flagComment(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    await storage.createFlaggedItem({
      contentType: "comment",
      contentId: req.params.id,
      content: comment.content.substring(0, 200),
      authorName: "Unknown",
      reason: parsed.success ? parsed.data.reason : "Flagged by user",
      reportedBy: "u1",
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    res.json(comment);
  });

  app.get("/api/news", async (_req, res) => {
    const items = await storage.getNewsItems();
    res.json(items);
  });

  app.get("/api/groups", async (_req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    const group = await storage.joinGroup(req.params.id, "u1");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    const group = await storage.leaveGroup(req.params.id, "u1");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.post("/api/events/:id/rsvp", async (req, res) => {
    const event = await storage.rsvpEvent(req.params.id, "u1");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.post("/api/events/:id/unrsvp", async (req, res) => {
    const event = await storage.unrsvpEvent(req.params.id, "u1");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.get("/api/moderation", async (_req, res) => {
    const items = await storage.getFlaggedItems();
    res.json(items);
  });

  app.patch("/api/moderation/:id", async (req, res) => {
    const parsed = moderationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.updateFlaggedItem(req.params.id, parsed.data.status);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  return httpServer;
}
