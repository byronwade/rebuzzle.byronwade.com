/**
 * Self-learning loop — record signals, calibrate puzzles, drive adaptive difficulty.
 */

import { aiLearningEventOps } from "@/db/ai-operations";
import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import {
  type AdaptiveDifficultyResult,
  computeAdaptiveDifficulty,
} from "./adaptive-difficulty";
import {
  measurePuzzlePerformance,
  measureWindowPerformance,
  type WindowPerformance,
} from "./performance-monitor";

export type LearningPolicySnapshot = {
  computedAt: string;
  adaptive: AdaptiveDifficultyResult;
  window: WindowPerformance;
  eventId?: string;
};

/**
 * After a final guess, record a lightweight learning pulse (async-safe).
 */
export async function recordFinalAttemptSignal(input: {
  puzzleId: string;
  userId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptNumber: number;
  hintsUsed: number;
  isArchive: boolean;
}): Promise<void> {
  if (input.isArchive) return;

  try {
    // Fast-solve pulse — immediate signal that content may be too easy
    if (input.isCorrect && input.timeSpentSeconds > 0 && input.timeSpentSeconds < 40) {
      await aiLearningEventOps.create({
        id: crypto.randomUUID(),
        eventType: "difficulty_calibration",
        feedbackIds: [`attempt:${input.puzzleId}:${input.userId}`],
        aggregationType: "single",
        change: {
          parameter: "fast_solve_signal",
          oldValue: null,
          newValue: {
            puzzleId: input.puzzleId,
            timeSpentSeconds: input.timeSpentSeconds,
            attemptNumber: input.attemptNumber,
            hintsUsed: input.hintsUsed,
          },
          reason: `Solved in ${input.timeSpentSeconds}s — may need harder generation`,
          confidence: input.timeSpentSeconds < 25 ? 0.75 : 0.55,
        },
        expectedImpact: { qualityImprovement: 0 },
        status: "proposed",
        timestamp: new Date(),
        createdAt: new Date(),
      });
    }

    // Soft-calibrate the puzzle document once it has enough finals
    const perf = await measurePuzzlePerformance(input.puzzleId);
    if (perf && perf.finals >= 8 && perf.finals % 8 === 0) {
      await getCollection("puzzles").updateOne(
        { id: input.puzzleId },
        {
          $set: {
            "metadata.liveSolveRate": perf.solveRate,
            "metadata.liveMedianSolveSeconds": perf.medianSolveSeconds,
            "metadata.liveFinals": perf.finals,
            "metadata.perceivedTooEasy": perf.perceivedTooEasy,
            "metadata.perceivedTooHard": perf.perceivedTooHard,
            "metadata.lastCalibratedAt": new Date().toISOString(),
          },
        }
      );
    }
  } catch (error) {
    logger.warn("recordFinalAttemptSignal soft-failed", {
      error: error instanceof Error ? error.message : String(error),
      puzzleId: input.puzzleId,
    });
  }
}

/**
 * Nightly (or pre-generation) calibration — apply window metrics into a learning event.
 */
export async function runLearningCalibration(input?: {
  date?: Date;
  lookbackDays?: number;
}): Promise<LearningPolicySnapshot> {
  const date = input?.date ?? new Date();
  const window = await measureWindowPerformance({
    lookbackDays: input?.lookbackDays ?? 7,
    minFinals: 8,
  });
  const adaptive = computeAdaptiveDifficulty({ date, performance: window });

  let eventId: string | undefined;
  try {
    const event = await aiLearningEventOps.create({
      id: crypto.randomUUID(),
      eventType: "difficulty_calibration",
      feedbackIds: [],
      aggregationType: "trend",
      change: {
        parameter: "targetDifficulty",
        oldValue: adaptive.baseline,
        newValue: adaptive.target,
        reason: adaptive.reason,
        confidence: window.finalPlays >= 30 ? 0.85 : window.finalPlays >= 8 ? 0.65 : 0.35,
      },
      expectedImpact: {
        qualityImprovement: adaptive.delta !== 0 ? 5 : 0,
        satisfactionImprovement: adaptive.delta < 0 ? 4 : adaptive.delta > 0 ? 2 : 0,
      },
      status: "applied",
      timestamp: new Date(),
      createdAt: new Date(),
    });
    eventId = event.id;
  } catch (error) {
    logger.warn("Failed to persist learning calibration event", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Soft-calibrate yesterday's puzzle if present
  try {
    const yesterday = new Date(date);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    const start = new Date(`${yKey}T00:00:00.000Z`);
    const end = new Date(`${yKey}T23:59:59.999Z`);
    const puzzle = await getCollection("puzzles").findOne({
      publishedAt: { $gte: start, $lte: end },
      active: true,
    });
    if (puzzle?.id) {
      const perf = await measurePuzzlePerformance(String(puzzle.id));
      if (perf) {
        await getCollection("puzzles").updateOne(
          { id: puzzle.id },
          {
            $set: {
              "metadata.liveSolveRate": perf.solveRate,
              "metadata.liveMedianSolveSeconds": perf.medianSolveSeconds,
              "metadata.liveFinals": perf.finals,
              "metadata.perceivedTooEasy": perf.perceivedTooEasy,
              "metadata.perceivedTooHard": perf.perceivedTooHard,
              "metadata.lastCalibratedAt": new Date().toISOString(),
            },
          }
        );
      }
    }
  } catch {
    // non-blocking
  }

  return {
    computedAt: new Date().toISOString(),
    adaptive,
    window,
    eventId,
  };
}

/**
 * Resolve adaptive difficulty for a generation date (used by daily generate).
 */
export async function resolveAdaptiveDifficultyForDate(
  date: Date
): Promise<AdaptiveDifficultyResult> {
  const window = await measureWindowPerformance({ lookbackDays: 7, minFinals: 8 });
  return computeAdaptiveDifficulty({ date, performance: window });
}
