import type {
  User, InsertUser, TriagePost, Comment, NewsItem, NewsComment, Group, MedEvent, FlaggedItem,
  ChatThread, ChatMessage, TrainingModule, AribotHistory, AribotFolder, Team
} from "@shared/schema";
import { randomUUID } from "crypto";
import { seedAllData } from "./seed";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  searchDoctors(query?: string, specialty?: string, sortBy?: string): Promise<User[]>;

  getTriagePosts(sort?: string): Promise<TriagePost[]>;
  getTriagePost(id: string): Promise<TriagePost | undefined>;
  createTriagePost(post: Omit<TriagePost, "id">): Promise<TriagePost>;
  likeTriagePost(postId: string, userId: string): Promise<TriagePost | undefined>;
  flagTriagePost(postId: string): Promise<TriagePost | undefined>;

  getComments(postId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id">): Promise<Comment>;
  likeComment(commentId: string, userId: string): Promise<Comment | undefined>;
  flagComment(commentId: string): Promise<Comment | undefined>;

  getNewsItems(source?: string, specialty?: string, search?: string): Promise<NewsItem[]>;
  getNewsItem(id: string): Promise<NewsItem | undefined>;
  likeNewsItem(newsId: string, userId: string): Promise<NewsItem | undefined>;
  getNewsComments(newsId: string): Promise<NewsComment[]>;
  getAllNewsComments(): Promise<NewsComment[]>;
  createNewsComment(comment: Omit<NewsComment, "id">): Promise<NewsComment>;
  likeNewsComment(commentId: string, userId: string): Promise<NewsComment | undefined>;

  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  joinGroup(groupId: string, userId: string): Promise<Group | undefined>;
  leaveGroup(groupId: string, userId: string): Promise<Group | undefined>;

  getEvents(): Promise<MedEvent[]>;
  rsvpEvent(eventId: string, userId: string): Promise<MedEvent | undefined>;
  unrsvpEvent(eventId: string, userId: string): Promise<MedEvent | undefined>;

  getFlaggedItems(): Promise<FlaggedItem[]>;
  createFlaggedItem(item: Omit<FlaggedItem, "id">): Promise<FlaggedItem>;
  updateFlaggedItem(id: string, status: FlaggedItem["status"]): Promise<FlaggedItem | undefined>;

  getChatThreads(userId: string): Promise<ChatThread[]>;
  getChatThread(id: string): Promise<ChatThread | undefined>;
  getChatMessages(threadId: string): Promise<ChatMessage[]>;
  createChatMessage(msg: Omit<ChatMessage, "id">): Promise<ChatMessage>;
  createChatThread(thread: Omit<ChatThread, "id">): Promise<ChatThread>;

  getTrainingModules(): Promise<TrainingModule[]>;
  completeTrainingStep(moduleId: string, userId: string): Promise<TrainingModule | undefined>;

  getAribotHistory(): Promise<AribotHistory[]>;
  createAribotHistory(item: Omit<AribotHistory, "id">): Promise<AribotHistory>;
  getAribotFolders(): Promise<AribotFolder[]>;
  createAribotFolder(folder: Omit<AribotFolder, "id">): Promise<AribotFolder>;
  updateAribotFolder(id: string, name: string): Promise<AribotFolder | undefined>;
  deleteAribotFolder(id: string): Promise<boolean>;

  getTeams(): Promise<Team[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private triagePosts: Map<string, TriagePost> = new Map();
  private comments: Map<string, Comment> = new Map();
  private newsItems: Map<string, NewsItem> = new Map();
  private newsComments: Map<string, NewsComment> = new Map();
  private groups: Map<string, Group> = new Map();
  private events: Map<string, MedEvent> = new Map();
  private flaggedItems: Map<string, FlaggedItem> = new Map();
  private chatThreads: Map<string, ChatThread> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();
  private trainingModules: Map<string, TrainingModule> = new Map();
  private aribotHistory: Map<string, AribotHistory> = new Map();
  private aribotFolders: Map<string, AribotFolder> = new Map();
  private teams: Map<string, Team> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    const data = seedAllData();
    data.doctors.forEach(u => this.users.set(u.id, u));
    data.triagePosts.forEach(p => this.triagePosts.set(p.id, p));
    data.comments.forEach(c => this.comments.set(c.id, c));
    data.news.forEach(n => this.newsItems.set(n.id, n));
    data.newsComments.forEach(c => this.newsComments.set(c.id, c));
    data.groups.forEach(g => this.groups.set(g.id, g));
    data.events.forEach(e => this.events.set(e.id, e));
    data.flaggedItems.forEach(f => this.flaggedItems.set(f.id, f));
    data.chatThreads.forEach(t => this.chatThreads.set(t.id, t));
    data.chatMessages.forEach(m => this.chatMessages.set(m.id, m));
    data.training.forEach(t => this.trainingModules.set(t.id, t));
    data.aribotHistory.forEach(h => this.aribotHistory.set(h.id, h));
    data.aribotFolders.forEach(f => this.aribotFolders.set(f.id, f));
    data.teams.forEach(t => this.teams.set(t.id, t));
  }

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find(u => u.username === username); }
  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id, username: data.username, password: data.password, name: data.name || "",
      specialty: data.specialty || "", subspecialty: data.subspecialty || "",
      interests: data.interests || [], hospital: data.hospital || "",
      city: data.city || "", state: data.state || "",
      role: data.role || "physician", verified: data.verified || false,
      phiSafeMode: data.phiSafeMode !== undefined ? data.phiSafeMode : true,
      yearsExperience: data.yearsExperience || 0, rankingScore: data.rankingScore || 50,
      badges: data.badges || [], bio: data.bio || "", avatarUrl: data.avatarUrl || "",
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id: string, data: Partial<User>) {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }
  async getAllUsers() { return Array.from(this.users.values()); }
  async searchDoctors(query?: string, specialty?: string, sortBy?: string) {
    let docs = Array.from(this.users.values()).filter(d => d.verified && d.role === "physician");
    if (query) {
      const q = query.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
    }
    if (specialty) {
      docs = docs.filter(d => d.specialty.toLowerCase() === specialty.toLowerCase());
    }
    if (sortBy === "ranking") {
      docs.sort((a, b) => b.rankingScore - a.rankingScore);
    } else {
      docs.sort((a, b) => a.name.localeCompare(b.name));
    }
    return docs;
  }

  async getTriagePosts(sort?: string) {
    const posts = Array.from(this.triagePosts.values());
    const commentsArr = Array.from(this.comments.values());
    if (sort === "trending") {
      posts.sort((a, b) => b.likes.length - a.likes.length);
    } else if (sort === "discussed") {
      posts.sort((a, b) => {
        const ac = commentsArr.filter(c => c.postId === a.id).length;
        const bc = commentsArr.filter(c => c.postId === b.id).length;
        return bc - ac;
      });
    } else {
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return posts;
  }
  async getTriagePost(id: string) { return this.triagePosts.get(id); }
  async createTriagePost(post: Omit<TriagePost, "id">) {
    const id = randomUUID();
    const p = { ...post, id };
    this.triagePosts.set(id, p);
    return p;
  }
  async likeTriagePost(postId: string, userId: string) {
    const post = this.triagePosts.get(postId);
    if (!post) return undefined;
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id !== userId);
    } else {
      post.likes.push(userId);
    }
    return post;
  }
  async flagTriagePost(postId: string) {
    const post = this.triagePosts.get(postId);
    if (!post) return undefined;
    post.flagged = true;
    return post;
  }

  async getComments(postId: string) {
    return Array.from(this.comments.values())
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  async createComment(comment: Omit<Comment, "id">) {
    const id = randomUUID();
    const c = { ...comment, id };
    this.comments.set(id, c);
    return c;
  }
  async likeComment(commentId: string, userId: string) {
    const c = this.comments.get(commentId);
    if (!c) return undefined;
    if (c.likes.includes(userId)) {
      c.likes = c.likes.filter(id => id !== userId);
    } else {
      c.likes.push(userId);
    }
    return c;
  }
  async flagComment(commentId: string) {
    const c = this.comments.get(commentId);
    if (!c) return undefined;
    c.flagged = true;
    return c;
  }

  async getNewsItems(source?: string, specialty?: string, search?: string) {
    let items = Array.from(this.newsItems.values());
    if (source) {
      items = items.filter(n => n.source.toLowerCase().includes(source.toLowerCase()));
    }
    if (specialty) {
      const s = specialty.toLowerCase();
      items = items.filter(n => n.tags.some(t => t.includes(s)));
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q));
    }
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  async getNewsItem(id: string) { return this.newsItems.get(id); }
  async likeNewsItem(newsId: string, userId: string) {
    const n = this.newsItems.get(newsId);
    if (!n) return undefined;
    if (n.likes.includes(userId)) {
      n.likes = n.likes.filter(id => id !== userId);
    } else {
      n.likes.push(userId);
    }
    return n;
  }
  async getNewsComments(newsId: string) {
    return Array.from(this.newsComments.values())
      .filter(c => c.newsId === newsId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  async getAllNewsComments() {
    return Array.from(this.newsComments.values());
  }
  async createNewsComment(comment: Omit<NewsComment, "id">) {
    const id = randomUUID();
    const c = { ...comment, id };
    this.newsComments.set(id, c);
    const news = this.newsItems.get(comment.newsId);
    if (news) news.commentCount++;
    return c;
  }
  async likeNewsComment(commentId: string, userId: string) {
    const c = this.newsComments.get(commentId);
    if (!c) return undefined;
    if (c.likes.includes(userId)) {
      c.likes = c.likes.filter(id => id !== userId);
    } else {
      c.likes.push(userId);
    }
    return c;
  }

  async getGroups() { return Array.from(this.groups.values()); }
  async getGroup(id: string) { return this.groups.get(id); }
  async joinGroup(groupId: string, userId: string) {
    const g = this.groups.get(groupId);
    if (!g) return undefined;
    if (!g.members.includes(userId)) { g.members.push(userId); g.memberCount++; }
    return g;
  }
  async leaveGroup(groupId: string, userId: string) {
    const g = this.groups.get(groupId);
    if (!g) return undefined;
    g.members = g.members.filter(id => id !== userId);
    g.memberCount = Math.max(0, g.memberCount - 1);
    return g;
  }

  async getEvents() { return Array.from(this.events.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); }
  async rsvpEvent(eventId: string, userId: string) {
    const e = this.events.get(eventId);
    if (!e) return undefined;
    if (!e.rsvps.includes(userId)) e.rsvps.push(userId);
    return e;
  }
  async unrsvpEvent(eventId: string, userId: string) {
    const e = this.events.get(eventId);
    if (!e) return undefined;
    e.rsvps = e.rsvps.filter(id => id !== userId);
    return e;
  }

  async getFlaggedItems() { return Array.from(this.flaggedItems.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async createFlaggedItem(item: Omit<FlaggedItem, "id">) {
    const id = randomUUID();
    const f = { ...item, id };
    this.flaggedItems.set(id, f);
    return f;
  }
  async updateFlaggedItem(id: string, status: FlaggedItem["status"]) {
    const f = this.flaggedItems.get(id);
    if (!f) return undefined;
    f.status = status;
    return f;
  }

  async getChatThreads(userId: string) {
    return Array.from(this.chatThreads.values())
      .filter(t => t.participants.includes(userId))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }
  async getChatThread(id: string) { return this.chatThreads.get(id); }
  async getChatMessages(threadId: string) {
    return Array.from(this.chatMessages.values())
      .filter(m => m.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  async createChatMessage(msg: Omit<ChatMessage, "id">) {
    const id = randomUUID();
    const m = { ...msg, id };
    this.chatMessages.set(id, m);
    const thread = this.chatThreads.get(msg.threadId);
    if (thread) {
      thread.lastMessage = msg.content;
      thread.lastMessageAt = msg.createdAt;
    }
    return m;
  }
  async createChatThread(thread: Omit<ChatThread, "id">) {
    const id = randomUUID();
    const t = { ...thread, id };
    this.chatThreads.set(id, t);
    return t;
  }

  async getTrainingModules() { return Array.from(this.trainingModules.values()); }
  async completeTrainingStep(moduleId: string, userId: string) {
    const m = this.trainingModules.get(moduleId);
    if (!m) return undefined;
    if (!m.completedBy.includes(userId)) m.completedBy.push(userId);
    return m;
  }

  async getAribotHistory() {
    return Array.from(this.aribotHistory.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createAribotHistory(item: Omit<AribotHistory, "id">) {
    const id = randomUUID();
    const h = { ...item, id };
    this.aribotHistory.set(id, h);
    return h;
  }
  async getAribotFolders() {
    return Array.from(this.aribotFolders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createAribotFolder(folder: Omit<AribotFolder, "id">) {
    const id = randomUUID();
    const f = { ...folder, id };
    this.aribotFolders.set(id, f);
    return f;
  }
  async updateAribotFolder(id: string, name: string) {
    const f = this.aribotFolders.get(id);
    if (!f) return undefined;
    f.name = name;
    return f;
  }
  async deleteAribotFolder(id: string) {
    return this.aribotFolders.delete(id);
  }

  async getTeams() { return Array.from(this.teams.values()); }
}

export const storage = new MemStorage();
