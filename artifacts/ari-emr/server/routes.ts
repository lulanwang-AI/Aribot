import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { AuditService } from "./audit-service";
import { auditContextMiddleware, auditMiddleware, failedLoginMiddleware } from "./audit-middleware";
import { insertPatientSchema, insertImagingStudySchema, insertAiAnalysisSchema, insertReportSchema, insertAnnotationSchema, insertMeasurementSchema, insertTimepointSchema } from "@shared/schema";
import { dicomService } from "./dicom-service";
import { sampleDicomService } from "./sample-dicom-service";
import { DicomProcessor } from "./dicom-processor";
import { BrainVolumeGenerator } from "./brain-volume-generator";
import { LungVolumeGenerator } from "./lung-volume-generator";
import { aiMedicalAssistant } from "./ai-medical-assistant";
import { emrStorage } from "./emr-storage";
import { insertEncounterSchema, insertProblemSchema, insertMedicationSchema, insertAllergySchema, insertVitalSchema, insertOrderSchema, insertAppointmentSchema, insertClinicalNoteSchema } from "@shared/schema";
import { z } from "zod";
import { draftNoteFromEncounter, structureNarrative, transformNoteText, differentialDiagnosis, chartQA, suggestBillingCodes, analyticsQA, ariAvailable } from "./ari";
import { analyticsStorage } from "./analytics-storage";
import { billingStorage } from "./billing-storage";
import { insertPayerSchema, insertCoverageSchema, insertChargeSchema, insertClaimSchema, insertPaymentSchema } from "@shared/schema";
import { CPT_MAP } from "@shared/billing-codes";
import { crmStorage } from "./crm-storage";
import {
  insertPatientCrmProfileSchema, insertCommunicationSchema, insertCrmTaskSchema,
  insertCampaignSchema, insertReferralSchema, insertInBasketMessageSchema,
} from "@shared/schema";

// Partial schemas for PATCH: whitelist fields, never allow re-parenting to another patient
const patchEncounterSchema = insertEncounterSchema.omit({ patientId: true }).partial();
const patchProblemSchema = insertProblemSchema.omit({ patientId: true }).partial();
const patchMedicationSchema = insertMedicationSchema.omit({ patientId: true }).partial();
const patchOrderSchema = insertOrderSchema.omit({ patientId: true }).partial();
const patchAppointmentSchema = insertAppointmentSchema.omit({ patientId: true }).partial();
const patchNoteSchema = insertClinicalNoteSchema.omit({ patientId: true, encounterId: true }).partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply audit middleware globally
  app.use(auditContextMiddleware);
  app.use(auditMiddleware);
  app.use(failedLoginMiddleware);

  // Initialize DICOM processor
  const dicomProcessor = new DicomProcessor();

  // Configure multer for DICOM file uploads
  const upload = multer({
    dest: 'uploads/dicom/',
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit per file
      files: 100 // Max 100 files per upload
    },
    fileFilter: (req, file, cb) => {
      // Accept DICOM files (usually have .dcm extension or no extension)
      const allowedMimes = ['application/dicom', 'application/octet-stream'];
      const allowedExts = ['.dcm', '.dicom', ''];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only DICOM files are allowed'));
      }
    }
  });

  // DICOM Upload and Processing Routes
  app.post("/api/dicom/upload", upload.array('dicomFiles'), async (req, res) => {
    try {
      const files = req.files as any[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No DICOM files uploaded" });
      }

      const studies = await dicomService.processUploadedDicomFiles(files);
      
      // Log the upload action
      await AuditService.logAction({
        action: 'DICOM_UPLOAD',
        userId: 'system', // In a real app, get from session/auth
        resourceId: studies.map(s => s.studyInstanceUID).join(','),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          filesCount: files.length,
          studiesCount: studies.length
        }
      });

      res.status(201).json({
        message: `Successfully processed ${files.length} DICOM files`,
        studies: studies,
        filesProcessed: files.length
      });
    } catch (error) {
      console.error('DICOM upload error:', error);
      res.status(500).json({ 
        message: "Failed to process DICOM files",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/dicom/studies", async (req, res) => {
    try {
      // In a real implementation, you'd fetch from database
      // For now, return a mock response showing the structure
      const studies = [
        {
          studyInstanceUID: "1.2.826.0.1.3680043.8.498.12345",
          studyDate: "20241215",
          studyDescription: "CT Brain without contrast",
          patientName: "John Doe",
          patientId: "P-001",
          series: [
            {
              seriesInstanceUID: "1.2.826.0.1.3680043.8.498.12346",
              seriesDescription: "Axial CT Brain",
              modality: "CT",
              seriesNumber: 1,
              instanceCount: 256
            }
          ]
        }
      ];
      res.json(studies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch DICOM studies" });
    }
  });

  app.get("/api/dicom/studies/:studyUID", async (req, res) => {
    try {
      const { studyUID } = req.params;
      
      // Log data access
      await AuditService.logDataAccess({
        dataType: 'IMAGING_STUDY',
        patientId: 'system', // In a real app, get from session/auth
        accessType: 'READ',
        userId: 'system',
        ipAddress: req.ip,
        purpose: 'DICOM_STUDY_VIEW'
      });

      // Mock study data - in real implementation, fetch from database
      const study = {
        studyInstanceUID: studyUID,
        studyDate: "20241215",
        studyDescription: "CT Brain without contrast",
        patientName: "John Doe",
        patientId: "P-001",
        series: [
          {
            seriesInstanceUID: "1.2.826.0.1.3680043.8.498.12346",
            seriesDescription: "Axial CT Brain",
            modality: "CT",
            seriesNumber: 1,
            instances: []
          }
        ]
      };

      res.json(study);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch DICOM study" });
    }
  });

  app.get("/api/dicom/instances/:instanceUID/image", async (req, res) => {
    try {
      const { instanceUID } = req.params;
      const { window, center } = req.query;
      
      // In a real implementation, you'd:
      // 1. Find the DICOM file path from instanceUID
      // 2. Extract pixel data and convert to image format
      // 3. Apply window/level settings
      // 4. Return as PNG/JPEG

      // For now, return a placeholder response
      res.status(501).json({ 
        message: "Image rendering not yet implemented for real DICOM files",
        instanceUID,
        requestedWindow: window,
        requestedCenter: center
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to render DICOM image" });
    }
  });

  app.post("/api/dicom/parse", upload.single('dicomFile'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No DICOM file provided" });
      }

      const metadata = await dicomService.parseDicomFile(file.path);
      
      // Clean up uploaded file after parsing
      await dicomService.deleteDicomFile(file.path);
      
      res.json({
        message: "DICOM file parsed successfully",
        metadata: metadata,
        fileName: file.originalname
      });
    } catch (error) {
      console.error('DICOM parse error:', error);
      res.status(500).json({ 
        message: "Failed to parse DICOM file",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Patient routes (DB-backed)
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await emrStorage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await emrStorage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await emrStorage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  // ===== EMR Clinical routes =====
  // Encounters
  app.get("/api/encounters", async (_req, res) => {
    try { res.json(await emrStorage.getEncounters()); }
    catch { res.status(500).json({ message: "Failed to fetch encounters" }); }
  });
  app.get("/api/patients/:id/encounters", async (req, res) => {
    try { res.json(await emrStorage.getEncountersByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch encounters" }); }
  });
  app.post("/api/encounters", async (req, res) => {
    try {
      const data = insertEncounterSchema.parse({ ...req.body, encounterDate: new Date(req.body.encounterDate) });
      res.status(201).json(await emrStorage.createEncounter(data));
    } catch { res.status(400).json({ message: "Invalid encounter data" }); }
  });
  app.patch("/api/encounters/:id", async (req, res) => {
    try {
      const data = patchEncounterSchema.parse(
        req.body.encounterDate ? { ...req.body, encounterDate: new Date(req.body.encounterDate) } : req.body
      );
      const enc = await emrStorage.updateEncounter(req.params.id, data);
      if (!enc) return res.status(404).json({ message: "Encounter not found" });
      res.json(enc);
    } catch { res.status(400).json({ message: "Invalid encounter update" }); }
  });

  // Problems
  app.get("/api/patients/:id/problems", async (req, res) => {
    try { res.json(await emrStorage.getProblemsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch problems" }); }
  });
  app.post("/api/problems", async (req, res) => {
    try { res.status(201).json(await emrStorage.createProblem(insertProblemSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid problem data" }); }
  });
  app.patch("/api/problems/:id", async (req, res) => {
    try {
      const p = await emrStorage.updateProblem(req.params.id, patchProblemSchema.parse(req.body));
      if (!p) return res.status(404).json({ message: "Problem not found" });
      res.json(p);
    } catch { res.status(400).json({ message: "Invalid problem update" }); }
  });

  // Medications
  app.get("/api/patients/:id/medications", async (req, res) => {
    try { res.json(await emrStorage.getMedicationsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch medications" }); }
  });
  app.post("/api/medications", async (req, res) => {
    try { res.status(201).json(await emrStorage.createMedication(insertMedicationSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid medication data" }); }
  });
  app.patch("/api/medications/:id", async (req, res) => {
    try {
      const m = await emrStorage.updateMedication(req.params.id, patchMedicationSchema.parse(req.body));
      if (!m) return res.status(404).json({ message: "Medication not found" });
      res.json(m);
    } catch { res.status(400).json({ message: "Invalid medication update" }); }
  });

  // Allergies
  app.get("/api/patients/:id/allergies", async (req, res) => {
    try { res.json(await emrStorage.getAllergiesByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch allergies" }); }
  });
  app.post("/api/allergies", async (req, res) => {
    try { res.status(201).json(await emrStorage.createAllergy(insertAllergySchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid allergy data" }); }
  });

  // Vitals
  app.get("/api/patients/:id/vitals", async (req, res) => {
    try { res.json(await emrStorage.getVitalsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch vitals" }); }
  });
  app.post("/api/vitals", async (req, res) => {
    try {
      const data = insertVitalSchema.parse({ ...req.body, recordedAt: new Date(req.body.recordedAt) });
      res.status(201).json(await emrStorage.createVital(data));
    } catch { res.status(400).json({ message: "Invalid vitals data" }); }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try { res.json(await emrStorage.getOrders(req.query.status as string | undefined)); }
    catch { res.status(500).json({ message: "Failed to fetch orders" }); }
  });
  app.get("/api/patients/:id/orders", async (req, res) => {
    try { res.json(await emrStorage.getOrdersByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch orders" }); }
  });
  app.post("/api/orders", async (req, res) => {
    try {
      const data = insertOrderSchema.parse({
        ...req.body,
        orderedAt: new Date(req.body.orderedAt ?? Date.now()),
        resultedAt: req.body.resultedAt ? new Date(req.body.resultedAt) : undefined,
      });
      res.status(201).json(await emrStorage.createOrder(data));
    } catch { res.status(400).json({ message: "Invalid order data" }); }
  });
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const body: any = { ...req.body };
      if (body.orderedAt) body.orderedAt = new Date(body.orderedAt);
      if (body.resultedAt) body.resultedAt = new Date(body.resultedAt);
      const o = await emrStorage.updateOrder(req.params.id, patchOrderSchema.parse(body));
      if (!o) return res.status(404).json({ message: "Order not found" });
      res.json(o);
    } catch { res.status(400).json({ message: "Invalid order update" }); }
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    try { res.json(await emrStorage.getAppointments(req.query.date as string | undefined)); }
    catch { res.status(500).json({ message: "Failed to fetch appointments" }); }
  });
  app.get("/api/patients/:id/appointments", async (req, res) => {
    try { res.json(await emrStorage.getAppointmentsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch appointments" }); }
  });
  app.post("/api/appointments", async (req, res) => {
    try { res.status(201).json(await emrStorage.createAppointment(insertAppointmentSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid appointment data" }); }
  });
  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const a = await emrStorage.updateAppointment(req.params.id, patchAppointmentSchema.parse(req.body));
      if (!a) return res.status(404).json({ message: "Appointment not found" });
      res.json(a);
    } catch { res.status(400).json({ message: "Invalid appointment update" }); }
  });
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const ok = await emrStorage.deleteAppointment(req.params.id);
      if (!ok) return res.status(404).json({ message: "Appointment not found" });
      res.status(204).send();
    } catch { res.status(500).json({ message: "Failed to delete appointment" }); }
  });

  // ===== Clinical Notes =====
  app.get("/api/patients/:id/notes", async (req, res) => {
    try { res.json(await emrStorage.getNotesByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch notes" }); }
  });
  app.get("/api/encounters/:id/notes", async (req, res) => {
    try { res.json(await emrStorage.getNotesByEncounter(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch notes" }); }
  });
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const n = await emrStorage.getNote(req.params.id);
      if (!n) return res.status(404).json({ message: "Note not found" });
      res.json(n);
    } catch { res.status(500).json({ message: "Failed to fetch note" }); }
  });
  app.post("/api/notes", async (req, res) => {
    try {
      const data = insertClinicalNoteSchema.parse(req.body);
      if (data.encounterId) {
        const encs = await emrStorage.getEncountersByPatient(data.patientId);
        if (!encs.some((e) => e.id === data.encounterId)) {
          return res.status(400).json({ message: "Encounter does not belong to this patient" });
        }
      }
      res.status(201).json(await emrStorage.createNote(data));
    } catch { res.status(400).json({ message: "Invalid note data" }); }
  });
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const existing = await emrStorage.getNote(req.params.id);
      if (!existing) return res.status(404).json({ message: "Note not found" });
      if (existing.status === "signed") return res.status(409).json({ message: "Signed notes cannot be edited — add an addendum instead" });
      const n = await emrStorage.updateNote(req.params.id, patchNoteSchema.parse(req.body));
      res.json(n);
    } catch { res.status(400).json({ message: "Invalid note update" }); }
  });
  app.post("/api/notes/:id/sign", async (req, res) => {
    try {
      const { signedBy } = z.object({ signedBy: z.string().min(1) }).parse(req.body);
      const existing = await emrStorage.getNote(req.params.id);
      if (!existing) return res.status(404).json({ message: "Note not found" });
      if (existing.status === "signed") return res.status(409).json({ message: "Note is already signed" });
      res.json(await emrStorage.signNote(req.params.id, signedBy));
    } catch { res.status(400).json({ message: "Invalid sign request" }); }
  });
  app.post("/api/notes/:id/addendum", async (req, res) => {
    try {
      const { text, author } = z.object({ text: z.string().min(1), author: z.string().min(1) }).parse(req.body);
      const existing = await emrStorage.getNote(req.params.id);
      if (!existing) return res.status(404).json({ message: "Note not found" });
      if (existing.status !== "signed") return res.status(409).json({ message: "Addendums apply to signed notes — edit the draft directly" });
      res.json(await emrStorage.addAddendum(req.params.id, text, author));
    } catch { res.status(400).json({ message: "Invalid addendum" }); }
  });

  // ===== Billing & Revenue Cycle =====
  app.get("/api/billing/summary", async (_req, res) => {
    try { res.json(await billingStorage.getRevenueSummary()); }
    catch { res.status(500).json({ message: "Failed to fetch revenue summary" }); }
  });

  // Payers
  app.get("/api/payers", async (_req, res) => {
    try { res.json(await billingStorage.getPayers()); }
    catch { res.status(500).json({ message: "Failed to fetch payers" }); }
  });
  app.post("/api/payers", async (req, res) => {
    try { res.status(201).json(await billingStorage.createPayer(insertPayerSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid payer data" }); }
  });

  // Coverages
  app.get("/api/patients/:id/coverages", async (req, res) => {
    try { res.json(await billingStorage.getCoveragesByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch coverages" }); }
  });
  app.post("/api/coverages", async (req, res) => {
    try { res.status(201).json(await billingStorage.createCoverage(insertCoverageSchema.parse(req.body))); }
    catch { res.status(400).json({ message: "Invalid coverage data" }); }
  });
  app.patch("/api/coverages/:id", async (req, res) => {
    try {
      const c = await billingStorage.updateCoverage(req.params.id, insertCoverageSchema.omit({ patientId: true }).partial().parse(req.body));
      if (!c) return res.status(404).json({ message: "Coverage not found" });
      res.json(c);
    } catch { res.status(400).json({ message: "Invalid coverage update" }); }
  });

  // Charges
  app.get("/api/patients/:id/charges", async (req, res) => {
    try { res.json(await billingStorage.getChargesByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch charges" }); }
  });
  app.get("/api/encounters/:id/charges", async (req, res) => {
    try { res.json(await billingStorage.getChargesByEncounter(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch charges" }); }
  });
  app.post("/api/charges", async (req, res) => {
    try {
      const data = insertChargeSchema
        .extend({ units: z.number().int().min(1).max(99), unitPriceCents: z.number().int().min(1) })
        .parse(req.body);
      if (!CPT_MAP.has(data.cptCode)) return res.status(400).json({ message: "Unknown CPT code" });
      const encs = await emrStorage.getEncountersByPatient(data.patientId);
      if (!encs.some((e) => e.id === data.encounterId)) {
        return res.status(400).json({ message: "Encounter does not belong to this patient" });
      }
      res.status(201).json(await billingStorage.createCharge(data));
    } catch { res.status(400).json({ message: "Invalid charge data" }); }
  });
  app.delete("/api/charges/:id", async (req, res) => {
    try {
      const ok = await billingStorage.deleteCharge(req.params.id);
      if (!ok) return res.status(409).json({ message: "Only unbilled charges can be removed" });
      res.status(204).send();
    } catch { res.status(500).json({ message: "Failed to delete charge" }); }
  });

  // Claims
  app.get("/api/claims", async (req, res) => {
    try { res.json(await billingStorage.getClaims(req.query.status as string | undefined)); }
    catch { res.status(500).json({ message: "Failed to fetch claims" }); }
  });
  app.get("/api/patients/:id/claims", async (req, res) => {
    try { res.json(await billingStorage.getClaimsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch claims" }); }
  });
  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await billingStorage.getClaim(req.params.id);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      const [claimCharges, claimPayments] = await Promise.all([
        billingStorage.getChargesByClaim(claim.id),
        billingStorage.getPaymentsByClaim(claim.id),
      ]);
      res.json({ ...claim, charges: claimCharges, payments: claimPayments });
    } catch { res.status(500).json({ message: "Failed to fetch claim" }); }
  });
  app.post("/api/claims", async (req, res) => {
    try {
      const { chargeIds, ...rest } = z.object({ chargeIds: z.array(z.string()).min(1) }).passthrough().parse(req.body);
      const data = insertClaimSchema.parse(rest);
      if (data.coverageId) {
        const cov = await billingStorage.getCoverage(data.coverageId);
        if (!cov || cov.patientId !== data.patientId) {
          return res.status(400).json({ message: "Coverage does not belong to this patient" });
        }
      }
      res.status(201).json(await billingStorage.createClaimFromCharges(data, chargeIds));
    } catch (e) {
      if (e instanceof Error && e.message === "INELIGIBLE_CHARGES") {
        return res.status(400).json({ message: "All charges must be unbilled and belong to the claim's patient" });
      }
      res.status(400).json({ message: "Invalid claim data" });
    }
  });
  // Claim lifecycle transitions (server-authoritative)
  app.post("/api/claims/:id/submit", async (req, res) => {
    try {
      const claim = await billingStorage.getClaim(req.params.id);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      if (claim.status !== "draft") return res.status(409).json({ message: "Only draft claims can be submitted" });
      res.json(await billingStorage.updateClaim(claim.id, { status: "submitted", submittedAt: new Date() }));
    } catch { res.status(500).json({ message: "Failed to submit claim" }); }
  });
  app.post("/api/claims/:id/accept", async (req, res) => {
    try {
      const claim = await billingStorage.getClaim(req.params.id);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      if (claim.status !== "submitted") return res.status(409).json({ message: "Only submitted claims can be accepted" });
      res.json(await billingStorage.updateClaim(claim.id, { status: "accepted", respondedAt: new Date() }));
    } catch { res.status(500).json({ message: "Failed to accept claim" }); }
  });
  app.post("/api/claims/:id/deny", async (req, res) => {
    try {
      const { denialReason } = z.object({ denialReason: z.string().min(1) }).parse(req.body);
      const claim = await billingStorage.getClaim(req.params.id);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      if (claim.status !== "submitted") return res.status(409).json({ message: "Only submitted claims can be denied" });
      res.json(await billingStorage.updateClaim(claim.id, { status: "denied", denialReason, respondedAt: new Date() }));
    } catch { res.status(400).json({ message: "Invalid denial request" }); }
  });
  app.post("/api/claims/:id/pay", async (req, res) => {
    try {
      const { amountCents, postedBy, method, reference } = z.object({
        amountCents: z.number().int().positive(),
        postedBy: z.string().min(1),
        method: z.enum(["card", "cash", "check", "eft", "adjustment"]).default("eft"),
        reference: z.string().optional(),
      }).parse(req.body);
      const result = await billingStorage.payClaim(req.params.id, { amountCents, postedBy, method, reference });
      if ("error" in result) {
        if (result.error === "NOT_FOUND") return res.status(404).json({ message: "Claim not found" });
        if (result.error === "BAD_STATUS") return res.status(409).json({ message: "Only submitted or accepted claims can be paid" });
        return res.status(400).json({ message: "Payment must be positive and no more than the billed total" });
      }
      res.json(result);
    } catch { res.status(400).json({ message: "Invalid payment request" }); }
  });
  app.post("/api/claims/:id/resubmit", async (req, res) => {
    try {
      const next = await billingStorage.resubmitClaim(req.params.id);
      if (!next) return res.status(409).json({ message: "Only denied claims can be resubmitted" });
      res.status(201).json(next);
    } catch { res.status(500).json({ message: "Failed to resubmit claim" }); }
  });

  // Payments (patient statements — manual entry)
  app.get("/api/patients/:id/payments", async (req, res) => {
    try { res.json(await billingStorage.getPaymentsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch payments" }); }
  });
  app.post("/api/payments", async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      if (data.amountCents <= 0) return res.status(400).json({ message: "Amount must be positive" });
      res.status(201).json(await billingStorage.createPayment(data));
    } catch { res.status(400).json({ message: "Invalid payment data" }); }
  });

  // ===== CRM & Patient Engagement =====
  app.get("/api/crm/panel", async (_req, res) => {
    try { res.json(await crmStorage.getPanel()); }
    catch { res.status(500).json({ message: "Failed to fetch patient panel" }); }
  });
  app.put("/api/crm/profiles/:patientId", async (req, res) => {
    try {
      const data = insertPatientCrmProfileSchema.parse({ ...req.body, patientId: req.params.patientId });
      const patient = await emrStorage.getPatient(data.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(await crmStorage.upsertProfile(data));
    } catch { res.status(400).json({ message: "Invalid CRM profile" }); }
  });

  // Communications
  app.get("/api/patients/:id/communications", async (req, res) => {
    try { res.json(await crmStorage.getCommunicationsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch communications" }); }
  });
  app.post("/api/communications", async (req, res) => {
    try {
      const data = insertCommunicationSchema.parse(req.body);
      const patient = await emrStorage.getPatient(data.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.status(201).json(await crmStorage.createCommunication(data));
    } catch { res.status(400).json({ message: "Invalid communication data" }); }
  });

  // Follow-up tasks
  app.get("/api/crm/tasks", async (req, res) => {
    try {
      res.json(await crmStorage.getTasks({
        patientId: req.query.patientId as string | undefined,
        status: req.query.status as string | undefined,
      }));
    } catch { res.status(500).json({ message: "Failed to fetch tasks" }); }
  });
  app.post("/api/crm/tasks", async (req, res) => {
    try {
      const data = insertCrmTaskSchema.parse(req.body);
      if (data.patientId && !(await emrStorage.getPatient(data.patientId))) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.status(201).json(await crmStorage.createTask(data));
    } catch { res.status(400).json({ message: "Invalid task data" }); }
  });
  app.post("/api/crm/tasks/:id/complete", async (req, res) => {
    try {
      const t = await crmStorage.completeTask(req.params.id);
      if (!t) return res.status(409).json({ message: "Task not found or already completed" });
      res.json(t);
    } catch { res.status(500).json({ message: "Failed to complete task" }); }
  });
  app.post("/api/crm/tasks/:id/reopen", async (req, res) => {
    try {
      const t = await crmStorage.reopenTask(req.params.id);
      if (!t) return res.status(404).json({ message: "Task not found" });
      res.json(t);
    } catch { res.status(500).json({ message: "Failed to reopen task" }); }
  });

  // Campaigns
  app.get("/api/campaigns", async (_req, res) => {
    try { res.json(await crmStorage.getCampaigns()); }
    catch { res.status(500).json({ message: "Failed to fetch campaigns" }); }
  });
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const c = await crmStorage.getCampaign(req.params.id);
      if (!c) return res.status(404).json({ message: "Campaign not found" });
      res.json(c);
    } catch { res.status(500).json({ message: "Failed to fetch campaign" }); }
  });
  app.post("/api/campaigns", async (req, res) => {
    try {
      const { patientIds, ...rest } = req.body ?? {};
      // Campaigns are always created as drafts; lifecycle moves via PATCH.
      const data = { ...insertCampaignSchema.omit({ status: true }).parse(rest), status: "draft" as const };
      const ids = z.array(z.string()).default([]).parse(patientIds ?? []);
      if (ids.length) {
        const all = await emrStorage.getPatients();
        const known = new Set(all.map((p) => p.id));
        if (!ids.every((id) => known.has(id))) return res.status(400).json({ message: "Unknown patient in cohort" });
      }
      res.status(201).json(await crmStorage.createCampaign(data, Array.from(new Set(ids))));
    } catch { res.status(400).json({ message: "Invalid campaign data" }); }
  });
  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const data = insertCampaignSchema.omit({ createdBy: true }).partial().parse(req.body);
      const c = await crmStorage.updateCampaign(req.params.id, data);
      if (!c) return res.status(404).json({ message: "Campaign not found" });
      res.json(c);
    } catch { res.status(400).json({ message: "Invalid campaign update" }); }
  });
  app.patch("/api/campaign-members/:id", async (req, res) => {
    try {
      const { status, note } = z.object({
        status: z.enum(["pending", "contacted", "scheduled", "completed", "declined"]),
        note: z.string().optional(),
      }).parse(req.body);
      const m = await crmStorage.updateCampaignMember(req.params.id, status, note);
      if (!m) return res.status(404).json({ message: "Campaign member not found" });
      res.json(m);
    } catch { res.status(400).json({ message: "Invalid member update" }); }
  });

  // Referrals
  app.get("/api/referrals", async (req, res) => {
    try { res.json(await crmStorage.getReferrals(req.query.status as string | undefined)); }
    catch { res.status(500).json({ message: "Failed to fetch referrals" }); }
  });
  app.get("/api/patients/:id/referrals", async (req, res) => {
    try { res.json(await crmStorage.getReferralsByPatient(req.params.id)); }
    catch { res.status(500).json({ message: "Failed to fetch referrals" }); }
  });
  app.post("/api/referrals", async (req, res) => {
    try {
      const data = insertReferralSchema.parse(req.body);
      const patient = await emrStorage.getPatient(data.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.status(201).json(await crmStorage.createReferral(data));
    } catch { res.status(400).json({ message: "Invalid referral data" }); }
  });
  app.patch("/api/referrals/:id", async (req, res) => {
    try {
      const data = z.object({
        status: z.enum(["new", "pending", "scheduled", "completed", "declined"]).optional(),
        scheduledFor: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        priority: z.enum(["stat", "urgent", "routine"]).optional(),
      }).parse(req.body);
      const r = await crmStorage.updateReferral(req.params.id, data);
      if (!r) return res.status(404).json({ message: "Referral not found" });
      res.json(r);
    } catch { res.status(400).json({ message: "Invalid referral update" }); }
  });

  // In Basket
  app.get("/api/inbasket", async (req, res) => {
    try {
      res.json(await crmStorage.getInBasketMessages({
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
      }));
    } catch { res.status(500).json({ message: "Failed to fetch messages" }); }
  });
  app.get("/api/inbasket/unread-counts", async (_req, res) => {
    try { res.json(await crmStorage.getUnreadCounts()); }
    catch { res.status(500).json({ message: "Failed to fetch unread counts" }); }
  });
  app.post("/api/inbasket", async (req, res) => {
    try {
      const data = insertInBasketMessageSchema.parse(req.body);
      if (data.patientId && !(await emrStorage.getPatient(data.patientId))) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.status(201).json(await crmStorage.createInBasketMessage(data));
    } catch { res.status(400).json({ message: "Invalid message data" }); }
  });
  app.post("/api/inbasket/:id/read", async (req, res) => {
    try {
      const { read } = z.object({ read: z.boolean().default(true) }).parse(req.body ?? {});
      const m = await crmStorage.markMessageRead(req.params.id, read);
      if (!m) return res.status(404).json({ message: "Message not found" });
      res.json(m);
    } catch { res.status(400).json({ message: "Invalid request" }); }
  });
  app.post("/api/inbasket/:id/status", async (req, res) => {
    try {
      const { status } = z.object({ status: z.enum(["open", "done"]) }).parse(req.body);
      const m = await crmStorage.setMessageStatus(req.params.id, status);
      if (!m) return res.status(404).json({ message: "Message not found" });
      res.json(m);
    } catch { res.status(400).json({ message: "Invalid request" }); }
  });

  // ===== Reporting & Analytics =====
  const analyticsRangeSchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const { from, to } = analyticsRangeSchema.parse({ from: req.query.from, to: req.query.to });
      res.json(await analyticsStorage.getOverview({ from, to }));
    } catch { res.status(400).json({ message: "Invalid analytics query" }); }
  });
  app.get("/api/analytics/cohort", async (req, res) => {
    try {
      const filters = z.object({
        icd10Prefix: z.string().max(10).optional(),
        ageMin: z.coerce.number().int().min(0).max(130).optional(),
        ageMax: z.coerce.number().int().min(0).max(130).optional(),
        gender: z.string().max(20).optional(),
        engagementStatus: z.enum(["engaged", "at-risk", "inactive"]).optional(),
        careGapKind: z.string().max(30).optional(),
      }).parse({
        icd10Prefix: req.query.icd10Prefix, ageMin: req.query.ageMin, ageMax: req.query.ageMax,
        gender: req.query.gender, engagementStatus: req.query.engagementStatus, careGapKind: req.query.careGapKind,
      });
      res.json(await analyticsStorage.getCohort(filters));
    } catch { res.status(400).json({ message: "Invalid cohort query" }); }
  });
  app.get("/api/analytics/report", async (req, res) => {
    try {
      const opts = z.object({
        domain: z.enum(["clinical", "operational", "financial"]),
        groupBy: z.string().max(20),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).parse({ domain: req.query.domain, groupBy: req.query.groupBy, from: req.query.from, to: req.query.to });
      res.json(await analyticsStorage.runReport(opts));
    } catch { res.status(400).json({ message: "Invalid report request" }); }
  });
  app.post("/api/ari/analytics-qa", async (req, res) => {
    try {
      const { question } = z.object({ question: z.string().min(1).max(500) }).parse(req.body);
      res.json(await analyticsQA(question));
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid question" : "AI service error" });
    }
  });

  // ===== Ari (clinical AI assistant) =====
  app.get("/api/ari/status", (_req, res) => res.json({ available: ariAvailable }));
  app.post("/api/ari/draft-note", async (req, res) => {
    try {
      const { encounterId } = z.object({ encounterId: z.string().min(1) }).parse(req.body);
      const result = await draftNoteFromEncounter(encounterId);
      if (!result) return res.status(404).json({ message: "Encounter not found" });
      res.json(result);
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid draft request" : "AI service error" });
    }
  });
  app.post("/api/ari/structure-narrative", async (req, res) => {
    try {
      const { narrative, patientId } = z.object({ narrative: z.string().min(1), patientId: z.string().optional() }).parse(req.body);
      res.json(await structureNarrative(narrative, patientId));
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid narrative request" : "AI service error" });
    }
  });
  app.post("/api/ari/transform", async (req, res) => {
    try {
      const { text, mode } = z.object({ text: z.string().min(1), mode: z.enum(["summarize", "expand", "restructure"]) }).parse(req.body);
      res.json(await transformNoteText(text, mode));
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid transform request" : "AI service error" });
    }
  });
  app.post("/api/ari/differential", async (req, res) => {
    try {
      const { patientId, presentation } = z.object({ patientId: z.string().min(1), presentation: z.string().min(1) }).parse(req.body);
      const result = await differentialDiagnosis(patientId, presentation);
      if (!result) return res.status(404).json({ message: "Patient not found" });
      res.json(result);
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid differential request" : "AI service error" });
    }
  });
  app.post("/api/ari/suggest-codes", async (req, res) => {
    try {
      const { encounterId } = z.object({ encounterId: z.string().min(1) }).parse(req.body);
      const result = await suggestBillingCodes(encounterId);
      if (!result) return res.status(404).json({ message: "Encounter not found" });
      res.json(result);
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid code suggestion request" : "AI service error" });
    }
  });
  app.post("/api/ari/chart-qa", async (req, res) => {
    try {
      const { patientId, question } = z.object({ patientId: z.string().min(1), question: z.string().min(1) }).parse(req.body);
      const result = await chartQA(patientId, question);
      if (!result) return res.status(404).json({ message: "Patient not found" });
      res.json(result);
    } catch (err) {
      res.status(err instanceof z.ZodError ? 400 : 502).json({ message: err instanceof z.ZodError ? "Invalid question" : "AI service error" });
    }
  });

  // Imaging study routes
  app.get("/api/patients/:id/studies", async (req, res) => {
    try {
      const studies = await storage.getImagingStudiesByPatient(req.params.id);
      res.json(studies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch imaging studies" });
    }
  });

  app.get("/api/studies/:id", async (req, res) => {
    try {
      const study = await storage.getImagingStudy(req.params.id);
      if (!study) {
        return res.status(404).json({ message: "Study not found" });
      }
      res.json(study);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study" });
    }
  });

  app.post("/api/studies", async (req, res) => {
    try {
      const studyData = insertImagingStudySchema.parse(req.body);
      const study = await storage.createImagingStudy(studyData);
      res.status(201).json(study);
    } catch (error) {
      res.status(400).json({ message: "Invalid study data" });
    }
  });

  app.patch("/api/studies/:id", async (req, res) => {
    try {
      const updates = req.body;
      const study = await storage.updateImagingStudy(req.params.id, updates);
      if (!study) {
        return res.status(404).json({ message: "Study not found" });
      }
      res.json(study);
    } catch (error) {
      res.status(500).json({ message: "Failed to update study" });
    }
  });

  // AI Analysis routes
  app.get("/api/studies/:id/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAiAnalysesByStudy(req.params.id);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI analyses" });
    }
  });

  app.post("/api/analyses", async (req, res) => {
    try {
      const analysisData = insertAiAnalysisSchema.parse(req.body);
      const analysis = await storage.createAiAnalysis(analysisData);
      
      // Simulate AI processing
      setTimeout(async () => {
        const mockFindings = {
          "intracranialHemorrhage": { detected: false, confidence: 97 },
          "midlineShift": { detected: false, confidence: 99 },
          "massEffect": { detected: false, confidence: 95 }
        };
        
        await storage.updateAiAnalysis(analysis.id, {
          status: "completed",
          confidence: 94,
          findings: mockFindings,
          processingTime: "2.3 seconds"
        });
      }, 3000);
      
      res.status(201).json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Invalid analysis data" });
    }
  });

  // Report routes
  app.get("/api/studies/:id/report", async (req, res) => {
    try {
      const report = await storage.getReportByStudy(req.params.id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid report data" });
    }
  });

  app.patch("/api/reports/:id", async (req, res) => {
    try {
      const updates = req.body;
      const report = await storage.updateReport(req.params.id, updates);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  // Annotation routes
  app.get("/api/studies/:id/annotations", async (req, res) => {
    try {
      const annotations = await storage.getAnnotationsByStudy(req.params.id);
      res.json(annotations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch annotations" });
    }
  });

  app.post("/api/annotations", async (req, res) => {
    try {
      const annotationData = insertAnnotationSchema.parse(req.body);
      const annotation = await storage.createAnnotation(annotationData);
      res.status(201).json(annotation);
    } catch (error) {
      res.status(400).json({ message: "Invalid annotation data" });
    }
  });

  app.delete("/api/annotations/:id", async (req, res) => {
    try {
      const success = await storage.deleteAnnotation(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Annotation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete annotation" });
    }
  });

  // Measurement routes
  app.get("/api/studies/:id/measurements", async (req, res) => {
    try {
      const measurements = await storage.getMeasurementsByStudy(req.params.id);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

  app.post("/api/measurements", async (req, res) => {
    try {
      const measurementData = insertMeasurementSchema.parse(req.body);
      const measurement = await storage.createMeasurement(measurementData);
      res.status(201).json(measurement);
    } catch (error) {
      res.status(400).json({ message: "Invalid measurement data" });
    }
  });

  app.patch("/api/measurements/:id", async (req, res) => {
    try {
      const updates = req.body;
      const measurement = await storage.updateMeasurement(req.params.id, updates);
      if (!measurement) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      res.json(measurement);
    } catch (error) {
      res.status(500).json({ message: "Failed to update measurement" });
    }
  });

  app.delete("/api/measurements/:id", async (req, res) => {
    try {
      const success = await storage.deleteMeasurement(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  // Timepoint routes
  app.get("/api/patients/:id/timepoints", async (req, res) => {
    try {
      const timepoints = await storage.getTimepointsByPatient(req.params.id);
      res.json(timepoints);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timepoints" });
    }
  });

  app.post("/api/timepoints", async (req, res) => {
    try {
      const timepointData = insertTimepointSchema.parse(req.body);
      const timepoint = await storage.createTimepoint(timepointData);
      res.status(201).json(timepoint);
    } catch (error) {
      res.status(400).json({ message: "Invalid timepoint data" });
    }
  });

  app.patch("/api/timepoints/:id", async (req, res) => {
    try {
      const updates = req.body;
      const timepoint = await storage.updateTimepoint(req.params.id, updates);
      if (!timepoint) {
        return res.status(404).json({ message: "Timepoint not found" });
      }
      res.json(timepoint);
    } catch (error) {
      res.status(500).json({ message: "Failed to update timepoint" });
    }
  });

  // Audit and Compliance Routes
  app.get("/api/audit/logs", async (req, res) => {
    try {
      const {
        userId,
        resourceType,
        action,
        startDate,
        endDate,
        severity,
        limit = 100
      } = req.query;

      const filters = {
        userId: userId as string,
        resourceType: resourceType as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        severity: severity as string,
        limit: parseInt(limit as string, 10)
      };

      const logs = await AuditService.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit/data-access", async (req, res) => {
    try {
      const {
        userId,
        patientId,
        accessType,
        startDate,
        endDate,
        limit = 100
      } = req.query;

      const filters = {
        userId: userId as string,
        patientId: patientId as string,
        accessType: accessType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string, 10)
      };

      const logs = await AuditService.getDataAccessLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data access logs" });
    }
  });

  app.get("/api/audit/security-events", async (req, res) => {
    try {
      const {
        userId,
        eventType,
        severity,
        resolved,
        startDate,
        endDate,
        limit = 100
      } = req.query;

      const filters = {
        userId: userId as string,
        eventType: eventType as string,
        severity: severity as string,
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string, 10)
      };

      const events = await AuditService.getSecurityEvents(filters);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.patch("/api/audit/security-events/:id/resolve", async (req, res) => {
    try {
      const { resolvedBy } = req.body;
      if (!resolvedBy) {
        return res.status(400).json({ message: "resolvedBy is required" });
      }

      const event = await AuditService.resolveSecurityEvent(req.params.id, resolvedBy);
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve security event" });
    }
  });

  // Compliance Reports
  app.post("/api/compliance/reports", async (req, res) => {
    try {
      const { reportType, dateRange, filters, generatedBy } = req.body;
      
      if (!reportType || !dateRange || !generatedBy) {
        return res.status(400).json({ message: "reportType, dateRange, and generatedBy are required" });
      }

      const report = await AuditService.generateComplianceReport({
        reportType,
        generatedBy,
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        },
        filters: filters || {}
      });

      res.status(201).json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  app.get("/api/compliance/reports", async (req, res) => {
    try {
      const { reportType, generatedBy, limit = 50 } = req.query;
      
      const filters = {
        reportType: reportType as string,
        generatedBy: generatedBy as string,
        limit: parseInt(limit as string, 10)
      };

      const reports = await AuditService.getComplianceReports(filters);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compliance reports" });
    }
  });

  app.get("/api/compliance/reports/:id", async (req, res) => {
    try {
      const reports = await AuditService.getComplianceReports({});
      const report = reports.find(r => r.id === req.params.id);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compliance report" });
    }
  });

  // Manual audit logging endpoints for special cases
  app.post("/api/audit/log-action", async (req, res) => {
    try {
      const auditData = req.body;
      const logEntry = await AuditService.logAction(auditData);
      res.status(201).json(logEntry);
    } catch (error) {
      res.status(400).json({ message: "Failed to create audit log" });
    }
  });

  app.post("/api/audit/log-data-access", async (req, res) => {
    try {
      const accessData = req.body;
      const logEntry = await AuditService.logDataAccess(accessData);
      res.status(201).json(logEntry);
    } catch (error) {
      res.status(400).json({ message: "Failed to create data access log" });
    }
  });

  app.post("/api/audit/log-security-event", async (req, res) => {
    try {
      const eventData = req.body;
      const logEntry = await AuditService.logSecurityEvent(eventData);
      res.status(201).json(logEntry);
    } catch (error) {
      res.status(400).json({ message: "Failed to create security event log" });
    }
  });

  // Sample DICOM Files Routes
  app.get("/api/dicom/sample-files", async (req, res) => {
    try {
      const files = await sampleDicomService.getSampleDicomFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching sample DICOM files:", error);
      res.status(500).json({ message: "Failed to fetch sample DICOM files" });
    }
  });

  app.get("/api/dicom/sample-studies", async (req, res) => {
    try {
      const studies = await sampleDicomService.getSampleDicomStudies();
      res.json(studies);
    } catch (error) {
      console.error("Error fetching sample DICOM studies:", error);
      res.status(500).json({ message: "Failed to fetch sample DICOM studies" });
    }
  });

  // Sample Brain Volume Route
  app.get("/api/dicom/3d/sample-brain", async (req, res) => {
    try {
      const brainVolume = BrainVolumeGenerator.generateBrainVolume();
      
      // Convert to base64 for transfer
      const volumeBuffer = Buffer.from(brainVolume.data.buffer);
      const base64Data = volumeBuffer.toString('base64');
      
      res.json({
        data: base64Data,
        dimensions: brainVolume.dimensions,
        spacing: brainVolume.spacing,
        origin: brainVolume.origin,
        metadata: brainVolume.metadata,
        dataType: 'Uint8Array'
      });
    } catch (error) {
      console.error("Error generating sample brain:", error);
      res.status(500).json({ message: "Failed to generate sample brain", error: error.message });
    }
  });

  // Sample Lung Volume Route with Organ Segmentation
  app.get("/api/dicom/3d/sample-lung", async (req, res) => {
    try {
      const lungVolume = LungVolumeGenerator.generateLungVolume();
      
      // Convert to base64 for transfer
      const volumeBuffer = Buffer.from(lungVolume.data.buffer);
      const base64Data = volumeBuffer.toString('base64');
      
      res.json({
        data: base64Data,
        dimensions: lungVolume.dimensions,
        spacing: lungVolume.spacing,
        origin: lungVolume.origin,
        metadata: lungVolume.metadata,
        dataType: 'Uint8Array'
      });
    } catch (error) {
      console.error("Error generating sample lung:", error);
      res.status(500).json({ message: "Failed to generate sample lung", error: error.message });
    }
  });

  // 3D Reconstruction and Volume Processing Routes
  app.get("/api/dicom/3d/volume", async (req, res) => {
    try {
      const volume = await dicomProcessor.processDicomDirectory();
      res.json({
        patientInfo: volume.patientInfo,
        seriesInfo: dicomProcessor.getSeriesInfo(volume),
        volumeDimensions: volume.volumeData.dimensions,
        volumeSpacing: volume.volumeData.spacing,
        volumeOrigin: volume.volumeData.origin
      });
    } catch (error) {
      console.error("Error processing 3D volume:", error);
      res.status(500).json({ message: "Failed to process 3D volume", error: error.message });
    }
  });

  app.get("/api/dicom/3d/volume/data", async (req, res) => {
    try {
      const volume = await dicomProcessor.processDicomDirectory();
      
      // Convert volume data to base64 for transfer
      const volumeBuffer = Buffer.from(volume.volumeData.data.buffer);
      const base64Data = volumeBuffer.toString('base64');
      
      res.json({
        data: base64Data,
        dimensions: volume.volumeData.dimensions,
        spacing: volume.volumeData.spacing,
        origin: volume.volumeData.origin,
        dataType: volume.volumeData.data.constructor.name
      });
    } catch (error) {
      console.error("Error fetching volume data:", error);
      res.status(500).json({ message: "Failed to fetch volume data", error: error.message });
    }
  });

  app.get("/api/dicom/3d/mpr/:plane/:position", async (req, res) => {
    try {
      const { plane, position } = req.params;
      const pos = parseInt(position);
      
      if (!['axial', 'sagittal', 'coronal'].includes(plane)) {
        return res.status(400).json({ message: "Invalid plane. Must be axial, sagittal, or coronal" });
      }

      const volume = await dicomProcessor.processDicomDirectory();
      
      // Extract MPR slice based on plane and position
      const mprSlice = extractMPRSlice(volume, plane as 'axial' | 'sagittal' | 'coronal', pos);
      
      if (!mprSlice) {
        return res.status(404).json({ message: "MPR slice not found" });
      }

      res.json({
        imageData: Array.from(mprSlice.imageData),
        width: mprSlice.width,
        height: mprSlice.height,
        plane,
        position: pos
      });
    } catch (error) {
      console.error("Error generating MPR slice:", error);
      res.status(500).json({ message: "Failed to generate MPR slice", error: error.message });
    }
  });

  app.get("/api/dicom/3d/slice/:seriesIndex/:sliceIndex", async (req, res) => {
    try {
      const seriesIndex = parseInt(req.params.seriesIndex) || 0;
      const sliceIndex = parseInt(req.params.sliceIndex) || 0;
      
      const volume = await dicomProcessor.processDicomDirectory();
      const sliceData = dicomProcessor.getSliceData(volume, seriesIndex, sliceIndex);
      
      if (!sliceData) {
        return res.status(404).json({ message: "Slice not found" });
      }

      res.json({
        imageData: Array.from(sliceData.imageData),
        pixelData: Array.from(sliceData.pixelData),
        width: sliceData.width,
        height: sliceData.height,
        metadata: sliceData.metadata,
        filename: sliceData.filename
      });
    } catch (error) {
      console.error("Error fetching slice data:", error);
      res.status(500).json({ message: "Failed to fetch slice data", error: error.message });
    }
  });

  // Helper function for MPR slice extraction
  function extractMPRSlice(volume: any, plane: 'axial' | 'sagittal' | 'coronal', position: number) {
    const [width, height, depth] = volume.volumeData.dimensions;
    const volumeData = volume.volumeData.data;

    switch (plane) {
      case 'axial':
        if (position >= depth) return null;
        const axialData = new Uint8Array(width * height);
        const axialOffset = position * width * height;
        for (let i = 0; i < width * height; i++) {
          axialData[i] = Math.min(255, Math.max(0, volumeData[axialOffset + i] / 16));
        }
        return { imageData: axialData, width, height };

      case 'sagittal':
        if (position >= width) return null;
        const sagittalData = new Uint8Array(depth * height);
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            const volumeIndex = z * width * height + y * width + position;
            const sagittalIndex = y * depth + z;
            sagittalData[sagittalIndex] = Math.min(255, Math.max(0, volumeData[volumeIndex] / 16));
          }
        }
        return { imageData: sagittalData, width: depth, height };

      case 'coronal':
        if (position >= height) return null;
        const coronalData = new Uint8Array(width * depth);
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            const volumeIndex = z * width * height + position * width + x;
            const coronalIndex = z * width + x;
            coronalData[coronalIndex] = Math.min(255, Math.max(0, volumeData[volumeIndex] / 16));
          }
        }
        return { imageData: coronalData, width, height: depth };

      default:
        return null;
    }
  }

  // AI Medical Assistant endpoints
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { sessionId, message, attachments, patientId, studyId } = req.body;
      
      const result = await aiMedicalAssistant.processMessage(
        sessionId || `session_${Date.now()}`,
        message,
        {
          ...attachments,
          patientId,
          studyId
        }
      );
      
      res.json(result);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ 
        error: "Failed to process message",
        response: "I apologize, but I'm having trouble processing your request. Please try again or contact support if the issue persists."
      });
    }
  });

  // AI DICOM analysis endpoint
  app.post("/api/ai/analyze-dicom", async (req, res) => {
    try {
      const { sessionId, dicomData, questions } = req.body;
      
      const result = await aiMedicalAssistant.analyzeDicomImage(
        Buffer.from(dicomData, 'base64'),
        sessionId || `session_${Date.now()}`,
        questions
      );
      
      res.json(result);
    } catch (error) {
      console.error("DICOM analysis error:", error);
      res.status(500).json({ error: "Failed to analyze DICOM image" });
    }
  });

  // AI report generation endpoint
  app.post("/api/ai/generate-report", async (req, res) => {
    try {
      const { sessionId, studyId } = req.body;
      
      const report = await aiMedicalAssistant.generateReport(
        sessionId || `session_${Date.now()}`,
        studyId
      );
      
      res.json({ report });
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Get AI conversation history
  app.get("/api/ai/history/:sessionId", async (req, res) => {
    try {
      const history = aiMedicalAssistant.getConversationHistory(req.params.sessionId);
      res.json({ history });
    } catch (error) {
      console.error("Failed to get conversation history:", error);
      res.status(500).json({ error: "Failed to retrieve conversation history" });
    }
  });

  // Clear AI session
  app.delete("/api/ai/session/:sessionId", async (req, res) => {
    try {
      aiMedicalAssistant.clearContext(req.params.sessionId);
      res.json({ message: "Session cleared successfully" });
    } catch (error) {
      console.error("Failed to clear session:", error);
      res.status(500).json({ error: "Failed to clear session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
