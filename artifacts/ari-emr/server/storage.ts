import { type Patient, type InsertPatient, type ImagingStudy, type InsertImagingStudy, type AiAnalysis, type InsertAiAnalysis, type Report, type InsertReport, type Annotation, type InsertAnnotation, type Measurement, type InsertMeasurement, type Timepoint, type InsertTimepoint } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined>;
  
  // Imaging Studies
  getImagingStudy(id: string): Promise<ImagingStudy | undefined>;
  getImagingStudiesByPatient(patientId: string): Promise<ImagingStudy[]>;
  getAllImagingStudies(): Promise<ImagingStudy[]>;
  getAllAiAnalyses(): Promise<AiAnalysis[]>;
  createImagingStudy(study: InsertImagingStudy): Promise<ImagingStudy>;
  updateImagingStudy(id: string, updates: Partial<InsertImagingStudy>): Promise<ImagingStudy | undefined>;
  
  // AI Analyses
  getAiAnalysesByStudy(studyId: string): Promise<AiAnalysis[]>;
  createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis>;
  updateAiAnalysis(id: string, updates: Partial<InsertAiAnalysis>): Promise<AiAnalysis | undefined>;
  
  // Reports
  getReportByStudy(studyId: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<InsertReport>): Promise<Report | undefined>;
  
  // Annotations
  getAnnotationsByStudy(studyId: string): Promise<Annotation[]>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  deleteAnnotation(id: string): Promise<boolean>;
  
  // Measurements
  getMeasurementsByStudy(studyId: string): Promise<Measurement[]>;
  createMeasurement(measurement: InsertMeasurement): Promise<Measurement>;
  updateMeasurement(id: string, updates: Partial<InsertMeasurement>): Promise<Measurement | undefined>;
  deleteMeasurement(id: string): Promise<boolean>;
  
  // Timepoints
  getTimepointsByPatient(patientId: string): Promise<Timepoint[]>;
  createTimepoint(timepoint: InsertTimepoint): Promise<Timepoint>;
  updateTimepoint(id: string, updates: Partial<InsertTimepoint>): Promise<Timepoint | undefined>;
}

export class MemStorage implements IStorage {
  private patients: Map<string, Patient> = new Map();
  private imagingStudies: Map<string, ImagingStudy> = new Map();
  private aiAnalyses: Map<string, AiAnalysis> = new Map();
  private reports: Map<string, Report> = new Map();
  private annotations: Map<string, Annotation> = new Map();
  private measurements: Map<string, Measurement> = new Map();
  private timepoints: Map<string, Timepoint> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create mock patients with CT data
    const patient1: Patient & { ctData?: any } = {
      id: "p1",
      name: "John Doe",
      patientId: "P-2025-001",
      age: 45,
      dateOfBirth: "01/15/1979",
      gender: "Male",
      status: "active",
      createdAt: new Date(),
      ctData: { scanDate: "08-04-2025", findings: "4.2cm mass in right upper lobe, suspicious for malignancy", slices: 512 }
    };

    const patient2: Patient & { ctData?: any } = {
      id: "p2",
      name: "Sarah Johnson",
      patientId: "P-2025-002",
      age: 38,
      dateOfBirth: "06/22/1985",
      gender: "Female",
      status: "pending",
      createdAt: new Date(),
      ctData: { scanDate: "09-04-2025", findings: "Ground-glass opacities in lower lobes consistent with pneumonia", slices: 256 }
    };

    const patient3: Patient & { ctData?: any } = {
      id: "p3",
      name: "Michael Chen",
      patientId: "P-2025-003",
      age: 52,
      dateOfBirth: "03/10/1972",
      gender: "Male",
      status: "critical",
      createdAt: new Date(),
      ctData: { scanDate: "10-04-2025", findings: "6.2cm abdominal aortic aneurysm requiring urgent intervention", slices: 640 }
    };

    const patient4: Patient & { ctData?: any } = {
      id: "p4",
      name: "Emma Rodriguez",
      patientId: "P-2025-004",
      age: 41,
      dateOfBirth: "09/05/1982",
      gender: "Female",
      status: "completed",
      createdAt: new Date(),
      ctData: { scanDate: "11-04-2025", findings: "Post-surgical changes, no acute findings", slices: 384 }
    };

    this.patients.set(patient1.id, patient1 as Patient);
    this.patients.set(patient2.id, patient2 as Patient);
    this.patients.set(patient3.id, patient3 as Patient);
    this.patients.set(patient4.id, patient4 as Patient);

    // Add 20 more patients to reach 25 total
    const additionalPatients = [
      { id: "p5", name: "Robert Martinez", patientId: "P-2025-005", age: 58, dateOfBirth: "02/14/1967", gender: "Male", status: "active", sAI: "Urgent", mAI: "Cancer Positive", diagnosis: "Lung adenocarcinoma", ctData: { scanDate: "12-04-2025", findings: "3.8cm spiculated mass in right lower lobe with mediastinal lymphadenopathy", slices: 480 } },
      { id: "p6", name: "Linda Thompson", patientId: "P-2025-006", age: 44, dateOfBirth: "08/30/1980", gender: "Female", status: "pending", sAI: "Normal", mAI: "Negative", diagnosis: "Routine screening", ctData: { scanDate: "13-04-2025", findings: "No significant abnormalities detected", slices: 320 } },
      { id: "p7", name: "David Wilson", patientId: "P-2025-007", age: 63, dateOfBirth: "11/20/1961", gender: "Male", status: "critical", sAI: "Urgent", mAI: "Cancer Positive", diagnosis: "Pancreatic mass", ctData: { scanDate: "14-04-2025", findings: "4.5cm heterogeneous mass in pancreatic head with vascular encasement", slices: 560 } },
      { id: "p8", name: "Patricia Brown", patientId: "P-2025-008", age: 51, dateOfBirth: "05/15/1973", gender: "Female", status: "active", sAI: "Urgent", mAI: "Negative", diagnosis: "Pulmonary embolism", ctData: { scanDate: "15-04-2025", findings: "Bilateral pulmonary emboli with right heart strain", slices: 400 } },
      { id: "p9", name: "James Anderson", patientId: "P-2025-009", age: 37, dateOfBirth: "12/03/1987", gender: "Male", status: "completed", sAI: "Normal", mAI: "Negative", diagnosis: "Post-trauma follow-up", ctData: { scanDate: "16-04-2025", findings: "Healing rib fractures, no acute changes", slices: 350 } },
      { id: "p10", name: "Jennifer Garcia", patientId: "P-2025-010", age: 49, dateOfBirth: "07/28/1975", gender: "Female", status: "active", sAI: "Abnormal", mAI: "Cancer Positive", diagnosis: "Ovarian carcinoma", ctData: { scanDate: "17-04-2025", findings: "Large complex pelvic mass with ascites and peritoneal carcinomatosis", slices: 520 } },
      { id: "p11", name: "William Taylor", patientId: "P-2025-011", age: 66, dateOfBirth: "04/10/1958", gender: "Male", status: "pending", sAI: "Urgent", mAI: "Negative", diagnosis: "Acute appendicitis", ctData: { scanDate: "18-04-2025", findings: "Dilated appendix with peri-appendiceal inflammatory changes", slices: 380 } },
      { id: "p12", name: "Susan Moore", patientId: "P-2025-012", age: 42, dateOfBirth: "10/18/1982", gender: "Female", status: "active", sAI: "Normal", mAI: "Negative", diagnosis: "Chronic sinusitis", ctData: { scanDate: "19-04-2025", findings: "Pansinusitis with mucosal thickening", slices: 280 } },
      { id: "p13", name: "Richard Jackson", patientId: "P-2025-013", age: 55, dateOfBirth: "06/25/1969", gender: "Male", status: "critical", sAI: "Urgent", mAI: "Cancer Positive", diagnosis: "Hepatocellular carcinoma", ctData: { scanDate: "20-04-2025", findings: "Multiple hepatic lesions with portal vein thrombosis", slices: 600 } },
      { id: "p14", name: "Maria Davis", patientId: "P-2025-014", age: 39, dateOfBirth: "01/12/1986", gender: "Female", status: "pending", sAI: "Abnormal", mAI: "Negative", diagnosis: "Kidney stones", ctData: { scanDate: "21-04-2025", findings: "Bilateral nephrolithiasis with mild hydronephrosis", slices: 420 } },
      { id: "p15", name: "Charles Miller", patientId: "P-2025-015", age: 61, dateOfBirth: "09/05/1963", gender: "Male", status: "active", sAI: "Urgent", mAI: "Cancer Positive", diagnosis: "Colorectal cancer", ctData: { scanDate: "22-04-2025", findings: "Obstructing sigmoid mass with regional lymphadenopathy", slices: 480 } },
      { id: "p16", name: "Barbara White", patientId: "P-2025-016", age: 47, dateOfBirth: "03/22/1977", gender: "Female", status: "completed", sAI: "Normal", mAI: "Negative", diagnosis: "Annual check-up", ctData: { scanDate: "23-04-2025", findings: "No acute pathology identified", slices: 360 } },
      { id: "p17", name: "Thomas Harris", patientId: "P-2025-017", age: 54, dateOfBirth: "07/14/1970", gender: "Male", status: "active", sAI: "Abnormal", mAI: "Negative", diagnosis: "Pneumonia", ctData: { scanDate: "24-04-2025", findings: "Multifocal consolidation consistent with bacterial pneumonia", slices: 440 } },
      { id: "p18", name: "Nancy Clark", patientId: "P-2025-018", age: 46, dateOfBirth: "02/08/1978", gender: "Female", status: "pending", sAI: "Urgent", mAI: "Cancer Positive", diagnosis: "Breast cancer metastases", ctData: { scanDate: "25-04-2025", findings: "Multiple pulmonary and hepatic metastases", slices: 540 } },
      { id: "p19", name: "Christopher Lewis", patientId: "P-2025-019", age: 59, dateOfBirth: "11/30/1965", gender: "Male", status: "critical", sAI: "Urgent", mAI: "Negative", diagnosis: "Acute stroke", ctData: { scanDate: "26-04-2025", findings: "Large right MCA territory infarct with midline shift", slices: 320 } },
      { id: "p20", name: "Karen Robinson", patientId: "P-2025-020", age: 43, dateOfBirth: "05/03/1981", gender: "Female", status: "active", sAI: "Normal", mAI: "Negative", diagnosis: "Migraine evaluation", ctData: { scanDate: "27-04-2025", findings: "Normal brain parenchyma without acute findings", slices: 300 } },
      { id: "p21", name: "Daniel Walker", patientId: "P-2025-021", age: 50, dateOfBirth: "08/17/1974", gender: "Male", status: "pending", sAI: "Abnormal", mAI: "Cancer Positive", diagnosis: "Renal cell carcinoma", ctData: { scanDate: "28-04-2025", findings: "5.2cm heterogeneous right renal mass with renal vein extension", slices: 460 } },
      { id: "p22", name: "Betty Hall", patientId: "P-2025-022", age: 57, dateOfBirth: "12/21/1967", gender: "Female", status: "active", sAI: "Urgent", mAI: "Negative", diagnosis: "Diverticulitis", ctData: { scanDate: "29-04-2025", findings: "Sigmoid diverticulitis with localized abscess formation", slices: 400 } },
      { id: "p23", name: "Paul Allen", patientId: "P-2025-023", age: 48, dateOfBirth: "04/06/1976", gender: "Male", status: "completed", sAI: "Normal", mAI: "Negative", diagnosis: "Chest pain workup", ctData: { scanDate: "30-04-2025", findings: "No acute cardiopulmonary process", slices: 380 } },
      { id: "p24", name: "Sandra Young", patientId: "P-2025-024", age: 40, dateOfBirth: "10/11/1984", gender: "Female", status: "active", sAI: "Abnormal", mAI: "Negative", diagnosis: "Crohn's disease", ctData: { scanDate: "01-05-2025", findings: "Terminal ileitis with inflammatory stricture", slices: 420 } }
    ];

    additionalPatients.forEach(p => {
      const patient: Patient & { ctData?: any; sAI?: string; mAI?: string; diagnosis?: string } = {
        ...p,
        createdAt: new Date()
      };
      this.patients.set(patient.id, patient as Patient);
    });

    // Create mock timepoints for oncology workflow
    const timepoint1: Timepoint = {
      id: "tp1",
      patientId: "p1",
      studyId: "s1",
      studyDate: "07/10/25",
      description: "Baseline Study",
      isBaseline: true,
      createdAt: new Date(),
    };

    const timepoint2: Timepoint = {
      id: "tp2", 
      patientId: "p1",
      studyId: "s1",
      studyDate: "05/15/25",
      description: "Mid-Treatment Assessment",
      isBaseline: false,
      createdAt: new Date(),
    };

    const timepoint3: Timepoint = {
      id: "tp3",
      patientId: "p1", 
      studyId: "s1",
      studyDate: "03/01/25",
      description: "Pre-Treatment Baseline",
      isBaseline: false,
      createdAt: new Date(),
    };

    this.timepoints.set(timepoint1.id, timepoint1);
    this.timepoints.set(timepoint2.id, timepoint2);
    this.timepoints.set(timepoint3.id, timepoint3);

    // Create mock imaging studies
    const study1: ImagingStudy = {
      id: "s1",
      patientId: "p1",
      studyType: "CT Brain",
      studyDate: "07/10/25",
      description: "CT Brain without contrast",
      status: "active",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      sliceCount: 120,
      currentSlice: 60,
      createdAt: new Date(),
    };

    const study2: ImagingStudy = {
      id: "s2",
      patientId: "p2",
      studyType: "MRI Brain",
      studyDate: "06/10/25",
      description: "MRI Brain with contrast",
      status: "pending",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      sliceCount: 180,
      currentSlice: 90,
      createdAt: new Date(),
    };

    this.imagingStudies.set(study1.id, study1);
    this.imagingStudies.set(study2.id, study2);
  }

  // Patient methods
  async getPatient(id: string): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (patient) {
      // Include ctData if available
      return { ...patient } as Patient;
    }
    return undefined;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient: Patient = {
      ...insertPatient,
      id,
      createdAt: new Date(),
      status: insertPatient.status || "active",
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    
    const updatedPatient = { ...patient, ...updates };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  // Imaging Study methods
  async getImagingStudy(id: string): Promise<ImagingStudy | undefined> {
    return this.imagingStudies.get(id);
  }

  async getImagingStudiesByPatient(patientId: string): Promise<ImagingStudy[]> {
    return Array.from(this.imagingStudies.values()).filter(study => study.patientId === patientId);
  }

  async getAllImagingStudies(): Promise<ImagingStudy[]> {
    return Array.from(this.imagingStudies.values());
  }

  async getAllAiAnalyses(): Promise<AiAnalysis[]> {
    return Array.from(this.aiAnalyses.values());
  }

  async createImagingStudy(insertStudy: InsertImagingStudy): Promise<ImagingStudy> {
    const id = randomUUID();
    const study: ImagingStudy = {
      ...insertStudy,
      id,
      createdAt: new Date(),
      status: insertStudy.status || "pending",
    };
    this.imagingStudies.set(id, study);
    return study;
  }

  async updateImagingStudy(id: string, updates: Partial<InsertImagingStudy>): Promise<ImagingStudy | undefined> {
    const study = this.imagingStudies.get(id);
    if (!study) return undefined;
    
    const updatedStudy = { ...study, ...updates };
    this.imagingStudies.set(id, updatedStudy);
    return updatedStudy;
  }

  // AI Analysis methods
  async getAiAnalysesByStudy(studyId: string): Promise<AiAnalysis[]> {
    return Array.from(this.aiAnalyses.values()).filter(analysis => analysis.studyId === studyId);
  }

  async createAiAnalysis(insertAnalysis: InsertAiAnalysis): Promise<AiAnalysis> {
    const id = randomUUID();
    const analysis: AiAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
      status: insertAnalysis.status || "pending",
    };
    this.aiAnalyses.set(id, analysis);
    return analysis;
  }

  async updateAiAnalysis(id: string, updates: Partial<InsertAiAnalysis>): Promise<AiAnalysis | undefined> {
    const analysis = this.aiAnalyses.get(id);
    if (!analysis) return undefined;
    
    const updatedAnalysis = { ...analysis, ...updates };
    this.aiAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  // Report methods
  async getReportByStudy(studyId: string): Promise<Report | undefined> {
    return Array.from(this.reports.values()).find(report => report.studyId === studyId);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      ...insertReport,
      id,
      createdAt: new Date(),
      status: insertReport.status || "draft",
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReport(id: string, updates: Partial<InsertReport>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  // Annotation methods
  async getAnnotationsByStudy(studyId: string): Promise<Annotation[]> {
    return Array.from(this.annotations.values()).filter(annotation => annotation.studyId === studyId);
  }

  async createAnnotation(insertAnnotation: InsertAnnotation): Promise<Annotation> {
    const id = randomUUID();
    const annotation: Annotation = {
      ...insertAnnotation,
      id,
      createdAt: new Date(),
      type: insertAnnotation.type || "point",
    };
    this.annotations.set(id, annotation);
    return annotation;
  }

  async deleteAnnotation(id: string): Promise<boolean> {
    return this.annotations.delete(id);
  }

  // Measurement methods
  async getMeasurementsByStudy(studyId: string): Promise<Measurement[]> {
    return Array.from(this.measurements.values()).filter(measurement => measurement.studyId === studyId);
  }

  async createMeasurement(insertMeasurement: InsertMeasurement): Promise<Measurement> {
    const id = randomUUID();
    const measurement: Measurement = {
      ...insertMeasurement,
      id,
      createdAt: new Date(),
      category: insertMeasurement.category || "target",
    };
    this.measurements.set(id, measurement);
    return measurement;
  }

  async updateMeasurement(id: string, updates: Partial<InsertMeasurement>): Promise<Measurement | undefined> {
    const measurement = this.measurements.get(id);
    if (!measurement) return undefined;
    
    const updatedMeasurement = { ...measurement, ...updates };
    this.measurements.set(id, updatedMeasurement);
    return updatedMeasurement;
  }

  async deleteMeasurement(id: string): Promise<boolean> {
    return this.measurements.delete(id);
  }

  // Timepoint methods
  async getTimepointsByPatient(patientId: string): Promise<Timepoint[]> {
    return Array.from(this.timepoints.values()).filter(timepoint => timepoint.patientId === patientId);
  }

  async createTimepoint(insertTimepoint: InsertTimepoint): Promise<Timepoint> {
    const id = randomUUID();
    const timepoint: Timepoint = {
      ...insertTimepoint,
      id,
      createdAt: new Date(),
    };
    this.timepoints.set(id, timepoint);
    return timepoint;
  }

  async updateTimepoint(id: string, updates: Partial<InsertTimepoint>): Promise<Timepoint | undefined> {
    const timepoint = this.timepoints.get(id);
    if (!timepoint) return undefined;
    
    const updatedTimepoint = { ...timepoint, ...updates };
    this.timepoints.set(id, updatedTimepoint);
    return updatedTimepoint;
  }
}

export const storage = new MemStorage();
