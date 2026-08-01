"use server";

import { formatGatewayAuthError, isGatewayAuthError, probeGatewayAuth } from "@/ai/client";
import { resolveAdaptiveDifficultyForDate } from "@/ai/learning";
import { normalizeAnswerKey } from "@/ai/learning/answer-registry";
import { generateMasterPuzzle } from "@/ai/services/master-puzzle-orchestrator";
import { archiveTodaysPuzzle as archiveTodaysPuzzleLib } from "@/lib/game/archive-daily-puzzle";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { persistDailyPuzzle } from "@/lib/game/persist-daily-puzzle";

/**
 * Soft-retire today's puzzle into the archive instead of hard-deleting.
 * Retired puzzles stay in Mongo so answers/fingerprints remain unique forever.
 */
export async function archiveTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
  archivedIds: string[];
}> {
  return archiveTodaysPuzzleLib("regenerate");
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
 * Probes AI Gateway auth, generates first, then archives the prior row and persists.
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
    const difficultyPlan = await resolveAdaptiveDifficultyForDate(
      new Date(`${dateKey}T00:00:00Z`)
    );

    // Generate BEFORE archiving so a failed run keeps the current daily puzzle.
    const result = await generateMasterPuzzle({
      targetDifficulty: difficultyPlan.target,
      requireNovelty: true,
      qualityThreshold: 74,
      maxAttempts: 4,
      puzzleType: typeToUse,
      useLearningFeedback: true,
    });

    const puzzleDisplay =
      result.puzzle.visual?.unicodeFallback?.trim() || result.puzzle.rebusPuzzle;

    const archiveResult = await archiveTodaysPuzzle();
    if (!archiveResult.success) {
      return {
        success: false,
        message: `Generated OK but failed to archive old puzzle: ${archiveResult.message}`,
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
        uniquenessScore: result.metadata.uniquenessScore,
        funScore: result.metadata.qualityMetrics?.scores?.fun,
        visualStyleId: result.puzzle.visual?.styleId,
        difficultyLevel: result.puzzle.difficultyLevel,
        difficultyScore: result.puzzle.difficulty,
        fingerprint: result.metadata.fingerprint,
        calibratedDifficulty: result.metadata.calibratedDifficulty,
        generationMethod:
          result.metadata.engine === "apex" ? "apex-tournament" : "eve-tool-agent",
        engine: result.metadata.engine ?? "eve",
        learningBaselineDifficulty: difficultyPlan.baseline,
        learningDifficultyDelta: difficultyPlan.delta,
        learningReason: difficultyPlan.reason,
        selfLearning: true,
        estimatedSolveRate: result.metadata.estimatedSolveRate,
        simCalibrationBias: result.metadata.simCalibrationBias,
        answerKey: normalizeAnswerKey(result.puzzle.answer),
      },
    });

    return {
      success: true,
      message: `Successfully regenerated today's puzzle (type: ${typeToUse}; archived ${archiveResult.archivedIds.length})`,
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
