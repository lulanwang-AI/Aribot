import AsyncStorage from "@react-native-async-storage/async-storage";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
export const API_BASE = DOMAIN ? `https://${DOMAIN}` : "";

const COOKIE_KEY = "aribots_cookie";

export async function getCookie(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COOKIE_KEY);
  } catch {
    return null;
  }
}

async function setCookie(value: string | null) {
  if (!value) {
    await AsyncStorage.removeItem(COOKIE_KEY);
  } else {
    await AsyncStorage.setItem(COOKIE_KEY, value);
  }
}

function captureCookieFromHeaders(headers: Headers) {
  const setCookieHeader =
    (headers as any).get?.("set-cookie") ||
    (headers as any).get?.("Set-Cookie");
  if (setCookieHeader) {
    const match = /connect\.sid=[^;]+/.exec(setCookieHeader);
    if (match) {
      void setCookie(match[0]);
    }
  }
}

export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const cookie = await getCookie();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (cookie) headers["Cookie"] = cookie;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
  captureCookieFromHeaders(res.headers);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export async function login(email: string, password: string) {
  const cookie = await getCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  captureCookieFromHeaders(res.headers);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Login failed");
  }
  await AsyncStorage.setItem("aribots_authed", "1");
  return res.json();
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  await AsyncStorage.removeItem("aribots_authed");
  await setCookie(null);
}

export async function isAuthed(): Promise<boolean> {
  const v = await AsyncStorage.getItem("aribots_authed");
  return v === "1";
}
