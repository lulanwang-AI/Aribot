import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: "pdf" | "text" | "image";
  content: string;
  uploadedAt: string;
  size: number;
}

interface PatientSession {
  name: string;
  dob: string;
  mrn: string;
  sex: string;
  preferredLanguage: string;
  specialty: string;
  visitType: string;
  chiefComplaint: string;
  vitals: Record<string, string>;
  painScore: number;
  lmp: string;
  smokingStatus: string;
  alcoholUse: string;
  medications: string;
  allergies: string;
  pmh: string;
  psh: string;
  familyHistory: string;
  recentResults: string;
  encounterPrimer: string;
  preChartComplete: boolean;
  uploadedDocuments: UploadedDocument[];
  chatMessages: ChatMessage[];
  soapDraft: { S: string; O: string; A: string; P: string };
  soapOriginal: { S: string; O: string; A: string; P: string };
  soapEdited: { S: boolean; O: boolean; A: boolean; P: boolean };
  soapSigned: boolean;
  visitSummary: Record<string, any> | null;
  summaryApproved: boolean;
  setPatient: (data: Partial<PatientSession>) => void;
  addDocument: (doc: UploadedDocument) => void;
  removeDocument: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  appendToLastAssistant: (chunk: string) => void;
  setSoap: (soap: { S: string; O: string; A: string; P: string }) => void;
  updateSoapSection: (section: "S" | "O" | "A" | "P", text: string) => void;
  markSectionEdited: (section: "S" | "O" | "A" | "P") => void;
  signSoap: () => void;
  setSummary: (summary: Record<string, any>) => void;
  approveSummary: () => void;
  resetSession: () => void;
}

const initialState = {
  name: "",
  dob: "",
  mrn: "",
  sex: "",
  preferredLanguage: "English",
  specialty: "Primary Care",
  visitType: "",
  chiefComplaint: "",
  vitals: {} as Record<string, string>,
  painScore: 0,
  lmp: "",
  smokingStatus: "",
  alcoholUse: "",
  medications: "",
  allergies: "",
  pmh: "",
  psh: "",
  familyHistory: "",
  recentResults: "",
  encounterPrimer: "",
  preChartComplete: false,
  uploadedDocuments: [] as UploadedDocument[],
  chatMessages: [] as ChatMessage[],
  soapDraft: { S: "", O: "", A: "", P: "" },
  soapOriginal: { S: "", O: "", A: "", P: "" },
  soapEdited: { S: false, O: false, A: false, P: false },
  soapSigned: false,
  visitSummary: null,
  summaryApproved: false,
};

export const usePatientStore = create<PatientSession>()(
  persist(
    (set) => ({
      ...initialState,
      setPatient: (data) => set((state) => ({ ...state, ...data })),
      addDocument: (doc) =>
        set((state) => ({ uploadedDocuments: [...state.uploadedDocuments, doc] })),
      removeDocument: (id) =>
        set((state) => ({ uploadedDocuments: state.uploadedDocuments.filter(d => d.id !== id) })),
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      appendToLastAssistant: (chunk) =>
        set((state) => {
          const msgs = [...state.chatMessages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
          }
          return { chatMessages: msgs };
        }),
      setSoap: (soap) =>
        set({
          soapDraft: { ...soap },
          soapOriginal: { ...soap },
          soapEdited: { S: false, O: false, A: false, P: false },
        }),
      updateSoapSection: (section, text) =>
        set((state) => ({
          soapDraft: { ...state.soapDraft, [section]: text },
        })),
      markSectionEdited: (section) =>
        set((state) => ({
          soapEdited: { ...state.soapEdited, [section]: true },
        })),
      signSoap: () => set({ soapSigned: true }),
      setSummary: (summary) => set({ visitSummary: summary }),
      approveSummary: () => set({ summaryApproved: true }),
      resetSession: () => set(initialState),
    }),
    {
      name: "aribot-patient-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => {
        const { setPatient, addDocument, removeDocument, addChatMessage, appendToLastAssistant, setSoap, updateSoapSection, markSectionEdited, signSoap, setSummary, approveSummary, resetSession, ...rest } = state;
        return rest;
      },
    }
  )
);
