import { createContext, useContext } from "react";

export const AuthContext = createContext<{ signOut: () => void }>({ signOut: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}
