import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export type AppRole = "physician" | "medstudent" | "admin";

const ROLE_KEY = "aribot_role";
const VIEW_ROLES: readonly AppRole[] = ["physician", "medstudent", "admin"];

function readStoredRole(): AppRole {
  try {
    const stored = localStorage.getItem(ROLE_KEY) as AppRole | null;
    return stored && VIEW_ROLES.includes(stored) ? stored : "physician";
  } catch {
    return "physician";
  }
}

/**
 * Whether the signed-in account is an administrator according to the server.
 * Undefined until /api/me has answered, which the callers treat as "no".
 */
export function useServerIsAdmin(): boolean | undefined {
  const { data } = useQuery<{ role?: string }>({ queryKey: ["/api/me"] });
  return data ? data.role === "admin" : undefined;
}

/**
 * The role the interface is rendered for.
 *
 * The toggle in the sidebar lets a clinician preview the observer (student)
 * view, and lets an administrator switch between the clinician and admin
 * views. The preference is remembered per browser, but it can never grant
 * more than the account has: the "admin" view is only honoured when the
 * server says the account is an administrator, and the admin-only API
 * routes enforce the same check regardless of what the browser shows.
 */
export function useRole(): [AppRole, (r: AppRole) => void, boolean] {
  const [requested, setRequested] = useState<AppRole>(readStoredRole);
  const isServerAdmin = useServerIsAdmin() === true;

  const setRole = useCallback((r: AppRole) => {
    try {
      localStorage.setItem(ROLE_KEY, r);
    } catch {
      // Private browsing or blocked storage: the choice still applies to this tab.
    }
    setRequested(r);
    window.dispatchEvent(new StorageEvent("storage", { key: ROLE_KEY, newValue: r }));
  }, []);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === ROLE_KEY && e.newValue && VIEW_ROLES.includes(e.newValue as AppRole)) {
        setRequested(e.newValue as AppRole);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const effective: AppRole = requested === "admin" && !isServerAdmin ? "physician" : requested;
  return [effective, setRole, isServerAdmin];
}

/** The remembered view preference. Not an authorization check. */
export function getRole(): AppRole {
  return readStoredRole();
}
