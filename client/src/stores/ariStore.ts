import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AriCapabilityId } from "@shared/ari/capabilities";
import { logErModeSession } from "@/lib/ariTelemetry";

export type AriMode = "ari" | "er";

export interface AriAttachment {
  type: "image" | "pdf" | "document";
  mediaType: string;
  data: string;
  filename: string;
  sizeBytes?: number;
  pageCount?: number;
  textPreview?: string;
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
  mode?: AriMode;
}

export interface ModeSwitchEvent {
  from: AriMode;
  to: AriMode;
  at: number;
}

interface ErSessionStart {
  mode: AriMode;
  at: number;
  capabilityAtStart: AriCapabilityId;
  messageCountAtStart: number;
}

interface AriState {
  mode: AriMode;
  capability: AriCapabilityId;
  attachments: AriAttachment[];
  messages: AriMessage[];
  locationProvided: boolean;
  measurementConfirmed: boolean;
  modeHistory: ModeSwitchEvent[];
  sessionStartedAt: number;
  // Telemetry helper — not persisted across reloads on purpose.
  _erSessionStart?: ErSessionStart;

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
  modeHistory: [] as ModeSwitchEvent[],
  sessionStartedAt: Date.now(),
};

export const useAriStore = create<AriState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setMode: (mode) => {
        const state = get();
        if (state.mode === mode) return;
        const now = Date.now();
        const event: ModeSwitchEvent = {
          from: state.mode,
          to: mode,
          at: now,
        };
        // If we're leaving ER mode, fire a telemetry event with session shape.
        if (state.mode === "er" && state._erSessionStart) {
          const start = state._erSessionStart;
          logErModeSession({
            capability: start.capabilityAtStart,
            durationMs: now - start.at,
            messageCount: state.messages.length - start.messageCountAtStart,
          });
        }
        const nextEr =
          mode === "er"
            ? {
                mode,
                at: now,
                capabilityAtStart: state.capability,
                messageCountAtStart: state.messages.length,
              }
            : undefined;
        set({
          mode,
          modeHistory: [...state.modeHistory, event],
          _erSessionStart: nextEr,
          // Switching INTO ER also clears attachments per ER rules.
          attachments: mode === "er" ? [] : state.attachments,
        });
      },

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
        set((s) => ({
          messages: [
            ...s.messages,
            { ...message, mode: message.mode || s.mode },
          ],
        })),

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
          modeHistory: s.modeHistory,
          sessionStartedAt: s.sessionStartedAt,
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
        modeHistory: s.modeHistory,
        sessionStartedAt: s.sessionStartedAt,
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
  /\b\d{5}\b/,
];

export function detectLocationInText(text: string): boolean {
  if (!text) return false;
  return LOCATION_HINTS.some((re) => re.test(text));
}
