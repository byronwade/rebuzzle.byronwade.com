"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyVisualTheme,
  getStoredVisualTheme,
  setStoredVisualTheme,
  VISUAL_THEME_STORAGE_KEY,
  type VisualTheme,
} from "@/lib/visual-theme";

type VisualThemeContextValue = {
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  mounted: boolean;
};

const VisualThemeContext = createContext<VisualThemeContextValue>({
  visualTheme: "default",
  setVisualTheme: () => {},
  mounted: false,
});

export function useVisualTheme() {
  return useContext(VisualThemeContext);
}

export function VisualThemeProvider({ children }: { children: ReactNode }) {
  const [visualTheme, setThemeState] = useState<VisualTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredVisualTheme();
    setThemeState(initial);
    applyVisualTheme(initial);
    setMounted(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === VISUAL_THEME_STORAGE_KEY || e.key === null) {
        const next = getStoredVisualTheme();
        setThemeState(next);
        applyVisualTheme(next);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ theme?: VisualTheme }>).detail;
      if (detail?.theme) {
        setThemeState(detail.theme);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rebuzzle:visual-theme", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rebuzzle:visual-theme", onCustom);
    };
  }, []);

  const setVisualTheme = useCallback((theme: VisualTheme) => {
    setThemeState(theme);
    setStoredVisualTheme(theme);
  }, []);

  const value = useMemo(
    () => ({ visualTheme, setVisualTheme, mounted }),
    [visualTheme, setVisualTheme, mounted]
  );

  return <VisualThemeContext.Provider value={value}>{children}</VisualThemeContext.Provider>;
}
