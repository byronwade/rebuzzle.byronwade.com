/**
 * Track distinct UTC puzzle days played on this device.
 * Used to gate guest signup until day 2 — conversion feels earned.
 */

const STORAGE_KEY = "rebuzzlePlayDays:v1";
const LEGACY_STORAGE_KEY = "rebuzzlePlayDays";

function readPlayDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    const days = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(days) ? days : [];
  } catch {
    return [];
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordPlayDay(dateKey: string = todayKey()): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = [...readPlayDays()];
    if (!next.includes(dateKey)) {
      next.push(dateKey);
      // Cap growth — we only care about early retention.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-60)));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return next.length;
  } catch {
    return 0;
  }
}

export function getPlayDayCount(): number {
  return readPlayDays().length;
}

/** Guest “keep your streak” after the second distinct play day. */
export function shouldPromptGuestSave(): boolean {
  return getPlayDayCount() >= 2;
}

export function getLastPlayDay(): string | null {
  const days = readPlayDays();
  if (days.length === 0) return null;
  const sorted = [...days].sort();
  return sorted[sorted.length - 1] ?? null;
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
