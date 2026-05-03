import type {
  User, TriagePost, Comment, NewsItem, NewsComment, Group, MedEvent, FlaggedItem,
  ChatThread, ChatMessage, TrainingModule, AribotHistory, AribotFolder, Team,
  TelemedConsultation
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
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }

const firstNames = ["James","Sarah","Michael","Emily","David","Jennifer","Robert","Maria","William","Jessica","Daniel","Amanda","Christopher","Stephanie","Matthew","Nicole","Andrew","Samantha","Joshua","Ashley","Ryan","Megan","Brandon","Rachel","Kevin","Lauren","Justin","Michelle","Jonathan","Elizabeth","Brian","Kayla","Nathan","Christine","Timothy","Heather","Jason","Natalie","Tyler","Rebecca","Mark","Olivia","Steven","Victoria","Thomas","Catherine","Alexander","Priya","Raj","Wei","Min","Yuki","Hiroshi","Ahmed","Omar","Fatima","Carlos","Elena","Sofia","Diego","Marco","Lucia","Aisha","Hassan","Mei","Kenji","Sanjay","Anita","Deepak","Kavitha","Chen","Li","Jun","Hana","Nadia","Ravi","Shreya","Arjun","Pooja","Vikram","Neha","Tariq","Layla","Ibrahim","Yusuf","Amara","Kwame","Chinwe","Oluwaseun","Zara","Imran","Farah","Amir","Leila","Darius","Nina","Ivan","Svetlana","Dmitri","Anastasia","Viktor","Tatiana","Nikolai","Olga"];
const lastNames = ["Chen","Rodriguez","Patel","Thompson","Kim","Johnson","Williams","Brown","Jones","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Garcia","Martinez","Robinson","Clark","Lewis","Lee","Walker","Hall","Allen","Young","King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed","Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson","Gray","Ramirez","James","Watson","Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson","Coleman","Jenkins","Perry","Powell","Long","Patterson","Hughes","Flores","Washington","Butler","Simmons","Foster","Gonzales","Bryant","Alexander","Russell","Griffin","Diaz","Hayes"];

const specialties = [
  { name: "Cardiology", subs: ["Interventional Cardiology","Electrophysiology","Heart Failure","Structural Heart"] },
  { name: "Oncology", subs: ["Medical Oncology","Surgical Oncology","Radiation Oncology","Hematology"] },
  { name: "Neurology", subs: ["Stroke","Epilepsy","Movement Disorders","Neurocritical Care"] },
  { name: "Radiology", subs: ["Interventional Radiology","Neuroradiology","Musculoskeletal","Breast Imaging"] },
  { name: "Pediatrics", subs: ["Neonatology","Pediatric Cardiology","Pediatric Oncology","Adolescent Medicine"] },
  { name: "Emergency Medicine", subs: ["Trauma","Toxicology","Pediatric EM","Ultrasound"] },
  { name: "Internal Medicine", subs: ["Hospitalist","Pulmonology","Nephrology","Rheumatology"] },
  { name: "Surgery", subs: ["General Surgery","Vascular Surgery","Trauma Surgery","Minimally Invasive"] },
  { name: "Psychiatry", subs: ["Child Psychiatry","Addiction","Forensic Psychiatry","Consultation-Liaison"] },
  { name: "Orthopedics", subs: ["Sports Medicine","Joint Replacement","Spine Surgery","Hand Surgery"] },
  { name: "Dermatology", subs: ["Dermatopathology","Mohs Surgery","Cosmetic Dermatology","Pediatric Dermatology"] },
  { name: "Anesthesiology", subs: ["Cardiac Anesthesia","Pain Medicine","Regional Anesthesia","Critical Care"] },
  { name: "Gastroenterology", subs: ["Hepatology","IBD","Endoscopy","Motility"] },
  { name: "Endocrinology", subs: ["Diabetes","Thyroid","Reproductive Endocrinology","Metabolic Bone"] },
  { name: "Infectious Disease", subs: ["HIV/AIDS","Transplant ID","Antimicrobial Stewardship","Travel Medicine"] },
];

const hospitals = [
  { name: "Massachusetts General Hospital", city: "Boston", state: "MA" },
  { name: "Johns Hopkins Hospital", city: "Baltimore", state: "MD" },
  { name: "Mayo Clinic", city: "Rochester", state: "MN" },
  { name: "Cleveland Clinic", city: "Cleveland", state: "OH" },
  { name: "UCLA Medical Center", city: "Los Angeles", state: "CA" },
  { name: "Cedars-Sinai Medical Center", city: "Los Angeles", state: "CA" },
  { name: "UCSF Medical Center", city: "San Francisco", state: "CA" },
  { name: "Stanford Health Care", city: "Palo Alto", state: "CA" },
  { name: "NYU Langone Health", city: "New York", state: "NY" },
  { name: "Mount Sinai Hospital", city: "New York", state: "NY" },
  { name: "NewYork-Presbyterian Hospital", city: "New York", state: "NY" },
  { name: "Duke University Hospital", city: "Durham", state: "NC" },
  { name: "Brigham and Women's Hospital", city: "Boston", state: "MA" },
  { name: "University of Chicago Medicine", city: "Chicago", state: "IL" },
  { name: "Northwestern Memorial Hospital", city: "Chicago", state: "IL" },
  { name: "Penn Medicine", city: "Philadelphia", state: "PA" },
  { name: "Emory University Hospital", city: "Atlanta", state: "GA" },
  { name: "Vanderbilt University Medical Center", city: "Nashville", state: "TN" },
  { name: "Michigan Medicine", city: "Ann Arbor", state: "MI" },
  { name: "Houston Methodist", city: "Houston", state: "TX" },
  { name: "UT Southwestern Medical Center", city: "Dallas", state: "TX" },
  { name: "Barnes-Jewish Hospital", city: "St. Louis", state: "MO" },
  { name: "Oregon Health & Science University", city: "Portland", state: "OR" },
  { name: "University of Washington Medical Center", city: "Seattle", state: "WA" },
];

const badgeOptions = ["Top Contributor","Research Leader","Peer Reviewer","Mentor","Case Champion","Grand Rounds Speaker","Clinical Innovator","Rising Star","Community Builder"];

const credentialOptions: { value: string; weight: number }[] = [
  { value: "MD", weight: 38 },
  { value: "DO", weight: 14 },
  { value: "MD, PhD", weight: 10 },
  { value: "DO, PhD", weight: 4 },
  { value: "MBBS", weight: 8 },
  { value: "PA-C", weight: 8 },
  { value: "NP", weight: 7 },
  { value: "CRNA", weight: 3 },
  { value: "PharmD", weight: 2 },
  { value: "M1", weight: 1 },
  { value: "M2", weight: 1 },
  { value: "M3", weight: 2 },
  { value: "M4", weight: 2 },
];

function pickCredential(): string {
  const total = credentialOptions.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of credentialOptions) {
    r -= c.weight;
    if (r <= 0) return c.value;
  }
  return "MD";
}

const interests = ["Heart Failure","Clinical Trials","Structural Heart Disease","Cardiac Imaging","Stroke","Epilepsy","Brain Tumors","Sepsis","Trauma","ARDS","Diabetes","Thyroid","Breast Cancer","Lung Cancer","Melanoma","Joint Replacement","Spine Surgery","IBD","Hepatology","Transplant","HIV/AIDS","Pediatric Oncology","Neonatology","Pain Medicine","Addiction","AI in Medicine","Telemedicine","Point-of-Care Ultrasound","Genomics","Immunotherapy","Precision Medicine","Global Health","Health Equity","Medical Education"];

function generateDoctors(count: number): User[] {
  const docs: User[] = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(specialties);
    const hosp = pick(hospitals);
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const yrsExp = randInt(2, 35);
    docs.push({
      id: `u${i + 1}`,
      username: `${fn.toLowerCase()}${ln.toLowerCase()}${i}`,
      password: "demo",
      name: `Dr. ${fn} ${ln}`,
      specialty: spec.name,
      subspecialty: pick(spec.subs),
      interests: pickN(interests, randInt(2, 5)),
      hospital: hosp.name,
      city: hosp.city,
      state: hosp.state,
      role: i < 3 ? "admin" : "physician",
      verified: rand() > 0.05,
      phiSafeMode: true,
      yearsExperience: yrsExp,
      rankingScore: Math.min(100, randInt(30, 70) + Math.floor(yrsExp * 1.5)),
      badges: pickN(badgeOptions, randInt(0, 3)),
      bio: generateBio(fn, ln, spec.name, hosp.name, yrsExp),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fn.toLowerCase()}${ln.toLowerCase()}${i}&mouth[]=smile&mouth[]=twinkle&mouth[]=eating&eyes[]=happy&eyes[]=squint&eyes[]=wink&eyebrows[]=defaultNatural&eyebrows[]=raisedExcitedNatural&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
      credential: pickCredential(),
    });
  }
  return docs;
}

function generateBio(fn: string, ln: string, spec: string, hosp: string, yrs: number): string {
  const templates = [
    `Board-certified ${spec.toLowerCase()} physician with ${yrs} years of clinical experience at ${hosp}.`,
    `${spec} specialist focusing on evidence-based practice and clinical research. ${yrs} years in academic medicine.`,
    `Dedicated ${spec.toLowerCase()} practitioner at ${hosp}, passionate about medical education and patient outcomes.`,
    `${yrs}-year veteran in ${spec.toLowerCase()}, committed to advancing clinical care through research and innovation.`,
  ];
  return pick(templates);
}

const newsSources = ["NEJM","The Lancet","JAMA","BMJ","Nature Medicine"];
const newsTopics = [
  { title: "Breakthrough in {spec} Treatment Shows Promise in Phase III Trial", tags: ["{tag}","clinical-trials"] },
  { title: "Updated Guidelines for {spec} Management Released", tags: ["{tag}","guidelines"] },
  { title: "AI-Assisted Diagnosis Improves Outcomes in {spec}", tags: ["{tag}","artificial-intelligence"] },
  { title: "Novel Biomarker Panel for Early Detection in {spec}", tags: ["{tag}","diagnostics"] },
  { title: "Meta-Analysis: Comparing Treatment Approaches in {spec}", tags: ["{tag}","meta-analysis"] },
  { title: "Telemedicine Impact on {spec} Follow-Up Care", tags: ["{tag}","telemedicine","digital-health"] },
  { title: "Gene Therapy Advances in {spec}: A Review", tags: ["{tag}","gene-therapy"] },
  { title: "Immunotherapy Update: New Targets in {spec}", tags: ["{tag}","immunotherapy"] },
  { title: "Point-of-Care Testing Revolution in {spec}", tags: ["{tag}","diagnostics","innovation"] },
  { title: "Global Burden of Disease: {spec} Trends 2026", tags: ["{tag}","epidemiology"] },
  { title: "Surgical Innovation: Minimally Invasive Approaches in {spec}", tags: ["{tag}","surgery"] },
  { title: "Precision Medicine Advances in {spec} Care", tags: ["{tag}","precision-medicine","genomics"] },
  { title: "Clinical Decision Support Tools for {spec}", tags: ["{tag}","clinical-decision-support"] },
  { title: "Drug Safety Update: New Warnings for {spec} Medications", tags: ["{tag}","pharmacology"] },
  { title: "Pediatric {spec}: Emerging Treatment Paradigms", tags: ["{tag}","pediatrics"] },
  { title: "Cost-Effectiveness Analysis of {spec} Interventions", tags: ["{tag}","health-economics"] },
];

const summaryTemplates = [
  "A landmark study demonstrates significant improvements in patient outcomes with the novel approach, potentially changing standard of care for thousands of patients annually.",
  "Multi-center randomized controlled trial validates new treatment paradigm, showing superior efficacy and safety profile compared to current standard therapy.",
  "Comprehensive systematic review and meta-analysis of 47 studies provides updated evidence base for clinical decision-making in this rapidly evolving field.",
  "Real-world evidence from 12 health systems confirms the effectiveness and safety of the approach in diverse patient populations outside of clinical trial settings.",
  "Expert consensus panel releases updated recommendations based on emerging evidence, incorporating patient-centered outcomes and shared decision-making frameworks.",
  "Large-scale population study identifies key risk factors and protective measures, offering new insights for prevention strategies and early intervention programs.",
];

const abstractTemplates = [
  "**Background:** The management of {spec} remains a significant clinical challenge. Recent advances in molecular understanding have opened new therapeutic avenues.\n\n**Methods:** We conducted a multi-center, double-blind, randomized controlled trial across 24 academic medical centers (N=3,847). Primary endpoints included clinical response at 12 weeks and sustained remission at 52 weeks.\n\n**Results:** The intervention group demonstrated a statistically significant improvement in the primary endpoint (HR 0.72, 95% CI 0.61–0.85, p<0.001). Adverse events were comparable between groups. Subgroup analyses revealed consistent benefit across demographic categories.\n\n**Conclusions:** These findings support a paradigm shift in the approach to {spec} management, with meaningful improvements in patient-centered outcomes.",
  "**Objective:** To evaluate the efficacy and safety of a novel diagnostic approach in {spec} using a prospective cohort design.\n\n**Study Design:** Prospective, multi-center observational study enrolling 2,156 patients across 18 sites from 2023–2025. Sensitivity and specificity were assessed against the current gold standard.\n\n**Results:** The novel approach achieved 94.2% sensitivity and 97.1% specificity (AUC 0.96). Time to diagnosis was reduced by 47% (median 3.2 days vs. 6.1 days, p<0.001). Cost-per-diagnosis decreased by 32%.\n\n**Implications:** Adoption of this diagnostic pathway could significantly reduce diagnostic delay and healthcare resource utilization while maintaining diagnostic accuracy.",
  "**Introduction:** Current treatment paradigms in {spec} are limited by heterogeneous patient responses and significant side-effect burden.\n\n**Methods:** This systematic review and network meta-analysis included 47 randomized controlled trials (N=28,492). Bayesian network analysis was performed using a random-effects model.\n\n**Findings:** Treatment ranking identified the novel approach as having the highest probability of being the most effective intervention (SUCRA 0.91). Number needed to treat was 6 (95% CrI 4–9). Safety profiles were favorable compared to standard of care.\n\n**Interpretation:** The evidence supports re-evaluation of current clinical practice guidelines in {spec}, particularly for patients who have failed first-line therapy.",
  "**Purpose:** To assess real-world outcomes of emerging therapeutic strategies in {spec} across diverse healthcare settings.\n\n**Design:** Retrospective analysis of electronic health records from 12 integrated health systems (N=15,230 patients, 2022–2025). Propensity score matching was used to control for confounders.\n\n**Outcomes:** Adjusted analysis showed 28% reduction in composite endpoint (OR 0.72, 95% CI 0.64–0.81). Benefits persisted across age groups, sex, and comorbidity burden. Medication adherence was 84% at 12 months.\n\n**Significance:** Real-world evidence confirms and extends clinical trial findings, supporting broad adoption of this therapeutic approach in routine clinical practice.",
];

const researcherFirstNames = ["James","Maria","David","Sarah","Michael","Elena","Robert","Aisha","William","Priya","John","Fatima","Richard","Yuki","Thomas","Nadia","Charles","Lin","Andrew","Sophia"];
const researcherLastNames = ["Chen","Rodriguez","Patel","Thompson","Nakamura","Okafor","Schmidt","Kim","Anderson","Gupta","Williams","Hassan","Mueller","Park","Johnson","Desai","Brown","Yamamoto","Martinez","Krishnamurthy"];

function generateNews(count: number, doctors: User[]): NewsItem[] {
  const items: NewsItem[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const spec = pick(specialties);
    const topic = pick(newsTopics);
    const tag = spec.name.toLowerCase().replace(/ /g, "-");
    const likeCount = randInt(0, 20);
    const researcherFn = pick(researcherFirstNames);
    const researcherLn = pick(researcherLastNames);
    items.push({
      id: `n${i + 1}`,
      title: topic.title.replace(/\{spec\}/g, spec.name),
      summary: pick(summaryTemplates),
      abstract: pick(abstractTemplates).replace(/\{spec\}/g, spec.name.toLowerCase()),
      researcherName: `Dr. ${researcherFn} ${researcherLn}, ${pick(["MD","MD, PhD","PhD","MD, MPH","MD, FACS","MD, FACC"])}`,
      source: pick(newsSources),
      url: "#",
      tags: topic.tags.map(t => t.replace("{tag}", tag)),
      publishedAt: new Date(now - i * 8 * 3600000 - randInt(0, 7200000)).toISOString(),
      readingTime: randInt(3, 12),
      likes: pickN(doctors, likeCount).map(d => d.id),
      commentCount: randInt(0, 12),
    });
  }
  return items;
}

const newsCommentTemplates = [
  "This is a landmark study. The implications for clinical practice are significant.",
  "I've been following this research closely. The methodology is solid.",
  "We should discuss this at our next journal club meeting.",
  "Very relevant to my current patient population. Thanks for sharing.",
  "The sample size concerns me a bit, but the results are promising.",
  "Has anyone started implementing these findings in their practice?",
  "This aligns with what we've been seeing clinically at our institution.",
  "I'd like to see a longer follow-up period before changing practice.",
  "Important findings. I'll be sharing this with my residents.",
  "The cost-effectiveness analysis is particularly compelling.",
];

function generateNewsComments(newsItems: NewsItem[], doctors: User[]): NewsComment[] {
  const comments: NewsComment[] = [];
  let cid = 1;
  const now = Date.now();
  for (const news of newsItems) {
    const numComments = news.commentCount;
    const topLevelIds: string[] = [];
    for (let j = 0; j < numComments; j++) {
      const author = pick(doctors.slice(0, 60));
      const isReply = j > 1 && topLevelIds.length > 0 && rand() > 0.7;
      const id = `nc${cid++}`;
      comments.push({
        id,
        newsId: news.id,
        authorId: author.id,
        content: pick(newsCommentTemplates),
        parentId: isReply ? pick(topLevelIds) : null,
        likes: pickN(doctors, randInt(0, 5)).map(d => d.id),
        createdAt: new Date(now - randInt(0, 72) * 3600000).toISOString(),
      });
      if (!isReply) topLevelIds.push(id);
    }
  }
  return comments;
}

const caseTemplates = [
  { title: "Atypical Presentation of {cond} in {age}-Year-Old {sex}", content: "{age}-year-old {sex} presenting with atypical symptoms concerning for {cond}. {detail} Seeking input on diagnostic workup and management approach." },
  { title: "Treatment Dilemma: {cond} with Multiple Comorbidities", content: "Complex case involving {cond} in a patient with {comorbid}. Current management includes {tx}. Clinical question: What is the optimal therapeutic approach given the competing risks?" },
  { title: "Refractory {cond} - Seeking Multidisciplinary Input", content: "Patient with treatment-resistant {cond} despite {tx}. {detail} Looking for evidence-based alternatives and potential clinical trial options." },
  { title: "{cond} Diagnostic Challenge", content: "Diagnostic uncertainty in a case presenting with features suggestive of {cond}. {detail} What additional workup would you recommend?" },
  { title: "Acute {cond} Management - Decision Point", content: "Time-sensitive case requiring urgent management decision for acute {cond}. {detail} How would you approach this clinical scenario?" },
  { title: "Post-Procedural Complication in {cond} Patient", content: "Unexpected complication following intervention for {cond}. {detail} Seeking guidance on management and prevention strategies." },
];

const conditions: Record<string, string[]> = {
  "Cardiology": ["STEMI","Heart Failure","Atrial Fibrillation","Aortic Stenosis","Myocarditis","Pericarditis","Cardiomyopathy","Pulmonary Hypertension"],
  "Oncology": ["Pancreatic Adenocarcinoma","Triple-Negative Breast Cancer","Non-Small Cell Lung Cancer","Renal Cell Carcinoma","Melanoma","Glioblastoma","Lymphoma","Multiple Myeloma"],
  "Neurology": ["Ischemic Stroke","Status Epilepticus","Multiple Sclerosis","Parkinson's Disease","ALS","Myasthenia Gravis","Guillain-Barré","Meningitis"],
  "Emergency Medicine": ["Polytrauma","Septic Shock","Acute Abdomen","Overdose","DKA","Anaphylaxis","Tension Pneumothorax","Aortic Dissection"],
  "Internal Medicine": ["Acute Kidney Injury","COPD Exacerbation","GI Bleeding","DVT/PE","Pneumonia","Hyponatremia","Adrenal Crisis","Liver Cirrhosis"],
  "Surgery": ["Bowel Obstruction","Appendicitis","Cholecystitis","Hernia Incarceration","Necrotizing Fasciitis","Perforated Ulcer","Splenic Rupture","Mesenteric Ischemia"],
  "Pediatrics": ["Kawasaki Disease","Bronchiolitis","Febrile Seizure","Intussusception","Neonatal Sepsis","Croup","Henoch-Schönlein Purpura","Pyloric Stenosis"],
  "Radiology": ["Pulmonary Nodule","Intracranial Mass","Abdominal Abscess","Aortic Aneurysm","Bone Tumor","Liver Lesion","Renal Mass","Adrenal Incidentaloma"],
  "Psychiatry": ["Treatment-Resistant Depression","First-Episode Psychosis","Bipolar Disorder","PTSD","Substance Use Disorder","Eating Disorder","OCD","Catatonia"],
  "Orthopedics": ["ACL Tear","Hip Fracture","Spinal Stenosis","Rotator Cuff Tear","Carpal Tunnel","Osteoarthritis","Compartment Syndrome","Osteomyelitis"],
};

const commentTemplates = [
  "In my experience with similar cases, I would recommend {approach}. The evidence from recent trials supports this approach.",
  "Have you considered {approach}? We've had good outcomes with this strategy at our institution.",
  "I agree with the workup plan. One additional consideration would be {approach}.",
  "This is a challenging case. At our center, we typically start with {approach} and escalate if needed.",
  "Great discussion point. The latest guidelines from {society} suggest {approach} in these scenarios.",
  "I would add that {approach} is worth considering, especially given the patient's comorbidities.",
  "Interesting case. We published a similar case series last year showing {approach} had favorable outcomes.",
  "From an {specialty} perspective, I'd suggest {approach} before proceeding with more invasive options.",
  "Key consideration here is {approach}. Happy to discuss further.",
  "We see this presentation frequently. Our protocol includes {approach} as a first-line strategy.",
];

const approaches = ["serial troponin monitoring with risk stratification","advanced imaging with cardiac MRI","a multidisciplinary team approach","genetic testing to guide therapy","early specialist consultation","close hemodynamic monitoring in the ICU","conservative management initially with serial reassessment","empiric broad-spectrum coverage pending cultures","a shared decision-making conversation with the patient","a trial of non-pharmacologic intervention first"];
const societies = ["ACC/AHA","ESMO","AAN","ACEP","ACS","AAP","ACR","APA"];

function generateTriagePosts(count: number, doctors: User[]): TriagePost[] {
  const posts: TriagePost[] = [];
  const now = Date.now();
  const specKeys = Object.keys(conditions);
  for (let i = 0; i < count; i++) {
    const author = pick(doctors.slice(0, 50));
    const spec = author.specialty in conditions ? author.specialty : pick(specKeys);
    const cond = pick(conditions[spec] || conditions["Internal Medicine"]);
    const tmpl = pick(caseTemplates);
    const age = randInt(18, 85);
    const sex = rand() > 0.5 ? "male" : "female";
    const likeCount = randInt(0, 15);
    const likers = pickN(doctors, likeCount).map(d => d.id);
    posts.push({
      id: `t${i + 1}`,
      authorId: author.id,
      title: tmpl.title.replace("{cond}", cond).replace("{age}", String(age)).replace("{sex}", sex),
      content: tmpl.content
        .replace("{cond}", cond)
        .replace("{age}", String(age))
        .replace("{sex}", sex)
        .replace("{detail}", `Labs show ${rand() > 0.5 ? "elevated inflammatory markers" : "mildly abnormal values"}. Imaging ${rand() > 0.5 ? "pending" : "demonstrates equivocal findings"}.`)
        .replace("{comorbid}", pick(["diabetes and CKD","hypertension and obesity","immunosuppression","advanced age and frailty"]))
        .replace("{tx}", pick(["standard medical therapy","first-line agents","guideline-directed treatment","current standard of care"])),
      tags: [spec.toLowerCase().replace(/ /g, "-"), ...pickN(["clinical-trials","guidelines","case-discussion","urgent","diagnostics","treatment"], randInt(1, 3))],
      likes: likers,
      images: rand() > 0.7 ? ["https://placehold.co/400x300/e2e8f0/475569?text=Clinical+Image"] : [],
      flagged: false,
      createdAt: new Date(now - i * 4 * 3600000 - randInt(0, 14400000)).toISOString(),
    });
  }
  return posts;
}

function generateComments(posts: TriagePost[], doctors: User[]): Comment[] {
  const comments: Comment[] = [];
  let cid = 1;
  const now = Date.now();
  for (const post of posts) {
    const numComments = randInt(3, 12);
    const topLevelIds: string[] = [];
    for (let j = 0; j < numComments; j++) {
      const author = pick(doctors.slice(0, 80));
      const isAnon = rand() > 0.85;
      const isReply = j > 1 && topLevelIds.length > 0 && rand() > 0.6;
      const id = `c${cid++}`;
      const tmpl = pick(commentTemplates);
      comments.push({
        id,
        postId: post.id,
        authorId: author.id,
        content: tmpl
          .replace("{approach}", pick(approaches))
          .replace("{society}", pick(societies))
          .replace("{specialty}", author.specialty.toLowerCase()),
        parentId: isReply ? pick(topLevelIds) : null,
        anonymous: isAnon,
        likes: pickN(doctors, randInt(0, 5)).map(d => d.id),
        flagged: false,
        createdAt: new Date(now - randInt(0, 72) * 3600000).toISOString(),
      });
      if (!isReply) topLevelIds.push(id);
    }
  }
  return comments;
}

function generateGroups(count: number, doctors: User[]): Group[] {
  const groups: Group[] = [];
  const hospitalGroups = [
    "Cardiology Team","Oncology Tumor Board","Emergency Medicine","Radiology Reading Room",
    "Surgery Grand Rounds","Internal Medicine","Pediatrics","Neurology","ICU Team","Quality Improvement",
  ];
  const interestGroups = [
    "Stroke Imaging","Breast Cancer Tumor Board","Peds ER Network","Heart Failure Research",
    "AI in Clinical Practice","Point-of-Care Ultrasound","Clinical Trial Design","Global Health",
    "Medical Education Innovation","Physician Wellness","Precision Medicine","Antimicrobial Stewardship",
    "Palliative Care","Women in Medicine","Health Equity","Telehealth Innovation","Genomics & Medicine",
    "Evidence-Based Practice","Clinical Decision Support","Trauma Systems","Infectious Disease Updates",
    "Pain Management","Transplant Medicine","Interventional Procedures","Rare Diseases Network",
    "Metabolic Medicine","Geriatric Medicine","Sports Medicine","Addiction Medicine","Neurocritical Care",
  ];
  const hosp = hospitals;
  for (let i = 0; i < Math.min(count, 15); i++) {
    const h = hosp[i % hosp.length];
    const gName = hospitalGroups[i % hospitalGroups.length];
    const mems = pickN(doctors.filter(d => d.hospital === h.name), randInt(3, 10)).map(d => d.id);
    if (mems.length === 0) mems.push(...pickN(doctors, randInt(3, 8)).map(d => d.id));
    groups.push({
      id: `g${i + 1}`,
      name: `${h.name.split(" ")[0]} ${gName}`,
      description: `${gName} professionals at ${h.name} collaborating on clinical excellence.`,
      topic: gName.toLowerCase(),
      type: "hospital",
      hospital: h.name,
      city: h.city,
      memberCount: mems.length + randInt(10, 50),
      members: mems,
    });
  }
  for (let i = 0; i < count - 15; i++) {
    const gName = interestGroups[i % interestGroups.length];
    const mems = pickN(doctors, randInt(5, 20)).map(d => d.id);
    groups.push({
      id: `g${15 + i + 1}`,
      name: gName,
      description: `A collaborative community for physicians interested in ${gName.toLowerCase()}.`,
      topic: gName.toLowerCase(),
      type: "interest",
      hospital: "",
      city: "",
      memberCount: mems.length + randInt(20, 100),
      members: mems,
    });
  }
  return groups;
}

const eventImagesByType: Record<string, string> = {
  "conference": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=300&fit=crop",
  "grand-rounds": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=300&fit=crop",
  "lab": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=300&fit=crop",
  "meeting": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&h=300&fit=crop",
  "coffee-chat": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=300&fit=crop",
  "workshop": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop",
  "webinar": "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=600&h=300&fit=crop",
  "course": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=300&fit=crop",
};

function generateEvents(count: number, doctors: User[]): MedEvent[] {
  const events: MedEvent[] = [];
  const now = Date.now();
  const types = ["conference","grand-rounds","lab","meeting","coffee-chat","workshop","webinar","course"];
  const eventNames = [
    "Annual Scientific Sessions","Grand Rounds: {topic}","Clinical Research Symposium",
    "Board Review Course","Journal Club: {topic}","Case Conference","Morbidity & Mortality Conference",
    "Innovation Workshop","Professional Development Seminar","Physician Wellness Retreat",
    "Quality Improvement Meeting","Resident Teaching Conference","Multidisciplinary Tumor Board",
    "Interventional Techniques Workshop","Evidence-Based Medicine Seminar","Ethics Grand Rounds",
    "Global Health Lecture Series","Leadership in Medicine","Clinical AI Workshop",
    "Simulation Training","Hands-On Procedures Lab","Biostatistics Bootcamp",
    "Grant Writing Workshop","Peer Review Training","Medical Education Conference",
    "Research Methods Symposium","Translational Science Seminar","Palliative Care Rounds",
    "Health Policy Forum","Patient Safety Conference","Morning Coffee & Cases",
    "Lab Techniques Session","Departmental Meeting","Interdisciplinary Rounds",
  ];
  const topics = ["Heart Failure Therapies","Stroke Management","Cancer Immunotherapy","Sepsis Protocols","AI Diagnostics","Precision Medicine","Trauma Care","Pediatric Emergencies"];
  for (let i = 0; i < count; i++) {
    const h = pick(hospitals);
    const topic = pick(topics);
    const eName = pick(eventNames).replace("{topic}", topic);
    const eventType = pick(types);
    const cap = randInt(20, 200);
    const rsvpCount = randInt(5, Math.min(cap, 40));
    events.push({
      id: `e${i + 1}`,
      title: eName,
      description: `Join colleagues for this ${eventType} focusing on the latest advances and best practices. Featuring expert speakers and interactive sessions.`,
      type: eventType,
      date: new Date(now + (i + 1) * 3 * 86400000 + randInt(0, 86400000)).toISOString(),
      location: rand() > 0.4 ? `${h.city}, ${h.state}` : "Virtual",
      hostGroup: "",
      hostHospital: h.name,
      capacity: cap,
      rsvps: pickN(doctors, rsvpCount).map(d => d.id),
      imageUrl: eventImagesByType[eventType] || eventImagesByType["conference"],
    });
  }
  return events;
}

function generateChats(doctors: User[]): { threads: ChatThread[]; messages: ChatMessage[] } {
  const threads: ChatThread[] = [];
  const messages: ChatMessage[] = [];
  const now = Date.now();
  let mid = 1;
  const msgTemplates = [
    "Hi, I wanted to discuss the recent case we reviewed in rounds.",
    "Have you seen the latest publication on this topic?",
    "Thanks for your input on the differential diagnosis.",
    "I'll review the imaging and get back to you.",
    "Can we schedule a time to discuss the treatment plan?",
    "Great presentation at grand rounds today.",
    "FYI - updated protocol attached.",
    "Patient is stable, will follow up tomorrow.",
    "Any thoughts on this lab result?",
    "I'd recommend a multidisciplinary approach here.",
    "Agreed, let's proceed with the workup.",
    "The family meeting went well. Plan discussed.",
    "New guidelines just dropped - worth reviewing.",
    "Can you cover my patients this weekend?",
    "Thanks for the consult, very helpful.",
  ];
  const attachments = [
    { name: "clinical_protocol_v3.pdf", type: "pdf", url: "#" },
    { name: "imaging_report.pdf", type: "pdf", url: "#" },
    { name: "lab_results.png", type: "png", url: "#" },
    { name: "case_summary.docx", type: "docx", url: "#" },
    { name: "treatment_plan.pdf", type: "pdf", url: "#" },
  ];

  for (let i = 0; i < 18; i++) {
    const participants = pickN(doctors.slice(0, 50), 2).map(d => d.id);
    if (!participants.includes("u1") && i < 8) participants[1] = "u1";
    const numMsgs = randInt(3, 10);
    const threadId = `chat${i + 1}`;
    const otherUser = doctors.find(d => d.id === participants.find(p => p !== "u1")) || doctors[i + 1];
    for (let j = 0; j < numMsgs; j++) {
      const hasAttachment = rand() > 0.8;
      messages.push({
        id: `m${mid++}`,
        threadId,
        senderId: participants[j % participants.length],
        content: pick(msgTemplates),
        attachments: hasAttachment ? [pick(attachments)] : [],
        createdAt: new Date(now - (numMsgs - j) * 1800000 - randInt(0, 3600000)).toISOString(),
      });
    }
    const lastMsg = messages.filter(m => m.threadId === threadId).pop()!;
    threads.push({
      id: threadId,
      type: "direct",
      name: otherUser.name,
      participants,
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt,
      unreadCount: randInt(0, 3),
    });
  }

  for (let i = 0; i < 7; i++) {
    const participants = pickN(doctors.slice(0, 40), randInt(3, 8)).map(d => d.id);
    if (!participants.includes("u1") && i < 4) participants.push("u1");
    const threadId = `gchat${i + 1}`;
    const groupNames = ["Cardiology Consults","Morning Huddle","Case Discussion","Research Team","Teaching Fellows","Journal Club","On-Call Group"];
    const numMsgs = randInt(5, 15);
    for (let j = 0; j < numMsgs; j++) {
      messages.push({
        id: `m${mid++}`,
        threadId,
        senderId: pick(participants),
        content: pick(msgTemplates),
        attachments: rand() > 0.85 ? [pick(attachments)] : [],
        createdAt: new Date(now - (numMsgs - j) * 1200000 - randInt(0, 3600000)).toISOString(),
      });
    }
    const lastMsg = messages.filter(m => m.threadId === threadId).pop()!;
    threads.push({
      id: threadId,
      type: "group",
      name: groupNames[i],
      participants,
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt,
      unreadCount: randInt(0, 5),
    });
  }
  return { threads, messages };
}

function generateTraining(): TrainingModule[] {
  return [
    { id: "tr1", title: "Using Aribot Effectively", description: "Learn how to leverage Aribot's AI capabilities for clinical decision support, literature review, and case analysis.", outline: ["Introduction to Aribot","Setting Up Your Profile Context","Crafting Effective Prompts","Interpreting AI Responses","Clinical Decision Support Workflows","Privacy & PHI Best Practices"], duration: "30 min", completedBy: [] },
    { id: "tr2", title: "How to Cite Primary Sources", description: "Best practices for referencing clinical literature and ensuring evidence-based communication.", outline: ["Why Primary Sources Matter","Finding Reliable Sources","AMA Citation Format","Integrating Evidence in Clinical Discussions","Common Pitfalls"], duration: "20 min", completedBy: [] },
    { id: "tr3", title: "Clinical AI Pitfalls & Limitations", description: "Understanding the boundaries of AI in clinical practice and avoiding common mistakes.", outline: ["AI Hallucination in Medical Context","Bias in Training Data","When NOT to Trust AI","Verification Strategies","Regulatory Considerations","Ethical Frameworks"], duration: "45 min", completedBy: [] },
    { id: "tr4", title: "PHI Compliance in Digital Platforms", description: "Ensuring patient privacy when using digital communication and AI tools.", outline: ["HIPAA Refresher","De-identification Standards","Safe Communication Practices","Platform Security Features","Incident Response"], duration: "25 min", completedBy: [] },
    { id: "tr5", title: "Evidence-Based Medicine Fundamentals", description: "Core principles of EBM for effective clinical decision-making.", outline: ["Formulating Clinical Questions","Literature Search Strategies","Critical Appraisal of Evidence","Applying Evidence to Practice","Shared Decision Making"], duration: "40 min", completedBy: [] },
    { id: "tr6", title: "Effective Case Presentations", description: "Structure and deliver compelling clinical case presentations for Triage discussions.", outline: ["Case Presentation Framework","Identifying Key Features","Organizing the Differential","Presenting to Multidisciplinary Teams","Receiving & Giving Feedback"], duration: "30 min", completedBy: [] },
    { id: "tr7", title: "Telemedicine Best Practices", description: "Optimize virtual patient encounters and digital collaboration with colleagues.", outline: ["Setting Up Your Virtual Environment","Communication Skills for Telehealth","Technical Troubleshooting","Documentation for Virtual Visits","Legal Considerations"], duration: "35 min", completedBy: [] },
    { id: "tr8", title: "Research Methodology for Clinicians", description: "Practical research methods for busy practicing physicians.", outline: ["Study Design Basics","IRB & Ethics","Data Collection Methods","Basic Biostatistics","Writing for Publication","Peer Review Process"], duration: "50 min", completedBy: [] },
    { id: "tr9", title: "Leadership in Clinical Medicine", description: "Developing leadership skills for physicians in academic and clinical settings.", outline: ["Leadership Styles in Medicine","Building Effective Teams","Conflict Resolution","Change Management","Mentorship"], duration: "35 min", completedBy: [] },
    { id: "tr10", title: "Quality Improvement in Healthcare", description: "Tools and methodologies for driving quality improvement in clinical practice.", outline: ["Plan-Do-Study-Act Cycles","Root Cause Analysis","Lean Healthcare","Measuring Outcomes","Sustaining Improvements"], duration: "30 min", completedBy: [] },
    { id: "tr11", title: "Patient Safety Essentials", description: "Key principles and practices for maintaining patient safety in clinical settings.", outline: ["Culture of Safety","Error Reporting Systems","High-Reliability Organizations","Communication Failures","Safety Checklists"], duration: "25 min", completedBy: [] },
    { id: "tr12", title: "Interprofessional Collaboration", description: "Working effectively across disciplines for optimal patient outcomes.", outline: ["Team-Based Care Models","Communication Tools (SBAR)","Role Clarity","Shared Mental Models","Debriefing Practices"], duration: "30 min", completedBy: [] },
  ];
}

function generateAribotData(): { history: AribotHistory[]; folders: AribotFolder[] } {
  const folders: AribotFolder[] = [
    { id: "af1", name: "Clinical Cases", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "af2", name: "Research", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "af3", name: "Guidelines", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];
  const history: AribotHistory[] = [
    { id: "ah1", title: "HIV antiretroviral regimen selection 2026", tags: ["infectious-disease","hiv"], folderId: "af1", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "ah2", title: "Antimicrobial resistance patterns — carbapenem-resistant organisms", tags: ["infectious-disease","antimicrobial-stewardship"], folderId: "af3", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: "ah3", title: "Hepatitis B treatment guidelines update", tags: ["infectious-disease","hepatitis"], folderId: "af1", createdAt: new Date(Date.now() - 12 * 3600000).toISOString() },
    { id: "ah4", title: "Sepsis-3 criteria clinical application", tags: ["infectious-disease","sepsis"], folderId: null, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: "ah5", title: "Travel medicine pre-departure vaccines", tags: ["infectious-disease","travel-medicine"], folderId: "af1", createdAt: new Date(Date.now() - 36 * 3600000).toISOString() },
    { id: "ah6", title: "IDSA guidelines for MRSA management", tags: ["infectious-disease","guidelines"], folderId: "af2", createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: "ah7", title: "STI screening recommendations 2026", tags: ["infectious-disease","sti"], folderId: "af3", createdAt: new Date(Date.now() - 60 * 3600000).toISOString() },
    { id: "ah8", title: "Aspergillosis diagnosis and treatment", tags: ["infectious-disease","fungal"], folderId: null, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
    { id: "ah9", title: "AI-assisted infection surveillance", tags: ["infectious-disease","artificial-intelligence"], folderId: "af2", createdAt: new Date(Date.now() - 96 * 3600000).toISOString() },
    { id: "ah10", title: "Cellulitis vs DVT clinical differentiation", tags: ["infectious-disease","clinical-pearls"], folderId: null, createdAt: new Date(Date.now() - 120 * 3600000).toISOString() },
  ];
  return { history, folders };
}

function generateTeams(doctors: User[]): Team[] {
  return [
    { id: "team1", name: "Infectious Disease Service", description: "Inpatient and outpatient infectious disease consult service at Marin Health Medical Center.", members: pickN(doctors.slice(0, 30), 8).map(d => ({ userId: d.id, role: d.id === "u1" ? "admin" : "member" as const })) },
    { id: "team2", name: "ICU Team Alpha", description: "Critical care unit team with rotating coverage.", members: pickN(doctors.slice(0, 40), 6).map((d, i) => ({ userId: d.id, role: i === 0 ? "admin" : "member" as const })) },
    { id: "team3", name: "Research Collaborative", description: "Multi-site clinical research team.", members: pickN(doctors.slice(0, 50), 10).map((d, i) => ({ userId: d.id, role: i < 2 ? "admin" : "member" as const })) },
    { id: "team4", name: "Residency Education", description: "Teaching faculty and resident education coordinators.", members: pickN(doctors.slice(0, 30), 7).map((d, i) => ({ userId: d.id, role: i === 0 ? "admin" : "member" as const })) },
    { id: "team5", name: "Quality Committee", description: "Hospital-wide quality improvement committee.", members: pickN(doctors.slice(0, 60), 9).map((d, i) => ({ userId: d.id, role: i === 0 ? "admin" : "member" as const })) },
    { id: "team6", name: "Telehealth Operations", description: "Team managing virtual care delivery and protocols.", members: pickN(doctors.slice(0, 40), 5).map((d, i) => ({ userId: d.id, role: i === 0 ? "admin" : "member" as const })) },
  ];
}

function generateTelemedConsultations(): TelemedConsultation[] {
  const consultations: TelemedConsultation[] = [];
  const now = Date.now();

  const complaints = [
    { chief: "Chest pain", symptoms: ["chest tightness", "shortness of breath", "radiating pain to left arm"], history: "History of hypertension, on lisinopril 10mg daily" },
    { chief: "Chronic cough", symptoms: ["persistent dry cough", "mild wheezing", "post-nasal drip"], history: "Non-smoker, seasonal allergies" },
    { chief: "Skin rash", symptoms: ["erythematous papules", "pruritus", "spreading to trunk"], history: "No known drug allergies, started new detergent recently" },
    { chief: "Recurring headaches", symptoms: ["throbbing bilateral headache", "photophobia", "nausea"], history: "Migraines since adolescence, family history positive" },
    { chief: "Joint pain", symptoms: ["bilateral knee pain", "morning stiffness", "swelling"], history: "BMI 31, sedentary lifestyle, no prior joint issues" },
    { chief: "Anxiety symptoms", symptoms: ["palpitations", "excessive worry", "insomnia", "difficulty concentrating"], history: "Recently divorced, increased work stress" },
    { chief: "Follow-up diabetes management", symptoms: ["polyuria", "polydipsia", "fatigue"], history: "Type 2 DM diagnosed 3 years ago, on metformin 1000mg BID" },
    { chief: "Hypertension check", symptoms: ["elevated BP readings at home", "occasional dizziness"], history: "HTN diagnosed 5 years ago, on amlodipine 5mg daily" },
    { chief: "Lower back pain", symptoms: ["lumbar pain", "radiating to right leg", "numbness in foot"], history: "Office worker, no prior spine issues" },
    { chief: "Persistent fatigue", symptoms: ["extreme tiredness", "brain fog", "muscle weakness"], history: "Post-COVID infection 3 months ago" },
    { chief: "Abdominal pain", symptoms: ["epigastric pain", "bloating", "acid reflux"], history: "GERD diagnosed 2 years ago, on omeprazole PRN" },
    { chief: "Sore throat and fever", symptoms: ["pharyngeal erythema", "fever 101.2F", "cervical lymphadenopathy"], history: "No recent travel, works in daycare" },
    { chief: "Shortness of breath", symptoms: ["dyspnea on exertion", "orthopnea", "ankle edema"], history: "Former smoker, quit 5 years ago, mild COPD" },
    { chief: "Dizziness and vertigo", symptoms: ["room-spinning sensation", "nausea", "unsteady gait"], history: "No hearing loss, no tinnitus" },
    { chief: "Urinary symptoms", symptoms: ["dysuria", "frequency", "urgency", "suprapubic pain"], history: "Recurrent UTIs, 3 episodes in past year" },
    { chief: "Insomnia", symptoms: ["difficulty falling asleep", "early morning awakening", "daytime drowsiness"], history: "Shift worker, caffeine intake 4+ cups daily" },
    { chief: "Allergic rhinitis flare", symptoms: ["nasal congestion", "sneezing", "watery eyes", "itchy palate"], history: "Seasonal allergies, on cetirizine" },
    { chief: "Depression screening", symptoms: ["low mood", "anhedonia", "weight loss", "poor appetite"], history: "Family history of depression, recent bereavement" },
    { chief: "Wrist pain", symptoms: ["right wrist pain", "numbness in fingers", "worse at night"], history: "Data entry specialist, repetitive motion" },
    { chief: "Follow-up thyroid", symptoms: ["weight gain", "cold intolerance", "dry skin"], history: "Hypothyroidism on levothyroxine 75mcg daily" },
    { chief: "Pediatric fever", symptoms: ["fever 102.5F", "irritability", "decreased oral intake", "ear tugging"], history: "12-month-old, up to date on vaccinations" },
    { chief: "Medication refill request", symptoms: ["stable on current regimen", "no new complaints"], history: "Controlled asthma on fluticasone/salmeterol" },
    { chief: "Eye redness", symptoms: ["bilateral conjunctival injection", "watery discharge", "gritty sensation"], history: "Contact lens wearer, no recent changes" },
    { chief: "Palpitations", symptoms: ["intermittent rapid heartbeat", "lightheadedness", "anxiety"], history: "No structural heart disease, normal echo last year" },
    { chief: "Foot numbness", symptoms: ["bilateral foot tingling", "burning sensation", "balance issues"], history: "Type 2 DM for 8 years, A1c 7.8%" },
    { chief: "Acne flare-up", symptoms: ["inflammatory papules", "comedones", "facial scarring"], history: "Tried topical retinoids, moderate severity" },
    { chief: "Constipation", symptoms: ["infrequent bowel movements", "straining", "abdominal discomfort"], history: "Low fiber diet, sedentary, on opioids for back pain" },
    { chief: "Weight management consultation", symptoms: ["progressive weight gain", "difficulty losing weight", "joint stress"], history: "BMI 34, prediabetes, family history of obesity" },
    { chief: "Seasonal flu symptoms", symptoms: ["myalgia", "fever 100.8F", "cough", "malaise"], history: "Did not receive flu vaccine this season" },
    { chief: "Post-surgical follow-up", symptoms: ["incision healing well", "mild discomfort", "no signs of infection"], history: "Laparoscopic cholecystectomy 2 weeks ago" },
  ];

  const insuranceProviders = ["Aetna", "BlueCross", "UnitedHealth", "Cigna", "Humana", "Medicare", "Kaiser"];

  const statusDistribution: TelemedConsultation["status"][] = [
    "pending","pending","pending","pending","pending","pending","pending","pending","pending","pending","pending","pending",
    "accepted","accepted","accepted","accepted","accepted",
    "in-progress","in-progress","in-progress",
    "completed","completed","completed","completed","completed","completed","completed","completed",
    "cancelled","cancelled",
  ];

  const urgencyDistribution: TelemedConsultation["urgency"][] = [
    "medium","medium","medium","medium","medium","medium","medium","medium","medium","medium","medium","medium",
    "low","low","low","low","low","low","low","low",
    "high","high","high","high","high","high","high",
    "urgent","urgent","urgent",
  ];

  const diagnosisTemplates = [
    "Acute condition managed with pharmacologic intervention. Patient counseled on lifestyle modifications.",
    "Chronic condition stable on current therapy. Medication adjustment recommended.",
    "New diagnosis established. Treatment plan initiated with follow-up in 2 weeks.",
    "Exacerbation of known condition. Short-term therapy prescribed with monitoring plan.",
    "Benign condition identified. Reassurance provided with symptomatic treatment.",
    "Multifactorial presentation. Addressed primary concern with referral for secondary issues.",
    "Stable chronic disease management. Labs ordered for next visit.",
    "Acute self-limited illness. Supportive care recommended.",
  ];

  const prescriptionOptions = [
    ["Amoxicillin 500mg TID x 10 days"],
    ["Ibuprofen 400mg TID PRN", "Cyclobenzaprine 10mg QHS"],
    ["Metformin 500mg BID", "Glipizide 5mg daily"],
    ["Amlodipine 10mg daily", "Hydrochlorothiazide 25mg daily"],
    ["Fluoxetine 20mg daily"],
    ["Montelukast 10mg daily", "Fluticasone nasal spray BID"],
    ["Omeprazole 20mg daily", "Sucralfate 1g QID"],
    ["Gabapentin 300mg TID", "Acetaminophen 500mg Q6H PRN"],
    ["Prednisone taper 40-30-20-10mg", "Cetirizine 10mg daily"],
    ["Levothyroxine 88mcg daily"],
    ["Lisinopril 20mg daily"],
    ["Atorvastatin 40mg QHS"],
  ];

  const noteTemplates = [
    "Patient presented with chief complaint as described. Physical exam findings consistent with clinical history. Discussed treatment options and patient agreed to plan. Follow-up scheduled.",
    "Telehealth visit conducted successfully. Patient reports symptoms as documented. Assessment and plan discussed in detail. Patient verbalized understanding of treatment plan.",
    "Video consultation completed. Reviewed labs and imaging from prior visit. Adjusted medications as noted. Patient to return in 4 weeks for reassessment.",
    "Remote consultation for ongoing management. Symptoms improved since last visit. Continuing current regimen with minor adjustments. Lifestyle counseling provided.",
    "Initial telehealth evaluation. Comprehensive history obtained. Working diagnosis established. Treatment initiated with close follow-up planned.",
  ];

  for (let i = 0; i < 30; i++) {
    const complaint = complaints[i];
    const status = statusDistribution[i];
    const urgency = pick(urgencyDistribution);
    const patientFn = pick(firstNames);
    const patientLn = pick(lastNames);
    const age = randInt(18, 82);
    const gender = rand() > 0.5 ? "Male" : "Female";
    const hoursOffset = randInt(-72, 96);
    const scheduledAt = new Date(now + hoursOffset * 3600000).toISOString();
    const createdAt = new Date(now - randInt(1, 120) * 3600000).toISOString();
    const earnings = randInt(75, 250);
    const hasVitals = rand() > 0.4;

    const isCompleted = status === "completed";
    const isAccepted = status === "accepted" || status === "in-progress" || isCompleted;

    consultations.push({
      id: `tm${i + 1}`,
      patientName: `${patientFn} ${patientLn}`,
      patientAge: age,
      patientGender: gender,
      chiefComplaint: complaint.chief,
      symptoms: complaint.symptoms,
      urgency,
      status,
      scheduledAt,
      createdAt,
      duration: isCompleted ? randInt(10, 45) : 0,
      earnings,
      doctorId: isAccepted ? "u1" : null,
      notes: isCompleted ? pick(noteTemplates) : "",
      diagnosis: isCompleted ? pick(diagnosisTemplates) : "",
      prescriptions: isCompleted ? pick(prescriptionOptions) : [],
      vitals: hasVitals ? {
        bp: `${randInt(110, 160)}/${randInt(65, 95)}`,
        heartRate: randInt(58, 105),
        temp: `${(97 + rand() * 3).toFixed(1)}F`,
        spo2: randInt(94, 100),
        weight: `${randInt(120, 240)} lbs`,
      } : {},
      insuranceProvider: pick(insuranceProviders),
      paymentStatus: isCompleted ? (rand() > 0.3 ? "paid" : "processing") : "pending",
      followUp: isCompleted ? rand() > 0.4 : false,
      patientHistory: complaint.history,
      attachments: [],
    });
  }
  return consultations;
}

export function seedAllData() {
  const doctors = generateDoctors(200);
  doctors[0] = {
    ...doctors[0],
    id: "u1",
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
    bio: "Board-certified Infectious Disease specialist in Kentfield, CA with 21 years of clinical experience. Graduate of Ross University School of Medicine. Expertise in HIV/AIDS, antimicrobial stewardship, and travel medicine. Also fluent in Khmer.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ChetChea&mouth[]=smile&eyes[]=happy&eyebrows[]=defaultNatural&top[]=shortHairShortFlat&clothing[]=blazerAndShirt&skinColor[]=d08b5b&backgroundColor=b6e3f4",
    credential: "MD",
  };

  const news = generateNews(80, doctors);
  const newsComments = generateNewsComments(news, doctors);
  const triagePosts = generateTriagePosts(60, doctors);
  const comments = generateComments(triagePosts, doctors);
  const groups = generateGroups(40, doctors);
  const events = generateEvents(30, doctors);
  const { threads: chatThreads, messages: chatMessages } = generateChats(doctors);
  const training = generateTraining();
  const { history: aribotHistory, folders: aribotFolders } = generateAribotData();
  const teams = generateTeams(doctors);
  const telemedConsultations = generateTelemedConsultations();

  return {
    doctors,
    news,
    newsComments,
    triagePosts,
    comments,
    groups,
    events,
    chatThreads,
    chatMessages,
    training,
    aribotHistory,
    aribotFolders,
    teams,
    flaggedItems: [] as FlaggedItem[],
    telemedConsultations,
  };
}
