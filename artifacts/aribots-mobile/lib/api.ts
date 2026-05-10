import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "aribots_jwt_token";
const BASE_URL_KEY = "aribots_base_url";

let cachedToken: string | null = null;
let cachedBaseUrl: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
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

function getBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    cachedBaseUrl = `https://${domain}`;
    return cachedBaseUrl;
  }
  return "";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function streamAriChat(
  query: string,
  mode: "ari" | "er",
  capability: string | null,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
): Promise<void> {
  const { fetch: expoFetch } = await import("expo/fetch");
  const headers = await getAuthHeaders();
  const baseUrl = getBaseUrl();

  const res = await expoFetch(`${baseUrl}/api/mobile/ari/chat`, {
    method: "POST",
    headers: { ...headers, Accept: "text/event-stream" },
    body: JSON.stringify({ query, mode, capability }),
  });

  if (!res.ok) {
    onError("Failed to connect to Ari");
    return;
  }

  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data.trim()) onDelta(data);
      } else if (line.startsWith("event: done")) {
        onDone();
        return;
      } else if (line.startsWith("event: error")) {
        onError("Ari encountered an error");
        return;
      }
    }
  }
  onDone();
}
