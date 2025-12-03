/**
 * Game Settings Configuration
 *
 * Re-exports shared config from @rebuzzle/config and adds local game logic functions.
 */

export type {
  BlogPostReference,
  Difficulty,
  DifficultyLevel,
  GameData,
  LeaderboardEntry,
  PuzzleMetadata,
  PuzzleType,
} from "@rebuzzle/config";
// Re-export all types and constants from shared config
export {
  engagementConfig,
  type GameSettings,
  gameSettings,
  scoringConfig,
} from "@rebuzzle/config";

// Import for local use
import { engagementConfig, gameSettings, scoringConfig } from "@rebuzzle/config";

/**
 * Check if current time is within streak grace period
 * Grace period allows completing yesterday's puzzle after midnight
 *
 * @returns Object with grace status and deadline
 */
export function checkStreakGracePeriod(): {
  inGracePeriod: boolean;
  graceDeadline: Date | null;
  hoursRemaining: number;
} {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const graceHours = engagementConfig.streakGraceHours;

  // Grace period: 00:00 - 02:00 UTC (configurable)
  const inGracePeriod = utcHours < graceHours;

  if (inGracePeriod) {
    const graceDeadline = new Date(now);
    graceDeadline.setUTCHours(graceHours, 0, 0, 0);

    const hoursRemaining = graceHours - utcHours;

    return {
      inGracePeriod: true,
      graceDeadline,
      hoursRemaining,
    };
  }

  return {
    inGracePeriod: false,
    graceDeadline: null,
    hoursRemaining: 0,
  };
}

/**
 * Determine if this solve should be a "lucky solve" (random 2x points)
 *
 * Psychology: Variable rewards create stronger habit loops
 * The unpredictability makes the reward feel more special
 *
 * @returns Object with lucky status and multiplier
 */
export function rollLuckySolve(): {
  isLucky: boolean;
  multiplier: number;
} {
  const roll = Math.random();
  const isLucky = roll < engagementConfig.luckySolveChance;

  return {
    isLucky,
    multiplier: isLucky ? engagementConfig.luckySolveMultiplier : 1,
  };
}

/**
 * Determine if today should have a bonus multiplier
 * Uses a deterministic seed based on date for consistency
 *
 * @returns Object with bonus status and multiplier
 */
export function getDailyBonusMultiplier(date: Date = new Date()): {
  hasBonus: boolean;
  multiplier: number;
} {
  // Create a deterministic "random" based on date
  // This ensures all users see the same bonus on the same day
  const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const seed = dateString?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) ?? 0;
  const pseudoRandom = (Math.sin(seed) + 1) / 2; // 0-1 range

  const hasBonus = pseudoRandom < engagementConfig.dailyBonusChance;

  if (!hasBonus) {
    return { hasBonus: false, multiplier: 1 };
  }

  // Calculate multiplier within range
  const { dailyBonusMinMultiplier, dailyBonusMaxMultiplier } = engagementConfig;
  const range = dailyBonusMaxMultiplier - dailyBonusMinMultiplier;
  const multiplier = Math.round((dailyBonusMinMultiplier + pseudoRandom * range) * 10) / 10;

  return { hasBonus: true, multiplier };
}

/**
 * Check if user should receive a streak freeze
 * Resets weekly on Monday UTC
 *
 * @param lastFreezeWeekStart - Start of the week when freeze was last given
 * @returns Whether to grant a new freeze
 */
export function shouldResetStreakFreeze(lastFreezeWeekStart?: Date): boolean {
  if (!lastFreezeWeekStart) return true;

  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const lastWeekStart = getWeekStart(lastFreezeWeekStart);

  return currentWeekStart.getTime() > lastWeekStart.getTime();
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate points for a completed puzzle
 *
 * Scoring breakdown:
 * - Base: 100 points
 * - Speed Bonus: 0-50 points (faster = more)
 * - Accuracy: -15 points per wrong attempt
 * - Hints: -10 points per hint used (max -30)
 * - Streak Bonus: 5 points per streak day (max 50)
 * - Difficulty Bonus: 10 points per level above 4 (max 60)
 *
 * @param attempts - Number of attempts used (1 = first try)
 * @param timeTaken - Time to solve in seconds (optional)
 * @param streakDays - Current winning streak in days (optional)
 * @param difficulty - Puzzle difficulty level 1-10 (optional, default 5)
 * @param hintsUsed - Number of hints revealed (optional, default 0)
 */
export function calculateGamePoints(
  attempts: number,
  timeTaken?: number,
  streakDays = 0,
  difficulty = 5,
  hintsUsed = 0
): number {
  const {
    baseScore,
    speedBonus,
    accuracy,
    hints,
    streak,
    difficulty: diffConfig,
    minScore,
  } = scoringConfig;

  // Start with base score
  let score = baseScore;

  // 1. Speed Bonus: Up to 50 points for solving quickly
  if (timeTaken !== undefined && timeTaken < speedBonus.slowThreshold) {
    if (timeTaken <= speedBonus.fastThreshold) {
      // Full bonus for solving under 30 seconds
      score += speedBonus.maxBonus;
    } else {
      // Linear decrease from 30s to 120s
      const timeRange = speedBonus.slowThreshold - speedBonus.fastThreshold;
      const timeOver = timeTaken - speedBonus.fastThreshold;
      const bonusPct = 1 - timeOver / timeRange;
      score += Math.floor(speedBonus.maxBonus * bonusPct);
    }
  }

  // 2. Accuracy: Penalize wrong attempts (first attempt = no penalty)
  const wrongAttempts = attempts - 1;
  if (wrongAttempts > 0) {
    score -= wrongAttempts * accuracy.penaltyPerAttempt;
  }

  // 3. Hints: Penalize hint usage
  if (hintsUsed > 0) {
    const hintPenalty = Math.min(hintsUsed * hints.penaltyPerHint, hints.maxPenalty);
    score -= hintPenalty;
  }

  // 4. Streak Multiplier: Bonus for consecutive days
  if (streakDays > 0) {
    score += Math.min(streakDays * streak.bonusPerDay, streak.maxBonus);
  }

  // 5. Difficulty Bonus: Extra points for harder puzzles
  if (difficulty > diffConfig.baseline) {
    const levelsAboveBaseline = difficulty - diffConfig.baseline;
    score += Math.min(levelsAboveBaseline * diffConfig.bonusPerLevel, diffConfig.maxBonus);
  }

  // Never go below minimum score
  return Math.max(minScore, score);
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use calculateGamePoints instead
 */
export function calculateGamePointsLegacy(
  attempts: number,
  hintsUsed: number,
  streakDays = 0
): number {
  const { basePoints, streakBonus, maxAttempts } = gameSettings;
  const attemptPenalty = (maxAttempts - attempts) * 10;
  const hintPenalty = hintsUsed * 25;
  const streakBonusPoints = streakDays > 0 ? streakBonus * Math.min(streakDays, 7) : 0;
  return Math.max(10, basePoints - attemptPenalty - hintPenalty + streakBonusPoints);
}

/**
 * Calculate user level from total points
 * Level 1: 0-999 points
 * Level 2: 1000-1999 points
 * Level N: (N-1)*1000 to N*1000-1 points
 */
export function calculateLevel(totalPoints: number): number {
  const { pointsPerLevel, maxLevel } = gameSettings;
  const calculatedLevel = Math.floor(totalPoints / pointsPerLevel) + 1;
  return Math.min(maxLevel, calculatedLevel);
}

/**
 * Get points needed for a specific level
 */
export function getPointsForLevel(level: number): number {
  const { pointsPerLevel } = gameSettings;
  return (level - 1) * pointsPerLevel;
}

/**
 * Get points needed for the next level
 */
export function getPointsForNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints);
  return getPointsForLevel(currentLevel + 1);
}

/**
 * Get progress percentage toward next level
 */
export function getLevelProgress(currentPoints: number): number {
  const { pointsPerLevel } = gameSettings;
  const currentLevel = calculateLevel(currentPoints);
  const currentLevelStart = getPointsForLevel(currentLevel);
  const pointsIntoLevel = currentPoints - currentLevelStart;
  return Math.min(100, (pointsIntoLevel / pointsPerLevel) * 100);
}
