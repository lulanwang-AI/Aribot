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

// One conversation tab. Each tab is its own independent Ari session.
export interface AriTab {
  id: string;
  title: string;
  mode: AriMode;
  capability: AriCapabilityId;
  additionalCapabilities: AriCapabilityId[];
  attachments: AriAttachment[];
  messages: AriMessage[];
  // In-progress composer draft — kept per-tab so switching tabs preserves
  // unsent text in each.
  draft: string;
  locationProvided: boolean;
  measurementConfirmed: boolean;
  modeHistory: ModeSwitchEvent[];
  sessionStartedAt: number;
  // Telemetry helper — not persisted across reloads on purpose.
  _erSessionStart?: ErSessionStart;
}

interface AriState {
  // Tab management ────────────────────────────────────────────
  tabs: AriTab[];
  activeTabId: string;

  // Mirrored from the active tab so existing selectors keep working.
  mode: AriMode;
  capability: AriCapabilityId;
  additionalCapabilities: AriCapabilityId[];
  attachments: AriAttachment[];
  messages: AriMessage[];
  draft: string;
  locationProvided: boolean;
  measurementConfirmed: boolean;
  modeHistory: ModeSwitchEvent[];
  sessionStartedAt: number;
  _erSessionStart?: ErSessionStart;

  // Tab actions
  newTab: () => string;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;

  // Existing actions — operate on the active tab.
  setMode: (mode: AriMode) => void;
  setCapability: (capability: AriCapabilityId) => void;
  toggleCapability: (id: AriCapabilityId) => void;
  promoteCapability: (id: AriCapabilityId) => void;
  addAttachment: (attachment: AriAttachment) => void;
  removeAttachment: (filename: string) => void;
  clearAttachments: () => void;
  addMessage: (message: AriMessage) => void;
  appendToLastMessage: (delta: string) => void;
  setDraft: (text: string) => void;
  setLocationProvided: (v: boolean) => void;
  setMeasurementConfirmed: (v: boolean) => void;
  resetSession: () => void;
}

function makeTabId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTab(overrides: Partial<AriTab> = {}): AriTab {
  return {
    id: makeTabId(),
    title: "New chat",
    mode: "ari",
    capability: "antibiotic_stewardship",
    additionalCapabilities: [],
    attachments: [],
    messages: [],
    draft: "",
    locationProvided: false,
    measurementConfirmed: false,
    modeHistory: [],
    sessionStartedAt: Date.now(),
    ...overrides,
  };
}

// Pull the per-tab fields out of a tab so we can spread them as the
// top-level mirror.
function mirror(tab: AriTab) {
  return {
    mode: tab.mode,
    capability: tab.capability,
    additionalCapabilities: tab.additionalCapabilities,
    attachments: tab.attachments,
    messages: tab.messages,
    draft: tab.draft,
    locationProvided: tab.locationProvided,
    measurementConfirmed: tab.measurementConfirmed,
    modeHistory: tab.modeHistory,
    sessionStartedAt: tab.sessionStartedAt,
    _erSessionStart: tab._erSessionStart,
  };
}

// Apply an updater to the active tab and return the new tabs array PLUS the
// mirrored top-level fields. If the active tab is missing (defensive), this
// is a no-op.
function applyToActive(
  state: AriState,
  updater: (tab: AriTab) => AriTab
): Partial<AriState> {
  const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
  if (idx === -1) return {};
  const nextTab = updater(state.tabs[idx]);
  const nextTabs = state.tabs.slice();
  nextTabs[idx] = nextTab;
  return { tabs: nextTabs, ...mirror(nextTab) };
}

function deriveTitleFromUserMessage(text: string): string {
  const cleaned = text
    .replace(/^\[Also bring perspectives from:[^\]]*\]\s*/i, "")
    .trim();
  if (!cleaned) return "New chat";
  const firstLine = cleaned.split(/\r?\n/)[0];
  return firstLine.length > 32 ? firstLine.slice(0, 32) + "…" : firstLine;
}

const INITIAL_TAB = createTab();
const INITIAL_STATE = {
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  ...mirror(INITIAL_TAB),
};

export const useAriStore = create<AriState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Tab actions ───────────────────────────────────────────
      newTab: () => {
        const tab = createTab();
        set((s) => ({
          tabs: [...s.tabs, tab],
          activeTabId: tab.id,
          ...mirror(tab),
        }));
        return tab.id;
      },

      closeTab: (id) => {
        const state = get();
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        // Always keep at least one tab open. If closing the last one,
        // replace it with a fresh blank tab so the chat is never empty.
        let nextTabs = state.tabs.filter((t) => t.id !== id);
        if (nextTabs.length === 0) {
          nextTabs = [createTab()];
        }
        let nextActive = state.activeTabId;
        if (state.activeTabId === id) {
          // Pick the neighbor: try same index, fall back to last.
          const fallback = nextTabs[Math.min(idx, nextTabs.length - 1)];
          nextActive = fallback.id;
        }
        const activeTab =
          nextTabs.find((t) => t.id === nextActive) ?? nextTabs[0];
        set({
          tabs: nextTabs,
          activeTabId: activeTab.id,
          ...mirror(activeTab),
        });
      },

      switchTab: (id) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab || tab.id === state.activeTabId) return;
        set({ activeTabId: tab.id, ...mirror(tab) });
      },

      renameTab: (id, title) =>
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === id);
          if (idx === -1) return s;
          const next = { ...s.tabs[idx], title };
          const nextTabs = s.tabs.slice();
          nextTabs[idx] = next;
          // Mirror only if it's the active tab (title isn't mirrored, but
          // we still want to set tabs).
          return { tabs: nextTabs };
        }),

      // ── Per-tab actions ───────────────────────────────────────
      setMode: (mode) => {
        const state = get();
        const active = state.tabs.find((t) => t.id === state.activeTabId);
        if (!active || active.mode === mode) return;
        const now = Date.now();
        const event: ModeSwitchEvent = { from: active.mode, to: mode, at: now };
        if (active.mode === "er" && active._erSessionStart) {
          const start = active._erSessionStart;
          logErModeSession({
            capability: start.capabilityAtStart,
            durationMs: now - start.at,
            messageCount: active.messages.length - start.messageCountAtStart,
          });
        }
        const nextEr =
          mode === "er"
            ? {
                mode,
                at: now,
                capabilityAtStart: active.capability,
                messageCountAtStart: active.messages.length,
              }
            : undefined;
        set(
          applyToActive(state, (t) => ({
            ...t,
            mode,
            modeHistory: [...t.modeHistory, event],
            _erSessionStart: nextEr,
            // Switching INTO ER also clears attachments per ER rules.
            attachments: mode === "er" ? [] : t.attachments,
          }))
        );
      },

      setCapability: (capability) =>
        set((s) =>
          applyToActive(s, (t) => ({
            ...t,
            capability,
            additionalCapabilities: t.additionalCapabilities.filter(
              (c) => c !== capability
            ),
            locationProvided: false,
            measurementConfirmed: false,
          }))
        ),

      toggleCapability: (id) =>
        set((s) =>
          applyToActive(s, (t) => {
            if (t.capability === id) {
              if (t.additionalCapabilities.length === 0) return t;
              const [nextPrimary, ...rest] = t.additionalCapabilities;
              return {
                ...t,
                capability: nextPrimary,
                additionalCapabilities: rest,
                locationProvided: false,
                measurementConfirmed: false,
              };
            }
            if (t.additionalCapabilities.includes(id)) {
              return {
                ...t,
                additionalCapabilities: t.additionalCapabilities.filter(
                  (c) => c !== id
                ),
              };
            }
            return {
              ...t,
              additionalCapabilities: [...t.additionalCapabilities, id],
            };
          })
        ),

      promoteCapability: (id) =>
        set((s) =>
          applyToActive(s, (t) => {
            if (t.capability === id) return t;
            if (!t.additionalCapabilities.includes(id)) return t;
            const previousPrimary = t.capability;
            return {
              ...t,
              capability: id,
              additionalCapabilities: [
                previousPrimary,
                ...t.additionalCapabilities.filter((c) => c !== id),
              ],
              locationProvided: false,
              measurementConfirmed: false,
            };
          })
        ),

      addAttachment: (attachment) =>
        set((s) =>
          applyToActive(s, (t) => ({
            ...t,
            attachments: [...t.attachments, attachment],
          }))
        ),

      removeAttachment: (filename) =>
        set((s) =>
          applyToActive(s, (t) => ({
            ...t,
            attachments: t.attachments.filter((a) => a.filename !== filename),
          }))
        ),

      clearAttachments: () =>
        set((s) => applyToActive(s, (t) => ({ ...t, attachments: [] }))),

      addMessage: (message) =>
        set((s) =>
          applyToActive(s, (t) => {
            const stamped: AriMessage = { ...message, mode: message.mode || t.mode };
            // Auto-name the tab from the first user message.
            const isFirstUserMsg =
              message.role === "user" &&
              t.title === "New chat" &&
              t.messages.every((m) => m.role !== "user");
            return {
              ...t,
              title: isFirstUserMsg
                ? deriveTitleFromUserMessage(message.content)
                : t.title,
              messages: [...t.messages, stamped],
            };
          })
        ),

      appendToLastMessage: (delta) =>
        set((s) =>
          applyToActive(s, (t) => {
            if (t.messages.length === 0) return t;
            const last = t.messages[t.messages.length - 1];
            const updated: AriMessage = {
              ...last,
              content: last.content + delta,
            };
            return {
              ...t,
              messages: [...t.messages.slice(0, -1), updated],
            };
          })
        ),

      setDraft: (text) =>
        set((s) => applyToActive(s, (t) => ({ ...t, draft: text }))),

      setLocationProvided: (v) =>
        set((s) =>
          applyToActive(s, (t) => ({ ...t, locationProvided: v }))
        ),
      setMeasurementConfirmed: (v) =>
        set((s) =>
          applyToActive(s, (t) => ({ ...t, measurementConfirmed: v }))
        ),

      resetSession: () =>
        set((s) =>
          applyToActive(s, (t) => ({
            // Wipe conversation but keep tool selection (mode + capabilities).
            ...createTab(),
            id: t.id,
            title: t.title,
            mode: t.mode,
            capability: t.capability,
            additionalCapabilities: t.additionalCapabilities,
            modeHistory: t.modeHistory,
            sessionStartedAt: t.sessionStartedAt,
          }))
        ),
    }),
    {
      name: "ari-session",
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      // Persist tabs (minus heavy attachment blobs). Mirror fields are
      // recomputed on rehydrate so we don't bother storing them.
      partialize: (s) => ({
        tabs: s.tabs.map((t) => ({ ...t, attachments: [] })),
        activeTabId: s.activeTabId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AriState> | undefined;
        if (!p?.tabs?.length) return current;
        const activeTab =
          p.tabs.find((t) => t.id === p.activeTabId) ?? p.tabs[0];
        return {
          ...current,
          tabs: p.tabs,
          activeTabId: activeTab.id,
          ...mirror(activeTab),
        };
      },
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
