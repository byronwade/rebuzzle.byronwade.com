"use client";

import { createContext, type ReactNode, useContext, useSyncExternalStore } from "react";
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

function subscribeVisualTheme(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === VISUAL_THEME_STORAGE_KEY || e.key === null) {
      onStoreChange();
    }
  };
  const onCustom = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener("rebuzzle:visual-theme", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("rebuzzle:visual-theme", onCustom);
  };
}

function getClientTheme(): VisualTheme {
  const theme = getStoredVisualTheme();
  applyVisualTheme(theme);
  return theme;
}

export function VisualThemeProvider({ children }: { children: ReactNode }) {
  const visualTheme = useSyncExternalStore(
    subscribeVisualTheme,
    getClientTheme,
    () => "default" as VisualTheme
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const setVisualTheme = (theme: VisualTheme) => {
    setStoredVisualTheme(theme);
    applyVisualTheme(theme);
    window.dispatchEvent(new CustomEvent("rebuzzle:visual-theme", { detail: { theme } }));
  };

  const value = { visualTheme, setVisualTheme, mounted };

  return <VisualThemeContext.Provider value={value}>{children}</VisualThemeContext.Provider>;
}
