import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WorkflowRecord {
  id: string;
  completedAt: string;
  patientName: string;
  dob: string;
  mrn: string;
  sex: string;
  specialty: string;
  visitType: string;
  chiefComplaint: string;
  medications: string;
  allergies: string;
  pmh: string;
  soapDraft: { S: string; O: string; A: string; P: string };
  visitSummary: Record<string, any> | null;
  summaryApproved: boolean;
  exportedToEHR: boolean;
}

interface WorkflowHistoryState {
  records: WorkflowRecord[];
  addRecord: (record: Omit<WorkflowRecord, "id" | "completedAt">) => void;
  markExported: (id: string) => void;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
}

export const useWorkflowHistory = create<WorkflowHistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (record) =>
        set((state) => ({
          records: [
            {
              ...record,
              id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              completedAt: new Date().toISOString(),
            },
            ...state.records,
          ],
        })),
      markExported: (id) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, exportedToEHR: true } : r
          ),
        })),
      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),
      clearAll: () => set({ records: [] }),
    }),
    {
      name: "aribot-workflow-history",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ records: state.records }),
    }
  )
);
