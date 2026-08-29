import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "aribots_theme";

/**
 * Resolve the starting theme.
 *
 * Precedence is: what this user chose here, then what the host page asks for,
 * then the operating system. The host check matters when the app is embedded
 * rather than served on its own - the surrounding page stamps `data-theme` on
 * the root element, and ignoring it renders a light app inside a dark frame.
 */
function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore storage access failures (private mode, etc.)
  }

  const stamped = document.documentElement.getAttribute("data-theme");
  if (stamped === "dark" || stamped === "light") return stamped;

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());
  const [followsHost, setFollowsHost] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored !== "dark" && stored !== "light";
    } catch {
      return true;
    }
  });

  // Until the user makes a choice of their own, keep following the host page
  // and the operating system rather than freezing on whatever they were set to
  // at first paint.
  useEffect(() => {
    if (!followsHost) return;

    const apply = () => setThemeState(readInitialTheme());
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", apply);

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      media?.removeEventListener("change", apply);
      observer.disconnect();
    };
  }, [followsHost]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    if (followsHost) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme, followsHost]);

  const setTheme = (t: Theme) => {
    setFollowsHost(false);
    setThemeState(t);
  };
  const toggleTheme = () => {
    setFollowsHost(false);
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return ctx;
}
