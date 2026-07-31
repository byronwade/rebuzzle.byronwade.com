"use server";

import { revalidateTag } from "next/cache";
import { formatGatewayAuthError, isGatewayAuthError, probeGatewayAuth } from "@/ai/client";
import { generateMasterPuzzle } from "@/ai/services/master-puzzle-orchestrator";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { persistDailyPuzzle } from "@/lib/game/persist-daily-puzzle";

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

function calculateDailyDifficulty(date: Date): number {
  const dayOfWeek = date.getUTCDay();
  const difficulties = [5, 4, 6, 8, 7, 5, 4];
  return difficulties[dayOfWeek] || 5;
}

/**
 * Regenerate today's puzzle (admin path only — callers must authorize).
 * Generates via AI Gateway first; only swaps the DB row after a successful result.
 */
export async function regenerateTodaysPuzzle(
  puzzleType?: string
): Promise<{ success: boolean; message: string; puzzle?: unknown }> {
  try {
    const authProbe = await probeGatewayAuth();
    if (!authProbe.ok) {
      return {
        success: false,
        message: authProbe.error,
      };
    }

    const dateKey = getUtcPuzzleDate();
    const typeToUse = puzzleType || process.env.DEFAULT_PUZZLE_TYPE || "rebus";
    const difficulty = calculateDailyDifficulty(new Date(`${dateKey}T00:00:00Z`));

    // Generate BEFORE deleting so a failed run keeps the current daily puzzle.
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: true,
      qualityThreshold: 70,
      maxAttempts: 4,
      puzzleType: typeToUse,
    });

    const puzzleDisplay =
      result.puzzle.visual?.unicodeFallback?.trim() || result.puzzle.rebusPuzzle;

    const deleteResult = await deleteTodaysPuzzle();
    if (!deleteResult.success) {
      return {
        success: false,
        message: `Generated OK but failed to delete old puzzle: ${deleteResult.message}`,
      };
    }

    const persisted = await persistDailyPuzzle({
      dateString: dateKey,
      puzzleDisplay,
      puzzleType: typeToUse,
      answer: result.puzzle.answer,
      difficulty: result.puzzle.difficulty,
      category: result.puzzle.category,
      explanation: result.puzzle.explanation,
      hints: result.puzzle.hints,
      aiGenerated: true,
      rebusPuzzle: typeToUse === "rebus" ? puzzleDisplay : undefined,
      visual: result.puzzle.visual,
      metadataExtra: {
        regeneratedAt: new Date().toISOString(),
        techniqueId: result.puzzle.techniqueId,
        qualityScore: result.metadata.qualityMetrics?.scores?.overall,
      },
    });

    return {
      success: true,
      message: `Successfully regenerated today's puzzle (type: ${typeToUse})`,
      puzzle: {
        id: persisted.id,
        puzzle: puzzleDisplay,
        rebusPuzzle: typeToUse === "rebus" ? puzzleDisplay : undefined,
        puzzleType: typeToUse,
        difficulty: result.puzzle.difficulty,
        answer: result.puzzle.answer,
        explanation: result.puzzle.explanation,
        hints: result.puzzle.hints,
        visual: result.puzzle.visual,
        date: dateKey,
        aiGenerated: true,
      },
    };
  } catch (error) {
    console.error("Error regenerating today's puzzle:", error);
    return {
      success: false,
      message: isGatewayAuthError(error)
        ? formatGatewayAuthError()
        : error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}
