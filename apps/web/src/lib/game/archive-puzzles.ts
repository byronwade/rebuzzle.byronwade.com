import { getUtcPuzzleDate } from "@/lib/game/daily-lock";

type ArchiveCandidate = {
  active?: unknown;
  publishedAt?: unknown;
} | null;

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** One shared rule for archive lists, practice requests, and practice quips. */
export function isPublishedPastPuzzle(puzzle: ArchiveCandidate, localDateKey: string): boolean {
  if (puzzle?.active !== true || !isValidDateKey(localDateKey)) return false;
  if (!(puzzle.publishedAt instanceof Date) && typeof puzzle.publishedAt !== "string") return false;

  const publishedAt = new Date(puzzle.publishedAt);
  if (!Number.isFinite(publishedAt.getTime())) return false;

  return getUtcPuzzleDate(publishedAt) < localDateKey;
}
