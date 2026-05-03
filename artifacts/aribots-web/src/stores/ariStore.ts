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
  capabilityAtStart: AriCapabilityId | null;
  messageCountAtStart: number;
}

// One conversation tab. Each tab is its own independent Ari session.
export interface AriTab {
  id: string;
  title: string;
  mode: AriMode;
  // No default capability — when null, Ari auto-infers from the query.
  capability: AriCapabilityId | null;
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
  // Bumped every time a message is added or streamed into. Used to sort
  // the History panel so the most recent conversations float to the top.
  updatedAt: number;
  // Telemetry helper — not persisted across reloads on purpose.
  _erSessionStart?: ErSessionStart;
}

interface AriState {
  // Tab management ────────────────────────────────────────────
  tabs: AriTab[];
  activeTabId: string;

  // Mirrored from the active tab so existing selectors keep working.
  mode: AriMode;
  capability: AriCapabilityId | null;
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
  // History actions — wipe every saved conversation and start a fresh tab.
  clearHistory: () => void;

  // Existing actions — operate on the active tab.
  setMode: (mode: AriMode) => void;
  setCapability: (capability: AriCapabilityId | null) => void;
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

// Cap on how many past chats are kept in localStorage. 100 strikes a
// balance between long-term recall and keeping the persisted blob small
// enough to load fast on every page open.
const MAX_HISTORY_TABS = 100;

const PERSIST_KEY = "ari-session";

// One-shot bridge: in earlier builds the store used sessionStorage. When
// users upgrade to v4 we want their in-progress chats to carry over
// instead of being silently dropped. Run before zustand's persist middleware
// reads from localStorage.
function bridgeSessionStorageToLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(PERSIST_KEY)) return; // already migrated
    const legacy = window.sessionStorage.getItem(PERSIST_KEY);
    if (!legacy) return;
    window.localStorage.setItem(PERSIST_KEY, legacy);
    window.sessionStorage.removeItem(PERSIST_KEY);
  } catch {
    // Quota / privacy mode — fail silently, the user just starts fresh.
  }
}
bridgeSessionStorageToLocalStorage();

function makeTabId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTab(overrides: Partial<AriTab> = {}): AriTab {
  const now = Date.now();
  return {
    id: makeTabId(),
    title: "New chat",
    mode: "ari",
    capability: null,
    additionalCapabilities: [],
    attachments: [],
    messages: [],
    draft: "",
    locationProvided: false,
    measurementConfirmed: false,
    modeHistory: [],
    sessionStartedAt: now,
    updatedAt: now,
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

      clearHistory: () => {
        const fresh = createTab();
        set({
          tabs: [fresh],
          activeTabId: fresh.id,
          ...mirror(fresh),
        });
      },

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
            capability: start.capabilityAtStart ?? "auto",
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
            // Clicking the current primary clears it — capabilities are all
            // optional and there is no required default.
            if (t.capability === id) {
              if (t.additionalCapabilities.length === 0) {
                return {
                  ...t,
                  capability: null,
                  additionalCapabilities: [],
                  locationProvided: false,
                  measurementConfirmed: false,
                };
              }
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
            // First capability picked becomes primary; otherwise added as
            // an additional perspective.
            if (t.capability === null) {
              return {
                ...t,
                capability: id,
                locationProvided: false,
                measurementConfirmed: false,
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
                ...(previousPrimary ? [previousPrimary] : []),
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
              updatedAt: Date.now(),
            };
          })
        ),

      // NOTE: We intentionally do NOT bump `updatedAt` on every streaming
      // delta. It would cause `persist` to re-serialize the whole tab list
      // to localStorage on every chunk, which thrashes the main thread
      // during long replies. `addMessage` already bumps `updatedAt` when the
      // assistant message is first created, which is enough granularity for
      // History sorting (chats are still ordered by their start time, and
      // the next user reply will bump it again).
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
      // v3 → capability is now optional.
      // v4 → chat history persists across browser sessions (localStorage)
      //      and each tab gains an `updatedAt` field for History sorting.
      version: 4,
      storage: createJSONStorage(() => localStorage),
      // Persist tabs (minus heavy attachment blobs). Cap at MAX_HISTORY_TABS
      // to keep localStorage from ballooning indefinitely. Mirror fields
      // are recomputed on rehydrate so we don't bother storing them.
      partialize: (s) => {
        const sorted = [...s.tabs].sort((a, b) => b.updatedAt - a.updatedAt);
        const kept = sorted.slice(0, MAX_HISTORY_TABS);
        const keptIds = new Set(kept.map((t) => t.id));
        return {
          tabs: kept.map((t) => ({ ...t, attachments: [] })),
          // If the active tab was pruned, fall back to the most recent.
          activeTabId: keptIds.has(s.activeTabId)
            ? s.activeTabId
            : kept[0]?.id || s.activeTabId,
        };
      },
      migrate: (persisted, fromVersion) => {
        const p = persisted as Partial<AriState> | undefined;
        if (!p?.tabs) return p as any;
        let tabs = p.tabs as any[];
        if (fromVersion < 3) {
          tabs = tabs.map((t: any) => ({
            ...t,
            // Only clear capability for empty tabs — preserve the choice
            // for any tab that already has a conversation in progress so
            // continuing answers stay consistent.
            capability:
              Array.isArray(t.messages) && t.messages.length > 0
                ? t.capability
                : null,
          }));
        }
        if (fromVersion < 4) {
          // Backfill updatedAt from sessionStartedAt (or now) so existing
          // tabs sort sensibly in the History panel.
          tabs = tabs.map((t: any) => ({
            ...t,
            updatedAt: t.updatedAt ?? t.sessionStartedAt ?? Date.now(),
          }));
        }
        return { ...p, tabs } as any;
      },
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
