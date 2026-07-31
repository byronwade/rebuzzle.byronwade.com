/**
 * Daily puzzle lock helpers — UTC calendar day keys for anti-replay.
 */

/** UTC YYYY-MM-DD for a Date (defaults to now). */
export function getUtcPuzzleDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getUtcDayBounds(puzzleDate: string): { start: Date; end: Date } {
  return {
    start: new Date(`${puzzleDate}T00:00:00.000Z`),
    end: new Date(`${puzzleDate}T23:59:59.999Z`),
  };
}

export function clampAttempts(value: unknown, maxAttempts: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), maxAttempts);
}

export function clampHints(value: unknown, maxHints: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), maxHints);
}

export function clampTimeSpent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  // Cap at 24h to prevent absurd client clocks
  return Math.min(Math.max(Math.floor(value), 0), 86_400);
}
