/**
 * Daily track record: one cell per calendar day showing whether the player
 * solved the daily, played and never got it, or skipped it. Rendered as a
 * GitHub-contribution-style grid on the profile.
 */

import { addCalendarDays } from "@/lib/game/daily-lock";

/** Weeks shown in the grid (GitHub shows 53 so a full year always fits). */
export const TRACK_RECORD_WEEKS = 53;

export type TrackRecordStatus =
  /** Got the daily right. */
  | "solved"
  /** Played but never got it right (out of attempts or stopped guessing). */
  | "failed"
  /** No guesses on a day the player could have played. */
  | "missed"
  /** Today, still open: no result yet. */
  | "pending"
  /** Before the player joined, or after today (grid padding). */
  | "none";

export type TrackRecordDay = { date: string; status: TrackRecordStatus };

/** Per-day summary of a player's daily attempts (one per puzzleDate key). */
export type DailyResultRow = { date: string; solved: boolean; final: boolean };

export type TrackRecordTotals = { solved: number; failed: number; missed: number };

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDailyDateKey(key: string): boolean {
  return DATE_KEY_PATTERN.test(key);
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD key. */
function dayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay();
}

/** First day of the grid: the Sunday that starts the oldest shown week. */
export function getTrackRecordStart(today: string, weeks = TRACK_RECORD_WEEKS): string {
  const thisSunday = addCalendarDays(today, -dayOfWeek(today));
  return addCalendarDays(thisSunday, -7 * (weeks - 1));
}

/**
 * Build the grid's days, Sunday-first, oldest to newest, padded through the
 * end of the current week so every column has seven cells.
 */
export function buildTrackRecord({
  today,
  joined,
  results,
  weeks = TRACK_RECORD_WEEKS,
}: {
  /** Player's local YYYY-MM-DD. */
  today: string;
  /** Player's local YYYY-MM-DD join day; earlier days aren't counted as missed. */
  joined: string | null;
  results: DailyResultRow[];
  weeks?: number;
}): TrackRecordDay[] {
  const byDate = new Map(results.map((row) => [row.date, row]));
  const start = getTrackRecordStart(today, weeks);
  // A result before the join date (legacy or imported) still counts.
  const firstResult = results.reduce<string | null>(
    (min, row) => (min === null || row.date < min ? row.date : min),
    null
  );
  const countFrom =
    joined && firstResult ? (firstResult < joined ? firstResult : joined) : (joined ?? firstResult);

  const days: TrackRecordDay[] = [];
  for (let offset = 0; offset < weeks * 7; offset++) {
    const date = addCalendarDays(start, offset);
    days.push({ date, status: statusFor(date, today, countFrom, byDate.get(date)) });
  }
  return days;
}

function statusFor(
  date: string,
  today: string,
  countFrom: string | null,
  row: DailyResultRow | undefined
): TrackRecordStatus {
  if (date > today) return "none";
  if (row?.solved) return "solved";
  if (date === today) return row?.final ? "failed" : "pending";
  if (row) return "failed";
  if (!countFrom || date < countFrom) return "none";
  return "missed";
}

export function summarizeTrackRecord(days: TrackRecordDay[]): TrackRecordTotals {
  const totals: TrackRecordTotals = { solved: 0, failed: 0, missed: 0 };
  for (const day of days) {
    if (day.status === "solved" || day.status === "failed" || day.status === "missed") {
      totals[day.status] += 1;
    }
  }
  return totals;
}
