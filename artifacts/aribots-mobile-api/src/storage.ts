import { randomUUID } from "crypto";
import type {
  User, MobileTriagePost as TriagePost, MobileComment as Comment, MobileNewsItem as NewsItem,
  MobileGroup as Group, MobileMedEvent as MedEvent, MobileChatThread as ChatThread,
  MobileChatMessage as ChatMessage, MobileTrainingModule as TrainingModule,
  MobileTelemedConsultation as TelemedConsultation
} from "@workspace/db";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => rand() - 0.5).slice(0, n);
}
function randInt(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }

const firstNames = ["James","Sarah","Michael","Emily","David","Jennifer","Robert","Maria","William","Jessica","Daniel","Amanda","Christopher","Stephanie","Matthew","Nicole","Andrew","Samantha","Joshua","Ashley","Ryan","Megan","Brandon","Rachel","Kevin","Lauren","Justin","Michelle","Jonathan","Elizabeth"];
const lastNames = ["Chen","Rodriguez","Patel","Thompson","Kim","Johnson","Williams","Brown","Jones","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Garcia","Martinez","Robinson","Clark","Lewis","Lee","Walker","Hall","Allen","Young"];
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
const credentialOptions = ["MD","DO","MD, PhD","MBBS","PA-C","NP"];
const badgeOptions = ["Top Contributor","Research Leader","Peer Reviewer","Mentor","Case Champion"];
const interests = ["Heart Failure","Clinical Trials","Diabetes","Sepsis","Trauma","AI in Medicine","Telemedicine","Genomics","Immunotherapy","Global Health"];

function generateDoctors(count: number): User[] {
  const docs: User[] = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(specialties);
    const hosp = pick(hospitals);
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const yrs = randInt(2, 35);
    docs.push({
      id: `u${i + 1}`,
      username: `${fn.toLowerCase()}${ln.toLowerCase()}${i}`,
      password: "demo",
      name: `Dr. ${fn} ${ln}`,
      specialty: spec.name,
      subspecialty: pick(spec.subs),
      interests: pickN(interests, randInt(2, 4)),
      hospital: hosp.name,
      city: hosp.city,
      state: hosp.state,
      role: i < 3 ? "admin" : "physician",
      verified: rand() > 0.05,
      phiSafeMode: true,
      yearsExperience: yrs,
      rankingScore: Math.min(100, randInt(30, 70) + Math.floor(yrs * 1.5)),
      badges: pickN(badgeOptions, randInt(0, 2)),
      bio: `Board-certified ${spec.name.toLowerCase()} physician with ${yrs} years of clinical experience at ${hosp.name}.`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fn.toLowerCase()}${ln.toLowerCase()}${i}&mouth[]=smile&eyes[]=happy&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      credential: pick(credentialOptions),
    } as User);
  }
  return docs;
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
  "Pediatric abdominal pain with elevated lipase",
  "Bilateral lower extremity weakness — cord compression vs GBS",
];
const triageTags = [
  ["cardiology","arrhythmia"],["cardiology","chest-pain"],["pediatrics","infectious-disease"],
  ["neurology","stroke"],["hematology","thrombosis"],["nephrology","electrolytes"],
  ["neurology","seizures"],["critical-care","infectious-disease"],["cardiology","troponin"],
  ["rheumatology","dermatology"],["endocrinology","critical-care"],["pulmonology","critical-care"],
  ["hematology","critical-care"],["pediatrics","gastroenterology"],["neurology","emergency-medicine"],
];

function generateTriagePosts(userIds: string[]): TriagePost[] {
  return triageTitles.map((title, i) => ({
    id: `tp${i + 1}`,
    title,
    content: `Clinical scenario: ${title}. Seeking input from colleagues on workup and management approach. Patient has relevant comorbidities. What would your initial differential be?`,
    tags: triageTags[i] || ["general"],
    authorId: pick(userIds),
    anonymous: rand() > 0.7,
    likes: randInt(3, 47),
    likedBy: [],
    commentCount: randInt(1, 12),
    images: [],
    status: "safe" as const,
    createdAt: Date.now() - randInt(1, 30) * 24 * 3600 * 1000,
    flagged: false,
  }));
}

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

function generateNews(): NewsItem[] {
  return newsTitles.map((title, i) => ({
    id: `n${i + 1}`,
    title,
    summary: `Key findings from a landmark study examining ${title.toLowerCase().replace(/[^a-z ]/g, '')}. Implications for clinical practice are significant.`,
    content: `Full study details: This randomized controlled trial enrolled over 10,000 patients across 45 centers. Primary endpoint was met with statistical significance (p<0.001). Secondary endpoints also showed benefit. Authors conclude this represents a paradigm shift in management.`,
    source: pick(newsSources),
    specialty: pick(newsSpecialties),
    tags: ["evidence-based","research"],
    imageUrl: null,
    likes: randInt(10, 200),
    likedBy: [],
    commentCount: randInt(2, 25),
    publishedAt: Date.now() - randInt(1, 14) * 24 * 3600 * 1000,
    createdAt: Date.now() - randInt(1, 14) * 24 * 3600 * 1000,
  }));
}

const groupNames = [
  "Interventional Cardiology Network",
  "Critical Care & Sepsis Forum",
  "Oncology Clinical Trials Consortium",
  "Emergency Medicine Physicians",
  "AI in Medicine Working Group",
  "Neurology & Stroke Society",
  "Primary Care Innovation Hub",
  "Pediatric Hospitalist Group",
  "Surgical Quality Improvement",
  "Mental Health Integration Network",
];

function generateGroups(userIds: string[]): Group[] {
  return groupNames.map((name, i) => ({
    id: `g${i + 1}`,
    name,
    topic: name.split(" ").slice(0, 2).join(" "),
    description: `A professional community for physicians focused on ${name.toLowerCase()}.`,
    memberCount: randInt(50, 2000),
    members: pickN(userIds, randInt(3, 8)),
    imageUrl: null,
    createdAt: Date.now() - randInt(30, 365) * 24 * 3600 * 1000,
  }));
}

const eventNames = [
  "Grand Rounds: Advances in Heart Failure Management",
  "CME Workshop: Point-of-Care Ultrasound",
  "Case Conference: Challenging Diagnostic Dilemmas",
  "Symposium: AI Tools in Clinical Practice",
  "Webinar: Updated Sepsis Bundles — What Changed?",
  "Virtual Tumor Board: Immunotherapy Decision-Making",
  "Skills Lab: Procedural Simulation Workshop",
  "Annual Meeting: Internal Medicine Review",
];

function generateEvents(userIds: string[]): MedEvent[] {
  return eventNames.map((title, i) => ({
    id: `e${i + 1}`,
    title,
    description: `Join colleagues for ${title.toLowerCase()}. CME credits available. Featuring expert faculty and case-based discussion.`,
    date: Date.now() + randInt(1, 60) * 24 * 3600 * 1000,
    location: pick(["Virtual","Boston, MA","New York, NY","Chicago, IL","San Francisco, CA","Online"]),
    type: pick(["webinar","conference","workshop","grand-rounds"]) as MedEvent["type"],
    specialty: pick(newsSpecialties),
    maxCapacity: randInt(50, 500),
    rsvps: pickN(userIds, randInt(5, 20)),
    imageUrl: null,
    createdAt: Date.now() - randInt(1, 10) * 24 * 3600 * 1000,
    organizer: pick(userIds),
    cmeCredits: randInt(0, 4),
  }));
}

function generateTraining(): TrainingModule[] {
  const modules = [
    { title: "Ari AI: Clinical Workflow Fundamentals", category: "AI Tools", duration: 30, cmeCredits: 1 },
    { title: "Point-of-Care Ultrasound Certification", category: "Procedures", duration: 120, cmeCredits: 4 },
    { title: "Sepsis Recognition & Management Bundle", category: "Critical Care", duration: 60, cmeCredits: 2 },
    { title: "EHR Documentation Best Practices", category: "Workflow", duration: 45, cmeCredits: 1 },
    { title: "Implicit Bias in Clinical Decision Making", category: "DEI", duration: 90, cmeCredits: 3 },
    { title: "Telemedicine: Patient Engagement & Technology", category: "Digital Health", duration: 60, cmeCredits: 2 },
    { title: "Opioid Prescribing & Pain Management", category: "Pharmacology", duration: 90, cmeCredits: 3 },
    { title: "Radiology Interpretation for Non-Radiologists", category: "Diagnostics", duration: 75, cmeCredits: 2 },
  ];
  return modules.map((m, i) => ({
    id: `tm${i + 1}`,
    title: m.title,
    description: `Comprehensive module covering ${m.title.toLowerCase()}. Evidence-based content reviewed by clinical faculty.`,
    category: m.category,
    duration: m.duration,
    cmeCredits: m.cmeCredits,
    completedBy: [],
    steps: [
      { id: `step-${i}-1`, title: "Introduction & Learning Objectives", type: "video" as const, content: "Introduction video" },
      { id: `step-${i}-2`, title: "Core Concepts", type: "reading" as const, content: "Reading material" },
      { id: `step-${i}-3`, title: "Case Studies", type: "case" as const, content: "Interactive cases" },
      { id: `step-${i}-4`, title: "Assessment & Certification", type: "quiz" as const, content: "Final assessment" },
    ],
    createdAt: Date.now() - randInt(30, 180) * 24 * 3600 * 1000,
  }));
}

function generateTelemed(userIds: string[]): TelemedConsultation[] {
  const reasons = ["Chest pain evaluation","Medication review","Post-hospitalization follow-up","Chronic disease management","Second opinion request","Preventive care consultation"];
  const urgencies: Array<"low"|"medium"|"high"> = ["low","medium","high"];
  return reasons.map((reason, i) => ({
    id: `tc${i + 1}`,
    patientName: `Patient ${String.fromCharCode(65 + i)}`,
    patientAge: randInt(25, 80),
    reason,
    urgency: pick(urgencies),
    status: i < 2 ? ("pending" as const) : (i < 4 ? ("accepted" as const) : ("completed" as const)),
    doctorId: i >= 2 ? pick(userIds) : undefined,
    notes: i >= 4 ? "Consultation completed. Follow-up scheduled." : "",
    diagnosis: i >= 4 ? "Stable chronic condition, medication adjusted" : "",
    prescriptions: [],
    fee: randInt(50, 200),
    scheduledAt: Date.now() + randInt(-2, 7) * 24 * 3600 * 1000,
    createdAt: Date.now() - randInt(1, 7) * 24 * 3600 * 1000,
  }));
}

class MobileStorage {
  private users: Map<string, User> = new Map();
  private triagePosts: Map<string, TriagePost> = new Map();
  private comments: Map<string, Comment> = new Map();
  private newsItems: Map<string, NewsItem> = new Map();
  private groups: Map<string, Group> = new Map();
  private events: Map<string, MedEvent> = new Map();
  private chatThreads: Map<string, ChatThread> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();
  private trainingModules: Map<string, TrainingModule> = new Map();
  private telemedConsultations: Map<string, TelemedConsultation> = new Map();

  seed() {
    const doctors = generateDoctors(50);
    doctors.forEach(d => this.users.set(d.id, d));

    const userIds = doctors.map(d => d.id);
    generateTriagePosts(userIds).forEach(p => this.triagePosts.set(p.id, p));
    generateNews().forEach(n => this.newsItems.set(n.id, n));
    generateGroups(userIds).forEach(g => this.groups.set(g.id, g));
    generateEvents(userIds).forEach(e => this.events.set(e.id, e));
    generateTraining().forEach(t => this.trainingModules.set(t.id, t));
    generateTelemed(userIds).forEach(t => this.telemedConsultations.set(t.id, t));

    const threadId = "thread1";
    this.chatThreads.set(threadId, {
      id: threadId,
      participantIds: ["u1","u2"],
      lastMessage: "Looking forward to the case discussion",
      lastMessageAt: Date.now() - 3600000,
      unreadCount: 1,
      type: "direct",
    } as ChatThread);
    this.chatMessages.set("msg1", {
      id: "msg1",
      threadId,
      senderId: "u2",
      content: "Looking forward to the case discussion",
      createdAt: Date.now() - 3600000,
      read: false,
    } as ChatMessage);
  }

  getUser(id: string): User | undefined { return this.users.get(id); }
  getUserByEmail(email: string): User | undefined {
    return [...this.users.values()].find(u => u.username === email || u.username === email.split("@")[0]);
  }
  getAllUsers(): User[] { return [...this.users.values()]; }
  searchDoctors(q?: string, specialty?: string): User[] {
    let docs = [...this.users.values()];
    if (q) {
      const lq = q.toLowerCase();
      docs = docs.filter(d => d.name?.toLowerCase().includes(lq) || d.specialty?.toLowerCase().includes(lq) || d.hospital?.toLowerCase().includes(lq));
    }
    if (specialty) {
      docs = docs.filter(d => d.specialty?.toLowerCase() === specialty.toLowerCase());
    }
    return docs.sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
  }

  getTriagePosts(sort = "recent"): TriagePost[] {
    const posts = [...this.triagePosts.values()];
    if (sort === "trending") return posts.sort((a, b) => b.likes - a.likes);
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  }
  getTriagePost(id: string): TriagePost | undefined { return this.triagePosts.get(id); }
  createTriagePost(data: Omit<TriagePost, "id">): TriagePost {
    const post: TriagePost = { ...data, id: `tp${Date.now()}` };
    this.triagePosts.set(post.id, post);
    return post;
  }
  likeTriagePost(postId: string, userId: string): TriagePost | undefined {
    const p = this.triagePosts.get(postId);
    if (!p) return undefined;
    const liked = p.likedBy?.includes(userId);
    const updated = { ...p, likes: liked ? p.likes - 1 : p.likes + 1, likedBy: liked ? (p.likedBy ?? []).filter(id => id !== userId) : [...(p.likedBy ?? []), userId] };
    this.triagePosts.set(postId, updated);
    return updated;
  }

  getComments(postId: string): Comment[] {
    return [...this.comments.values()].filter(c => c.postId === postId).sort((a, b) => a.createdAt - b.createdAt);
  }
  createComment(data: Omit<Comment, "id">): Comment {
    const comment: Comment = { ...data, id: `c${Date.now()}${Math.random()}` };
    this.comments.set(comment.id, comment);
    const post = this.triagePosts.get(data.postId);
    if (post) this.triagePosts.set(post.id, { ...post, commentCount: post.commentCount + 1 });
    return comment;
  }

  getNewsItems(source?: string, specialty?: string): NewsItem[] {
    let items = [...this.newsItems.values()].sort((a, b) => b.publishedAt - a.publishedAt);
    if (source) items = items.filter(n => n.source === source);
    if (specialty) items = items.filter(n => n.specialty === specialty);
    return items;
  }
  getNewsItem(id: string): NewsItem | undefined { return this.newsItems.get(id); }

  getGroups(): Group[] { return [...this.groups.values()]; }
  getGroup(id: string): Group | undefined { return this.groups.get(id); }
  joinGroup(groupId: string, userId: string): Group | undefined {
    const g = this.groups.get(groupId);
    if (!g) return undefined;
    if (g.members.includes(userId)) return g;
    const updated = { ...g, members: [...g.members, userId], memberCount: g.memberCount + 1 };
    this.groups.set(groupId, updated);
    return updated;
  }

  getEvents(): MedEvent[] { return [...this.events.values()].sort((a, b) => a.date - b.date); }
  rsvpEvent(eventId: string, userId: string): MedEvent | undefined {
    const e = this.events.get(eventId);
    if (!e) return undefined;
    const rsvped = e.rsvps.includes(userId);
    const updated = { ...e, rsvps: rsvped ? e.rsvps.filter(id => id !== userId) : [...e.rsvps, userId] };
    this.events.set(eventId, updated);
    return updated;
  }

  getChatThreads(userId: string): ChatThread[] {
    return [...this.chatThreads.values()].filter(t => t.participantIds?.includes(userId));
  }
  getChatMessages(threadId: string): ChatMessage[] {
    return [...this.chatMessages.values()].filter(m => m.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt);
  }
  createChatMessage(data: Omit<ChatMessage, "id">): ChatMessage {
    const msg: ChatMessage = { ...data, id: `msg${Date.now()}` };
    this.chatMessages.set(msg.id, msg);
    return msg;
  }

  getTrainingModules(): TrainingModule[] { return [...this.trainingModules.values()]; }
  completeTrainingStep(moduleId: string, userId: string): TrainingModule | undefined {
    const m = this.trainingModules.get(moduleId);
    if (!m) return undefined;
    const updated = { ...m, completedBy: m.completedBy.includes(userId) ? m.completedBy : [...m.completedBy, userId] };
    this.trainingModules.set(moduleId, updated);
    return updated;
  }

  getTelemedConsultations(): TelemedConsultation[] { return [...this.telemedConsultations.values()]; }
  getTelemedConsultation(id: string): TelemedConsultation | undefined { return this.telemedConsultations.get(id); }
  getTelemedEarnings(doctorId: string) {
    const completed = [...this.telemedConsultations.values()].filter(t => t.doctorId === doctorId && t.status === "completed");
    const total = completed.reduce((s, t) => s + (t.fee ?? 0), 0);
    return { totalEarnings: total, thisMonth: Math.floor(total * 0.3), thisWeek: Math.floor(total * 0.1), pendingPayout: Math.floor(total * 0.15), completedConsultations: completed.length, avgPerConsultation: completed.length > 0 ? Math.floor(total / completed.length) : 0 };
  }
}

export const mobileStorage = new MobileStorage();
mobileStorage.seed();
