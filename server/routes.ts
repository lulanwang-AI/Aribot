import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().nullable().default(null),
  anonymous: z.boolean().default(false),
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

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = user;
    const posts = await storage.getTriagePosts();
    const groups = await storage.getGroups();
    const events = await storage.getEvents();
    const userPosts = posts.filter(p => p.authorId === req.params.id);
    const caseCount = userPosts.length;
    const groupCount = groups.filter(g => g.members.includes(req.params.id)).length;
    const eventCount = events.filter(e => e.rsvps.includes(req.params.id)).length;
    const recentCases = userPosts.slice(0, 3).map(p => ({ id: p.id, title: p.title, tags: p.tags, createdAt: p.createdAt }));
    const memberGroups = groups.filter(g => g.members.includes(req.params.id)).map(g => ({ id: g.id, name: g.name, topic: g.topic }));
    res.json({ ...safe, caseCount, commentCount: 0, groupCount, eventCount, recentCases, memberGroups });
  });

  app.get("/api/doctors", async (req, res) => {
    const { q, specialty, sort } = req.query;
    const docs = await storage.searchDoctors(
      q as string | undefined,
      specialty as string | undefined,
      sort as string | undefined
    );
    res.json(docs.slice(0, 100).map(({ password: _, ...u }) => u));
  });

  app.get("/api/triage", async (req, res) => {
    const sort = req.query.sort as string | undefined;
    const posts = await storage.getTriagePosts(sort);
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = await Promise.all(posts.map(async p => {
      const comments = await storage.getComments(p.id);
      const uniqueParticipantIds = [...new Set(comments.filter(c => !c.anonymous).map(c => c.authorId))];
      return {
        ...p,
        author: userMap[p.authorId] ? { name: userMap[p.authorId].name, specialty: userMap[p.authorId].specialty, avatarUrl: userMap[p.authorId].avatarUrl } : null,
        commentCount: comments.length,
        participants: uniqueParticipantIds.slice(0, 5).map(uid => ({
          id: uid,
          name: userMap[uid]?.name || "Unknown",
          avatarUrl: userMap[uid]?.avatarUrl || "",
        })),
      };
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
      author: userMap[post.authorId] ? { name: userMap[post.authorId].name, specialty: userMap[post.authorId].specialty, avatarUrl: userMap[post.authorId].avatarUrl } : null,
      comments: comments.map(c => ({
        ...c,
        author: c.anonymous
          ? { name: "Anonymous Clinician", specialty: "", avatarUrl: "" }
          : userMap[c.authorId] ? { name: userMap[c.authorId].name, specialty: userMap[c.authorId].specialty, avatarUrl: userMap[c.authorId].avatarUrl } : null,
      })),
    });
  });

  app.post("/api/triage", async (req, res) => {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const post = await storage.createTriagePost({
      authorId: "u1",
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags,
      images: parsed.data.images,
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
      contentType: "post", contentId: req.params.id, content: post.content.substring(0, 200),
      authorName: "Unknown", reason: parsed.success ? parsed.data.reason : "Flagged by user",
      reportedBy: "u1", status: "pending", createdAt: new Date().toISOString(),
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
      parentId: parsed.data.parentId,
      anonymous: parsed.data.anonymous,
      likes: [],
      flagged: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(comment);
  });

  app.post("/api/comments/:id/like", async (req, res) => {
    const comment = await storage.likeComment(req.params.id, "u1");
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json(comment);
  });

  app.post("/api/comments/:id/flag", async (req, res) => {
    const parsed = flagSchema.safeParse(req.body);
    const comment = await storage.flagComment(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    await storage.createFlaggedItem({
      contentType: "comment", contentId: req.params.id, content: comment.content.substring(0, 200),
      authorName: "Unknown", reason: parsed.success ? parsed.data.reason : "Flagged by user",
      reportedBy: "u1", status: "pending", createdAt: new Date().toISOString(),
    });
    res.json(comment);
  });

  app.get("/api/news", async (req, res) => {
    const { source, specialty, search } = req.query;
    const items = await storage.getNewsItems(
      source as string | undefined,
      specialty as string | undefined,
      search as string | undefined,
    );
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const allComments = await storage.getAllNewsComments();
    const commentsByNews = new Map<string, typeof allComments>();
    allComments.forEach(c => {
      const arr = commentsByNews.get(c.newsId) || [];
      arr.push(c);
      commentsByNews.set(c.newsId, arr);
    });
    const enriched = items.map(item => {
      const comments = commentsByNews.get(item.id) || [];
      const uniqueAuthors = [...new Set(comments.map(c => c.authorId))];
      return {
        ...item,
        commenters: uniqueAuthors.slice(0, 5).map(uid => ({
          id: uid,
          name: userMap[uid]?.name || "Unknown",
          avatarUrl: userMap[uid]?.avatarUrl || "",
        })),
      };
    });
    res.json(enriched);
  });

  app.get("/api/news/:id", async (req, res) => {
    const item = await storage.getNewsItem(req.params.id);
    if (!item) return res.status(404).json({ message: "News not found" });
    const comments = await storage.getNewsComments(req.params.id);
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    res.json({
      ...item,
      comments: comments.map(c => ({
        ...c,
        author: userMap[c.authorId] ? { name: userMap[c.authorId].name, specialty: userMap[c.authorId].specialty, avatarUrl: userMap[c.authorId].avatarUrl } : null,
      })),
    });
  });

  app.post("/api/news/:id/like", async (req, res) => {
    const item = await storage.likeNewsItem(req.params.id, "u1");
    if (!item) return res.status(404).json({ message: "News not found" });
    res.json(item);
  });

  app.post("/api/news/:id/comments", async (req, res) => {
    const schema = z.object({ content: z.string().min(1), parentId: z.string().nullable().default(null) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const comment = await storage.createNewsComment({
      newsId: req.params.id,
      authorId: "u1",
      content: parsed.data.content,
      parentId: parsed.data.parentId,
      likes: [],
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(comment);
  });

  app.post("/api/news-comments/:id/like", async (req, res) => {
    const comment = await storage.likeNewsComment(req.params.id, "u1");
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json(comment);
  });

  app.get("/api/groups", async (_req, res) => {
    const groups = await storage.getGroups();
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = groups.map(g => ({
      ...g,
      memberAvatars: g.members.slice(0, 5).map(mId => ({
        id: mId,
        name: userMap[mId]?.name || "Unknown",
        avatarUrl: userMap[mId]?.avatarUrl || "",
      })),
    }));
    res.json(enriched);
  });

  app.get("/api/groups/:id", async (req, res) => {
    const group = await storage.getGroup(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const memberDetails = group.members.map(mId => userMap[mId]).filter(Boolean).map(({ password: _, ...u }) => u);
    res.json({ ...group, memberDetails });
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
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = events.map(e => ({
      ...e,
      rsvpAvatars: e.rsvps.slice(0, 5).map(uid => ({
        id: uid,
        name: userMap[uid]?.name || "Unknown",
        avatarUrl: userMap[uid]?.avatarUrl || "",
      })),
    }));
    res.json(enriched);
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

  app.get("/api/chats", async (_req, res) => {
    const threads = await storage.getChatThreads("u1");
    res.json(threads);
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    const messages = await storage.getChatMessages(req.params.id);
    res.json(messages);
  });

  app.post("/api/chats/:id/messages", async (req, res) => {
    const schema = z.object({ content: z.string().min(1), attachments: z.array(z.any()).default([]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage({
      threadId: req.params.id,
      senderId: "u1",
      content: parsed.data.content,
      attachments: parsed.data.attachments,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(msg);
  });

  app.post("/api/chats", async (req, res) => {
    const schema = z.object({ name: z.string(), type: z.enum(["direct", "group"]), participants: z.array(z.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const thread = await storage.createChatThread({
      ...parsed.data,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    });
    res.status(201).json(thread);
  });

  app.get("/api/training", async (_req, res) => {
    const modules = await storage.getTrainingModules();
    res.json(modules);
  });

  app.patch("/api/training/:id/complete", async (req, res) => {
    const mod = await storage.completeTrainingStep(req.params.id, "u1");
    if (!mod) return res.status(404).json({ message: "Module not found" });
    res.json(mod);
  });

  app.get("/api/aribot/history", async (_req, res) => {
    const history = await storage.getAribotHistory();
    res.json(history);
  });

  app.post("/api/aribot/history", async (req, res) => {
    const schema = z.object({ title: z.string(), tags: z.array(z.string()).default([]), folderId: z.string().nullable().default(null) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createAribotHistory({ ...parsed.data, createdAt: new Date().toISOString() });
    res.status(201).json(item);
  });

  app.get("/api/aribot/folders", async (_req, res) => {
    const folders = await storage.getAribotFolders();
    res.json(folders);
  });

  app.post("/api/aribot/folders", async (req, res) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const folder = await storage.createAribotFolder({ name: parsed.data.name, createdAt: new Date().toISOString() });
    res.status(201).json(folder);
  });

  app.patch("/api/aribot/folders/:id", async (req, res) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const folder = await storage.updateAribotFolder(req.params.id, parsed.data.name);
    if (!folder) return res.status(404).json({ message: "Folder not found" });
    res.json(folder);
  });

  app.delete("/api/aribot/folders/:id", async (req, res) => {
    const deleted = await storage.deleteAribotFolder(req.params.id);
    res.json({ success: deleted });
  });

  app.get("/api/teams", async (_req, res) => {
    const teams = await storage.getTeams();
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, specialty: u.specialty, hospital: u.hospital, avatarUrl: u.avatarUrl, verified: u.verified, rankingScore: u.rankingScore }]));
    const enriched = teams.map(t => ({
      ...t,
      members: t.members.map(m => ({ ...m, ...userMap[m.userId] })),
    }));
    res.json(enriched);
  });

  app.get("/api/notifications", async (_req, res) => {
    const news = await storage.getNewsItems();
    const posts = await storage.getTriagePosts();
    const events = await storage.getEvents();
    const threads = await storage.getChatThreads("u1");
    const recentNews = news.filter(n => {
      const age = Date.now() - new Date(n.publishedAt).getTime();
      return age < 24 * 3600000;
    }).length;
    const recentTriage = posts.filter(p => {
      const age = Date.now() - new Date(p.createdAt).getTime();
      return age < 24 * 3600000;
    }).length;
    const upcomingEvents = events.filter(e => {
      const diff = new Date(e.date).getTime() - Date.now();
      return diff > 0 && diff < 7 * 86400000;
    }).length;
    const unreadChats = threads.reduce((sum, t) => sum + t.unreadCount, 0);
    res.json({ news: recentNews, triage: recentTriage, events: upcomingEvents, chats: unreadChats });
  });

  return httpServer;
}
