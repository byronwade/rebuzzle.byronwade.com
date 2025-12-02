"use server";

import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getTodaysPuzzle } from "./puzzleGenerationActions";

/**
 * Delete today's puzzle from the database
 * This allows regenerating it with the new system
 */
export async function deleteTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const collection = getCollection<Puzzle>("puzzles");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await collection.deleteMany({
      publishedAt: { $gte: today },
      active: true,
    });

    if (result.deletedCount > 0) {
      return {
        success: true,
        message: `Deleted ${result.deletedCount} puzzle(s) for today`,
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
 * Regenerate today's puzzle using the new system
 * This deletes the old puzzle and generates a new one
 *
 * @param puzzleType - Optional puzzle type (e.g., "rebus", "word-puzzle"). Defaults to DEFAULT_PUZZLE_TYPE or "rebus"
 */
export async function regenerateTodaysPuzzle(
  puzzleType?: string
): Promise<{ success: boolean; message: string; puzzle?: any }> {
  try {
    // Step 1: Delete today's puzzle
    const deleteResult = await deleteTodaysPuzzle();
    if (!deleteResult.success) {
      return {
        success: false,
        message: `Failed to delete old puzzle: ${deleteResult.message}`,
      };
    }

    console.log(`✅ Deleted old puzzle: ${deleteResult.message}`);

    // Step 2: Generate new puzzle (this will use the new system)
    const puzzleResult = await getTodaysPuzzle(puzzleType);

    if (!(puzzleResult.success && puzzleResult.puzzle)) {
      return {
        success: false,
        message: `Failed to generate new puzzle: ${"error" in puzzleResult ? puzzleResult.error : "Unknown error"}`,
      };
    }

    const typeUsed = puzzleType || process.env.DEFAULT_PUZZLE_TYPE || "rebus";

    return {
      success: true,
      message: `Successfully regenerated today's puzzle with the new system (type: ${typeUsed})`,
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
