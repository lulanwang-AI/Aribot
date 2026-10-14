import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * HTTP layer for the Ari AMR mobile app.
 *
 * Sign-in uses the mobile JWT issued by POST /api/mobile/auth/login. The API
 * server accepts that token as a bearer credential on every web API route,
 * which is how this app reaches the stewardship routes under /api/amr.
 */

const TOKEN_KEY = "amr_mobile_jwt";

let cachedToken: string | null | undefined;
let cachedBaseUrl: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string) {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function getBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    cachedBaseUrl = `https://${domain}`;
    return cachedBaseUrl;
  }
  // The web build is served from the same domain as the API.
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    cachedBaseUrl = window.location.origin;
    return cachedBaseUrl;
  }
  return "";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.message) return String(body.message);
  } catch {
    // Non-JSON error body: fall through to the status text.
  }
  return res.statusText || `Request failed (${res.status})`;
}

export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const headers = await authHeaders();
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Streams an Ari answer. The server emits SSE `data:` frames with text deltas
 * and finishes with `event: done`. Newlines inside a delta arrive as extra
 * `data:` lines, so consecutive data lines are joined back with "\n".
 */
export async function streamAriChat(
  query: string,
  handlers: { onDelta: (text: string) => void; onDone: () => void; onError: (message: string) => void },
): Promise<void> {
  const { fetch: expoFetch } = await import("expo/fetch");
  const headers = await authHeaders();
  const res = await expoFetch(`${getBaseUrl()}/api/mobile/ari/chat`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ query, mode: "ari" }),
  });
  if (!res.ok || !res.body) {
    handlers.onError(await readError(res as unknown as Response));
    return;
  }

  const reader = (res.body as unknown as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  const flush = (): boolean => {
    if (eventName === "done") return true;
    if (eventName === "error") {
      handlers.onError("Ari is temporarily unavailable.");
      return true;
    }
    if (dataLines.length) handlers.onDelta(dataLines.join("\n"));
    eventName = "";
    dataLines = [];
    return false;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line === "") {
        if (flush()) {
          handlers.onDone();
          return;
        }
      } else if (line.startsWith("event: ")) {
        eventName = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      } else if (line === "data:") {
        dataLines.push("");
      }
    }
  }
  flush();
  handlers.onDone();
}
