import OpenAI from "openai";
import { emrStorage } from "./emr-storage";
import type { Patient, Problem, Medication, Allergy, Vital, Encounter, Order } from "@shared/schema";

// Ari — the ARI EMR platform's clinical AI assistant.
// Powers note drafting (narrative → SOAP), text restructuring, differential
// diagnosis suggestions, and chart-aware Q&A. Falls back to deterministic,
// chart-data-driven output when no OpenAI API key is configured.

export interface SoapDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface ChartContext {
  patient: Patient;
  problems: Problem[];
  medications: Medication[];
  allergies: Allergy[];
  vitals: Vital[];
  encounters: Encounter[];
  orders: Order[];
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const ariAvailable = !!openai;

async function buildChartContext(patientId: string): Promise<ChartContext | null> {
  const patient = await emrStorage.getPatient(patientId);
  if (!patient) return null;
  const [problems, medications, allergies, vitals, encounters, orders] = await Promise.all([
    emrStorage.getProblemsByPatient(patientId),
    emrStorage.getMedicationsByPatient(patientId),
    emrStorage.getAllergiesByPatient(patientId),
    emrStorage.getVitalsByPatient(patientId),
    emrStorage.getEncountersByPatient(patientId),
    emrStorage.getOrdersByPatient(patientId),
  ]);
  return { patient, problems, medications, allergies, vitals, encounters, orders };
}

function fmtVital(v: Vital | undefined): string {
  if (!v) return "No vitals recorded.";
  const parts: string[] = [];
  if (v.systolic && v.diastolic) parts.push(`BP ${v.systolic}/${v.diastolic}`);
  if (v.heartRate) parts.push(`HR ${v.heartRate}`);
  if (v.temperature) parts.push(`Temp ${v.temperature}°F`);
  if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}`);
  if (v.oxygenSaturation) parts.push(`SpO2 ${v.oxygenSaturation}%`);
  if (v.bmi) parts.push(`BMI ${v.bmi}`);
  if (v.pain != null) parts.push(`Pain ${v.pain}/10`);
  return parts.join(", ") || "No vitals recorded.";
}

function chartContextText(ctx: ChartContext): string {
  const activeProblems = ctx.problems.filter((p) => p.status !== "resolved");
  const activeMeds = ctx.medications.filter((m) => m.status === "active");
  const recentEnc = ctx.encounters.slice(0, 5);
  const recentResults = ctx.orders.filter((o) => o.status === "resulted").slice(0, 8);
  return [
    `PATIENT: ${ctx.patient.name}, ${ctx.patient.age}y ${ctx.patient.gender}, MRN ${ctx.patient.patientId}`,
    `ACTIVE PROBLEMS: ${activeProblems.map((p) => `${p.name}${p.icd10Code ? ` (${p.icd10Code})` : ""} [${p.status}]`).join("; ") || "none"}`,
    `MEDICATIONS: ${activeMeds.map((m) => `${m.name} ${m.dosage} ${m.frequency}`).join("; ") || "none"}`,
    `ALLERGIES: ${ctx.allergies.map((a) => `${a.allergen} (${a.severity}${a.reaction ? `, ${a.reaction}` : ""})`).join("; ") || "NKDA"}`,
    `LATEST VITALS: ${fmtVital(ctx.vitals[0])}`,
    `RECENT ENCOUNTERS: ${recentEnc.map((e) => `${new Date(e.encounterDate).toISOString().slice(0, 10)} ${e.encounterType}: ${e.reason} (${e.provider}, ${e.status})`).join("; ") || "none"}`,
    `RECENT RESULTS: ${recentResults.map((o) => `${o.name}: ${o.resultSummary ?? "resulted"}`).join("; ") || "none"}`,
  ].join("\n");
}

const ARI_SYSTEM = `You are Ari, the clinical AI assistant inside the ARI EMR platform.
You help clinicians with encounter documentation, differential diagnosis, and patient-chart questions.
Be concise, professional, and evidence-based. Use standard clinical documentation style.
Never invent data that is not present in the provided chart context; clearly mark uncertainties.
You are a decision-support tool: always defer final clinical judgment to the treating clinician.`;

async function chatJSON<T>(prompt: string, fallback: () => T): Promise<{ result: T; ai: boolean }> {
  if (!openai) return { result: fallback(), ai: false };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ARI_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1400,
    });
    const raw = completion.choices[0].message.content ?? "{}";
    return { result: JSON.parse(raw) as T, ai: true };
  } catch (err) {
    console.error("Ari AI error:", err instanceof Error ? err.message : err);
    return { result: fallback(), ai: false };
  }
}

async function chatText(prompt: string, fallback: () => string): Promise<{ result: string; ai: boolean }> {
  if (!openai) return { result: fallback(), ai: false };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ARI_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });
    return { result: completion.choices[0].message.content ?? fallback(), ai: true };
  } catch (err) {
    console.error("Ari AI error:", err instanceof Error ? err.message : err);
    return { result: fallback(), ai: false };
  }
}

// ---------- Note drafting ----------

export async function draftNoteFromEncounter(encounterId: string): Promise<{ draft: SoapDraft; title: string; ai: boolean } | null> {
  const encounters = await emrStorage.getEncounters();
  const encounter = encounters.find((e) => e.id === encounterId);
  if (!encounter) return null;
  const ctx = await buildChartContext(encounter.patientId);
  if (!ctx) return null;

  const contextText = chartContextText(ctx);
  const fallback = (): SoapDraft => {
    const activeProblems = ctx.problems.filter((p) => p.status !== "resolved");
    const activeMeds = ctx.medications.filter((m) => m.status === "active");
    return {
      subjective: `${ctx.patient.name} presents for ${encounter.reason.toLowerCase()}. ` +
        (activeProblems.length ? `Known history of ${activeProblems.map((p) => p.name).join(", ")}. ` : "") +
        `Reviewed current symptoms with the patient.`,
      objective: `Vitals: ${fmtVital(ctx.vitals[0])}\n` +
        `Current medications: ${activeMeds.map((m) => `${m.name} ${m.dosage} ${m.frequency}`).join("; ") || "none"}.\n` +
        `Allergies: ${ctx.allergies.map((a) => a.allergen).join(", ") || "NKDA"}.`,
      assessment: activeProblems.length
        ? activeProblems.map((p, i) => `${i + 1}. ${p.name}${p.icd10Code ? ` (${p.icd10Code})` : ""} — ${p.status}`).join("\n")
        : `Assessment pending clinician review for: ${encounter.reason}.`,
      plan: `1. Continue current medication regimen.\n2. Follow up as scheduled.\n3. Patient education provided regarding ${encounter.reason.toLowerCase()}.`,
    };
  };

  const prompt = `Draft a SOAP note for this encounter.
ENCOUNTER: ${encounter.encounterType}, reason: "${encounter.reason}", provider: ${encounter.provider}, date: ${new Date(encounter.encounterDate).toISOString().slice(0, 10)}.
CHART CONTEXT:
${contextText}

Respond as JSON: {"subjective": string, "objective": string, "assessment": string, "plan": string}. Base the note strictly on the chart context; note explicitly where clinician input is needed.`;

  const { result, ai } = await chatJSON<SoapDraft>(prompt, fallback);
  return { draft: result, title: `${encounter.encounterType} — ${encounter.reason}`, ai };
}

export async function structureNarrative(narrative: string, patientId?: string): Promise<{ draft: SoapDraft; ai: boolean }> {
  let contextText = "";
  if (patientId) {
    const ctx = await buildChartContext(patientId);
    if (ctx) contextText = `\nCHART CONTEXT:\n${chartContextText(ctx)}`;
  }
  const fallback = (): SoapDraft => ({
    subjective: narrative.trim(),
    objective: "See narrative above. Objective findings to be entered by clinician.",
    assessment: "Assessment pending clinician review.",
    plan: "Plan pending clinician review.",
  });
  const prompt = `Restructure this rough clinical narrative (ambient dictation) into a clean SOAP note. Keep every clinical fact from the narrative; do not add facts that are not stated or in the chart context.
NARRATIVE:
"""${narrative}"""${contextText}

Respond as JSON: {"subjective": string, "objective": string, "assessment": string, "plan": string}.`;
  const { result, ai } = await chatJSON<SoapDraft>(prompt, fallback);
  return { draft: result, ai };
}

export async function transformNoteText(text: string, mode: "summarize" | "expand" | "restructure"): Promise<{ result: string; ai: boolean }> {
  const instructions = {
    summarize: "Summarize this clinical text into a tight, information-dense version suitable for a chart note. Keep all clinically significant facts.",
    expand: "Expand this terse clinical text into complete, professional documentation sentences. Do not invent new clinical facts.",
    restructure: "Restructure this clinical text into clearly organized documentation with logical ordering. Keep every fact.",
  } as const;
  return chatText(
    `${instructions[mode]}\n\nTEXT:\n"""${text}"""`,
    () => text,
  );
}

// ---------- Diagnostics ----------

export interface DifferentialItem {
  diagnosis: string;
  likelihood: "high" | "moderate" | "low";
  rationale: string;
  workup: string;
}

export async function differentialDiagnosis(patientId: string, presentation: string): Promise<{ differentials: DifferentialItem[]; disclaimer: string; ai: boolean } | null> {
  const ctx = await buildChartContext(patientId);
  if (!ctx) return null;
  const fallback = () => ({
    differentials: ctx.problems.filter((p) => p.status !== "resolved").slice(0, 3).map((p) => ({
      diagnosis: `Exacerbation or progression of ${p.name}`,
      likelihood: "moderate" as const,
      rationale: `Existing ${p.status} problem on the patient's chart${p.icd10Code ? ` (${p.icd10Code})` : ""}.`,
      workup: "Correlate clinically; consider targeted labs/imaging per presentation.",
    })),
  });
  const prompt = `Given this presentation, provide a differential diagnosis list (3-6 items).
PRESENTATION: """${presentation}"""
CHART CONTEXT:
${chartContextText(ctx)}

Respond as JSON: {"differentials": [{"diagnosis": string, "likelihood": "high"|"moderate"|"low", "rationale": string, "workup": string}]}. Order by likelihood.`;
  const { result, ai } = await chatJSON<{ differentials: DifferentialItem[] }>(prompt, fallback);
  return {
    differentials: result.differentials ?? [],
    disclaimer: "Decision support only — not a diagnosis. Final judgment rests with the treating clinician.",
    ai,
  };
}

export interface CodeSuggestion {
  cptCodes: { code: string; description: string; rationale: string }[];
  icd10Codes: { code: string; description: string; rationale: string }[];
}

export async function suggestBillingCodes(encounterId: string): Promise<{ suggestion: CodeSuggestion; ai: boolean } | null> {
  const { CPT_LIBRARY, CPT_MAP } = await import("@shared/billing-codes");
  const encounters = await emrStorage.getEncounters();
  const encounter = encounters.find((e) => e.id === encounterId);
  if (!encounter) return null;
  const ctx = await buildChartContext(encounter.patientId);
  if (!ctx) return null;
  const notes = await emrStorage.getNotesByEncounter(encounterId);
  const noteText = notes.map((n) =>
    [n.title, n.subjective, n.objective, n.assessment, n.plan, n.content].filter(Boolean).join("\n"),
  ).join("\n---\n") || "(no note on file for this encounter)";

  const fallback = (): CodeSuggestion => {
    const emByType: Record<string, string> = {
      "office-visit": "99213", "follow-up": "99213", telehealth: "99443", emergency: "99284", inpatient: "99214",
    };
    const em = CPT_MAP.get(emByType[encounter.encounterType] ?? "99213")!;
    return {
      cptCodes: [{ code: em.code, description: em.description, rationale: `Default E/M code for a ${encounter.encounterType} encounter.` }],
      icd10Codes: ctx.problems.filter((p) => p.status !== "resolved" && p.icd10Code).slice(0, 4).map((p) => ({
        code: p.icd10Code!, description: p.name, rationale: "Active problem on the patient's chart.",
      })),
    };
  };

  const prompt = `Suggest billing codes for this encounter. Choose CPT codes ONLY from the allowed library below (1-4 codes) and ICD-10 diagnoses supported by the documentation (1-4 codes).
ENCOUNTER: ${encounter.encounterType} on ${new Date(encounter.encounterDate).toISOString().slice(0, 10)} — reason: ${encounter.reason} (${encounter.provider})
ENCOUNTER NOTES:
"""${noteText}"""
CHART CONTEXT:
${chartContextText(ctx)}
ALLOWED CPT LIBRARY:
${CPT_LIBRARY.map((c) => `${c.code} — ${c.description}`).join("\n")}

Respond as JSON: {"cptCodes":[{"code":string,"description":string,"rationale":string}],"icd10Codes":[{"code":string,"description":string,"rationale":string}]}`;
  const { result, ai } = await chatJSON<CodeSuggestion>(prompt, fallback);
  // Guard: keep only CPT codes that exist in the library
  const cptCodes = (result.cptCodes ?? []).filter((c) => CPT_MAP.has(c.code));
  return { suggestion: { cptCodes: cptCodes.length ? cptCodes : fallback().cptCodes, icd10Codes: result.icd10Codes ?? [] }, ai };
}

export async function analyticsQA(question: string): Promise<{ answer: string; ai: boolean }> {
  const { analyticsStorage } = await import("./analytics-storage");
  const snapshot = await analyticsStorage.getSnapshotText();
  const fallback = () =>
    `Here is the current organization-wide analytics snapshot:\n\n${snapshot}\n\n(Ari's full reasoning requires an OpenAI API key — showing raw analytics summary instead.)`;
  const { result, ai } = await chatText(
    `You are answering an operational/population-health analytics question for practice leadership.
Answer using ONLY the organization analytics snapshot below. Quote concrete numbers. If the snapshot doesn't contain the answer, say what data would be needed.
QUESTION: """${question}"""
ORGANIZATION ANALYTICS SNAPSHOT:
${snapshot}`,
    fallback,
  );
  return { answer: result, ai };
}

export async function chartQA(patientId: string, question: string): Promise<{ answer: string; ai: boolean } | null> {
  const ctx = await buildChartContext(patientId);
  if (!ctx) return null;
  const fallback = () =>
    `Here is what's on ${ctx.patient.name}'s chart:\n\n${chartContextText(ctx)}\n\n(Ari's full reasoning requires an OpenAI API key — showing raw chart summary instead.)`;
  const { result, ai } = await chatText(
    `Answer the clinician's question using ONLY the chart context below. If the chart doesn't contain the answer, say so.
QUESTION: """${question}"""
CHART CONTEXT:
${chartContextText(ctx)}`,
    fallback,
  );
  return { answer: result, ai };
}
