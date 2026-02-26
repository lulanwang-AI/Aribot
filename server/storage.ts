import { type User, type InsertUser, type TriagePost, type Comment, type NewsItem, type Group, type MedEvent, type FlaggedItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getTriagePosts(): Promise<TriagePost[]>;
  getTriagePost(id: string): Promise<TriagePost | undefined>;
  createTriagePost(post: Omit<TriagePost, "id">): Promise<TriagePost>;
  likeTriagePost(postId: string, userId: string): Promise<TriagePost | undefined>;
  flagTriagePost(postId: string): Promise<TriagePost | undefined>;
  getComments(postId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id">): Promise<Comment>;
  flagComment(commentId: string): Promise<Comment | undefined>;
  getNewsItems(): Promise<NewsItem[]>;
  getGroups(): Promise<Group[]>;
  joinGroup(groupId: string, userId: string): Promise<Group | undefined>;
  leaveGroup(groupId: string, userId: string): Promise<Group | undefined>;
  getEvents(): Promise<MedEvent[]>;
  rsvpEvent(eventId: string, userId: string): Promise<MedEvent | undefined>;
  unrsvpEvent(eventId: string, userId: string): Promise<MedEvent | undefined>;
  getFlaggedItems(): Promise<FlaggedItem[]>;
  createFlaggedItem(item: Omit<FlaggedItem, "id">): Promise<FlaggedItem>;
  updateFlaggedItem(id: string, status: FlaggedItem["status"]): Promise<FlaggedItem | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private triagePosts: Map<string, TriagePost> = new Map();
  private comments: Map<string, Comment> = new Map();
  private newsItems: Map<string, NewsItem> = new Map();
  private groups: Map<string, Group> = new Map();
  private events: Map<string, MedEvent> = new Map();
  private flaggedItems: Map<string, FlaggedItem> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    const u1: User = { id: "u1", username: "schen", password: "demo", name: "Dr. Sarah Chen", specialty: "Cardiology", subspecialty: "Interventional Cardiology", interests: ["Heart Failure", "Clinical Trials", "Structural Heart Disease", "Cardiac Imaging"], hospital: "Massachusetts General Hospital", role: "physician", verified: true, phiSafeMode: true };
    const u2: User = { id: "u2", username: "jrodriguez", password: "demo", name: "Dr. James Rodriguez", specialty: "Neurology", subspecialty: "Movement Disorders", interests: ["Parkinson's Disease", "Deep Brain Stimulation", "Neurodegeneration"], hospital: "Johns Hopkins Hospital", role: "physician", verified: true, phiSafeMode: true };
    const u3: User = { id: "u3", username: "ppatel", password: "demo", name: "Dr. Priya Patel", specialty: "Emergency Medicine", subspecialty: "Trauma", interests: ["Resuscitation", "Point-of-Care Ultrasound", "Sepsis Management"], hospital: "Cedars-Sinai Medical Center", role: "physician", verified: true, phiSafeMode: true };
    const u4: User = { id: "u4", username: "mthompson", password: "demo", name: "Dr. Michael Thompson", specialty: "Internal Medicine", subspecialty: "Infectious Disease", interests: ["Antimicrobial Stewardship", "HIV Medicine", "Tropical Infections"], hospital: "Mayo Clinic", role: "admin", verified: true, phiSafeMode: true };

    [u1, u2, u3, u4].forEach(u => this.users.set(u.id, u));

    const posts: TriagePost[] = [
      { id: "t1", authorId: "u1", title: "Atypical Chest Pain in Young Athlete - Seeking Input", content: "32-year-old male competitive runner presenting with atypical chest pain during exertion. ECG shows nonspecific ST changes. Troponin negative x2. Echo shows preserved EF but subtle diastolic dysfunction. Family history significant for HCM in father. Considering cardiac MRI vs stress echo. Would appreciate thoughts on workup approach and return-to-play considerations.", tags: ["cardiology", "chest-pain", "sports-medicine"], likes: ["u2", "u3"], flagged: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "t2", authorId: "u2", title: "Treatment-Resistant Epilepsy in Pediatric Patient", content: "14-year-old female with focal epilepsy refractory to three AEDs (levetiracetam, carbamazepine, lamotrigine). MRI shows right temporal dysplasia. Video EEG localizes seizure onset to right temporal region. Family interested in surgical evaluation. Current seizure frequency: 3-4/week with secondary generalization. Looking for opinions on surgical candidacy and timing.", tags: ["neurology", "seizures", "pediatrics"], likes: ["u1", "u4"], flagged: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: "t3", authorId: "u4", title: "Sepsis Management in Immunocompromised Host", content: "58-year-old male on rituximab for rheumatoid arthritis, presenting with fever, hypotension, and altered mental status. Lactate 4.2. Blood cultures pending. CT shows bilateral ground-glass opacities. Started on meropenem + vancomycin + micafungin. Considering PJP prophylaxis status and possible viral etiologies. How would you approach empiric coverage in this clinical scenario?", tags: ["infectious-disease", "sepsis", "immunology"], likes: ["u1", "u2", "u3"], flagged: false, createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: "t4", authorId: "u3", title: "Acute Stroke: tPA vs Thrombectomy Decision", content: "67-year-old female presents 2.5 hours after symptom onset with NIHSS 18. CT shows no hemorrhage. CTA reveals left M1 occlusion with good collaterals. ASPECTS score 8. Considering IV tPA and proceeding directly to thrombectomy. Question: given the favorable imaging profile, would you pursue bridging therapy or direct thrombectomy given time constraints and INR of 1.3?", tags: ["neurology", "stroke", "emergency-medicine"], likes: ["u2"], flagged: false, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "t5", authorId: "u1", title: "HFpEF Management - Novel Approaches", content: "72-year-old female with heart failure with preserved ejection fraction (EF 58%), symptomatic despite optimal medical therapy. Currently on SGLT2i, loop diuretic, and MRA. Persistent exertional dyspnea (NYHA III). Recent exercise hemodynamics confirm elevated filling pressures. Interested in discussion of emerging therapies and clinical trial eligibility criteria. What's your approach to refractory HFpEF?", tags: ["cardiology", "heart-failure", "clinical-trials"], likes: ["u3", "u4"], flagged: false, createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    ];
    posts.forEach(p => this.triagePosts.set(p.id, p));

    const comments: Comment[] = [
      { id: "c1", postId: "t1", authorId: "u2", content: "Given the family history of HCM, cardiac MRI with gadolinium would be my first choice. It offers superior tissue characterization compared to echo for identifying fibrosis patterns. I'd hold off on stress testing until MRI results are available.", flagged: false, createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString() },
      { id: "c2", postId: "t1", authorId: "u3", content: "Agree with cardiac MRI approach. Also worth considering genetic counseling and testing given the strong family history. For return-to-play, I'd follow the AHA/ACC guidelines which recommend restricting competitive sports until evaluation is complete.", flagged: false, createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: "c3", postId: "t3", authorId: "u1", content: "In rituximab-treated patients, consider checking serum beta-D-glucan and galactomannan. PJP can occur even without classic CD4 depletion in rituximab patients. Would also send respiratory viral panel and CMV PCR given the immunosuppression.", flagged: false, createdAt: new Date(Date.now() - 3.5 * 86400000).toISOString() },
      { id: "c4", postId: "t5", authorId: "u4", content: "Have you considered referral for the SPIRRIT-HFpEF or similar ongoing trials? For refractory symptoms, atrial shunt devices are being studied and may offer hemodynamic benefit. Also worth re-evaluating for occult AF as a contributor.", flagged: false, createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString() },
    ];
    comments.forEach(c => this.comments.set(c.id, c));

    const news: NewsItem[] = [
      { id: "n1", title: "NEJM: Breakthrough in SGLT2 Inhibitor Therapy for Heart Failure", summary: "A landmark randomized controlled trial demonstrates significant mortality benefit of combined SGLT2 inhibitor therapy in heart failure patients across the ejection fraction spectrum, challenging current treatment paradigms.", source: "New England Journal of Medicine", url: "#", tags: ["cardiology", "heart-failure", "clinical-trials"], publishedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: "n2", title: "Lancet: Novel Biomarker Panel Improves Early Sepsis Detection", summary: "Multi-center study validates a new biomarker combination that identifies sepsis 6 hours earlier than conventional methods, potentially reducing mortality by 15% when integrated into clinical decision support systems.", source: "The Lancet", url: "#", tags: ["infectious-disease", "sepsis", "diagnostics"], publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "n3", title: "JAMA: AI-Assisted Stroke Triage Reduces Door-to-Needle Time", summary: "Implementation of artificial intelligence algorithms in stroke triage significantly reduced door-to-needle time by an average of 18 minutes across 50 participating emergency departments nationwide.", source: "JAMA", url: "#", tags: ["neurology", "stroke", "artificial-intelligence"], publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "n4", title: "Nature Medicine: Gene Therapy Shows Promise for Parkinson's Disease", summary: "Phase II trial of AAV-based gene therapy targeting the subthalamic nucleus shows sustained motor improvement in Parkinson's disease patients at 2-year follow-up, with favorable safety profile.", source: "Nature Medicine", url: "#", tags: ["neurology", "movement-disorders", "gene-therapy"], publishedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: "n5", title: "Updated ACC/AHA Guidelines for Valvular Heart Disease Released", summary: "Comprehensive update to valvular heart disease management guidelines incorporates new evidence on transcatheter therapies, updated surgical timing criteria, and expanded role of multimodality imaging.", source: "ACC/AHA", url: "#", tags: ["cardiology", "valve-disease", "guidelines"], publishedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
      { id: "n6", title: "CDC Updates Antimicrobial Resistance Threat Assessment", summary: "Annual report highlights emerging resistance patterns in Candida auris and carbapenem-resistant Enterobacterales, with new recommendations for antimicrobial stewardship programs in healthcare settings.", source: "CDC", url: "#", tags: ["infectious-disease", "antimicrobial-resistance"], publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "n7", title: "Annals of EM: Point-of-Care Ultrasound in Cardiac Arrest", summary: "Systematic review and meta-analysis supports targeted POCUS protocols during cardiac arrest, demonstrating improved identification of reversible causes and correlation with patient outcomes.", source: "Annals of Emergency Medicine", url: "#", tags: ["emergency-medicine", "ultrasound", "resuscitation"], publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "n8", title: "BMJ: Telemedicine Equivalence in Chronic Disease Follow-Up", summary: "Pragmatic trial across 12 health systems finds telemedicine follow-up for stable chronic conditions achieves non-inferior outcomes compared to in-person visits, with significantly higher patient satisfaction scores.", source: "BMJ", url: "#", tags: ["telemedicine", "chronic-disease", "digital-health"], publishedAt: new Date(Date.now() - 6 * 86400000).toISOString() },
    ];
    news.forEach(n => this.newsItems.set(n.id, n));

    const groups: Group[] = [
      { id: "g1", name: "Cardiology Network", description: "A community for cardiologists to discuss latest evidence, complex cases, and emerging therapies in cardiovascular medicine.", topic: "cardiology", memberCount: 1247, members: ["u1"] },
      { id: "g2", name: "Emergency Medicine Forum", description: "Rapid-fire clinical discussions, protocol updates, and case-based learning for emergency medicine physicians.", topic: "emergency-medicine", memberCount: 892, members: ["u3"] },
      { id: "g3", name: "Neuroscience Research Group", description: "Bridging bench-to-bedside: discussions on translational neuroscience, clinical trials, and novel therapeutic targets.", topic: "neurology", memberCount: 634, members: ["u2"] },
      { id: "g4", name: "Infectious Disease Updates", description: "Stay current with antimicrobial stewardship, emerging pathogens, and vaccine developments in the infectious disease landscape.", topic: "infectious-disease", memberCount: 478, members: ["u4"] },
      { id: "g5", name: "Clinical Trials Collaborative", description: "Cross-specialty group focused on trial design, enrollment strategies, and evidence synthesis across therapeutic areas.", topic: "clinical-trials", memberCount: 356, members: ["u1", "u4"] },
    ];
    groups.forEach(g => this.groups.set(g.id, g));

    const events: MedEvent[] = [
      { id: "e1", title: "ACC Annual Scientific Sessions 2026", description: "The premier cardiovascular conference featuring late-breaking clinical trials, keynote lectures, and hands-on learning opportunities.", type: "conference", date: new Date(Date.now() + 30 * 86400000).toISOString(), location: "Chicago, IL", rsvps: ["u1"] },
      { id: "e2", title: "Grand Rounds: Novel Heart Failure Therapies", description: "Weekly grand rounds featuring Dr. Amanda Foster discussing emerging therapeutic targets in HFpEF management.", type: "grand-rounds", date: new Date(Date.now() + 3 * 86400000).toISOString(), location: "Virtual / MGH Amphitheater", rsvps: ["u1", "u4"] },
      { id: "e3", title: "Clinical Research Methods Symposium", description: "Intensive workshop on advanced biostatistics, adaptive trial designs, and real-world evidence generation.", type: "symposium", date: new Date(Date.now() + 14 * 86400000).toISOString(), location: "Boston, MA", rsvps: ["u1", "u2"] },
      { id: "e4", title: "Emergency Medicine Board Review", description: "Comprehensive board review course covering high-yield topics in emergency medicine with case-based learning.", type: "course", date: new Date(Date.now() + 45 * 86400000).toISOString(), location: "Virtual", rsvps: ["u3"] },
    ];
    events.forEach(e => this.events.set(e.id, e));

    const flagged: FlaggedItem[] = [
      { id: "f1", contentType: "comment", contentId: "flagged-c1", content: "I had a patient named John Smith with MRN 12345678 who had a similar presentation...", authorName: "Anonymous User", reason: "Contains potential patient identifiers", reportedBy: "u3", status: "pending", createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: "f2", contentType: "post", contentId: "flagged-t1", content: "Case discussion with potentially identifying details about a specific patient at Regional Medical Center", authorName: "Dr. Test User", reason: "May contain identifiable clinical details", reportedBy: "u4", status: "pending", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ];
    flagged.forEach(f => this.flaggedItems.set(f.id, f));
  }

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find(u => u.username === username); }
  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { id, username: data.username, password: data.password, name: data.name || "", specialty: data.specialty || "", subspecialty: data.subspecialty || "", interests: data.interests || [], hospital: data.hospital || "", role: data.role || "physician", verified: data.verified || false, phiSafeMode: data.phiSafeMode !== undefined ? data.phiSafeMode : true };
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

  async getTriagePosts() { return Array.from(this.triagePosts.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
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

  async getComments(postId: string) { return Array.from(this.comments.values()).filter(c => c.postId === postId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }
  async createComment(comment: Omit<Comment, "id">) {
    const id = randomUUID();
    const c = { ...comment, id };
    this.comments.set(id, c);
    return c;
  }
  async flagComment(commentId: string) {
    const c = this.comments.get(commentId);
    if (!c) return undefined;
    c.flagged = true;
    return c;
  }

  async getNewsItems() { return Array.from(this.newsItems.values()).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()); }

  async getGroups() { return Array.from(this.groups.values()); }
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
}

export const storage = new MemStorage();
