// Server-only helpers, not server actions: as actions, any visitor could call
// them to read answers or regenerate today's puzzle. Gated routes wrap them.
import "server-only";

import { revalidateTag } from "next/cache";
import { formatGatewayAuthError, isGatewayAuthError, probeGatewayAuth } from "@/ai/client";
import { resolveAdaptiveDifficultyForDate } from "@/ai/learning";
import { assertDailyChallenge } from "@/ai/puzzle-agent/daily-challenge";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { generateMasterPuzzle } from "@/ai/services/master-puzzle-orchestrator";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { createMongoDailyPuzzleCandidateRepository } from "@/lib/game/daily-puzzle-candidate-repository";
import { createDailyPuzzleCandidateQueue } from "@/lib/game/queue-daily-puzzle-candidate";
import { logger } from "@/lib/logger";

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
async function deleteTodaysPuzzle(): Promise<{
  success: boolean;
  message: string;
}> {
  const result = await archiveTodaysPuzzle();
  return { success: result.success, message: result.message };
}

/**
 * Queue a proposed daily puzzle for blind human playtesting (admin callers authorize separately).
 * The currently published puzzle stays active while the proposal is reviewed.
 */
export async function regenerateTodaysPuzzle(puzzleType?: string): Promise<{
  success: boolean;
  message: string;
  candidate?: { id: string; status: string };
}> {
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
    const difficultyPlan = await resolveAdaptiveDifficultyForDate(new Date(`${dateKey}T00:00:00Z`));

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
    const visual = result.puzzle.visual;
    const metadataExtra = {
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
      generationMethod: result.metadata.engine === "apex" ? "apex-tournament" : "eve-tool-agent",
      engine: result.metadata.engine ?? "eve",
      answerSeed: result.metadata.answerSeed,
      answerSeedCuePlan: result.metadata.answerSeedCuePlan,
      answerResearch: result.metadata.answerResearch,
      learningBaselineDifficulty: difficultyPlan.baseline,
      learningDifficultyDelta: difficultyPlan.delta,
      learningReason: difficultyPlan.reason,
      selfLearning: true,
      estimatedSolveRate: result.metadata.estimatedSolveRate,
      simCalibrationBias: result.metadata.simCalibrationBias,
      reasoningEvidence: result.metadata.reasoningEvidence,
      reasoningEvidenceSource: "independent-editorial",
    };
    assertDailyChallenge({
      difficulty: result.puzzle.difficulty,
      answer: result.puzzle.answer,
      visual,
      reasoningEvidence: result.metadata.reasoningEvidence,
      reasoningEvidenceSource: "independent-editorial",
    });
    const candidateQueue = createDailyPuzzleCandidateQueue(
      createMongoDailyPuzzleCandidateRepository(),
      puzzlePlaytestService
    );
    const candidate = await candidateQueue.enqueue({
      generationKey: dateKey,
      payload: {
        puzzleDisplay,
        puzzleType: typeToUse,
        answer: result.puzzle.answer,
        difficulty: result.puzzle.difficulty,
        category: result.puzzle.category || "general",
        explanation: result.puzzle.explanation,
        hints: result.puzzle.hints || [],
        aiGenerated: true,
        rebusPuzzle: typeToUse === "rebus" ? puzzleDisplay : undefined,
        visual,
        metadataExtra,
      },
    });

    return {
      success: true,
      message: "Puzzle queued for blind human playtesting; today's published puzzle stays live.",
      candidate: {
        id: candidate.id,
        status: candidate.status,
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
