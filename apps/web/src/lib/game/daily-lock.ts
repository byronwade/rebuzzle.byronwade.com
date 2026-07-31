/**
 * Daily puzzle lock helpers — UTC calendar day keys for anti-replay.
 */

/** Archive replays award half of normal points. */
export const ARCHIVE_POINTS_MULTIPLIER = 0.5;

/** UTC YYYY-MM-DD for a Date (defaults to now). */
export function getUtcPuzzleDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Lock key for archive/replay plays so they don't collide with the
 * unique {userId, puzzleDate} final index used by the daily challenge.
 */
export function getArchiveLockKey(puzzleId: string): string {
  return `archive:${puzzleId}`;
}

export function isArchiveLockKey(key: string): boolean {
  return key.startsWith("archive:");
}

export function getUtcDayBounds(puzzleDate: string): { start: Date; end: Date } {
  return {
    start: new Date(`${puzzleDate}T00:00:00.000Z`),
    end: new Date(`${puzzleDate}T23:59:59.999Z`),
  };
}

/** Next UTC midnight — when the daily puzzle rolls over. */
export function getNextUtcMidnight(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Milliseconds until next UTC midnight (0 if already past). */
export function msUntilNextUtcMidnight(date: Date = new Date()): number {
  return Math.max(0, getNextUtcMidnight(date).getTime() - date.getTime());
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
