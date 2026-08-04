/**
 * Elo-style priors for Apex finalist pre-ranking.
 *
 * Soft priors come from technique/player solve rates and difficulty hints.
 * When `answerEloByKey` is provided (from persisted pairwise matches in
 * `puzzleEloRatings`), those ratings take precedence over soft priors.
 */

import type { TechniqueSolveRate } from "./technique-calibration";

export const ELO_BASE = 1500;

/** Map a 1–10 difficulty hint onto an Elo ladder (easy → lower). */
export function eloFromDifficultyHint(difficultyHint: number): number {
  const clamped = Math.max(1, Math.min(10, difficultyHint));
  return Math.round(1200 + ((clamped - 1) * 600) / 9);
}

/**
 * Lower solve rate ⇒ higher Elo (harder for players).
 * 50% solve ≈ base 1500; each 10pp shifts ~80 Elo.
 */
export function eloFromSolveRate(solveRate: number): number {
  const rate = Math.max(0, Math.min(1, solveRate));
  return Math.round(ELO_BASE + (0.5 - rate) * 800);
}

/** Shrink an Elo estimate toward base when the sample is thin. */
export function shrinkEloTowardBase(elo: number, sampleSize: number, minSamples = 4): number {
  if (sampleSize >= minSamples * 3) return elo;
  if (sampleSize <= 0) return ELO_BASE;
  const weight = Math.min(1, sampleSize / (minSamples * 3));
  return Math.round(ELO_BASE * (1 - weight) + elo * weight);
}

export function eloPriorForTechnique(
  techniqueId: string,
  rates: readonly TechniqueSolveRate[],
  minSamples = 4
): number {
  const row = rates.find((entry) => entry.techniqueId === techniqueId);
  if (!row || row.sampleSize < minSamples) return ELO_BASE;
  return shrinkEloTowardBase(eloFromSolveRate(row.solveRate), row.sampleSize, minSamples);
}

/** Target Elo for a daily difficulty score (1–10). */
export function targetEloForDifficulty(difficulty: number): number {
  return eloFromDifficultyHint(difficulty);
}

/**
 * Bonus when candidate Elo sits near the target band (max ~5 points).
 * Used as a soft nudge on top of tournamentScore — never overrides hard gates.
 */
export function eloFitBonus(candidateElo: number, targetElo: number): number {
  const distance = Math.abs(candidateElo - targetElo);
  return Math.max(0, 5 - distance / 40);
}

/**
 * Blend a hard-gated tournament score with an Elo fit prior.
 * Negative tournament scores (gate failures) are unchanged.
 */
export function blendScoreWithElo(
  tournamentScoreValue: number,
  candidateElo: number,
  targetElo: number
): number {
  if (tournamentScoreValue < 0) return tournamentScoreValue;
  return tournamentScoreValue + eloFitBonus(candidateElo, targetElo);
}

export type EloRankingOptions = {
  techniqueRates?: readonly TechniqueSolveRate[];
  targetDifficulty?: number;
  /** Optional per-answer Elo overrides (e.g. from playtest panels). */
  answerEloByKey?: ReadonlyMap<string, number>;
};

export function resolveCandidateElo(
  input: {
    techniqueId: string;
    answer: string;
    difficulty: number;
    estimatedSolveRate?: number;
  },
  options?: EloRankingOptions
): number {
  const key = input.answer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const answerElo = options?.answerEloByKey?.get(key);
  if (typeof answerElo === "number" && Number.isFinite(answerElo)) {
    return Math.round(answerElo);
  }

  if (
    typeof input.estimatedSolveRate === "number" &&
    Number.isFinite(input.estimatedSolveRate)
  ) {
    return eloFromSolveRate(input.estimatedSolveRate);
  }

  const techniqueElo = eloPriorForTechnique(input.techniqueId, options?.techniqueRates ?? []);
  if (techniqueElo !== ELO_BASE) return techniqueElo;

  return eloFromDifficultyHint(input.difficulty);
}
