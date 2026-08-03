/**
 * Daily puzzle lock helpers.
 *
 * Generation keys puzzles by a calendar date string (YYYY-MM-DD) with
 * publishedAt at that UTC midnight — one puzzle document per day.
 *
 * Players unlock / roll over on *their* local midnight. The lock key for a
 * daily final is the puzzle's publication date key (same YYYY-MM-DD).
 */

/** Archive replays award half of normal points. */
export const ARCHIVE_POINTS_MULTIPLIER = 0.5;

const IANA_TIME_ZONE_PATTERN = /^[A-Za-z0-9_+\-/]+$/;

/** UTC YYYY-MM-DD for a Date (defaults to now). Used for generation / publishedAt. */
export function getUtcPuzzleDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** True when `timeZone` is a usable IANA zone id. */
export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64 || !IANA_TIME_ZONE_PATTERN.test(timeZone)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Calendar YYYY-MM-DD in the given IANA zone (or the runtime's local zone when
 * `timeZone` is omitted — browsers use the player's zone).
 */
export function getLocalPuzzleDate(date: Date = new Date(), timeZone?: string): string {
  if (!timeZone) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!(year && month && day)) {
    return getUtcPuzzleDate(date);
  }
  return `${year}-${month}-${day}`;
}

/** Add one civil day to a YYYY-MM-DD key (UTC-safe arithmetic). */
export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!(year && month && day)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/**
 * Offset (ms) such that `utcInstant + offset ≈ wall-clock as if it were UTC`.
 * Recomputed at the target instant so DST is handled.
 */
function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - instant.getTime();
}

/** UTC instant for local midnight at the start of `dateKey` in `timeZone`. */
export function getZonedMidnightUtc(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!(year && month && day)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let utcMs = wallAsUtc - getTimeZoneOffsetMs(timeZone, new Date(wallAsUtc));
  // Second pass at the corrected instant (DST boundaries).
  utcMs = wallAsUtc - getTimeZoneOffsetMs(timeZone, new Date(utcMs));
  return new Date(utcMs);
}

/**
 * Next local midnight after `date`.
 * - With `timeZone`: IANA-aware (server + cookie).
 * - Without: runtime local zone (browser countdown).
 */
export function getNextLocalMidnight(date: Date = new Date(), timeZone?: string): Date {
  if (!timeZone) {
    const next = new Date(date.getTime());
    next.setHours(24, 0, 0, 0);
    return next;
  }

  const todayLocal = getLocalPuzzleDate(date, timeZone);
  const tomorrowLocal = addCalendarDays(todayLocal, 1);
  return getZonedMidnightUtc(tomorrowLocal, timeZone);
}

/** @deprecated Prefer getNextLocalMidnight — kept for cron/generation call sites. */
export function getNextUtcMidnight(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
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

export function clampHints(value: unknown, maxHints: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), maxHints);
}

export function clampTimeSpent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  // Cap at 24h to prevent absurd client clocks
  return Math.min(Math.max(Math.floor(value), 0), 86_400);
}
