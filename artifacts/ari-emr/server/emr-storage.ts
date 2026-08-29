import { db } from "./db";
import { eq, desc, asc, and } from "drizzle-orm";
import {
  patients, encounters, problems, medications, allergies, vitals, orders, appointments, clinicalNotes,
  type ClinicalNote, type InsertClinicalNote,
  type Patient, type InsertPatient,
  type Encounter, type InsertEncounter,
  type Problem, type InsertProblem,
  type Medication, type InsertMedication,
  type Allergy, type InsertAllergy,
  type Vital, type InsertVital,
  type Order, type InsertOrder,
  type Appointment, type InsertAppointment,
} from "@shared/schema";

export const emrStorage = {
  // Clinical notes
  async getNotesByPatient(patientId: string): Promise<ClinicalNote[]> {
    return db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, patientId)).orderBy(desc(clinicalNotes.createdAt));
  },
  async getNotesByEncounter(encounterId: string): Promise<ClinicalNote[]> {
    return db.select().from(clinicalNotes).where(eq(clinicalNotes.encounterId, encounterId)).orderBy(desc(clinicalNotes.createdAt));
  },
  async getNote(id: string): Promise<ClinicalNote | undefined> {
    const [n] = await db.select().from(clinicalNotes).where(eq(clinicalNotes.id, id));
    return n;
  },
  async createNote(data: InsertClinicalNote): Promise<ClinicalNote> {
    const [n] = await db.insert(clinicalNotes).values(data).returning();
    return n;
  },
  async updateNote(id: string, updates: Partial<InsertClinicalNote>): Promise<ClinicalNote | undefined> {
    const [n] = await db.update(clinicalNotes).set({ ...updates, updatedAt: new Date() }).where(eq(clinicalNotes.id, id)).returning();
    return n;
  },
  async signNote(id: string, signedBy: string): Promise<ClinicalNote | undefined> {
    const [n] = await db.update(clinicalNotes)
      .set({ status: "signed", signedBy, signedAt: new Date(), updatedAt: new Date() })
      .where(eq(clinicalNotes.id, id)).returning();
    return n;
  },
  async addAddendum(id: string, text: string, author: string): Promise<ClinicalNote | undefined> {
    const note = await this.getNote(id);
    if (!note) return undefined;
    const addendums = [...(note.addendums ?? []), { text, author, createdAt: new Date().toISOString() }];
    const [n] = await db.update(clinicalNotes).set({ addendums, updatedAt: new Date() }).where(eq(clinicalNotes.id, id)).returning();
    return n;
  },

  // Patients (DB-backed)
  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(asc(patients.name));
  },
  async getPatient(id: string): Promise<Patient | undefined> {
    const [p] = await db.select().from(patients).where(eq(patients.id, id));
    return p;
  },
  async createPatient(data: InsertPatient): Promise<Patient> {
    const [p] = await db.insert(patients).values(data).returning();
    return p;
  },
  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [p] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();
    return p;
  },

  // Encounters
  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    return db.select().from(encounters).where(eq(encounters.patientId, patientId)).orderBy(desc(encounters.encounterDate));
  },
  async getEncounters(): Promise<Encounter[]> {
    return db.select().from(encounters).orderBy(desc(encounters.encounterDate));
  },
  async createEncounter(data: InsertEncounter): Promise<Encounter> {
    const [e] = await db.insert(encounters).values(data).returning();
    return e;
  },
  async updateEncounter(id: string, updates: Partial<InsertEncounter>): Promise<Encounter | undefined> {
    const [e] = await db.update(encounters).set(updates).where(eq(encounters.id, id)).returning();
    return e;
  },

  // Problems
  async getProblemsByPatient(patientId: string): Promise<Problem[]> {
    return db.select().from(problems).where(eq(problems.patientId, patientId)).orderBy(desc(problems.createdAt));
  },
  async createProblem(data: InsertProblem): Promise<Problem> {
    const [p] = await db.insert(problems).values(data).returning();
    return p;
  },
  async updateProblem(id: string, updates: Partial<InsertProblem>): Promise<Problem | undefined> {
    const [p] = await db.update(problems).set(updates).where(eq(problems.id, id)).returning();
    return p;
  },

  // Medications
  async getMedicationsByPatient(patientId: string): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.patientId, patientId)).orderBy(desc(medications.createdAt));
  },
  async createMedication(data: InsertMedication): Promise<Medication> {
    const [m] = await db.insert(medications).values(data).returning();
    return m;
  },
  async updateMedication(id: string, updates: Partial<InsertMedication>): Promise<Medication | undefined> {
    const [m] = await db.update(medications).set(updates).where(eq(medications.id, id)).returning();
    return m;
  },

  // Allergies
  async getAllergiesByPatient(patientId: string): Promise<Allergy[]> {
    return db.select().from(allergies).where(eq(allergies.patientId, patientId));
  },
  async createAllergy(data: InsertAllergy): Promise<Allergy> {
    const [a] = await db.insert(allergies).values(data).returning();
    return a;
  },

  // Vitals
  async getVitalsByPatient(patientId: string): Promise<Vital[]> {
    return db.select().from(vitals).where(eq(vitals.patientId, patientId)).orderBy(desc(vitals.recordedAt));
  },
  async createVital(data: InsertVital): Promise<Vital> {
    const [v] = await db.insert(vitals).values(data).returning();
    return v;
  },

  // Orders
  async getOrdersByPatient(patientId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.patientId, patientId)).orderBy(desc(orders.orderedAt));
  },
  async getOrders(status?: string): Promise<Order[]> {
    if (status) return db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.orderedAt));
    return db.select().from(orders).orderBy(desc(orders.orderedAt));
  },
  async createOrder(data: InsertOrder): Promise<Order> {
    const [o] = await db.insert(orders).values(data).returning();
    return o;
  },
  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [o] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return o;
  },

  // Appointments
  async getAppointments(date?: string): Promise<Appointment[]> {
    if (date) {
      return db.select().from(appointments).where(eq(appointments.appointmentDate, date)).orderBy(asc(appointments.appointmentTime));
    }
    return db.select().from(appointments).orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime));
  },
  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.appointmentDate));
  },
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const [a] = await db.insert(appointments).values(data).returning();
    return a;
  },
  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [a] = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
    return a;
  },
  async deleteAppointment(id: string): Promise<boolean> {
    const res = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return res.length > 0;
  },
};
