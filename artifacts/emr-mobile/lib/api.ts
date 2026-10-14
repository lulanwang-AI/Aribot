import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * HTTP layer for the Ari EMR mobile app.
 *
 * The EMR runs below /ari-emr/ on the platform domain and its API lives at
 * /ari-emr/api/*. Sign-in returns a session token that the app sends as a
 * bearer credential; the EMR server honours it exactly like the browser's
 * session cookie.
 */

const TOKEN_KEY = "emr_mobile_session";

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

/** Origin of the platform, without the /ari-emr prefix. */
export function getOrigin(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    cachedBaseUrl = `https://${domain}`;
    return cachedBaseUrl;
  }
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    cachedBaseUrl = window.location.origin;
    return cachedBaseUrl;
  }
  return "";
}

export const EMR_BASE_PATH = "/ari-emr";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

/** Calls the EMR API. `path` is the EMR's own route, e.g. "/api/patients". */
export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${getOrigin()}${EMR_BASE_PATH}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
