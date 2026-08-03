/**
 * Real-player performance monitor — the signal that drives self-learning.
 */

import { getCollection } from "@/db/mongodb";

export type WindowPerformance = {
  lookbackDays: number;
  finalPlays: number;
  solves: number;
  abandons: number;
  solveRate: number;
  abandonRate: number;
  /** Median time among correct finals (seconds) */
  medianSolveSeconds: number | null;
  avgSolveSeconds: number | null;
  avgAttemptsOnSolve: number | null;
  avgHintsOnFinal: number | null;
  /** Distinct puzzles represented */
  puzzleCount: number;
  tooEasy: boolean;
  tooHard: boolean;
  /** Suggested difficulty delta for tomorrow (−2…+2) */
  difficultyDelta: number;
  notes: string[];
};

type FinalAttempt = {
  puzzleId?: string;
  isCorrect?: boolean;
  abandoned?: boolean;
  isFinal?: boolean;
  timeSpentSeconds?: number;
  attemptNumber?: number;
  hintsUsed?: number;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function loadPerceptionVotes(lookbackDays: number): Promise<{
  tooEasy: number;
  justRight: number;
  tooHard: number;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  try {
    const docs = (await getCollection("aiFeedback")
      .find({
        feedbackType: "difficulty_accuracy",
        timestamp: { $gte: cutoff },
      })
      .project({ metrics: 1, context: 1 })
      .limit(500)
      .toArray()) as Array<{
      metrics?: { tooEasy?: boolean; tooHard?: boolean };
      context?: { difficultyPerception?: number };
    }>;

    let tooEasy = 0;
    let tooHard = 0;
    let justRight = 0;
    for (const doc of docs) {
      if (doc.metrics?.tooEasy) tooEasy += 1;
      else if (doc.metrics?.tooHard) tooHard += 1;
      else justRight += 1;
    }
    return { tooEasy, justRight, tooHard };
  } catch {
    return { tooEasy: 0, justRight: 0, tooHard: 0 };
  }
}

/**
 * Aggregate final daily plays into a difficulty-pressure signal.
 * Fast solves + high solve rate → push harder tomorrow.
 */
export async function measureWindowPerformance(input?: {
  lookbackDays?: number;
  minFinals?: number;
}): Promise<WindowPerformance> {
  const lookbackDays = input?.lookbackDays ?? 7;
  const minFinals = input?.minFinals ?? 8;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const empty: WindowPerformance = {
    lookbackDays,
    finalPlays: 0,
    solves: 0,
    abandons: 0,
    solveRate: 0,
    abandonRate: 0,
    medianSolveSeconds: null,
    avgSolveSeconds: null,
    avgAttemptsOnSolve: null,
    avgHintsOnFinal: null,
    puzzleCount: 0,
    tooEasy: false,
    tooHard: false,
    difficultyDelta: 0,
    notes: ["Insufficient play data — keep scheduled difficulty"],
  };

  try {
    const finals = (await getCollection("puzzleAttempts")
      .find({
        isFinal: true,
        attemptedAt: { $gte: cutoff },
        // Exclude archive replays from difficulty pressure
        puzzleDate: { $not: { $regex: /^archive:/ } },
      })
      .project({
        puzzleId: 1,
        isCorrect: 1,
        abandoned: 1,
        isFinal: 1,
        timeSpentSeconds: 1,
        attemptNumber: 1,
        hintsUsed: 1,
      })
      .limit(5000)
      .toArray()) as FinalAttempt[];

    if (finals.length < minFinals) {
      return { ...empty, finalPlays: finals.length, notes: empty.notes };
    }

    const solves = finals.filter((f) => f.isCorrect);
    const abandons = finals.filter((f) => f.abandoned || !f.isCorrect);
    const solveTimes = solves
      .map((f) => f.timeSpentSeconds)
      .filter((t): t is number => typeof t === "number" && t > 0 && t < 3600);
    const attemptOnSolve = solves
      .map((f) => f.attemptNumber)
      .filter((n): n is number => typeof n === "number" && n > 0);
    const hints = finals
      .map((f) => f.hintsUsed)
      .filter((n): n is number => typeof n === "number" && n >= 0);

    const solveRate = solves.length / finals.length;
    const abandonRate = abandons.length / finals.length;
    const medianSolveSeconds = median(solveTimes);
    const avgSolveSeconds = avg(solveTimes);
    const avgAttemptsOnSolve = avg(attemptOnSolve);
    const avgHintsOnFinal = avg(hints);
    const puzzleCount = new Set(finals.map((f) => f.puzzleId).filter(Boolean)).size;

    const notes: string[] = [];
    let difficultyDelta = 0;

    // Too easy: fast solves + high completion
    const veryFast = medianSolveSeconds !== null && medianSolveSeconds < 35 && solveRate >= 0.7;
    const fast = medianSolveSeconds !== null && medianSolveSeconds < 70 && solveRate >= 0.75;
    const fewAttempts =
      avgAttemptsOnSolve !== null && avgAttemptsOnSolve <= 1.35 && solveRate >= 0.7;
    const fewHints = avgHintsOnFinal !== null && avgHintsOnFinal < 0.4 && solveRate >= 0.75;

    if (veryFast || (fast && fewAttempts && fewHints)) {
      difficultyDelta = veryFast ? 2 : 1;
      notes.push(
        `Players finishing too quickly (median ${Math.round(medianSolveSeconds ?? 0)}s, solve ${(solveRate * 100).toFixed(0)}%) — raise difficulty`
      );
    }

    // Too hard: low solve / high abandon
    if (solveRate < 0.28 || abandonRate > 0.55) {
      difficultyDelta = Math.min(difficultyDelta, -1);
      if (solveRate < 0.18 || abandonRate > 0.65) {
        difficultyDelta = -2;
      }
      notes.push(
        `Players struggling (solve ${(solveRate * 100).toFixed(0)}%, abandon ${(abandonRate * 100).toFixed(0)}%) — ease difficulty`
      );
    }

    // Mid: slow solves with healthy rate → slight bump toward craft density
    if (
      difficultyDelta === 0 &&
      medianSolveSeconds !== null &&
      medianSolveSeconds > 180 &&
      solveRate > 0.45 &&
      solveRate < 0.7
    ) {
      notes.push("Healthy challenge band — hold difficulty, sharpen aha craft");
    }

    // Blend explicit difficulty perception votes (when enough exist)
    try {
      const { aggregatePerceptionDelta } = await import("./difficulty-perception");
      const votes = await loadPerceptionVotes(lookbackDays);
      const perception = aggregatePerceptionDelta(votes);
      if (perception.delta !== 0) {
        // Soft blend: perception can nudge ±1 beyond behavioral delta
        const blended = Math.max(-2, Math.min(2, difficultyDelta + Math.sign(perception.delta)));
        if (blended !== difficultyDelta) {
          difficultyDelta = blended;
          notes.push(...perception.notes);
        } else {
          notes.push(...perception.notes);
        }
      }
    } catch {
      // non-blocking
    }

    if (!notes.length) {
      notes.push("Performance within target band — maintain schedule with light adaptation");
    }

    return {
      lookbackDays,
      finalPlays: finals.length,
      solves: solves.length,
      abandons: abandons.length,
      solveRate,
      abandonRate,
      medianSolveSeconds,
      avgSolveSeconds,
      avgAttemptsOnSolve,
      avgHintsOnFinal,
      puzzleCount,
      tooEasy: difficultyDelta > 0,
      tooHard: difficultyDelta < 0,
      difficultyDelta,
      notes,
    };
  } catch {
    return empty;
  }
}

/**
 * Per-puzzle live calibration after enough finals accumulate.
 */
export async function measurePuzzlePerformance(puzzleId: string): Promise<{
  puzzleId: string;
  finals: number;
  solveRate: number;
  medianSolveSeconds: number | null;
  perceivedTooEasy: boolean;
  perceivedTooHard: boolean;
  suggestedActualDifficultyDelta: number;
} | null> {
  try {
    const finals = (await getCollection("puzzleAttempts")
      .find({ puzzleId, isFinal: true })
      .project({
        isCorrect: 1,
        abandoned: 1,
        timeSpentSeconds: 1,
      })
      .limit(500)
      .toArray()) as FinalAttempt[];

    if (finals.length < 5) return null;

    const solves = finals.filter((f) => f.isCorrect);
    const solveRate = solves.length / finals.length;
    const times = solves
      .map((f) => f.timeSpentSeconds)
      .filter((t): t is number => typeof t === "number" && t > 0);
    const medianSolveSeconds = median(times);

    let suggestedActualDifficultyDelta = 0;
    if (solveRate > 0.8 && medianSolveSeconds !== null && medianSolveSeconds < 60) {
      suggestedActualDifficultyDelta = -1; // was easier than labeled
    } else if (solveRate < 0.25) {
      suggestedActualDifficultyDelta = 1; // was harder than labeled
    }

    let perceivedTooEasy = suggestedActualDifficultyDelta < 0;
    let perceivedTooHard = suggestedActualDifficultyDelta > 0;

    try {
      const feedback = (await getCollection("aiFeedback")
        .find({ puzzleId, feedbackType: "difficulty_accuracy" })
        .project({ metrics: 1 })
        .limit(100)
        .toArray()) as Array<{ metrics?: { tooEasy?: boolean; tooHard?: boolean } }>;
      if (feedback.length >= 3) {
        const easy = feedback.filter((f) => f.metrics?.tooEasy).length;
        const hard = feedback.filter((f) => f.metrics?.tooHard).length;
        perceivedTooEasy = easy / feedback.length >= 0.4;
        perceivedTooHard = hard / feedback.length >= 0.4;
        if (perceivedTooEasy && suggestedActualDifficultyDelta >= 0) {
          suggestedActualDifficultyDelta = -1;
        } else if (perceivedTooHard && suggestedActualDifficultyDelta <= 0) {
          suggestedActualDifficultyDelta = 1;
        }
      }
    } catch {
      // keep behavioral signals
    }

    return {
      puzzleId,
      finals: finals.length,
      solveRate,
      medianSolveSeconds,
      perceivedTooEasy,
      perceivedTooHard,
      suggestedActualDifficultyDelta,
    };
  } catch {
    return null;
  }
}
