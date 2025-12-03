/**
 * Scoring Module
 *
 * Pure functions for calculating game scores based on the 4 pillars:
 * 1. Speed Bonus - Solve faster for more points
 * 2. Accuracy Matters - Fewer attempts = higher score
 * 3. Streak Multiplier - Build streaks for bonus points
 * 4. Difficulty Bonus - Harder puzzles = bigger rewards
 */

import { scoringConfig } from "@rebuzzle/config";

export interface ScoreInput {
  timeTakenSeconds: number;
  wrongAttempts: number;
  streakDays: number;
  difficultyLevel: number;
  hintsUsed?: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  speedBonus: number;
  accuracyPenalty: number;
  hintPenalty: number;
  streakBonus: number;
  difficultyBonus: number;
  totalScore: number;
}

/**
 * Calculate the speed bonus based on solve time
 */
export function calculateSpeedBonus(timeTakenSeconds: number): number {
  const { maxBonus, fastThreshold, slowThreshold } = scoringConfig.speedBonus;

  if (timeTakenSeconds <= fastThreshold) {
    return maxBonus;
  }

  if (timeTakenSeconds >= slowThreshold) {
    return 0;
  }

  // Linear interpolation between thresholds
  const range = slowThreshold - fastThreshold;
  const timeOverFast = timeTakenSeconds - fastThreshold;
  const bonusRatio = 1 - timeOverFast / range;

  return Math.round(maxBonus * bonusRatio);
}

/**
 * Calculate the accuracy penalty based on wrong attempts
 */
export function calculateAccuracyPenalty(wrongAttempts: number): number {
  return wrongAttempts * scoringConfig.accuracy.penaltyPerAttempt;
}

/**
 * Calculate the hint penalty based on hints used
 */
export function calculateHintPenalty(hintsUsed: number): number {
  const penalty = hintsUsed * scoringConfig.hints.penaltyPerHint;
  return Math.min(penalty, scoringConfig.hints.maxPenalty);
}

/**
 * Calculate the streak bonus based on consecutive days played
 */
export function calculateStreakBonus(streakDays: number): number {
  const { bonusPerDay, maxBonus } = scoringConfig.streak;
  return Math.min(streakDays * bonusPerDay, maxBonus);
}

/**
 * Calculate the difficulty bonus based on puzzle difficulty level
 */
export function calculateDifficultyBonus(difficultyLevel: number): number {
  const { bonusPerLevel, baseline, maxBonus } = scoringConfig.difficulty;

  if (difficultyLevel <= baseline) {
    return 0;
  }

  const levelsAboveBaseline = difficultyLevel - baseline;
  return Math.min(levelsAboveBaseline * bonusPerLevel, maxBonus);
}

/**
 * Calculate the full score breakdown for a solved puzzle
 */
export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const baseScore = scoringConfig.baseScore;
  const speedBonus = calculateSpeedBonus(input.timeTakenSeconds);
  const accuracyPenalty = calculateAccuracyPenalty(input.wrongAttempts);
  const hintPenalty = calculateHintPenalty(input.hintsUsed ?? 0);
  const streakBonus = calculateStreakBonus(input.streakDays);
  const difficultyBonus = calculateDifficultyBonus(input.difficultyLevel);

  const rawTotal = baseScore + speedBonus - accuracyPenalty - hintPenalty + streakBonus + difficultyBonus;
  const totalScore = Math.max(rawTotal, scoringConfig.minScore);

  return {
    baseScore,
    speedBonus,
    accuracyPenalty,
    hintPenalty,
    streakBonus,
    difficultyBonus,
    totalScore,
  };
}

/**
 * Calculate user level from total points
 */
export function calculateLevel(totalPoints: number, pointsPerLevel = 1000): number {
  return Math.max(1, Math.floor(totalPoints / pointsPerLevel) + 1);
}

/**
 * Calculate points needed for next level
 */
export function pointsToNextLevel(
  totalPoints: number,
  pointsPerLevel = 1000
): { currentLevel: number; pointsInCurrentLevel: number; pointsNeeded: number } {
  const currentLevel = calculateLevel(totalPoints, pointsPerLevel);
  const pointsForCurrentLevel = (currentLevel - 1) * pointsPerLevel;
  const pointsInCurrentLevel = totalPoints - pointsForCurrentLevel;
  const pointsNeeded = pointsPerLevel - pointsInCurrentLevel;

  return {
    currentLevel,
    pointsInCurrentLevel,
    pointsNeeded,
  };
}
