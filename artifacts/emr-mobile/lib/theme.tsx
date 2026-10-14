import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "emr_mobile_theme";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === "light" || v === "dark" || v === "system") setModeState(v);
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const scheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  function toggle() {
    setMode(scheme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ mode, scheme, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Effective color scheme ("light" | "dark") honoring the user's in-app override. */
export function useThemeScheme(): "light" | "dark" {
  const ctx = useContext(ThemeContext);
  const systemScheme = useSystemColorScheme();
  if (!ctx) return systemScheme === "dark" ? "dark" : "light";
  return ctx.scheme;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
