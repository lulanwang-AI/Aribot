import { useState, useCallback, useEffect } from "react";

export type AppRole = "physician" | "medstudent" | "admin";

const ROLE_KEY = "aribot_role";

export function useRole(): [AppRole, (r: AppRole) => void] {
  const [role, setRoleState] = useState<AppRole>(() => {
    return (localStorage.getItem(ROLE_KEY) as AppRole) || "physician";
  });

  const setRole = useCallback((r: AppRole) => {
    localStorage.setItem(ROLE_KEY, r);
    setRoleState(r);
    window.dispatchEvent(new StorageEvent("storage", { key: ROLE_KEY, newValue: r }));
  }, []);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === ROLE_KEY && e.newValue) {
        setRoleState(e.newValue as AppRole);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return [role, setRole];
}

export function getRole(): AppRole {
  return (localStorage.getItem(ROLE_KEY) as AppRole) || "physician";
}
