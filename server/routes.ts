import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertDemoRequestSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

  app.get("/api/triage/trending", async (req, res) => {
    const posts = await storage.getTrendingTriagePosts(10);
    const users = await storage.getAllUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = await Promise.all(posts.map(async p => {
      const comments = await storage.getComments(p.id);
      return {
        ...p,
        author: userMap[p.authorId] ? { name: userMap[p.authorId].name, specialty: userMap[p.authorId].specialty, credential: userMap[p.authorId].credential, avatarUrl: userMap[p.authorId].avatarUrl } : null,
        commentCount: comments.length,
      };
    }));
    res.json(enriched);
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
        author: userMap[p.authorId] ? { name: userMap[p.authorId].name, specialty: userMap[p.authorId].specialty, credential: userMap[p.authorId].credential, avatarUrl: userMap[p.authorId].avatarUrl } : null,
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
      author: userMap[post.authorId] ? { name: userMap[post.authorId].name, specialty: userMap[post.authorId].specialty, credential: userMap[post.authorId].credential, avatarUrl: userMap[post.authorId].avatarUrl } : null,
      comments: comments.map(c => ({
        ...c,
        author: c.anonymous
          ? { name: "Anonymous Clinician", specialty: "", avatarUrl: "" }
          : userMap[c.authorId] ? { name: userMap[c.authorId].name, specialty: userMap[c.authorId].specialty, credential: userMap[c.authorId].credential, avatarUrl: userMap[c.authorId].avatarUrl } : null,
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
        author: userMap[c.authorId] ? { name: userMap[c.authorId].name, specialty: userMap[c.authorId].specialty, credential: userMap[c.authorId].credential, avatarUrl: userMap[c.authorId].avatarUrl } : null,
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

  app.get("/api/telemed/consultations", async (req, res) => {
    const { status, urgency } = req.query;
    const consultations = await storage.getTelemedConsultations(
      status as string | undefined,
      urgency as string | undefined
    );
    res.json(consultations);
  });

  app.get("/api/telemed/consultations/:id", async (req, res) => {
    const consultation = await storage.getTelemedConsultation(req.params.id);
    if (!consultation) return res.status(404).json({ message: "Consultation not found" });
    res.json(consultation);
  });

  app.post("/api/telemed/consultations/:id/accept", async (req, res) => {
    const consultation = await storage.acceptTelemedConsultation(req.params.id, "u1");
    if (!consultation) return res.status(404).json({ message: "Consultation not found" });
    res.json(consultation);
  });

  app.post("/api/telemed/consultations/:id/complete", async (req, res) => {
    const schema = z.object({
      notes: z.string().min(1),
      diagnosis: z.string().min(1),
      prescriptions: z.array(z.string()).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const consultation = await storage.completeTelemedConsultation(req.params.id, parsed.data);
    if (!consultation) return res.status(404).json({ message: "Consultation not found" });
    res.json(consultation);
  });

  app.patch("/api/telemed/consultations/:id/notes", async (req, res) => {
    const schema = z.object({ notes: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const consultation = await storage.updateTelemedNotes(req.params.id, parsed.data.notes);
    if (!consultation) return res.status(404).json({ message: "Consultation not found" });
    res.json(consultation);
  });

  app.get("/api/telemed/earnings", async (_req, res) => {
    const earnings = await storage.getTelemedEarnings("u1");
    res.json(earnings);
  });

  app.get("/api/telemed/stats", async (_req, res) => {
    const all = await storage.getTelemedConsultations();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = all.filter(c => new Date(c.scheduledAt) >= today && new Date(c.scheduledAt) < new Date(today.getTime() + 86400000)).length;
    res.json({
      total: all.length,
      pending: all.filter(c => c.status === "pending").length,
      accepted: all.filter(c => c.status === "accepted").length,
      inProgress: all.filter(c => c.status === "in-progress").length,
      completed: all.filter(c => c.status === "completed").length,
      todayCount,
    });
  });

  app.post("/api/upload-document", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const ext = path.extname(req.file.originalname).toLowerCase();
      let content = "";
      let docType: "pdf" | "text" | "image" = "text";

      if (ext === ".pdf") {
        docType = "pdf";
        const pdfParse = (await import("pdf-parse")).default;
        const result = await pdfParse(req.file.buffer);
        content = result.text;
      } else if ([".txt", ".csv", ".md", ".rtf"].includes(ext)) {
        docType = "text";
        content = req.file.buffer.toString("utf-8");
      } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)) {
        docType = "image";
        content = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      } else {
        return res.status(400).json({ error: "Unsupported file type. Use PDF, TXT, CSV, MD, or image files." });
      }

      res.json({
        id: `doc-${Date.now()}`,
        name: req.file.originalname,
        type: docType,
        content,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  app.post("/api/parse-document", async (req, res) => {
    try {
      const { content, documentName } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (!openaiKey) {
        return res.json({ fields: {}, raw: content });
      }

      const prompt = `You are a medical document parser. Extract structured patient data from this clinical document. Return ONLY valid JSON with these optional keys (only include keys that have data):
- name (patient full name)
- dob (date of birth, format YYYY-MM-DD)
- mrn (medical record number)
- sex (Male/Female/Other)
- chiefComplaint (reason for visit)
- medications (one per line)
- allergies (with reactions)
- pmh (past medical history)
- psh (past surgical history)
- familyHistory
- recentResults (labs, imaging)
- bp, hr, temp, o2sat, rr, weight, height (vitals)

Document name: ${documentName}
Document content:
${content.substring(0, 8000)}`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.2,
          messages: [
            { role: "system", content: "You are a medical document parser. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiRes.ok) return res.json({ fields: {}, raw: content });

      const aiJson = await aiRes.json();
      const aiContent = aiJson.choices?.[0]?.message?.content || "{}";
      try {
        const parsed = JSON.parse(aiContent.replace(/```json\n?/g, "").replace(/```/g, "").trim());
        return res.json({ fields: parsed, raw: content });
      } catch {
        return res.json({ fields: {}, raw: content });
      }
    } catch (err) {
      console.error("Parse document error:", err);
      res.status(500).json({ error: "Failed to parse document" });
    }
  });

  app.post("/api/prechart", async (req, res) => {
    try {
      const data = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (openaiKey) {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{
              role: "system",
              content: "You are ARIbot, a clinical AI assistant developed by Dr. Chet Chea. Generate a concise 3-5 sentence encounter primer summarizing the patient's clinical context. Focus on clinically relevant information that the physician needs before the encounter. Be specific and actionable."
            }, {
              role: "user",
              content: `Patient: ${data.name}, DOB: ${data.dob}, Sex: ${data.sex}
Chief Complaint: ${data.chiefComplaint}
Visit Type: ${data.visitType}, Specialty: ${data.specialty}
Vitals: BP ${data.bp || "N/A"}, HR ${data.hr || "N/A"}, Temp ${data.temp || "N/A"}, O2 ${data.o2sat || "N/A"}, BMI ${data.bmi || "N/A"}
Pain: ${data.painScore}/10
Medications: ${data.medications || "None listed"}
Allergies: ${data.allergies || "NKDA"}
PMH: ${data.pmh || "None"}
PSH: ${data.psh || "None"}
Family History: ${data.familyHistory || "None"}
Recent Results: ${data.recentResults || "None"}`
            }],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("OpenAI Prechart error:", aiRes.status, errText);
          return res.status(502).json({ primer: "AI service error generating primer." });
        }

        const aiJson = await aiRes.json();
        const primer = aiJson.choices?.[0]?.message?.content || "Unable to generate primer.";
        return res.json({ primer });
      }

      const primer = `${data.name} is a ${data.sex?.toLowerCase() || ""} patient presenting for a ${data.visitType?.toLowerCase() || "clinic"} visit with a chief complaint of "${data.chiefComplaint || "not specified"}". ${data.medications ? `Current medications include ${data.medications.split("\\n").filter(Boolean).length} active prescriptions.` : "No current medications reported."} ${data.allergies ? `Known allergies: ${data.allergies}.` : "No known drug allergies."} ${data.pmh ? `Relevant medical history includes ${data.pmh.substring(0, 100)}.` : ""} ${data.bp ? `Vitals on intake: BP ${data.bp}, HR ${data.hr || "N/A"}, Temp ${data.temp || "N/A"}.` : "Vitals pending."}`.trim();
      res.json({ primer });
    } catch (err) {
      res.status(500).json({ primer: "Error generating encounter primer." });
    }
  });

  app.post("/api/clinical-chat", async (req, res) => {
    try {
      const { message, patientContext, history } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      const systemPrompt = `Your name is ARIbot. You were developed by Dr. Chet Chea. You are a specialized medical AI assistant designed to help physicians analyze medical data, review clinical cases, and provide evidence-based clinical decision support.

IMPORTANT RULES:
1. You must ONLY answer medical and clinical questions. If a user asks anything outside of medicine, healthcare, or clinical practice, politely decline and remind them that you are exclusively a medical assistant.
2. You are assisting a licensed physician. Provide detailed clinical reasoning. Do not add generic disclaimers about "consulting a doctor" — you ARE talking to the doctor.
3. Be concise, evidence-based, and clinically rigorous. Cite sources inline with numbered references like [1], [2]. At the end of your response, list references with their evidence level (e.g., RCT, Meta-analysis, Guideline, Expert Opinion).
4. If asked about your identity, say: "I am ARIbot, a clinical AI assistant developed by Dr. Chet Chea, designed to help physicians analyze medical data and support clinical decision-making."

Patient context:
Name: ${patientContext?.name || "Unknown"}
DOB: ${patientContext?.dob || "Unknown"}, Sex: ${patientContext?.sex || "Unknown"}
Chief Complaint: ${patientContext?.chiefComplaint || "Not specified"}
Medications: ${patientContext?.medications || "None listed"}
Allergies: ${patientContext?.allergies || "NKDA"}
PMH: ${patientContext?.pmh || "None"}
Vitals: ${JSON.stringify(patientContext?.vitals || {})}
Specialty: ${patientContext?.specialty || "General"}
${patientContext?.encounterPrimer ? `Encounter Primer: ${patientContext.encounterPrimer}` : ""}`;

      if (openaiKey) {
        const messages = [
          { role: "system", content: systemPrompt },
          ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ];

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            stream: true,
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("OpenAI API error:", aiRes.status, errText);
          return res.status(502).json({ error: "AI service error" });
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");
        if (aiRes.body) {
          const reader = (aiRes.body as any).getReader?.();
          if (reader) {
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) res.write(content);
                } catch {}
              }
            }
          }
          return res.end();
        }
        return res.end();
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");
      const cc = patientContext?.chiefComplaint || "the presenting complaint";
      const specialty = patientContext?.specialty || "general medicine";
      const mockResponse = `Based on the clinical presentation of ${cc} in the context of ${specialty}, here is my assessment:

## Differential Diagnosis
1. **Primary consideration**: Given the symptoms described, the most likely diagnosis involves evaluating the chief complaint in the context of the patient's medical history [1].
2. **Secondary consideration**: Additional workup may be warranted to rule out alternative etiologies [2].
3. **Less likely but important**: Consider screening for related conditions given the patient's risk factors [3].

## Recommended Workup
- Complete metabolic panel and CBC with differential
- Imaging as clinically indicated based on physical examination findings
- Consider specialty referral if symptoms persist despite initial management

## Evidence-Based Recommendations
Current guidelines suggest a stepwise approach to management, beginning with conservative measures and escalating as clinically appropriate [1]. Medication reconciliation should be performed to assess for potential drug interactions [2].

---
**References:**
[1] UpToDate Clinical Reference (Clinical Guidelines)
[2] CDC Clinical Practice Recommendations (Guidelines)
[3] Cochrane Systematic Review Database (Meta-analysis)`;

      const words = mockResponse.split(" ");
      let i = 0;
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval);
          res.end();
          return;
        }
        res.write((i > 0 ? " " : "") + words[i]);
        i++;
      }, 30);
    } catch (err) {
      console.error("Clinical chat error:", err);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  app.post("/api/soap/integrate", async (req, res) => {
    try {
      const { snippet, currentSoap, patientContext } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (!openaiKey) {
        const updated = { ...currentSoap };
        updated.A = updated.A ? updated.A + "\n\n" + snippet : snippet;
        return res.json(updated);
      }

      const prompt = `You are a physician's clinical documentation assistant. You have an existing SOAP note draft and a new piece of clinical information from an AI consult conversation. Your job is to INTELLIGENTLY INTEGRATE the new information into the appropriate SOAP sections.

Rules:
- Merge the new info into the correct section(s) — subjective findings go in S, objective data in O, clinical reasoning in A, and management recommendations in P.
- Do NOT just append text. Rewrite each affected section so it reads as a single coherent narrative.
- Preserve all existing content that is still relevant — do not remove information.
- If a section has no new information to add, return it unchanged.
- Return ONLY valid JSON with keys: S, O, A, P. Each value must be a plain text STRING. No markdown fences.

${patientContext ? `Patient context: ${patientContext}\n` : ""}
Current SOAP draft:
S: ${currentSoap.S || "(empty)"}
O: ${currentSoap.O || "(empty)"}
A: ${currentSoap.A || "(empty)"}
P: ${currentSoap.P || "(empty)"}

New clinical information to integrate:
${snippet}`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          messages: [
            { role: "system", content: "You are a clinical documentation assistant for physicians. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const updated = { ...currentSoap };
        updated.A = updated.A ? updated.A + "\n\n" + snippet : snippet;
        return res.json(updated);
      }

      const aiJson = await aiRes.json();
      const content = aiJson.choices?.[0]?.message?.content || "{}";
      try {
        const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
        const normalize = (val: any): string => {
          if (typeof val === "string") return val;
          if (typeof val === "object" && val !== null) {
            const lines: string[] = [];
            function flatten(obj: any, prefix = "") {
              if (Array.isArray(obj)) {
                obj.forEach((item: any) => {
                  if (typeof item === "string") lines.push(`- ${item}`);
                  else flatten(item, prefix);
                });
              } else if (typeof obj === "object" && obj !== null) {
                for (const [key, v] of Object.entries(obj)) {
                  if (typeof v === "string" || typeof v === "number") lines.push(`${key}: ${v}`);
                  else { lines.push(`\n${key}:`); flatten(v, key); }
                }
              } else lines.push(String(obj));
            }
            flatten(val);
            return lines.join("\n").trim();
          }
          return String(val || "");
        };
        return res.json({
          S: normalize(parsed.S),
          O: normalize(parsed.O),
          A: normalize(parsed.A),
          P: normalize(parsed.P),
        });
      } catch {
        const updated = { ...currentSoap };
        updated.A = updated.A ? updated.A + "\n\n" + snippet : snippet;
        return res.json(updated);
      }
    } catch (err) {
      console.error("SOAP integrate error:", err);
      res.status(500).json({ error: "Integration failed" });
    }
  });

  app.post("/api/soap", async (req, res) => {
    try {
      const data = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (openaiKey) {
        const prompt = `Generate a SOAP note for the following patient. Return ONLY valid JSON with keys: S, O, A, P, confidence (object with S/O/A/P each being "high", "moderate", or "low"). IMPORTANT: Each of S, O, A, P must be a plain text STRING, never an object or array. No markdown fences.

Patient: ${data.name}, DOB: ${data.dob}, Sex: ${data.sex}
Chief Complaint: ${data.chiefComplaint}
Specialty: ${data.specialty}
Vitals: ${JSON.stringify(data.vitals || {})}
Medications: ${data.medications || "None"}
Allergies: ${data.allergies || "NKDA"}
PMH: ${data.pmh || "None"}
PSH: ${data.psh || "None"}
Encounter Primer: ${data.encounterPrimer || "N/A"}
Chat Transcript: ${data.chatTranscript || "No chat history"}
${data.regenerateSection ? `Only regenerate the ${data.regenerateSection} section. Return JSON with only that key and its confidence.` : "Generate all four sections."}`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are ARIbot, a clinical documentation AI developed by Dr. Chet Chea. Generate SOAP notes in JSON format. Return ONLY valid JSON, no markdown fences or extra text." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("OpenAI SOAP error:", aiRes.status, errText);
          return res.status(502).json({ error: "AI service error" });
        }

        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content || "{}";
        try {
          const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
          const normalize = (val: any): string => {
            if (typeof val === "string") return val;
            if (typeof val === "object" && val !== null) {
              const lines: string[] = [];
              function flatten(obj: any, prefix = "") {
                if (Array.isArray(obj)) {
                  obj.forEach((item) => {
                    if (typeof item === "string") lines.push(`${prefix ? prefix + ": " : ""}- ${item}`);
                    else flatten(item, prefix);
                  });
                } else if (typeof obj === "object" && obj !== null) {
                  for (const [key, v] of Object.entries(obj)) {
                    if (typeof v === "string" || typeof v === "number") {
                      lines.push(`${key}: ${v}`);
                    } else {
                      lines.push(`\n${key}:`);
                      flatten(v, key);
                    }
                  }
                } else {
                  lines.push(String(obj));
                }
              }
              flatten(val);
              return lines.join("\n").trim();
            }
            return String(val || "");
          };
          return res.json({
            S: normalize(parsed.S),
            O: normalize(parsed.O),
            A: normalize(parsed.A),
            P: normalize(parsed.P),
            confidence: parsed.confidence || { S: "moderate", O: "moderate", A: "moderate", P: "moderate" },
          });
        } catch {
          return res.json({ S: content, O: "", A: "", P: "", confidence: { S: "low", O: "low", A: "low", P: "low" } });
        }
      }

      const cc = data.chiefComplaint || "the chief complaint";
      const name = data.name || "the patient";
      const specialty = data.specialty || "general medicine";
      const soap = {
        S: `${name} presents with ${cc}. ${data.pmh ? `Past medical history is notable for ${data.pmh}.` : "No significant past medical history reported."} ${data.medications ? `Current medications: ${data.medications.substring(0, 200)}.` : "No current medications."} ${data.allergies ? `Allergies: ${data.allergies}.` : "No known drug allergies."} Patient reports symptoms as described in the intake form.`,
        O: `Vitals: ${data.vitals?.bp ? `BP ${data.vitals.bp}` : "BP not recorded"}, ${data.vitals?.hr ? `HR ${data.vitals.hr}` : "HR not recorded"}, ${data.vitals?.temp ? `Temp ${data.vitals.temp}°F` : "Temp not recorded"}, ${data.vitals?.o2sat ? `O2 Sat ${data.vitals.o2sat}%` : "O2 sat not recorded"}, ${data.vitals?.rr ? `RR ${data.vitals.rr}` : "RR not recorded"}.\n\nGeneral: Patient appears well-nourished and in no acute distress.\nPhysical examination findings: To be documented by examining physician.\n${data.recentResults ? `Recent results: ${data.recentResults}` : ""}`,
        A: `Primary Assessment: ${cc}\n\nDifferential diagnoses to consider based on ${specialty} presentation:\n1. [Primary diagnosis to be confirmed]\n2. [Secondary consideration]\n3. [Alternate diagnosis to rule out]\n\nClinical impression based on available data and clinical encounter.`,
        P: `1. Continue current medications with monitoring\n2. Order appropriate diagnostic studies as indicated\n3. Follow-up appointment in [timeframe]\n4. Patient education regarding condition management\n5. Return precautions discussed\n6. Specialty referral if clinically indicated`,
        confidence: {
          S: data.chiefComplaint ? "high" : "low",
          O: data.vitals?.bp ? "moderate" : "low",
          A: "moderate",
          P: "moderate",
        },
      };

      if (data.regenerateSection) {
        return res.json({
          [data.regenerateSection]: soap[data.regenerateSection as keyof typeof soap],
          confidence: { [data.regenerateSection]: soap.confidence[data.regenerateSection as keyof typeof soap.confidence] },
        });
      }

      res.json(soap);
    } catch (err) {
      res.status(500).json({ error: "SOAP generation failed" });
    }
  });

  app.post("/api/summary", async (req, res) => {
    try {
      const { soapNote, patientName, specialty, chiefComplaint, medications } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (openaiKey) {
        const prompt = `Convert this SOAP note into a patient-friendly visit summary. Use simple language at a 5th-grade reading level. Avoid all medical abbreviations and jargon. Return ONLY valid JSON with keys: visitReason (string), findings (string), diagnoses (array of strings), medications (array of objects with keys: name, change, reason — change must be one of START, CONTINUE, STOP, DOSE CHANGE), carePlan (string), warningSigns (array of strings), followUp (string).

Patient: ${patientName || "Patient"}
Specialty: ${specialty || "General"}
Chief Complaint: ${chiefComplaint || "Not specified"}
Current Medications: ${medications || "None listed"}

SOAP Note:
S: ${soapNote.S}
O: ${soapNote.O}
A: ${soapNote.A}
P: ${soapNote.P}`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are ARIbot, a clinical documentation assistant developed by Dr. Chet Chea. Convert SOAP notes into patient-friendly summaries. Return ONLY valid JSON, no markdown fences or extra text." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" },
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("OpenAI Summary error:", aiRes.status, errText);
          return res.status(502).json({ error: "AI service error" });
        }

        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content || "{}";
        try {
          const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
          return res.json(parsed);
        } catch {
          return res.json({ visitReason: content, findings: "", diagnoses: [], medications: [], carePlan: "", warningSigns: [], followUp: "" });
        }
      }

      const meds = (medications || "").split("\n").filter(Boolean);
      res.json({
        visitReason: `You came in today because of ${chiefComplaint || "your health concern"}. Your doctor wanted to check on how you are doing and make sure you are getting the right care.`,
        findings: `Your doctor checked your vital signs and did a physical exam. ${soapNote.O ? "The exam showed the findings described in your clinical record." : "Everything was checked thoroughly."} Your doctor reviewed your medical history and current medications.`,
        diagnoses: [
          `Based on your visit today, your doctor is working on figuring out exactly what is causing your symptoms. More tests may be needed to confirm the diagnosis.`,
        ],
        medications: meds.length > 0
          ? meds.slice(0, 5).map((m: string) => ({
              name: m.trim(),
              change: "CONTINUE",
              reason: "Keep taking as prescribed for your current condition",
            }))
          : [{ name: "No changes", change: "CONTINUE", reason: "Your current medications remain the same" }],
        carePlan: `1. Follow up with your doctor as scheduled\n2. Take all medications as prescribed\n3. Watch for any new or worsening symptoms\n4. Call the office if you have any questions about your care\n5. Maintain a healthy diet and regular exercise as tolerated`,
        warningSigns: [
          "Fever over 101°F (38.3°C) that doesn't go away",
          "Severe or sudden worsening of your symptoms",
          "New symptoms that concern you",
          "Side effects from any medications",
          "Difficulty breathing or chest pain — call 911 immediately",
        ],
        followUp: `Please schedule a follow-up appointment within the next 2-4 weeks. If your symptoms get worse before then, call our office right away. For emergencies, go to the nearest emergency room or call 911.`,
      });
    } catch (err) {
      res.status(500).json({ error: "Summary generation failed" });
    }
  });

  app.post("/api/demo-requests", async (req, res) => {
    const parsed = insertDemoRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const demoRequest = await storage.createDemoRequest(parsed.data);
    res.status(201).json(demoRequest);
  });

  return httpServer;
}
