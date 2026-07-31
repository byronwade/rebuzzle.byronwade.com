"use server";

import { revalidateTag } from "next/cache";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { logger } from "@/lib/logger";
import { getTodaysPuzzle } from "./puzzleGenerationActions";

/**
 * Soft-retire today's puzzle into the archive instead of hard-deleting.
 * Retired puzzles stay in Mongo so answers/fingerprints remain unique forever.
 */
export async function archiveTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
  archivedIds: string[];
}> {
  try {
    const collection = getCollection<Puzzle>("puzzles");
    const dateKey = getUtcPuzzleDate();
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
            "metadata.retiredReason": "regenerate",
            "metadata.retiredDateKey": dateKey,
          },
        }
      );
    }

    revalidateTag("daily-puzzle", "max");
    revalidateTag(`daily-puzzle-${dateKey}`, "max");

    logger.info("Archived today's puzzle(s) before regenerate", {
      dateKey,
      count: archivedIds.length,
      archivedIds,
    });

    return {
      success: true,
      message: archivedIds.length
        ? `Archived ${archivedIds.length} puzzle(s) for ${dateKey}`
        : `No active puzzle for ${dateKey} to archive`,
      archivedIds,
    };
  } catch (error) {
    console.error("Error archiving today's puzzle:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      archivedIds: [],
    };
  }
}

/** @deprecated Prefer archiveTodaysPuzzle — hard delete destroys uniqueness history */
export async function deleteTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
}> {
  const result = await archiveTodaysPuzzle();
  return { success: result.success, message: result.message };
}

/**
 * Regenerate today's puzzle (admin path only — callers must authorize).
 * Previous puzzle is archived, not deleted.
 */
export async function regenerateTodaysPuzzle(
  puzzleType?: string
): Promise<{ success: boolean; message: string; puzzle?: unknown }> {
  try {
    const archiveResult = await archiveTodaysPuzzle();
    if (!archiveResult.success) {
      return {
        success: false,
        message: `Failed to archive old puzzle: ${archiveResult.message}`,
      };
    }

    const puzzleResult = await getTodaysPuzzle(puzzleType);

    if (!(puzzleResult.success && puzzleResult.puzzle)) {
      return {
        success: false,
        message: `Failed to generate new puzzle: ${
          "error" in puzzleResult ? puzzleResult.error : "Unknown error"
        }`,
      };
    }

    const typeUsed = puzzleType || process.env.DEFAULT_PUZZLE_TYPE || "rebus";

    return {
      success: true,
      message: `Successfully regenerated today's puzzle (type: ${typeUsed}; archived ${archiveResult.archivedIds.length})`,
      puzzle: puzzleResult.puzzle,
    };
  } catch (error) {
    console.error("Error regenerating today's puzzle:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
