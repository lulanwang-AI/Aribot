import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  patientId: text("patient_id").notNull().unique(),
  age: integer("age").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const imagingStudies = pgTable("imaging_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  studyType: text("study_type").notNull(),
  studyDate: text("study_date").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  imageUrl: text("image_url"),
  sliceCount: integer("slice_count").default(120),
  currentSlice: integer("current_slice").default(60),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiAnalyses = pgTable("ai_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studyId: varchar("study_id").notNull().references(() => imagingStudies.id),
  moduleName: text("module_name").notNull(),
  status: text("status").notNull().default("pending"),
  confidence: integer("confidence"),
  findings: jsonb("findings"),
  processingTime: text("processing_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studyId: varchar("study_id").notNull().references(() => imagingStudies.id),
  clinicalInfo: text("clinical_info"),
  findings: text("findings"),
  impression: text("impression"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const annotations = pgTable("annotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studyId: varchar("study_id").notNull().references(() => imagingStudies.id),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  text: text("text"),
  type: text("type").notNull().default("point"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const measurements = pgTable("measurements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studyId: varchar("study_id").notNull().references(() => imagingStudies.id),
  x1: integer("x1").notNull(),
  y1: integer("y1").notNull(),
  x2: integer("x2").notNull(),
  y2: integer("y2").notNull(),
  length: text("length").notNull(), // stored as "35.1 mm"
  width: text("width"), // optional for diameter measurements
  label: text("label"), // anatomical site
  category: text("category").notNull().default("target"), // "target", "non-target", "new"
  isBaseline: boolean("is_baseline").default(false),
  sliceNumber: integer("slice_number").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timepoints = pgTable("timepoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  studyDate: text("study_date").notNull(),
  description: text("description").notNull(),
  isBaseline: boolean("is_baseline").default(false),
  studyIds: text("study_ids").array(), // array of study IDs for this timepoint
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertImagingStudySchema = createInsertSchema(imagingStudies).omit({
  id: true,
  createdAt: true,
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertAnnotationSchema = createInsertSchema(annotations).omit({
  id: true,
  createdAt: true,
});

export const insertMeasurementSchema = createInsertSchema(measurements).omit({
  id: true,
  createdAt: true,
});

export const insertTimepointSchema = createInsertSchema(timepoints).omit({
  id: true,
  createdAt: true,
});

// Types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type ImagingStudy = typeof imagingStudies.$inferSelect;
export type InsertImagingStudy = z.infer<typeof insertImagingStudySchema>;

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;

export type Measurement = typeof measurements.$inferSelect;
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;

export type Timepoint = typeof timepoints.$inferSelect;
export type InsertTimepoint = z.infer<typeof insertTimepointSchema>;

// ============ EMR Clinical Core ============

export const encounters = pgTable("encounters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  encounterType: text("encounter_type").notNull(), // office-visit, telehealth, emergency, inpatient, follow-up
  status: text("status").notNull().default("open"), // open, closed, in-progress
  reason: text("reason").notNull(),
  provider: text("provider").notNull(),
  department: text("department"),
  encounterDate: timestamp("encounter_date").notNull(),
  dischargeDate: timestamp("discharge_date"),
  disposition: text("disposition"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const problems = pgTable("problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  name: text("name").notNull(),
  icd10Code: text("icd10_code"),
  status: text("status").notNull().default("active"), // active, resolved, chronic
  severity: text("severity"), // mild, moderate, severe
  onsetDate: text("onset_date"),
  resolvedDate: text("resolved_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  route: text("route").notNull().default("oral"),
  frequency: text("frequency").notNull(),
  status: text("status").notNull().default("active"), // active, discontinued, completed
  prescribedBy: text("prescribed_by"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const allergies = pgTable("allergies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  allergen: text("allergen").notNull(),
  allergyType: text("allergy_type").notNull().default("drug"), // drug, food, environmental
  reaction: text("reaction"),
  severity: text("severity").notNull().default("moderate"), // mild, moderate, severe, life-threatening
  notedDate: text("noted_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vitals = pgTable("vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  encounterId: varchar("encounter_id").references(() => encounters.id),
  recordedAt: timestamp("recorded_at").notNull(),
  heartRate: integer("heart_rate"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  temperature: text("temperature"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  weight: text("weight"),
  height: text("height"),
  bmi: text("bmi"),
  pain: integer("pain"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  encounterId: varchar("encounter_id").references(() => encounters.id),
  orderType: text("order_type").notNull(), // lab, imaging, medication, procedure, referral
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, cancelled, resulted
  priority: text("priority").notNull().default("routine"), // stat, urgent, routine
  orderedBy: text("ordered_by").notNull(),
  orderedAt: timestamp("ordered_at").notNull(),
  resultSummary: text("result_summary"),
  resultedAt: timestamp("resulted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  provider: text("provider").notNull(),
  department: text("department").notNull(),
  appointmentDate: text("appointment_date").notNull(), // yyyy-MM-dd
  appointmentTime: text("appointment_time").notNull(), // HH:mm
  duration: integer("duration").notNull().default(30),
  visitType: text("visit_type").notNull().default("in-person"), // in-person, video, phone
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, checked-in, in-progress, completed, cancelled, no-show
  reason: text("reason").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clinicalNotes = pgTable("clinical_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  encounterId: varchar("encounter_id").references(() => encounters.id),
  noteType: text("note_type").notNull().default("progress"), // soap, progress, consult
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, signed
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  content: text("content"), // freeform body for progress/consult notes
  author: text("author").notNull(),
  aiAssisted: boolean("ai_assisted").default(false),
  signedBy: text("signed_by"),
  signedAt: timestamp("signed_at"),
  addendums: jsonb("addendums").$type<Array<{ text: string; author: string; createdAt: string }>>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// status is server-controlled: notes are always created as drafts and only
// transition to "signed" through the dedicated sign endpoint.
export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  signedBy: true,
  signedAt: true,
  addendums: true,
});
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;

export const insertEncounterSchema = createInsertSchema(encounters).omit({ id: true, createdAt: true });
export const insertProblemSchema = createInsertSchema(problems).omit({ id: true, createdAt: true });
export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true, createdAt: true });
export const insertAllergySchema = createInsertSchema(allergies).omit({ id: true, createdAt: true });
export const insertVitalSchema = createInsertSchema(vitals).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });

export type Encounter = typeof encounters.$inferSelect;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Allergy = typeof allergies.$inferSelect;
export type InsertAllergy = z.infer<typeof insertAllergySchema>;
export type Vital = typeof vitals.$inferSelect;
export type InsertVital = z.infer<typeof insertVitalSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// ============ Billing & Revenue Cycle ============
// All monetary amounts are stored as integer cents.

export const payers = pgTable("payers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  payerType: text("payer_type").notNull().default("commercial"), // commercial, medicare, medicaid, self-pay
  electronicPayerId: text("electronic_payer_id"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coverages = pgTable("coverages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  payerId: varchar("payer_id").notNull().references(() => payers.id),
  memberId: text("member_id").notNull(),
  groupNumber: text("group_number"),
  planName: text("plan_name").notNull(),
  planType: text("plan_type").notNull().default("PPO"), // PPO, HMO, EPO, POS, Medicare, Medicaid
  priority: text("priority").notNull().default("primary"), // primary, secondary
  status: text("status").notNull().default("active"), // active, inactive
  eligibilityStatus: text("eligibility_status").notNull().default("pending"), // verified, pending, failed
  copayCents: integer("copay_cents").default(0),
  deductibleCents: integer("deductible_cents").default(0),
  effectiveDate: text("effective_date"),
  expirationDate: text("expiration_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charges = pgTable("charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  encounterId: varchar("encounter_id").notNull().references(() => encounters.id),
  claimId: varchar("claim_id"), // set when attached to a claim
  cptCode: text("cpt_code").notNull(),
  description: text("description").notNull(),
  icd10Codes: text("icd10_codes").array().notNull().default(sql`'{}'::text[]`),
  units: integer("units").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
  status: text("status").notNull().default("unbilled"), // unbilled, billed, paid, written-off
  serviceDate: text("service_date").notNull(), // yyyy-MM-dd
  provider: text("provider").notNull(),
  aiSuggested: boolean("ai_suggested").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimNumber: text("claim_number").notNull().unique(),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  coverageId: varchar("coverage_id").references(() => coverages.id),
  status: text("status").notNull().default("draft"), // draft, submitted, accepted, denied, paid
  totalCents: integer("total_cents").notNull().default(0),
  paidCents: integer("paid_cents").notNull().default(0),
  submittedAt: timestamp("submitted_at"),
  respondedAt: timestamp("responded_at"),
  denialReason: text("denial_reason"),
  resubmittedFromId: varchar("resubmitted_from_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  claimId: varchar("claim_id").references(() => claims.id),
  amountCents: integer("amount_cents").notNull(),
  source: text("source").notNull().default("patient"), // patient, insurance
  method: text("method").notNull().default("card"), // card, cash, check, eft, adjustment
  reference: text("reference"),
  note: text("note"),
  postedBy: text("posted_by").notNull(),
  postedAt: timestamp("posted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayerSchema = createInsertSchema(payers).omit({ id: true, createdAt: true });
export const insertCoverageSchema = createInsertSchema(coverages).omit({ id: true, createdAt: true });
export const insertChargeSchema = createInsertSchema(charges).omit({ id: true, createdAt: true, claimId: true, status: true });
// claim lifecycle fields are server-controlled via dedicated transition endpoints
export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true, createdAt: true, claimNumber: true, status: true, totalCents: true, paidCents: true,
  submittedAt: true, respondedAt: true, denialReason: true, resubmittedFromId: true,
});
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, postedAt: true });

export type Payer = typeof payers.$inferSelect;
export type InsertPayer = z.infer<typeof insertPayerSchema>;
export type Coverage = typeof coverages.$inferSelect;
export type InsertCoverage = z.infer<typeof insertCoverageSchema>;
export type Charge = typeof charges.$inferSelect;
export type InsertCharge = z.infer<typeof insertChargeSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// ============ CRM & Patient Engagement ============

export const patientCrmProfiles = pgTable("patient_crm_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id).unique(),
  engagementStatus: text("engagement_status").notNull().default("engaged"), // engaged, at-risk, inactive
  vip: boolean("vip").default(false),
  priorityFlag: text("priority_flag"), // e.g. "high-touch", "care-management", null
  preferredChannel: text("preferred_channel").notNull().default("phone"), // phone, email, sms, portal
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  channel: text("channel").notNull(), // call, email, sms, portal
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  subject: text("subject").notNull(),
  body: text("body"),
  outcome: text("outcome"), // reached, voicemail, no-answer, replied, scheduled
  staff: text("staff").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmTasks = pgTable("crm_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id),
  title: text("title").notNull(),
  details: text("details"),
  dueDate: text("due_date"), // yyyy-MM-dd
  priority: text("priority").notNull().default("routine"), // urgent, high, routine
  status: text("status").notNull().default("open"), // open, completed
  assignee: text("assignee").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  campaignType: text("campaign_type").notNull().default("outreach"), // outreach, recall, wellness, follow-up
  channel: text("channel").notNull().default("phone"), // phone, email, sms, portal
  status: text("status").notNull().default("draft"), // draft, active, completed
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaignMembers = pgTable("campaign_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  status: text("status").notNull().default("pending"), // pending, contacted, scheduled, completed, declined
  lastContactAt: timestamp("last_contact_at"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  specialty: text("specialty").notNull(),
  referringProvider: text("referring_provider").notNull(),
  referredTo: text("referred_to").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("routine"), // stat, urgent, routine
  status: text("status").notNull().default("new"), // new, pending, scheduled, completed, declined
  referredAt: timestamp("referred_at").defaultNow().notNull(),
  scheduledFor: text("scheduled_for"), // yyyy-MM-dd
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inBasketMessages = pgTable("in_basket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull().default("staff"), // staff, results, patient
  fromName: text("from_name").notNull(),
  toName: text("to_name").notNull(),
  patientId: varchar("patient_id").references(() => patients.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  priority: text("priority").notNull().default("routine"), // urgent, high, routine
  read: boolean("read").default(false),
  status: text("status").notNull().default("open"), // open, done
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientCrmProfileSchema = createInsertSchema(patientCrmProfiles).omit({ id: true, createdAt: true });
export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, createdAt: true, occurredAt: true });
export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({ id: true, createdAt: true, completedAt: true, status: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export const insertCampaignMemberSchema = createInsertSchema(campaignMembers).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, referredAt: true });
export const insertInBasketMessageSchema = createInsertSchema(inBasketMessages).omit({ id: true, createdAt: true, read: true, status: true });

export type PatientCrmProfile = typeof patientCrmProfiles.$inferSelect;
export type InsertPatientCrmProfile = z.infer<typeof insertPatientCrmProfileSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignMember = typeof campaignMembers.$inferSelect;
export type InsertCampaignMember = z.infer<typeof insertCampaignMemberSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InBasketMessage = typeof inBasketMessages.$inferSelect;
export type InsertInBasketMessage = z.infer<typeof insertInBasketMessageSchema>;

// Audit logging tables for HIPAA compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  resourceType: varchar("resource_type").notNull(), // patient, study, report, etc.
  resourceId: varchar("resource_id"), // ID of the resource being accessed
  details: jsonb("details"), // Additional context about the action
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  severity: varchar("severity").default("info"), // info, warning, error, critical
  complianceLevel: varchar("compliance_level").default("standard"), // standard, hipaa, audit
  createdAt: timestamp("created_at").defaultNow(),
});

export const dataAccessLogs = pgTable("data_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  accessType: varchar("access_type").notNull(), // view, download, print, export
  dataType: varchar("data_type").notNull(), // demographics, images, reports, notes
  purpose: varchar("purpose"), // treatment, payment, operations, research
  duration: integer("duration"), // duration in seconds
  ipAddress: varchar("ip_address"),
  location: varchar("location"), // geographic location if available
  deviceInfo: jsonb("device_info"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  eventType: varchar("event_type").notNull(), // failed_login, password_change, permission_change, etc.
  severity: varchar("severity").notNull(), // low, medium, high, critical
  details: jsonb("details").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  resolved: boolean("resolved").default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const complianceReports = pgTable("compliance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: varchar("report_type").notNull(), // hipaa_access, security_audit, user_activity
  generatedBy: varchar("generated_by").notNull(),
  dateRange: jsonb("date_range").notNull(), // {start: date, end: date}
  filters: jsonb("filters"), // Additional filters applied
  reportData: jsonb("report_data").notNull(), // The actual report content
  status: varchar("status").default("generated"), // generated, reviewed, archived
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for audit tables
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).omit({
  id: true,
  createdAt: true,
});

// Types for audit tables
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type InsertDataAccessLog = z.infer<typeof insertDataAccessLogSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = z.infer<typeof insertComplianceReportSchema>;

/** Demo sign-in sessions, shared across instances and redeploys. */
export const emrDemoSessions = pgTable("emr_demo_sessions", {
  token: varchar("token").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
