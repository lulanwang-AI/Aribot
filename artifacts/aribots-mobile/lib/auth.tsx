import React, { createContext, useContext, useEffect, useState } from "react";
import { isAuthed, login as apiLogin, logout as apiLogout } from "./api";

type AuthState = {
  authed: boolean;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  authed: false,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setAuthed(await isAuthed());
      setReady(true);
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authed,
        ready,
        signIn: async (email, password) => {
          await apiLogin(email, password);
          setAuthed(true);
        },
        signOut: async () => {
          await apiLogout();
          setAuthed(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
