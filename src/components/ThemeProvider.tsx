import { createContext, useContext, useEffect, useState } from "react";
import { ConfigManager } from "../utils/configManager";

const UI_PREFS_KEY = '3d-model-muncher-ui-prefs';

function loadUiPrefs(): any {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[ThemeProvider] Failed to load UI prefs:', err);
    return {};
  }
}

function saveUiPrefs(prefs: any) {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[ThemeProvider] Failed to save UI prefs:', err);
  }
}

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Prefer UI-only prefs for immediate UI changes. Fall back to global config if UI prefs missing.
    try {
      const prefs = loadUiPrefs();
      if (prefs && (prefs.defaultTheme === 'light' || prefs.defaultTheme === 'dark' || prefs.defaultTheme === 'system')) {
        return prefs.defaultTheme as Theme;
      }
    } catch (e) {
      console.warn('[ThemeProvider] Error reading UI prefs on init', e);
    }

    const savedTheme = ConfigManager.getSetting("theme", defaultTheme) as Theme;
    return savedTheme;
  });

  // On mount, if UI prefs are not present, prefer server-backed config (localStorage or /api/load-config)
  useEffect(() => {
    let cancelled = false;

    try {
      const prefs = loadUiPrefs();
      if (prefs && (prefs.defaultTheme === 'light' || prefs.defaultTheme === 'dark' || prefs.defaultTheme === 'system')) {
        // UI prefs present - nothing to do
        console.debug('[ThemeProvider] UI prefs found on mount, using', prefs.defaultTheme);
        return;
      }
    } catch (err) {
      console.warn('[ThemeProvider] Error reading UI prefs on mount', err);
    }

    // If no UI prefs, try localStorage global config first
    try {
      const raw = localStorage.getItem('3d-model-muncher-config');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const serverTheme = parsed?.settings?.defaultTheme;
          if (serverTheme && (serverTheme === 'light' || serverTheme === 'dark' || serverTheme === 'system')) {
            console.debug('[ThemeProvider] Found localStorage global config on mount, applying theme=', serverTheme);
            if (!cancelled) setTheme(serverTheme as Theme);
            return;
          }
        } catch (e) {
          console.warn('[ThemeProvider] Failed to parse localStorage global config:', e);
        }
      }
    } catch (err) {
      console.warn('[ThemeProvider] Error accessing localStorage global config:', err);
    }

    // As a last resort, attempt to fetch server config
    (async () => {
      try {
        const resp = await fetch('/api/load-config');
        if (!resp.ok) {
          console.debug('[ThemeProvider] /api/load-config not available, status=', resp.status);
          return;
        }
        const data = await resp.json();
        if (data && data.success && data.config) {
          const serverTheme = data.config?.settings?.defaultTheme;
          if (serverTheme && (serverTheme === 'light' || serverTheme === 'dark' || serverTheme === 'system')) {
            console.debug('[ThemeProvider] Loaded server config on mount, applying serverTheme=', serverTheme);
            if (!cancelled) setTheme(serverTheme as Theme);
          }
        }
      } catch (err) {
        console.warn('[ThemeProvider] Failed to fetch /api/load-config on mount:', err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Persist to UI-only prefs only (do not overwrite global config)
      try {
        const prefs = loadUiPrefs();
        prefs.defaultTheme = newTheme;
        saveUiPrefs(prefs);
      } catch (err) {
        console.warn('[ThemeProvider] Failed to persist theme to UI prefs:', err);
      }
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};