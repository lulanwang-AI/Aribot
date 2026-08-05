import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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

export interface AriImageAttachment {
  mediaType: string; // image/jpeg | image/png | image/webp | image/gif
  data: string; // base64 (no data: prefix)
}

export async function streamAriChat(
  query: string,
  mode: "ari" | "er",
  capability: string | null,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  images?: AriImageAttachment[]
): Promise<void> {
  const { fetch: expoFetch } = await import("expo/fetch");
  const headers = await getAuthHeaders();
  const baseUrl = getBaseUrl();

  const res = await expoFetch(`${baseUrl}/api/mobile/ari/chat`, {
    method: "POST",
    headers: { ...headers, Accept: "text/event-stream" },
    body: JSON.stringify({ query, mode, capability, images: images?.length ? images : undefined }),
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

// ── Ari voice: speech-to-text ───────────────────────────────────────────────
// Uploads a recorded audio file to the API, which forwards it to ElevenLabs
// Scribe and returns { text }.
export async function transcribeAriAudio(uri: string, mimeType: string): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  if (uri.startsWith("blob:") || uri.startsWith("data:")) {
    // Web: fetch the blob and append it directly
    const blob = await fetch(uri).then(r => r.blob());
    form.append("audio", blob, "speech.webm");
  } else {
    // Native: React Native FormData file descriptor
    form.append("audio", { uri, name: "speech.m4a", type: mimeType } as any);
  }
  const res = await fetch(`${getBaseUrl()}/api/mobile/ari/voice/stt`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.text || "").trim();
}

export async function synthesizeAriSpeech(text: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBaseUrl()}/api/mobile/ari/voice/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  if (Platform.OS === "web") {
    return URL.createObjectURL(blob);
  }
  // Native: expo-audio can't play blob URIs, so persist the MP3 to the app
  // cache and hand back a file:// URI.
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Failed to read audio data."));
    reader.readAsDataURL(blob);
  });
  const FileSystem = await import("expo-file-system/legacy");
  const fileUri = `${FileSystem.cacheDirectory}ari-tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}
