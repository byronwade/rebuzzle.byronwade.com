/**
 * Learning digest — turn recent attempt telemetry into generation guidance.
 */

import { getCollection } from "@/db/mongodb";
import { isFeatureEnabled } from "../../config/feature-flags";
import type { LearningDigest } from "./types";

type AttemptAgg = {
  puzzleId: string;
  attempts: number;
  solves: number;
  abandons: number;
  hints: number;
};

/**
 * Aggregate recent attempt patterns into avoid/prefer guidance for Apex.
 * Soft-fails to empty digest when learning is disabled or DB is empty.
 */
export async function loadLearningDigest(input?: {
  lookbackDays?: number;
}): Promise<LearningDigest> {
  const enabled = isFeatureEnabled("learning");
  if (!enabled) {
    return {
      enabled: false,
      avoidPatterns: [],
      preferPatterns: [],
      difficultyDriftNotes: [],
      sampleSize: 0,
    };
  }

  const lookbackDays = input?.lookbackDays ?? 21;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  try {
    const attempts = await getCollection("puzzleAttempts")
      .find({ attemptedAt: { $gte: cutoff } })
      .project({
        puzzleId: 1,
        isCorrect: 1,
        abandoned: 1,
        hintsUsed: 1,
      })
      .limit(2000)
      .toArray();

    if (!attempts.length) {
      return {
        enabled: true,
        avoidPatterns: [],
        preferPatterns: ["Clear visual→answer mapping", "Progressive hints without early spoilers"],
        difficultyDriftNotes: ["No recent attempts — default to fair Hard/Difficult craft"],
        sampleSize: 0,
      };
    }

    const byPuzzle = new Map<string, AttemptAgg>();
    for (const a of attempts) {
      const id = String(a.puzzleId ?? "");
      if (!id) continue;
      const row = byPuzzle.get(id) ?? {
        puzzleId: id,
        attempts: 0,
        solves: 0,
        abandons: 0,
        hints: 0,
      };
      row.attempts += 1;
      if (a.isCorrect) row.solves += 1;
      if (a.abandoned) row.abandons += 1;
      row.hints += typeof a.hintsUsed === "number" ? a.hintsUsed : 0;
      byPuzzle.set(id, row);
    }

    const rows = [...byPuzzle.values()].filter((r) => r.attempts >= 5);
    const avoidPatterns: string[] = [];
    const preferPatterns: string[] = [];
    const difficultyDriftNotes: string[] = [];

    let lowSolve = 0;
    let highAbandon = 0;
    let highHint = 0;
    let easySolves = 0;

    for (const r of rows) {
      const solveRate = r.solves / r.attempts;
      const abandonRate = r.abandons / r.attempts;
      const avgHints = r.hints / r.attempts;
      if (solveRate < 0.15) lowSolve += 1;
      if (abandonRate > 0.45) highAbandon += 1;
      if (avgHints > 2.5) highHint += 1;
      if (solveRate > 0.85 && avgHints < 0.3) easySolves += 1;
    }

    if (lowSolve >= 2) {
      avoidPatterns.push("Obscure answers with weak visual mapping (low solve rate)");
      preferPatterns.push("Familiar idioms/compounds with one clear aha");
    }
    if (highAbandon >= 2) {
      avoidPatterns.push("Dense boards that cause early abandon");
      preferPatterns.push("Readable component budgets for the tier");
    }
    if (highHint >= 2) {
      avoidPatterns.push("Hints that don't unlock the mechanism early enough");
      preferPatterns.push("Hint 2 should name the mechanism (sound / position / compound)");
    }
    if (easySolves >= 3) {
      difficultyDriftNotes.push(
        "Recent puzzles solved too easily — lean into preferred Evil/Difficult techniques when targeting those tiers"
      );
    } else if (lowSolve >= 3) {
      difficultyDriftNotes.push(
        "Recent puzzles too hard — prefer cleaner compounds and stronger pictogram cues"
      );
    }

    if (!preferPatterns.length) {
      preferPatterns.push("Strong aha with fair hint ladder");
    }

    return {
      enabled: true,
      avoidPatterns,
      preferPatterns,
      difficultyDriftNotes,
      sampleSize: attempts.length,
    };
  } catch {
    return {
      enabled: true,
      avoidPatterns: [],
      preferPatterns: [],
      difficultyDriftNotes: ["Learning digest unavailable — continue with diversity memory only"],
      sampleSize: 0,
    };
  }
}
