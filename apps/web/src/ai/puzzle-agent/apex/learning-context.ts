/**
 * Learning digest — real player pressure → generation guidance + difficulty delta.
 */

import { isFeatureEnabled } from "../../config/feature-flags";
import { measureWindowPerformance } from "../../learning/performance-monitor";
import type { LearningDigest } from "./types";

/**
 * Aggregate recent finals into avoid/prefer guidance and a numeric difficulty delta.
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
      targetDifficultyDelta: 0,
      tooEasy: false,
      tooHard: false,
      medianSolveSeconds: null,
      solveRate: null,
    };
  }

  const lookbackDays = input?.lookbackDays ?? 7;

  try {
    const window = await measureWindowPerformance({
      lookbackDays,
      minFinals: 8,
    });

    const avoidPatterns: string[] = [];
    const preferPatterns: string[] = [];
    const difficultyDriftNotes = [...window.notes];

    if (window.tooEasy) {
      avoidPatterns.push("Simple one-step compounds that resolve in under a minute");
      avoidPatterns.push("Over-obvious emoji sums with no false lead");
      preferPatterns.push("Prefer denser techniques: false leads, nested homophones, spatial idioms");
      preferPatterns.push("Require at least two interacting layers for Evil+ targets");
      difficultyDriftNotes.push(
        `RAISE DIFFICULTY: median solve ${Math.round(window.medianSolveSeconds ?? 0)}s, solve rate ${(window.solveRate * 100).toFixed(0)}% → delta +${window.difficultyDelta}`
      );
    }

    if (window.tooHard) {
      avoidPatterns.push("Obscure answers / niche cultural refs without clear visual mapping");
      avoidPatterns.push("Dense boards that cause early abandon");
      preferPatterns.push("Familiar idioms/compounds with one clear aha");
      preferPatterns.push("Hint 2 should name the mechanism (sound / position / compound)");
      difficultyDriftNotes.push(
        `EASE DIFFICULTY: solve rate ${(window.solveRate * 100).toFixed(0)}%, abandon ${(window.abandonRate * 100).toFixed(0)}% → delta ${window.difficultyDelta}`
      );
    }

    if (!window.tooEasy && !window.tooHard) {
      preferPatterns.push("Strong aha with fair hint ladder");
      preferPatterns.push("Clear visual→answer mapping with progressive hints");
    }

    if (
      window.avgHintsOnFinal !== null &&
      window.avgHintsOnFinal > 2.2 &&
      !window.tooHard
    ) {
      avoidPatterns.push("Hints that don't unlock the mechanism early enough");
      preferPatterns.push("Make hint 2 structural, not just thematic");
    }

    return {
      enabled: true,
      avoidPatterns,
      preferPatterns,
      difficultyDriftNotes,
      sampleSize: window.finalPlays,
      targetDifficultyDelta: window.difficultyDelta,
      tooEasy: window.tooEasy,
      tooHard: window.tooHard,
      medianSolveSeconds: window.medianSolveSeconds,
      solveRate: window.solveRate,
    };
  } catch {
    return {
      enabled: true,
      avoidPatterns: [],
      preferPatterns: [],
      difficultyDriftNotes: ["Learning digest unavailable — continue with diversity memory only"],
      sampleSize: 0,
      targetDifficultyDelta: 0,
      tooEasy: false,
      tooHard: false,
      medianSolveSeconds: null,
      solveRate: null,
    };
  }
}
