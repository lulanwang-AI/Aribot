import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, clearToken, getToken, setToken } from "./api";

export interface Clinician {
  id: string;
  username: string;
  name?: string;
  specialty?: string;
  hospital?: string;
  credential?: string;
  role?: string;
}

interface AuthContextValue {
  user: Clinician | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const DEMO_EMAIL = "demo@aribots.local";
export const DEMO_PASSWORD = "demo";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Clinician | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        if (!(await getToken())) return;
        setUser(await api<Clinician>("/api/mobile/auth/me"));
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: Clinician }>("/api/mobile/auth/login", {
      method: "POST",
      body: { email: email.trim(), password },
    });
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
