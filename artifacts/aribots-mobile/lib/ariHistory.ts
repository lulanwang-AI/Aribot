import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AriHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AriSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: AriHistoryMessage[];
}

const KEY_PREFIX = "aribots_ari_history:";
const MAX_SESSIONS = 50;

function keyFor(userId: string) {
  return KEY_PREFIX + userId;
}

// Serialize all read-modify-write operations so concurrent saves/deletes
// on the same key can't lose updates.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

async function readSessions(userId: string): Promise<AriSession[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSessions(userId: string): Promise<AriSession[]> {
  return enqueue(() => readSessions(userId));
}

export function saveSession(userId: string, session: AriSession): Promise<void> {
  return enqueue(async () => {
    const sessions = await readSessions(userId);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  });
}

export function deleteSession(userId: string, id: string): Promise<void> {
  return enqueue(async () => {
    const sessions = await readSessions(userId);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(sessions.filter(s => s.id !== id)));
  });
}

/** Remove every stored Ari conversation on this device (all users). Called on sign-out. */
export function clearAllAriHistory(): Promise<void> {
  return enqueue(async () => {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter(k => k.startsWith(KEY_PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  });
}
