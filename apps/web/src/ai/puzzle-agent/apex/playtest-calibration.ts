/**
 * Bridge human playtest strata into curriculum / Elo (no longer shadow-only).
 */

import type { TechniqueSolveRate } from "./technique-calibration";

export type PlaytestTechniqueStratum = {
  /** Technique id from playtest report (`techniqueScores[].id`). */
  id: string;
  decisions: number;
  solveRate: number | null;
};

/** Convert playtest techniqueScores into TechniqueSolveRate rows. */
export function techniqueRatesFromPlaytestStrata(
  strata: readonly PlaytestTechniqueStratum[],
  minDecisions = 4
): TechniqueSolveRate[] {
  return strata
    .filter(
      (row) =>
        row.decisions >= minDecisions &&
        row.solveRate !== null &&
        Number.isFinite(row.solveRate) &&
        Boolean(row.id)
    )
    .map((row) => ({
      techniqueId: row.id,
      sampleSize: row.decisions,
      solveRate: row.solveRate as number,
    }));
}

/**
 * Merge live puzzle solve rates with playtest strata.
 * Playtest evidence is weighted higher when both exist (human ground truth).
 */
export function mergeTechniqueSolveRates(
  live: readonly TechniqueSolveRate[],
  playtest: readonly TechniqueSolveRate[],
  playtestWeight = 0.65
): TechniqueSolveRate[] {
  const weight = Math.max(0, Math.min(1, playtestWeight));
  const byId = new Map<string, TechniqueSolveRate>();

  for (const row of live) {
    byId.set(row.techniqueId, { ...row });
  }

  for (const row of playtest) {
    const existing = byId.get(row.techniqueId);
    if (!existing) {
      byId.set(row.techniqueId, { ...row });
      continue;
    }
    const liveWeight = 1 - weight;
    byId.set(row.techniqueId, {
      techniqueId: row.techniqueId,
      sampleSize: existing.sampleSize + row.sampleSize,
      solveRate: existing.solveRate * liveWeight + row.solveRate * weight,
    });
  }

  return [...byId.values()].sort((a, b) => b.sampleSize - a.sampleSize);
}

/**
 * Detect technique families that are far outside the expected solve band for
 * the current learning window — feeds the human calibration circuit breaker.
 */
export function playtestTechniqueDriftIssues(input: {
  rates: readonly TechniqueSolveRate[];
  tooEasy: boolean;
  tooHard: boolean;
  crushThreshold?: number;
  missThreshold?: number;
  minSamples?: number;
}): string[] {
  const crush = input.crushThreshold ?? 0.85;
  const miss = input.missThreshold ?? 0.25;
  const minSamples = input.minSamples ?? 8;
  const issues: string[] = [];

  for (const row of input.rates) {
    if (row.sampleSize < minSamples) continue;
    if (input.tooEasy && row.solveRate >= crush) {
      issues.push(
        `Playtest drift: ${row.techniqueId} solve rate ${Math.round(row.solveRate * 100)}% (players crushing)`
      );
    }
    if (input.tooHard && row.solveRate <= miss) {
      issues.push(
        `Playtest drift: ${row.techniqueId} solve rate ${Math.round(row.solveRate * 100)}% (players missing)`
      );
    }
  }
  return issues.slice(0, 4);
}
