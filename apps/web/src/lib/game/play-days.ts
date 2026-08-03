/**
 * Track distinct UTC puzzle days played on this device.
 * Used to gate guest signup until day 2 — conversion feels earned.
 */

const STORAGE_KEY = "rebuzzlePlayDays";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordPlayDay(dateKey: string = todayKey()): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const days: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(days) ? [...days] : [];
    if (!next.includes(dateKey)) {
      next.push(dateKey);
      // Cap growth — we only care about early retention.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-60)));
    }
    return next.length;
  } catch {
    return 0;
  }
}

export function getPlayDayCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const days = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(days) ? days.length : 0;
  } catch {
    return 0;
  }
}

/** Guest “keep your streak” after the second distinct play day. */
export function shouldPromptGuestSave(): boolean {
  return getPlayDayCount() >= 2;
}
