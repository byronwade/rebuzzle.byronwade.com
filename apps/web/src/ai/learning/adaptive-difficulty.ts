/**
 * Adaptive difficulty — blend day-of-week schedule with live player pressure.
 */

import { getDifficultyLevelForScore } from "../puzzle-agent/difficulty-levels";
import type { WindowPerformance } from "./performance-monitor";

/**
 * Canonical weekly spine (UTC day index). Hard→Impossible vocabulary.
 * Averages ~8/10 (~80% difficulty) while still varying the week.
 */
export const WEEKLY_DIFFICULTY_SPINE = [8, 7, 8, 8, 9, 8, 7] as const;

export function baselineDifficultyForDate(date: Date = new Date()): number {
  const dayOfWeek = date.getUTCDay();
  return WEEKLY_DIFFICULTY_SPINE[dayOfWeek] ?? 5;
}

export type AdaptiveDifficultyResult = {
  baseline: number;
  delta: number;
  target: number;
  tierLabel: string;
  reason: string;
  performance: Pick<
    WindowPerformance,
    | "solveRate"
    | "medianSolveSeconds"
    | "finalPlays"
    | "tooEasy"
    | "tooHard"
    | "difficultyDelta"
    | "notes"
  >;
};

/**
 * Clamp into playable generation band (Hard 4 … Impossible 9).
 */
export function clampGenerationDifficulty(score: number): number {
  return Math.max(4, Math.min(9, Math.round(score)));
}

/**
 * Compute tomorrow's (or today's) generation target from schedule + live metrics.
 */
export function computeAdaptiveDifficulty(input: {
  date?: Date;
  performance: WindowPerformance;
  /** Optional manual override from admin/env */
  forceDelta?: number;
}): AdaptiveDifficultyResult {
  const date = input.date ?? new Date();
  const baseline = baselineDifficultyForDate(date);
  const delta =
    typeof input.forceDelta === "number"
      ? input.forceDelta
      : input.performance.difficultyDelta;

  const target = clampGenerationDifficulty(baseline + delta);
  const tier = getDifficultyLevelForScore(target);

  const reason = [
    `Baseline ${baseline} (${tier.label} spine for UTC day ${date.getUTCDay()})`,
    delta !== 0 ? `learning delta ${delta > 0 ? "+" : ""}${delta}` : "no learning delta",
    input.performance.notes[0] ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    baseline,
    delta,
    target,
    tierLabel: tier.label,
    reason,
    performance: {
      solveRate: input.performance.solveRate,
      medianSolveSeconds: input.performance.medianSolveSeconds,
      finalPlays: input.performance.finalPlays,
      tooEasy: input.performance.tooEasy,
      tooHard: input.performance.tooHard,
      difficultyDelta: input.performance.difficultyDelta,
      notes: input.performance.notes,
    },
  };
}
