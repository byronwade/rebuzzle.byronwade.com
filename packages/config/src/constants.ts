/**
 * Game Settings Configuration
 *
 * Central configuration for game mechanics, scoring, and difficulty.
 */

export const gameSettings = {
  maxAttempts: 3,
  puzzlesPerDay: 1,
  nextGameCountdownHours: 24,
  resetTime: "00:00", // UTC
  basePoints: 100,
  streakBonus: 10,
  dailyChallengeBonus: 50,
  maxLevel: 100, // Allow up to level 100
  pointsPerLevel: 1000, // 1000 points per level (matches scoring ~10 games per level)
} as const;

/** Type-safe access to game settings values */
export type GameSettings = typeof gameSettings;

/**
 * Scoring Configuration
 * Based on the 4 pillars shown on leaderboard:
 * 1. Speed Bonus - Solve faster for more points
 * 2. Accuracy Matters - Fewer attempts = higher score
 * 3. Streak Multiplier - Build streaks for bonus points
 * 4. Difficulty Bonus - Harder puzzles = bigger rewards
 */
export const scoringConfig = {
  // Base score for solving a puzzle
  baseScore: 100,

  // Speed Bonus: Points for solving quickly (max 50 bonus)
  // Under 30 seconds = full bonus, scales down to 0 at 2 minutes
  speedBonus: {
    maxBonus: 50,
    fastThreshold: 30, // seconds for full bonus
    slowThreshold: 120, // seconds where bonus becomes 0
  },

  // Accuracy: Points deducted per wrong attempt
  accuracy: {
    penaltyPerAttempt: 15, // Points lost per wrong attempt
  },

  // Streak Multiplier: Bonus multiplier based on consecutive days
  streak: {
    bonusPerDay: 5, // Points per streak day
    maxBonus: 50, // Cap at 10 day streak (50 points)
  },

  // Difficulty Bonus: Extra points for harder puzzles (scale 1-10)
  difficulty: {
    bonusPerLevel: 10, // Points per difficulty level above baseline (4)
    baseline: 4, // Difficulty level that gives no bonus
    maxBonus: 60, // Max bonus at difficulty 10 (6 levels above baseline * 10)
  },

  // Minimum score (never go below this)
  minScore: 10,
} as const;

/**
 * Psychological Engagement Configuration
 *
 * Settings for subtle engagement mechanics that increase retention
 * without being manipulative.
 */
export const engagementConfig = {
  // Near-miss feedback threshold (0-100 similarity score)
  nearMissThreshold: 70, // Show "So close!" when >= 70% similar

  // Lucky solve random bonus
  luckySolveChance: 0.05, // 5% chance
  luckySolveMultiplier: 2, // 2x points

  // Daily bonus multiplier (surprise bonus days)
  dailyBonusChance: 0.2, // 20% of days
  dailyBonusMinMultiplier: 1.5,
  dailyBonusMaxMultiplier: 3.0,

  // Streak grace period (hours after midnight to save streak)
  streakGraceHours: 2,

  // Streak freeze settings
  streakFreezesPerWeek: 1,
  streakShieldFromAchievements: true,
} as const;
