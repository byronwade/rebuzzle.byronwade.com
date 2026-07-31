/**
 * Visual skin (independent of light/dark mode).
 * Default = current Rebuzzle ink-on-canvas design.
 * 8bit = 8bitcn-inspired retro skin (sharp corners, pixel font).
 */

export const VISUAL_THEME_STORAGE_KEY = "rebuzzle_visual_theme";
export const VISUAL_THEME_ATTRIBUTE = "data-skin";

export const VISUAL_THEMES = ["default", "8bit"] as const;
export type VisualTheme = (typeof VISUAL_THEMES)[number];

export const VISUAL_THEME_META: Record<VisualTheme, { label: string; description: string }> = {
  default: {
    label: "Default",
    description: "Ink-on-canvas — the current Rebuzzle look",
  },
  "8bit": {
    label: "8-bit",
    description: "Retro pixel style inspired by 8bitcn/ui",
  },
};

export function isVisualTheme(value: unknown): value is VisualTheme {
  return typeof value === "string" && (VISUAL_THEMES as readonly string[]).includes(value);
}

export function getStoredVisualTheme(): VisualTheme {
  if (typeof window === "undefined") return "default";
  try {
    const stored = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    return isVisualTheme(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

export function applyVisualTheme(theme: VisualTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(VISUAL_THEME_ATTRIBUTE, theme);
}

export function setStoredVisualTheme(theme: VisualTheme): void {
  applyVisualTheme(theme);
  try {
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new CustomEvent("rebuzzle:visual-theme", { detail: { theme } }));
}

/** Inline script for layout <head> — applies skin before paint to avoid FOUC. */
export const VISUAL_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(VISUAL_THEME_STORAGE_KEY)};var a=${JSON.stringify(VISUAL_THEME_ATTRIBUTE)};var v=localStorage.getItem(k);if(v!=="default"&&v!=="8bit")v="default";document.documentElement.setAttribute(a,v);}catch(e){document.documentElement.setAttribute(${JSON.stringify(VISUAL_THEME_ATTRIBUTE)},"default");}})();`;
