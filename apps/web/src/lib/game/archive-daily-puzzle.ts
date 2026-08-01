/**
 * Soft-retire today's active puzzle into the archive (keeps answer uniqueness).
 */

import { revalidateTag } from "next/cache";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { logger } from "@/lib/logger";

export async function archivePuzzleForDate(
  dateKey: string,
  reason = "regenerate"
): Promise<{
  success: boolean;
  message: string;
  archivedIds: string[];
}> {
  try {
    const collection = getCollection<Puzzle>("puzzles");
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const end = new Date(`${dateKey}T23:59:59.999Z`);

    const existing = await collection
      .find({ publishedAt: { $gte: start, $lte: end }, active: true })
      .project({ id: 1 })
      .toArray();

    const archivedIds = existing.map((p) => String(p.id));

    if (archivedIds.length) {
      await collection.updateMany(
        { id: { $in: archivedIds } },
        {
          $set: {
            active: false,
            "metadata.archived": true,
            "metadata.retiredAt": new Date().toISOString(),
            "metadata.retiredReason": reason,
            "metadata.retiredDateKey": dateKey,
          },
        }
      );
    }

    revalidateTag("daily-puzzle", "max");
    revalidateTag(`daily-puzzle-${dateKey}`, "max");

    logger.info("Archived daily puzzle(s)", {
      dateKey,
      count: archivedIds.length,
      archivedIds,
      reason,
    });

    return {
      success: true,
      message: archivedIds.length
        ? `Archived ${archivedIds.length} puzzle(s) for ${dateKey}`
        : `No active puzzle for ${dateKey} to archive`,
      archivedIds,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      archivedIds: [],
    };
  }
}

export async function archiveTodaysPuzzle(reason = "regenerate"): Promise<{
  success: boolean;
  message: string;
  archivedIds: string[];
}> {
  return archivePuzzleForDate(getUtcPuzzleDate(), reason);
}
