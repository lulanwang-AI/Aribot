import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  patients, encounters, problems, medications, allergies, vitals, orders, appointments,
} from "@shared/schema";
import { format, addDays, subDays, subHours } from "date-fns";
import { demoSeedAllowed, demoSeedSkipReason } from "./seed-policy";

const today = new Date();
const d = (offset: number) => format(addDays(today, offset), "yyyy-MM-dd");

const PATIENTS = [
  { id: "p1", name: "John Doe", patientId: "MRN-100001", age: 47, dateOfBirth: "1979-01-15", gender: "Male", status: "active" },
  { id: "p2", name: "Sarah Johnson", patientId: "MRN-100002", age: 41, dateOfBirth: "1985-06-22", gender: "Female", status: "active" },
  { id: "p3", name: "Michael Chen", patientId: "MRN-100003", age: 54, dateOfBirth: "1972-03-10", gender: "Male", status: "critical" },
  { id: "p4", name: "Emma Rodriguez", patientId: "MRN-100004", age: 43, dateOfBirth: "1982-09-05", gender: "Female", status: "active" },
  { id: "p5", name: "Robert Martinez", patientId: "MRN-100005", age: 59, dateOfBirth: "1967-02-14", gender: "Male", status: "critical" },
  { id: "p6", name: "Linda Thompson", patientId: "MRN-100006", age: 45, dateOfBirth: "1980-08-30", gender: "Female", status: "active" },
  { id: "p7", name: "David Wilson", patientId: "MRN-100007", age: 64, dateOfBirth: "1961-11-20", gender: "Male", status: "critical" },
  { id: "p8", name: "Patricia Brown", patientId: "MRN-100008", age: 53, dateOfBirth: "1973-05-15", gender: "Female", status: "active" },
  { id: "p9", name: "James Anderson", patientId: "MRN-100009", age: 38, dateOfBirth: "1987-12-03", gender: "Male", status: "active" },
  { id: "p10", name: "Jennifer Garcia", patientId: "MRN-100010", age: 50, dateOfBirth: "1975-07-28", gender: "Female", status: "critical" },
  { id: "p11", name: "William Taylor", patientId: "MRN-100011", age: 68, dateOfBirth: "1958-04-10", gender: "Male", status: "active" },
  { id: "p12", name: "Susan Moore", patientId: "MRN-100012", age: 43, dateOfBirth: "1982-10-18", gender: "Female", status: "active" },
  { id: "p13", name: "Richard Jackson", patientId: "MRN-100013", age: 57, dateOfBirth: "1969-06-25", gender: "Male", status: "critical" },
  { id: "p14", name: "Maria Davis", patientId: "MRN-100014", age: 40, dateOfBirth: "1986-01-12", gender: "Female", status: "active" },
  { id: "p15", name: "Charles Miller", patientId: "MRN-100015", age: 62, dateOfBirth: "1963-09-05", gender: "Male", status: "active" },
  { id: "p16", name: "Barbara White", patientId: "MRN-100016", age: 49, dateOfBirth: "1977-03-22", gender: "Female", status: "active" },
  { id: "p17", name: "Thomas Harris", patientId: "MRN-100017", age: 56, dateOfBirth: "1970-07-14", gender: "Male", status: "active" },
  { id: "p18", name: "Nancy Clark", patientId: "MRN-100018", age: 48, dateOfBirth: "1978-02-08", gender: "Female", status: "critical" },
  { id: "p19", name: "Christopher Lee", patientId: "MRN-100019", age: 47, dateOfBirth: "1978-10-30", gender: "Male", status: "active" },
  { id: "p20", name: "Michelle Anderson", patientId: "MRN-100020", age: 33, dateOfBirth: "1993-06-19", gender: "Female", status: "critical" },
];

export async function seedEmrData() {
  if (!demoSeedAllowed()) {
    console.log(demoSeedSkipReason());
    return;
  }

  // Non-destructive, per-table idempotence: each empty table is backfilled;
  // tables that already contain data are left completely untouched.
  const isEmpty = async (t: any) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(t))[0].n) === 0;
  const [seedProblems, seedMeds, seedAllergies, seedEncounters, seedOrders, seedAppointments] =
    await Promise.all([
      isEmpty(problems), isEmpty(medications), isEmpty(allergies),
      isEmpty(encounters), isEmpty(orders), isEmpty(appointments),
    ]);
  if (![seedProblems, seedMeds, seedAllergies, seedEncounters, seedOrders, seedAppointments].some(Boolean)) {
    console.log("[seed] EMR data already present, skipping");
    return;
  }
  console.log("[seed] Backfilling empty EMR tables...");

  // Patients: insert-if-missing only (never overwrites existing rows)
  for (const p of PATIENTS) {
    await db.insert(patients).values(p).onConflictDoNothing();
  }

  const providers = ["Dr. Sarah Johnson", "Dr. Michael Reyes", "Dr. Lisa Wang", "Dr. James Osei", "Dr. Priya Nair"];
  const departments = ["Internal Medicine", "Cardiology", "Oncology", "Family Medicine", "Pulmonology"];

  const problemBank: Record<string, { name: string; icd10: string; status: string; severity: string }[]> = {
    p1: [{ name: "Type 2 diabetes mellitus", icd10: "E11.9", status: "chronic", severity: "moderate" }, { name: "Hypertension", icd10: "I10", status: "chronic", severity: "mild" }],
    p2: [{ name: "Community-acquired pneumonia", icd10: "J18.9", status: "active", severity: "moderate" }],
    p3: [{ name: "Abdominal aortic aneurysm", icd10: "I71.4", status: "active", severity: "severe" }, { name: "Hyperlipidemia", icd10: "E78.5", status: "chronic", severity: "mild" }],
    p5: [{ name: "Lung adenocarcinoma", icd10: "C34.31", status: "active", severity: "severe" }, { name: "COPD", icd10: "J44.9", status: "chronic", severity: "moderate" }],
    p7: [{ name: "Pancreatic mass", icd10: "C25.0", status: "active", severity: "severe" }],
    p8: [{ name: "Pulmonary embolism", icd10: "I26.99", status: "active", severity: "severe" }, { name: "Atrial fibrillation", icd10: "I48.91", status: "chronic", severity: "moderate" }],
    p10: [{ name: "Ovarian carcinoma", icd10: "C56.9", status: "active", severity: "severe" }],
    p11: [{ name: "Acute appendicitis", icd10: "K35.80", status: "resolved", severity: "severe" }],
    p12: [{ name: "Chronic sinusitis", icd10: "J32.9", status: "chronic", severity: "mild" }, { name: "Seasonal allergies", icd10: "J30.2", status: "chronic", severity: "mild" }],
    p13: [{ name: "Hepatocellular carcinoma", icd10: "C22.0", status: "active", severity: "severe" }, { name: "Cirrhosis of liver", icd10: "K74.60", status: "chronic", severity: "severe" }],
    p14: [{ name: "Nephrolithiasis", icd10: "N20.0", status: "active", severity: "moderate" }],
    p15: [{ name: "Colorectal cancer", icd10: "C18.9", status: "active", severity: "severe" }],
    p17: [{ name: "Bacterial pneumonia", icd10: "J15.9", status: "active", severity: "moderate" }, { name: "Asthma", icd10: "J45.909", status: "chronic", severity: "mild" }],
    p18: [{ name: "Metastatic breast cancer", icd10: "C50.912", status: "active", severity: "severe" }],
    p20: [{ name: "Acute ischemic stroke", icd10: "I63.9", status: "active", severity: "severe" }, { name: "Hypertension", icd10: "I10", status: "chronic", severity: "moderate" }],
  };

  if (seedProblems) for (const [pid, list] of Object.entries(problemBank)) {
    for (const pr of list) {
      await db.insert(problems).values({
        patientId: pid, name: pr.name, icd10Code: pr.icd10, status: pr.status, severity: pr.severity,
        onsetDate: format(subDays(today, 90 + Math.floor(Math.random() * 400)), "yyyy-MM-dd"),
      });
    }
  }

  const medBank: Record<string, { name: string; dosage: string; frequency: string }[]> = {
    p1: [{ name: "Metformin", dosage: "1000 mg", frequency: "Twice daily" }, { name: "Lisinopril", dosage: "10 mg", frequency: "Once daily" }],
    p2: [{ name: "Azithromycin", dosage: "500 mg", frequency: "Once daily x5 days" }],
    p3: [{ name: "Atorvastatin", dosage: "40 mg", frequency: "Nightly" }, { name: "Metoprolol", dosage: "50 mg", frequency: "Twice daily" }],
    p5: [{ name: "Carboplatin", dosage: "AUC 5 IV", frequency: "Every 21 days" }, { name: "Tiotropium", dosage: "18 mcg inhaled", frequency: "Once daily" }],
    p8: [{ name: "Apixaban", dosage: "5 mg", frequency: "Twice daily" }, { name: "Diltiazem", dosage: "120 mg", frequency: "Once daily" }],
    p12: [{ name: "Fluticasone nasal spray", dosage: "50 mcg/spray", frequency: "2 sprays each nostril daily" }],
    p13: [{ name: "Sorafenib", dosage: "400 mg", frequency: "Twice daily" }, { name: "Spironolactone", dosage: "100 mg", frequency: "Once daily" }],
    p17: [{ name: "Levofloxacin", dosage: "750 mg", frequency: "Once daily x7 days" }, { name: "Albuterol inhaler", dosage: "90 mcg", frequency: "As needed" }],
    p18: [{ name: "Letrozole", dosage: "2.5 mg", frequency: "Once daily" }, { name: "Palbociclib", dosage: "125 mg", frequency: "Daily x21, 7 off" }],
    p20: [{ name: "Aspirin", dosage: "81 mg", frequency: "Once daily" }, { name: "Atorvastatin", dosage: "80 mg", frequency: "Nightly" }],
  };
  if (seedMeds) for (const [pid, list] of Object.entries(medBank)) {
    for (const m of list) {
      await db.insert(medications).values({
        patientId: pid, name: m.name, dosage: m.dosage, frequency: m.frequency, route: "oral",
        status: "active", prescribedBy: providers[Math.floor(Math.random() * providers.length)],
        startDate: format(subDays(today, 30 + Math.floor(Math.random() * 200)), "yyyy-MM-dd"),
      });
    }
  }

  const allergyBank: Record<string, { allergen: string; type: string; reaction: string; severity: string }[]> = {
    p1: [{ allergen: "Penicillin", type: "drug", reaction: "Hives", severity: "moderate" }],
    p3: [{ allergen: "Iodinated contrast", type: "drug", reaction: "Anaphylaxis", severity: "life-threatening" }],
    p5: [{ allergen: "Sulfa drugs", type: "drug", reaction: "Rash", severity: "mild" }],
    p8: [{ allergen: "Shellfish", type: "food", reaction: "Angioedema", severity: "severe" }],
    p12: [{ allergen: "Pollen", type: "environmental", reaction: "Rhinitis", severity: "mild" }],
    p18: [{ allergen: "Latex", type: "environmental", reaction: "Contact dermatitis", severity: "moderate" }],
  };
  if (seedAllergies) for (const [pid, list] of Object.entries(allergyBank)) {
    for (const a of list) {
      await db.insert(allergies).values({
        patientId: pid, allergen: a.allergen, allergyType: a.type, reaction: a.reaction, severity: a.severity,
        notedDate: format(subDays(today, 400), "yyyy-MM-dd"),
      });
    }
  }

  // Encounters + vitals + orders
  const encounterTypes = ["office-visit", "follow-up", "telehealth", "emergency"];
  const reasons = ["Annual physical", "Medication follow-up", "New symptom evaluation", "Chronic disease management", "Post-hospital follow-up", "Lab result review"];
  if (seedEncounters) for (const p of PATIENTS) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const encDate = subDays(today, i === 0 ? Math.floor(Math.random() * 3) : 20 + i * 45 + Math.floor(Math.random() * 20));
      const open = i === 0 && Math.random() < 0.4;
      const [enc] = await db.insert(encounters).values({
        patientId: p.id,
        encounterType: encounterTypes[Math.floor(Math.random() * encounterTypes.length)],
        status: open ? "open" : "closed",
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        provider: providers[Math.floor(Math.random() * providers.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        encounterDate: encDate,
      }).returning();

      await db.insert(vitals).values({
        patientId: p.id, encounterId: enc.id, recordedAt: encDate,
        heartRate: 60 + Math.floor(Math.random() * 45),
        systolic: 105 + Math.floor(Math.random() * 45),
        diastolic: 65 + Math.floor(Math.random() * 25),
        temperature: (97.5 + Math.random() * 2.4).toFixed(1),
        respiratoryRate: 12 + Math.floor(Math.random() * 8),
        oxygenSaturation: 93 + Math.floor(Math.random() * 7),
        weight: (130 + Math.random() * 110).toFixed(1),
        height: (60 + Math.random() * 15).toFixed(0),
        bmi: (21 + Math.random() * 12).toFixed(1),
        pain: Math.floor(Math.random() * 6),
      });
    }
  }

  const orderBank = [
    { type: "lab", name: "Comprehensive Metabolic Panel" },
    { type: "lab", name: "CBC with Differential" },
    { type: "lab", name: "Hemoglobin A1c" },
    { type: "lab", name: "Lipid Panel" },
    { type: "imaging", name: "CT Chest with Contrast" },
    { type: "imaging", name: "Chest X-Ray PA/Lateral" },
    { type: "imaging", name: "MRI Brain without Contrast" },
    { type: "procedure", name: "Echocardiogram" },
    { type: "referral", name: "Cardiology Referral" },
    { type: "referral", name: "Oncology Referral" },
  ];
  const statuses = ["pending", "in-progress", "resulted", "completed"];
  if (seedOrders) for (const p of PATIENTS) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const o = orderBank[Math.floor(Math.random() * orderBank.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await db.insert(orders).values({
        patientId: p.id, orderType: o.type, name: o.name, status,
        priority: Math.random() < 0.15 ? "stat" : Math.random() < 0.3 ? "urgent" : "routine",
        orderedBy: providers[Math.floor(Math.random() * providers.length)],
        orderedAt: subHours(today, Math.floor(Math.random() * 96)),
        resultSummary: status === "resulted" ? "Results available for review" : null,
        resultedAt: status === "resulted" ? subHours(today, Math.floor(Math.random() * 24)) : null,
      });
    }
  }

  // Appointments: today through +7 days, plus a few past
  const visitReasons = ["Annual wellness visit", "Follow-up: hypertension", "New patient consult", "Lab review", "Post-op check", "Medication adjustment", "Chest pain evaluation", "Imaging follow-up"];
  const times = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  let t = 0;
  if (seedAppointments) for (let day = -3; day <= 7; day++) {
    const count = day === 0 ? 9 : 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = PATIENTS[(t++) % PATIENTS.length];
      const past = day < 0;
      const status = past
        ? (Math.random() < 0.85 ? "completed" : "no-show")
        : day === 0
          ? ["checked-in", "scheduled", "confirmed", "in-progress", "completed"][Math.floor(Math.random() * 5)]
          : Math.random() < 0.5 ? "confirmed" : "scheduled";
      await db.insert(appointments).values({
        patientId: p.id,
        provider: providers[t % providers.length],
        department: departments[t % departments.length],
        appointmentDate: d(day),
        appointmentTime: times[i % times.length],
        duration: [15, 20, 30, 45][Math.floor(Math.random() * 4)],
        visitType: Math.random() < 0.2 ? "video" : Math.random() < 0.1 ? "phone" : "in-person",
        status,
        reason: visitReasons[Math.floor(Math.random() * visitReasons.length)],
        location: `Suite ${100 + (t % 8)}, Main Campus`,
      });
    }
  }

  console.log("[seed] EMR seed complete");
}
