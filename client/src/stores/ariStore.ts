import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AriCapabilityId } from "@shared/ari/capabilities";

export type AriMode = "ari" | "er";

export interface AriAttachment {
  type: "image" | "pdf" | "document";
  mediaType: string;
  data: string;
  filename: string;
  previewUrl?: string;
}

export interface AriBlock {
  kind: string;
  raw: string;
  data?: unknown;
}

export interface AriMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsedBlocks?: AriBlock[];
  timestamp: number;
}

interface AriState {
  mode: AriMode;
  capability: AriCapabilityId;
  attachments: AriAttachment[];
  messages: AriMessage[];
  locationProvided: boolean;
  measurementConfirmed: boolean;

  setMode: (mode: AriMode) => void;
  setCapability: (capability: AriCapabilityId) => void;
  addAttachment: (attachment: AriAttachment) => void;
  removeAttachment: (filename: string) => void;
  clearAttachments: () => void;
  addMessage: (message: AriMessage) => void;
  appendToLastMessage: (delta: string) => void;
  setLocationProvided: (v: boolean) => void;
  setMeasurementConfirmed: (v: boolean) => void;
  resetSession: () => void;
}

const DEFAULT_STATE = {
  mode: "ari" as AriMode,
  capability: "antibiotic_stewardship" as AriCapabilityId,
  attachments: [] as AriAttachment[],
  messages: [] as AriMessage[],
  locationProvided: false,
  measurementConfirmed: false,
};

export const useAriStore = create<AriState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setMode: (mode) => set({ mode }),

      setCapability: (capability) =>
        set({
          capability,
          // Reset gate flags when capability changes — gates are capability-specific.
          locationProvided: false,
          measurementConfirmed: false,
        }),

      addAttachment: (attachment) =>
        set((s) => ({ attachments: [...s.attachments, attachment] })),

      removeAttachment: (filename) =>
        set((s) => ({
          attachments: s.attachments.filter((a) => a.filename !== filename),
        })),

      clearAttachments: () => set({ attachments: [] }),

      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, message] })),

      appendToLastMessage: (delta) =>
        set((s) => {
          if (s.messages.length === 0) return s;
          const last = s.messages[s.messages.length - 1];
          const updated: AriMessage = {
            ...last,
            content: last.content + delta,
          };
          return {
            messages: [...s.messages.slice(0, -1), updated],
          };
        }),

      setLocationProvided: (v) => set({ locationProvided: v }),
      setMeasurementConfirmed: (v) => set({ measurementConfirmed: v }),

      resetSession: () =>
        set((s) => ({
          ...DEFAULT_STATE,
          // Preserve current mode/capability across resets — clinicians usually
          // want to clear the conversation, not reset their tool selection.
          mode: s.mode,
          capability: s.capability,
        })),
    }),
    {
      name: "ari-session",
      storage: createJSONStorage(() => sessionStorage),
      // Don't persist attachments — they're large base64 blobs and shouldn't
      // outlive the tab.
      partialize: (s) => ({
        mode: s.mode,
        capability: s.capability,
        messages: s.messages,
        locationProvided: s.locationProvided,
        measurementConfirmed: s.measurementConfirmed,
      }),
    }
  )
);

// Heuristic: detect whether the user mentioned a location/facility in their
// query. Used only to soften the antibiotic_stewardship gate UI — the backend
// still receives the raw query and applies its own rules.
const LOCATION_HINTS = [
  /\b(hospital|clinic|icu|micu|sicu|ccu|emergency department|\bed\b|\ber\b|ward|floor|unit|facility|center|centre|county)\b/i,
  /\bin [A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*(?:,\s*[A-Z]{2})?\b/,
];

export function detectLocationInText(text: string): boolean {
  if (!text) return false;
  return LOCATION_HINTS.some((re) => re.test(text));
}
