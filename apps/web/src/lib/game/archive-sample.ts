import { db } from "@/db";
import { isPublishedPastPuzzle } from "@/lib/game/archive-puzzles";

/** Return the stable free sample only when a valid server-resolved local day is supplied. */
export async function findFreeArchiveSample(localDateKey: string) {
  const beforeUtc = new Date(`${localDateKey}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(localDateKey) ||
    !Number.isFinite(beforeUtc.getTime()) ||
    beforeUtc.toISOString().slice(0, 10) !== localDateKey
  ) {
    return null;
  }

  const puzzle = await db.puzzleOps.findOldestPublishedBefore(beforeUtc);
  return isPublishedPastPuzzle(puzzle, localDateKey) ? puzzle : null;
}
