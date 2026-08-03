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

export function getLastPlayDay(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const days = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(days) || days.length === 0) return null;
    const sorted = [...days].sort();
    return sorted[sorted.length - 1] ?? null;
  } catch {
    return null;
  }
}

/** True when the player has history but last play was before yesterday (gap ≥ 2 days). */
export function isComebackVisit(): boolean {
  const last = getLastPlayDay();
  if (!last) return false;
  const lastMs = Date.parse(`${last}T00:00:00.000Z`);
  const todayMs = Date.parse(`${todayKey()}T00:00:00.000Z`);
  if (Number.isNaN(lastMs) || Number.isNaN(todayMs)) return false;
  const gapDays = Math.round((todayMs - lastMs) / (24 * 60 * 60 * 1000));
  return gapDays >= 2;
}
