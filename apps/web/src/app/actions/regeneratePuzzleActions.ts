"use server";

import { revalidateTag } from "next/cache";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { getTodaysPuzzle } from "./puzzleGenerationActions";

/**
 * Delete today's puzzle from the database (UTC day window only).
 */
export async function deleteTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const collection = getCollection<Puzzle>("puzzles");
    const dateKey = getUtcPuzzleDate();
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const end = new Date(`${dateKey}T23:59:59.999Z`);

    const result = await collection.deleteMany({
      publishedAt: { $gte: start, $lte: end },
      active: true,
    });

    // Must bust Data Cache or getTodaysPuzzle will keep serving the deleted row
    revalidateTag("daily-puzzle", "max");
    revalidateTag(`daily-puzzle-${dateKey}`, "max");

    if (result.deletedCount > 0) {
      return {
        success: true,
        message: `Deleted ${result.deletedCount} puzzle(s) for ${dateKey}`,
      };
    }

    return {
      success: true,
      message: "No puzzle found for today to delete",
    };
  } catch (error) {
    console.error("Error deleting today's puzzle:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Regenerate today's puzzle (admin path only — callers must authorize).
 */
export async function regenerateTodaysPuzzle(
  puzzleType?: string
): Promise<{ success: boolean; message: string; puzzle?: unknown }> {
  try {
    const deleteResult = await deleteTodaysPuzzle();
    if (!deleteResult.success) {
      return {
        success: false,
        message: `Failed to delete old puzzle: ${deleteResult.message}`,
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
      message: `Successfully regenerated today's puzzle (type: ${typeUsed})`,
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
