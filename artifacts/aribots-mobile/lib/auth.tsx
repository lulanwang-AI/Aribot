import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPost, setToken, clearToken, getToken } from "./api";

interface User {
  id: string;
  username: string;
  name?: string;
  specialty?: string;
  subspecialty?: string;
  hospital?: string;
  city?: string;
  state?: string;
  credential?: string;
  avatarUrl?: string;
  verified?: boolean;
  role?: string;
  yearsExperience?: number;
  bio?: string;
  badges?: string[];
  interests?: string[];
  rankingScore?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const me = await apiGet<User>("/api/mobile/auth/me");
      setUser(me);
    } catch {
      await clearToken();
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const res = await apiPost<{ token: string; user: User }>("/api/mobile/auth/login", { email, password });
    await setToken(res.token);
    setUser(res.user);
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const me = await apiGet<User>("/api/mobile/auth/me");
      setUser(me);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
