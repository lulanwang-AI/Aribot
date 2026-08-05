/**
 * Mobile API Router — serves /api/mobile/... routes
 *
 * Uses JWT authentication (no sessions), separate in-memory storage,
 * and provides all endpoints consumed by the ARIbots Mobile (Expo) app.
 */
import { Router } from "express";
import jwt from "jsonwebtoken";
import multer, { MulterError } from "multer";
import { randomUUID } from "crypto";
import { anthropic } from "../ari/client";
import { getAriAgentConfig } from "../ari/agentSync";
import { buildClinicianPromptAddendum } from "../ari/license";
import { isActiveCapability, CAPABILITY_REJECTION_MESSAGE } from "../ari/capabilities";
import type {
  User, TriagePost, Comment, NewsItem, Group, MedEvent,
  ChatThread, ChatMessage, TrainingModule, TelemedConsultation,
} from "@workspace/db";
import { transcribeAudioFile, synthesizeSpeech, stripAriMarkup } from "../ari/voice";

const JWT_SECRET = process.env.SESSION_SECRET || "aribots-mobile-jwt-dev-secret";

function signToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

function requireMobileAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
    req.mobileUser = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

function optionalMobileAuth(req: any, _res: any, next: any) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try { req.mobileUser = jwt.verify(header.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

// ─── Seed helpers ──────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}
const r = seededRand(99);
function pick<T>(a: T[]): T { return a[Math.floor(r() * a.length)]; }
function pickN<T>(a: T[], n: number): T[] { return [...a].sort(() => r() - 0.5).slice(0, n); }
function ri(min: number, max: number) { return Math.floor(r() * (max - min + 1)) + min; }

const firstNames = ["James","Sarah","Michael","Emily","David","Jennifer","Robert","Maria","William","Jessica","Daniel","Amanda","Christopher","Stephanie"];
const lastNames = ["Chen","Rodriguez","Patel","Thompson","Kim","Johnson","Williams","Brown","Jones","Davis","Miller","Wilson"];
const specialties = [
  { name: "Cardiology", subs: ["Interventional Cardiology","Electrophysiology","Heart Failure"] },
  { name: "Oncology", subs: ["Medical Oncology","Surgical Oncology","Hematology"] },
  { name: "Neurology", subs: ["Stroke","Epilepsy","Movement Disorders"] },
  { name: "Emergency Medicine", subs: ["Trauma","Toxicology","Pediatric EM"] },
  { name: "Internal Medicine", subs: ["Hospitalist","Pulmonology","Nephrology"] },
  { name: "Surgery", subs: ["General Surgery","Vascular Surgery","Trauma Surgery"] },
  { name: "Radiology", subs: ["Interventional Radiology","Neuroradiology","Musculoskeletal"] },
  { name: "Pediatrics", subs: ["Neonatology","Pediatric Cardiology","Adolescent Medicine"] },
  { name: "Psychiatry", subs: ["Child Psychiatry","Addiction","Forensic Psychiatry"] },
  { name: "Orthopedics", subs: ["Sports Medicine","Joint Replacement","Spine Surgery"] },
];
const hospitals = [
  { name: "Massachusetts General Hospital", city: "Boston", state: "MA" },
  { name: "Johns Hopkins Hospital", city: "Baltimore", state: "MD" },
  { name: "Mayo Clinic", city: "Rochester", state: "MN" },
  { name: "Cleveland Clinic", city: "Cleveland", state: "OH" },
  { name: "UCLA Medical Center", city: "Los Angeles", state: "CA" },
  { name: "Stanford Health Care", city: "Palo Alto", state: "CA" },
  { name: "NYU Langone Health", city: "New York", state: "NY" },
  { name: "Duke University Hospital", city: "Durham", state: "NC" },
];
const credentials = ["MD","DO","MD, PhD","MBBS","PA-C","NP"];
const badges = ["Top Contributor","Research Leader","Peer Reviewer","Mentor","Case Champion"];
const interests = ["Heart Failure","Clinical Trials","Diabetes","Sepsis","Trauma","AI in Medicine","Telemedicine","Genomics"];

function makeUsers(): User[] {
  const users = Array.from({ length: 40 }, (_, i) => {
    const spec = pick(specialties); const hosp = pick(hospitals);
    const fn = pick(firstNames); const ln = pick(lastNames); const yrs = ri(2, 35);
    return {
      id: `mu${i + 1}`,
      username: `${fn.toLowerCase()}${ln.toLowerCase()}${i}`,
      password: "demo",
      name: `Dr. ${fn} ${ln}`,
      specialty: spec.name, subspecialty: pick(spec.subs),
      interests: pickN(interests, ri(2, 4)), hospital: hosp.name,
      city: hosp.city, state: hosp.state,
      role: i < 2 ? "admin" : "physician",
      verified: r() > 0.05, phiSafeMode: true,
      yearsExperience: yrs,
      rankingScore: Math.min(100, ri(30, 70) + Math.floor(yrs * 1.5)),
      badges: pickN(badges, ri(0, 2)),
      bio: `Board-certified ${spec.name.toLowerCase()} physician with ${yrs} years of experience at ${hosp.name}.`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fn.toLowerCase()}${ln.toLowerCase()}${i}&mouth[]=smile&eyes[]=happy&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      credential: pick(credentials),
    } as User;
  });
  // Seed user is always Dr. Chet Chea
  users[0] = {
    ...users[0],
    id: "mu1",
    username: "cchea",
    name: "Dr. Chet Chea",
    specialty: "Infectious Disease",
    subspecialty: "HIV/AIDS & Travel Medicine",
    interests: ["HIV/AIDS","Hepatitis B","Antimicrobial Stewardship","Sepsis","Travel Medicine"],
    hospital: "Marin Health Medical Center",
    city: "Kentfield",
    state: "CA",
    role: "physician",
    verified: true,
    yearsExperience: 21,
    rankingScore: 91,
    badges: ["Top Contributor","Research Leader","Grand Rounds Speaker"],
    bio: "Board-certified Infectious Disease specialist in Kentfield, CA with 21 years of clinical experience. Expertise in HIV/AIDS, antimicrobial stewardship, and travel medicine. Also fluent in Khmer.",
    avatarUrl: "/api/assets/avatars/avatar-chet-chea.jpg",
    credential: "MD",
  };
  return users;
}

const triageTitles = [
  "Unexplained bradycardia in post-op patient — cardiac cause ruled out",
  "Atypical chest pain in 42F — STEMI equivalent or variant angina?",
  "Pediatric fever with petechiae — meningococcemia vs ITP",
  "Acute onset expressive aphasia in young adult — stroke workup",
  "Recurrent DVT despite anticoagulation — thrombophilia panel?",
  "Hyponatremia resistant to fluid restriction in SIADH",
  "New-onset seizures with normal MRI — epilepsy vs functional?",
  "Sepsis without obvious source in immunocompromised patient",
  "Elevated troponin post-procedure — type 1 or type 2 MI?",
  "Rash with joint pain — lupus vs reactive arthritis workup",
  "Diabetic ketoacidosis with normal glucose — euglycemic DKA",
  "Intubated patient with rising peak pressures",
  "Unexpected platelet drop in ICU — HIT screening",
];
const triageTags = [
  ["cardiology","arrhythmia"],["cardiology","chest-pain"],["pediatrics","infectious-disease"],
  ["neurology","stroke"],["hematology","thrombosis"],["nephrology","electrolytes"],
  ["neurology","seizures"],["critical-care","infectious-disease"],["cardiology","troponin"],
  ["rheumatology","dermatology"],["endocrinology","critical-care"],["pulmonology","critical-care"],
  ["hematology","critical-care"],
];

const newsTitles = [
  "NEJM: Novel GLP-1 Receptor Agonist Shows 40% Reduction in Cardiovascular Events",
  "JAMA: AI-Assisted Sepsis Detection Reduces ICU Mortality by 18%",
  "The Lancet: Updated Hypertension Guidelines — New Thresholds for Treatment",
  "Nature Medicine: CRISPR-Based Therapy Achieves Functional Cure in Sickle Cell",
  "BMJ: Aspirin for Primary Prevention — Meta-Analysis of 15 RCTs",
  "NEJM: Pembrolizumab Combination Therapy in Advanced NSCLC",
  "JAMA: Burnout Among US Physicians — Nationwide Survey 2025",
  "The Lancet: Long COVID Mechanisms — Mitochondrial Dysfunction Link",
  "NEJM: Polypharmacy Deprescribing Trial in Elderly Patients",
  "Nature Medicine: Blood-Based Alzheimer Biomarker Panel",
];
const newsSources = ["NEJM","JAMA","The Lancet","Nature Medicine","BMJ"];
const newsSpecialties = ["Cardiology","Emergency Medicine","Internal Medicine","Oncology","Psychiatry","Neurology","Endocrinology"];

const groupNames = [
  "Interventional Cardiology Network","Critical Care & Sepsis Forum",
  "Oncology Clinical Trials Consortium","Emergency Medicine Physicians",
  "AI in Medicine Working Group","Neurology & Stroke Society",
  "Primary Care Innovation Hub","Pediatric Hospitalist Group",
];

const eventNames = [
  "Grand Rounds: Advances in Heart Failure Management",
  "CME Workshop: Point-of-Care Ultrasound",
  "Case Conference: Challenging Diagnostic Dilemmas",
  "Symposium: AI Tools in Clinical Practice",
  "Webinar: Updated Sepsis Bundles — What Changed?",
  "Virtual Tumor Board: Immunotherapy Decision-Making",
];

// ─── In-Memory Data Store ──────────────────────────────────────────────────

class MobileStore {
  users = new Map<string, User>();
  posts = new Map<string, TriagePost>();
  comments = new Map<string, Comment>();
  news = new Map<string, NewsItem>();
  groups = new Map<string, Group>();
  events = new Map<string, MedEvent>();
  threads = new Map<string, ChatThread>();
  messages = new Map<string, ChatMessage>();
  training = new Map<string, TrainingModule>();
  telemed = new Map<string, TelemedConsultation>();

  constructor() {
    const users = makeUsers();
    users.forEach(u => this.users.set(u.id, u));
    const uids = users.map(u => u.id);

    triageTitles.forEach((title, i) => {
      const id = `mtp${i + 1}`;
      this.posts.set(id, {
        id, title,
        content: `Clinical scenario: ${title}. Seeking input from colleagues on workup and management approach.`,
        tags: triageTags[i] || ["general"],
        authorId: pick(uids),
        anonymous: r() > 0.7,
        likes: ri(3, 47), likedBy: [], commentCount: ri(1, 12),
        images: [], status: "safe" as const, flagged: false,
        createdAt: Date.now() - ri(1, 30) * 86400000,
      });
    });

    newsTitles.forEach((title, i) => {
      const id = `mn${i + 1}`;
      this.news.set(id, {
        id, title,
        summary: `Key findings from a landmark study. Primary endpoint was met with statistical significance.`,
        content: `Full study details available. Randomized controlled trial with over 10,000 patients across 45 centers.`,
        source: pick(newsSources), specialty: pick(newsSpecialties),
        tags: ["evidence-based","research"], imageUrl: null,
        likes: ri(10, 200), likedBy: [], commentCount: ri(2, 25),
        publishedAt: Date.now() - ri(1, 14) * 86400000,
        createdAt: Date.now() - ri(1, 14) * 86400000,
      });
    });

    groupNames.forEach((name, i) => {
      const id = `mg${i + 1}`;
      this.groups.set(id, {
        id, name,
        topic: name.split(" ").slice(0, 2).join(" "),
        description: `A professional community for physicians focused on ${name.toLowerCase()}.`,
        memberCount: ri(50, 2000),
        members: pickN(uids, ri(3, 8)),
        imageUrl: null,
        createdAt: Date.now() - ri(30, 365) * 86400000,
      });
    });

    eventNames.forEach((title, i) => {
      const id = `me${i + 1}`;
      this.events.set(id, {
        id, title,
        description: `Join colleagues for ${title.toLowerCase()}. CME credits available.`,
        date: Date.now() + ri(1, 60) * 86400000,
        location: pick(["Virtual","Boston, MA","New York, NY","Chicago, IL","Online"]),
        type: pick(["webinar","conference","workshop","grand-rounds"]) as MedEvent["type"],
        specialty: pick(newsSpecialties),
        maxCapacity: ri(50, 500),
        rsvps: pickN(uids, ri(5, 20)),
        imageUrl: null,
        createdAt: Date.now() - ri(1, 10) * 86400000,
        organizer: pick(uids),
        cmeCredits: ri(0, 4),
      });
    });

    const trainingData = [
      { title: "Ari AI: Clinical Workflow Fundamentals", category: "AI Tools", duration: 30, cmeCredits: 1 },
      { title: "Point-of-Care Ultrasound Certification", category: "Procedures", duration: 120, cmeCredits: 4 },
      { title: "Sepsis Recognition & Management Bundle", category: "Critical Care", duration: 60, cmeCredits: 2 },
      { title: "Telemedicine: Patient Engagement & Technology", category: "Digital Health", duration: 60, cmeCredits: 2 },
      { title: "Opioid Prescribing & Pain Management", category: "Pharmacology", duration: 90, cmeCredits: 3 },
      { title: "Implicit Bias in Clinical Decision Making", category: "DEI", duration: 90, cmeCredits: 3 },
      { title: "Radiology Interpretation for Non-Radiologists", category: "Diagnostics", duration: 75, cmeCredits: 2 },
      { title: "EHR Documentation Best Practices", category: "Workflow", duration: 45, cmeCredits: 1 },
    ];
    trainingData.forEach((m, i) => {
      const id = `mtm${i + 1}`;
      this.training.set(id, {
        id, ...m,
        description: `Comprehensive module covering ${m.title.toLowerCase()}.`,
        completedBy: [],
        steps: [
          { id: `s${i}a`, title: "Introduction", type: "video" as const, content: "Intro" },
          { id: `s${i}b`, title: "Core Content", type: "reading" as const, content: "Reading" },
          { id: `s${i}c`, title: "Cases", type: "case" as const, content: "Cases" },
          { id: `s${i}d`, title: "Assessment", type: "quiz" as const, content: "Quiz" },
        ],
        createdAt: Date.now() - ri(30, 180) * 86400000,
      });
    });

    const reasons = ["Chest pain evaluation","Medication review","Post-hospitalization follow-up","Chronic disease management","Second opinion request"];
    reasons.forEach((reason, i) => {
      const id = `mtc${i + 1}`;
      this.telemed.set(id, {
        id, reason,
        patientName: `Patient ${String.fromCharCode(65 + i)}`,
        patientAge: ri(25, 80),
        urgency: pick(["low","medium","high"]) as any,
        status: i < 2 ? ("pending" as const) : (i < 4 ? ("accepted" as const) : ("completed" as const)),
        doctorId: i >= 2 ? pick(uids) : undefined,
        notes: i >= 4 ? "Consultation completed." : "",
        diagnosis: i >= 4 ? "Stable chronic condition" : "",
        prescriptions: [],
        fee: ri(50, 200),
        scheduledAt: Date.now() + ri(-2, 7) * 86400000,
        createdAt: Date.now() - ri(1, 7) * 86400000,
      });
    });

    this.threads.set("mthread1", {
      id: "mthread1",
      participantIds: ["mu1","mu2"],
      lastMessage: "Looking forward to the case discussion",
      lastMessageAt: Date.now() - 3600000,
      unreadCount: 1,
      type: "direct",
    } as any);
    this.messages.set("mmsg1", {
      id: "mmsg1", threadId: "mthread1", senderId: "mu2",
      content: "Looking forward to the case discussion",
      createdAt: Date.now() - 3600000, read: false,
    } as any);
  }
}

const store = new MobileStore();

// ─── Router ────────────────────────────────────────────────────────────────

const mobile = Router();

// Health
mobile.get("/healthz", (_req, res) => res.json({ status: "ok", service: "mobile-api" }));

// Auth
mobile.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  if (process.env.NODE_ENV === "production") return res.status(401).json({ message: "Auth not configured for production" });
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  const { password: _, ...safe } = user;
  const token = signToken({ userId: user.id, username: user.username ?? email });
  return res.json({ token, user: safe });
});

mobile.get("/auth/me", requireMobileAuth, (req: any, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  const { password: _, ...safe } = user;
  res.json(safe);
});

mobile.patch("/auth/me", requireMobileAuth, (req: any, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { password: _pw, id: _id, ...updates } = req.body;
    const updated = { ...m, completedBy: [...m.completedBy, uid] };
  store.users.set(user.id, updated);
  const { password: _, ...safe } = user;
  res.json(safe);
});

// Triage
mobile.get("/triage", optionalMobileAuth, (req: any, res) => {
  const sort = typeof req.query.sort === "string" ? req.query.sort : "recent";
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  let posts = [...store.posts.values()];
  if (tag) posts = posts.filter(p => p.tags.includes(tag));
  if (sort === "trending") posts.sort((a, b) => b.likes - a.likes);
  else posts.sort((a, b) => b.createdAt - a.createdAt);

  const uid = req.mobileUser.userId;
  const enriched = threads.map(t => ({
    ...t,
    participants: ((t as any).participantIds || []).map((id: string) => {
      const u = store.users.get(id);
      return u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, specialty: u.specialty } : null;
    }).filter(Boolean),
  }));
  res.json(enriched);
});

mobile.get("/triage/:id", optionalMobileAuth, (req: any, res) => {
  const post = store.posts.get(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const uid = req.mobileUser.userId;
  const author = !post.anonymous ? store.users.get(post.authorId) : null;
  const comments = [...store.comments.values()].filter(c => c.postId === post.id).sort((a, b) => a.createdAt - b.createdAt);
  const enrichedComments = comments.map(c => {
    const cu = !c.anonymous ? store.users.get(c.authorId) : null;
    return { ...c, author: cu ? { id: cu.id, name: cu.name, specialty: cu.specialty, avatarUrl: cu.avatarUrl, credential: cu.credential } : null };
  });
  res.json({ ...post, author: author ? { id: author.id, name: author.name, specialty: author.specialty, avatarUrl: author.avatarUrl, credential: author.credential } : null, comments: enrichedComments, likedByMe: uid ? post.likedBy?.includes(uid) : false });
});

mobile.post("/triage", requireMobileAuth, (req: any, res) => {
  const { title, content, tags = [], anonymous = false } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content required" });
  const id = `mmsg${Date.now()}`;
  const post = store.posts.get(req.params.id);
  store.posts.set(id, post);
  res.status(201).json(post);
});

mobile.post("/triage/:id/like", requireMobileAuth, (req: any, res) => {
  const p = store.posts.get(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  const uid = req.mobileUser.userId;
  const liked = p.likedBy?.includes(uid);
    const updated = { ...m, completedBy: [...m.completedBy, uid] };
  store.posts.set(p.id, updated);
  res.json({ likes: updated.likes, likedByMe: !liked });
});

mobile.post("/triage/:id/comments", requireMobileAuth, (req: any, res) => {
  const { content, anonymous = false, parentId = null } = req.body;
  if (!content) return res.status(400).json({ message: "Content required" });
  const id = `mmsg${Date.now()}`;
  const comment: Comment = { id, postId: req.params.id, authorId: req.mobileUser.userId, content, anonymous, parentId, likes: 0, likedBy: [], flagged: false, createdAt: Date.now() };
  store.comments.set(id, comment);
  const post = store.posts.get(req.params.id);
  if (post) store.posts.set(post.id, { ...post, commentCount: post.commentCount + 1 });
  res.status(201).json(comment);
});

// News
mobile.get("/news", (req, res) => {
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : "";
  let items = [...store.news.values()].sort((a, b) => b.publishedAt - a.publishedAt);
  if (source) items = items.filter(n => n.source === source);
  if (specialty) items = items.filter(n => n.specialty === specialty);
  res.json(items);
});

mobile.get("/news/:id", (req, res) => {
  const item = store.news.get(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// Doctors
mobile.get("/doctors", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : "";
  let docs = [...store.users.values()];
  if (q) docs = docs.filter(d => d.name?.toLowerCase().includes(q) || d.specialty?.toLowerCase().includes(q) || d.hospital?.toLowerCase().includes(q));
  if (specialty) docs = docs.filter(d => d.specialty?.toLowerCase() === specialty.toLowerCase());
  docs.sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
  res.json(docs.slice(0, 50).map(({ password: _, ...d }) => d));
});

mobile.get("/doctors/:id", (req, res) => {
  const user = store.users.get(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// Groups
mobile.get("/groups", (_req, res) => res.json([...store.groups.values()]));

mobile.get("/groups/:id", (req, res) => {
  const g = store.groups.get(req.params.id);
  if (!g) return res.status(404).json({ message: "Not found" });
  res.json(g);
});

mobile.post("/groups/:id/join", requireMobileAuth, (req: any, res) => {
  const g = store.groups.get(req.params.id);
  if (!g) return res.status(404).json({ message: "Not found" });
  const uid = req.mobileUser.userId;
  if (!m.completedBy.includes(uid)) {
    const updated = { ...m, completedBy: [...m.completedBy, uid] };
    store.groups.set(g.id, updated);
    return res.json(updated);
  }
  res.json(g);
});

// Events
mobile.get("/events", (_req, res) => res.json([...store.events.values()].sort((a, b) => a.date - b.date)));

mobile.post("/events/:id/rsvp", requireMobileAuth, (req: any, res) => {
  const e = store.events.get(req.params.id);
  if (!e) return res.status(404).json({ message: "Not found" });
  const uid = req.mobileUser.userId;
  const rsvped = e.rsvps.includes(uid);
    const updated = { ...m, completedBy: [...m.completedBy, uid] };
    store.training.set(m.id, updated);
    return res.json(updated);
  }
  res.json(m);
});

// Telemed
mobile.get("/telemed", requireMobileAuth, (_req, res) => res.json([...store.telemed.values()]));

mobile.get("/telemed/earnings", requireMobileAuth, (req: any, res) => {
  const uid = req.mobileUser.userId;
  const threads = [...store.threads.values()].filter(t => (t as any).participantIds?.includes(uid));
  const enriched = threads.map(t => ({
    ...t,
    participants: ((t as any).participantIds || []).map((id: string) => {
      const u = store.users.get(id);
      return u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, specialty: u.specialty } : null;
    }).filter(Boolean),
  }));
  res.json(enriched);
});

mobile.get("/messaging/threads/:id/messages", requireMobileAuth, (_req: any, res) => {
  const thread = store.threads.get(req.params.id);
  if (!thread) return res.status(404).json({ message: "Thread not found" });
  if (!thread.participantIds?.includes(_req.mobileUser.userId)) return res.status(403).json({ message: "Not a participant of this thread" });
  const msgs = [...store.messages.values()].filter(m => m.threadId === _req.params.id).sort((a, b) => a.createdAt - b.createdAt);
  res.json(msgs.map(m => {
    const sender = store.users.get(m.senderId);
    return { ...m, sender: sender ? { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl } : null };
  }));
});

mobile.post("/messaging/threads/:id/messages", requireMobileAuth, (req: any, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "Content required" });
  const thread = store.threads.get(req.params.id);
  if (!thread) return res.status(404).json({ message: "Thread not found" });
  if (!thread.participantIds?.includes(req.mobileUser.userId)) return res.status(403).json({ message: "Not a participant of this thread" });
  const id = `mmsg${Date.now()}`;
  const msg = { id, threadId: req.params.id, senderId: req.mobileUser.userId, content, createdAt: Date.now(), read: false };
  store.messages.set(id, msg as any);
  res.status(201).json(msg);
});

// Training
mobile.get("/training", (_req, res) => res.json([...store.training.values()]));

mobile.post("/training/:id/complete", requireMobileAuth, (req: any, res) => {
  const m = store.training.get(req.params.id);
  if (!m) return res.status(404).json({ message: "Not found" });
  const uid = req.mobileUser.userId;
  if (!m.completedBy.includes(uid)) {
    const updated = { ...m, completedBy: [...m.completedBy, uid] };
    store.training.set(m.id, updated);
    return res.json(updated);
  }
  res.json(m);
});

// Telemed
mobile.get("/telemed", requireMobileAuth, (_req, res) => res.json([...store.telemed.values()]));

mobile.get("/telemed/earnings", requireMobileAuth, (req: any, res) => {
  const uid = req.mobileUser.userId;
  const completed = [...store.telemed.values()].filter(t => t.doctorId === uid && t.status === "completed");
  const total = completed.reduce((s, t) => s + (t.fee ?? 0), 0);
  res.json({ totalEarnings: total, thisMonth: Math.floor(total * 0.3), thisWeek: Math.floor(total * 0.1), pendingPayout: Math.floor(total * 0.15), completedConsultations: completed.length, avgPerConsultation: completed.length > 0 ? Math.floor(total / completed.length) : 0 });
});

mobile.get("/telemed/:id", requireMobileAuth, (req, res) => {
  const c = store.telemed.get(req.params.id);
  if (!c) return res.status(404).json({ message: "Not found" });
  res.json(c);
});

// Ari voice — speech-to-text via ElevenLabs Scribe (same provider as web)
const mobileSttUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
}).single("audio");

mobile.post("/ari/voice/stt", requireMobileAuth, (req, res, next) => {
  mobileSttUpload(req, res, (err: any) => {
    if (!err) return next();
    if (err instanceof MulterError) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ message: `Upload error: ${err.message}` });
    }
    return res.status(400).json({ message: "Failed to read audio upload." });
  });
}, async (req: any, res) => {
  const file = req.file as { buffer: Buffer; mimetype: string; originalname: string } | undefined;
  if (!file) return res.status(400).json({ message: "Missing audio file." });
  if (!file.mimetype.startsWith("audio/") && file.mimetype !== "video/webm") {
    return res.status(415).json({ message: `Unsupported media type: ${file.mimetype}` });
  }
  const result = await synthesizeSpeech(clean, typeof voiceId === "string" ? voiceId : undefined);

const MOBILE_MAX_TTS_CHARS = 4000;
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", result.audio.length.toString());
  res.setHeader("Cache-Control", "no-store");
  return res.send(result.audio);
});

// Ari streaming (optionally with base64 image attachments for vision)
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGES = 3;
// Per-image cap of ~1.9MB binary (~2.5M base64 chars). 3 images stay well
// under the app-wide express.json({ limit: "10mb" }) body limit.
const MAX_IMAGE_B64_CHARS = 2.5 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function sniffImageType(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length > 6 && buf.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

mobile.post("/ari/chat", requireMobileAuth, async (req: any, res) => {
  const { query, mode = "ari", capability, images } = req.body;
  const hasImages = Array.isArray(images) && images.length > 0;
  if (!query && !hasImages) return res.status(400).json({ message: "Query is required" });
  // Same capability gating as the web endpoint so both clients agree.
  if (typeof capability === "string" && capability && !isActiveCapability(capability)) {
    return res.status(400).json({ message: CAPABILITY_REJECTION_MESSAGE });
  }

  let imageBlocks: any[] = [];
  if (hasImages) {
    if (images.length > MAX_IMAGES) {
      return res.status(400).json({ message: `At most ${MAX_IMAGES} images per message.` });
    }
    for (const img of images) {
      const mediaType = img?.mediaType;
      const data = img?.data;
      if (typeof mediaType !== "string" || !ALLOWED_IMAGE_TYPES.has(mediaType) ||
          typeof data !== "string" || !data || data.length > MAX_IMAGE_B64_CHARS ||
          !BASE64_RE.test(data)) {
        return res.status(400).json({ message: "Invalid image attachment." });
      }
      // Decode and verify magic bytes so the payload really is the image
      // type it claims to be before we forward it to the model.
      const buf = Buffer.from(data, "base64");
      if (sniffImageType(buf) !== mediaType) {
        return res.status(400).json({ message: "Invalid image attachment." });
      }
      imageBlocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  (res as any).flushHeaders?.();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.write(`data: <ari_section title="Service Unavailable">Ari AI requires an Anthropic API key. Please configure ANTHROPIC_API_KEY in the environment settings to use Ari.</ari_section>\n\n`);
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
    return;
  }

  try {
    // Use the SAME managed-agent configuration as the web Ask Ari pipeline
    // (system prompt, model, MCP servers) so mobile and web behave alike.
    // The old mobile-only mini prompt didn't describe the JSON request
    // envelope or the structured-block output format, which is why mobile
    // replies came back looking like raw JSON.
    const agentConfig = await getAriAgentConfig();
    // Mobile JWT users don't carry a license type yet — default to OTHER,
    // same fallback the web endpoint uses for unknown clinicians.
    const systemPrompt = agentConfig.system + buildClinicianPromptAddendum("OTHER" as any);

    // Same payload envelope the web sends; the system prompt defines it.
    const payloadBlock = {
      type: "text" as const,
      text: JSON.stringify(capability ? { mode, capability, query } : { mode, query }),
    };
    const userContent = [...imageBlocks, payloadBlock];

    const stream = await anthropic.beta.messages.create(
      {
        model: agentConfig.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent as any }],
        stream: true,
        ...(mode !== "er" ? { mcp_servers: agentConfig.mcpServers } : {}),
      } as any,
      { headers: { "anthropic-beta": "mcp-client-2025-04-04" } },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && (event as any).delta?.type === "text_delta") {
        const delta = (event as any).delta.text || "";
        res.write(`data: ${delta.replace(/\n/g, "\ndata: ")}\n\n`);
      }
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[mobile/ari/chat] failure:", err?.message || err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: "Ari is temporarily unavailable." })}\n\n`);
    res.end();
  }
});

export default mobile;

  const clean = stripAriMarkup(text);

  const { text, voiceId } = (req.body ?? {}) as { text?: unknown; voiceId?: unknown };
