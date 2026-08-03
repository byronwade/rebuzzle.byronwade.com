/**
 * Temporary client-side Dev Mode flag (Settings toggle).
 * Powerful actions still require admin on the server.
 */

export const DEV_MODE_STORAGE_KEY = "rebuzzle_dev_mode";

export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEV_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDevModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.setItem(DEV_MODE_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(DEV_MODE_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("rebuzzle:dev-mode", { detail: { enabled } }));
  } catch {
    // ignore quota / private mode
  }
}

export function clearDevClientGameState(): void {
  if (typeof window === "undefined") return;
  const keys = [
    "lastGameCompletion:v1",
    "lastGameSolution:v1",
    "lastEveClosingLine",
    "rebuzzlePlayDays",
    "rebuzzleEmailNudgeDismissed",
    "gameCompletion",
    "userStats",
  ];
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
