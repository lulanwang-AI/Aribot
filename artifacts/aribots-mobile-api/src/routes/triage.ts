import { Router } from "express";
import { mobileStorage } from "../storage";
import { requireAuth, optionalAuth } from "../jwt";
import { z } from "zod";

const router = Router();

router.get("/", optionalAuth, async (req: any, res) => {
  const sort = typeof req.query.sort === "string" ? req.query.sort : "recent";
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  let posts = mobileStorage.getTriagePosts(sort);
  if (tag) posts = posts.filter(p => p.tags.includes(tag));
  const users = mobileStorage.getAllUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const enriched = posts.map(p => {
    const author = !p.anonymous ? userMap[p.authorId] : null;
    return {
      ...p,
      author: author ? { id: author.id, name: author.name, specialty: author.specialty, avatarUrl: author.avatarUrl, credential: author.credential } : null,
      likedByMe: req.jwtUser ? p.likedBy?.includes(req.jwtUser.userId) : false,
    };
  });
  res.json(enriched.slice(0, 50));
});

router.get("/:id", optionalAuth, async (req: any, res) => {
  const post = mobileStorage.getTriagePost(req.params.id);
  if (!post) { res.status(404).json({ message: "Post not found" }); return; }
  const users = mobileStorage.getAllUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const author = !post.anonymous ? userMap[post.authorId] : null;
  const comments = mobileStorage.getComments(post.id);
  const enrichedComments = comments.map(c => {
    const commenter = !c.anonymous ? userMap[c.authorId] : null;
    return { ...c, author: commenter ? { id: commenter.id, name: commenter.name, specialty: commenter.specialty, avatarUrl: commenter.avatarUrl, credential: commenter.credential } : null };
  });
  res.json({
    ...post,
    author: author ? { id: author.id, name: author.name, specialty: author.specialty, avatarUrl: author.avatarUrl, credential: author.credential } : null,
    comments: enrichedComments,
    likedByMe: req.jwtUser ? post.likedBy?.includes(req.jwtUser.userId) : false,
  });
});

router.post("/", requireAuth, async (req: any, res) => {
  const schema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    tags: z.array(z.string()).default([]),
    anonymous: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
  const post = mobileStorage.createTriagePost({
    ...parsed.data,
    authorId: req.jwtUser.userId,
    likes: 0,
    likedBy: [],
    commentCount: 0,
    images: [],
    status: "safe",
    flagged: false,
    createdAt: Date.now(),
  });
  res.status(201).json(post);
});

router.post("/:id/like", requireAuth, async (req: any, res) => {
  const post = mobileStorage.likeTriagePost(req.params.id, req.jwtUser.userId);
  if (!post) { res.status(404).json({ message: "Post not found" }); return; }
  res.json({ likes: post.likes, likedByMe: post.likedBy?.includes(req.jwtUser.userId) });
});

router.post("/:id/comments", requireAuth, async (req: any, res) => {
  const schema = z.object({ content: z.string().min(1), anonymous: z.boolean().default(false), parentId: z.string().nullable().default(null) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
  const comment = mobileStorage.createComment({
    ...parsed.data,
    postId: req.params.id,
    authorId: req.jwtUser.userId,
    likes: 0,
    likedBy: [],
    flagged: false,
    createdAt: Date.now(),
  });
  res.status(201).json(comment);
});

export default router;
