/**
 * Neon Auth Configuration
 *
 * This module provides authentication using Neon Auth
 * with proper integration for leaderboard and statistics
 */

import { db } from "@/db";
import type { UserStats } from "@/db/models";
import { getAchievementDifficultyCategory } from "@/lib/difficulty";
import { calculateGamePoints, calculateLevel } from "@/lib/gameSettings";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLogin?: Date;
};

export type UserStatsData = {
  points: number;
  streak: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  completionRate?: number; // Optional completion rate from analytics
};

/**
 * Get user by ID with stats
 */
export async function getUserWithStats(userId: string): Promise<{
  user: AuthUser | null;
  stats: UserStatsData | null;
}> {
  try {
    const user = await db.userOps.findById(userId);

    if (!user) {
      return { user: null, stats: null };
    }

    const stats = await db.userStatsOps.findByUserId(userId);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || undefined,
      },
      stats: stats
        ? {
            points: stats.points,
            streak: stats.streak,
            totalGames: stats.totalGames,
            wins: stats.wins,
            level: stats.level,
            dailyChallengeStreak: stats.dailyChallengeStreak,
            lastPlayDate: stats.lastPlayDate || undefined,
          }
        : null,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting user with stats:", error);
    return { user: null, stats: null };
  }
}

/**
 * Update user stats after game completion
 * Uses unified scoring system with:
 * 1. Speed Bonus - Solve faster for more points
 * 2. Accuracy Matters - Fewer attempts = higher score
 * 3. Streak Multiplier - Build streaks for bonus points
 * 4. Difficulty Bonus - Harder puzzles = bigger rewards
 */
function calculatePointsEarned(
  gameResult: {
    won: boolean;
    attempts: number;
    timeSpent?: number;
    difficulty?: number;
  },
  currentStreak: number
): number {
  if (!gameResult.won) {
    return 0;
  }

  return calculateGamePoints(
    gameResult.attempts,
    gameResult.timeSpent,
    currentStreak,
    gameResult.difficulty
  );
}

/**
 * Calculate streak after a game.
 * - Loss always resets streak to 0
 * - Win on a new day increments streak
 * - Win on same day keeps current streak (already counted today)
 */
function calculateStreak(
  currentStats: UserStats | null,
  gameResult: { won: boolean },
  isNewDay: boolean
): number {
  // Loss always resets streak
  if (!gameResult.won) {
    return 0;
  }

  const currentStreak = currentStats?.streak || 0;

  // Only increment on a new day to prevent multiple daily increments
  // If same day, keep current streak (player already earned it today)
  return isNewDay ? currentStreak + 1 : currentStreak;
}

/**
 * Calculate daily challenge streak.
 * - Loss resets daily streak to 0 (you broke your daily habit)
 * - Win on a new day increments daily streak
 * - Win on same day keeps current daily streak
 */
function calculateDailyStreak(
  currentStats: UserStats | null,
  gameResult: { won: boolean },
  isNewDay: boolean
): number {
  // Loss resets daily streak - you broke the daily chain
  if (!gameResult.won) {
    return 0;
  }

  const currentDailyStreak = currentStats?.dailyChallengeStreak || 0;
  return isNewDay ? currentDailyStreak + 1 : currentDailyStreak;
}

function calculateNewStats(
  currentStats: UserStats | null,
  gameResult: {
    won: boolean;
    attempts: number;
    timeSpent?: number;
    difficulty?: number;
    maxAttempts?: number;
    hintsUsed?: number;
  }
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPlayDate = currentStats?.lastPlayDate
    ? new Date(
        currentStats.lastPlayDate.getFullYear(),
        currentStats.lastPlayDate.getMonth(),
        currentStats.lastPlayDate.getDate()
      )
    : null;

  const isNewDay = !lastPlayDate || lastPlayDate.getTime() !== today.getTime();

  // Calculate streak first so we can use it for points
  const newStreak = calculateStreak(currentStats, gameResult, isNewDay);
  const maxStreak = Math.max(currentStats?.maxStreak || 0, newStreak);

  // Pass streak to points calculation for streak bonus
  const pointsEarned = calculatePointsEarned(gameResult, newStreak);
  const newPoints = (currentStats?.points || 0) + pointsEarned;
  const newWins = (currentStats?.wins || 0) + (gameResult.won ? 1 : 0);
  const newTotalGames = (currentStats?.totalGames || 0) + 1;

  const newDailyStreak = calculateDailyStreak(currentStats, gameResult, isNewDay);

  // Use centralized level calculation from gameSettings
  const newLevel = calculateLevel(newPoints);

  // Achievement tracking calculations
  const maxAttempts = gameResult.maxAttempts || 5;
  const isPerfectSolve = gameResult.won && gameResult.attempts === 1;
  const isClutchSolve = gameResult.won && gameResult.attempts === maxAttempts;
  const isSpeedSolve =
    gameResult.won && gameResult.timeSpent !== undefined && gameResult.timeSpent < 30;
  const isNoHint = !gameResult.hintsUsed || gameResult.hintsUsed === 0;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  // Difficulty categorization (use ?? to handle 0 correctly)
  const difficultyLevel = gameResult.difficulty ?? 5;
  const difficultyCategory = getAchievementDifficultyCategory(difficultyLevel);
  const isEasy = difficultyCategory === "easy";
  const isMedium = difficultyCategory === "medium";
  const isHard = difficultyCategory === "hard";

  // Update achievement counters
  const perfectSolves = (currentStats?.perfectSolves || 0) + (isPerfectSolve ? 1 : 0);
  const clutchSolves = (currentStats?.clutchSolves || 0) + (isClutchSolve ? 1 : 0);
  const speedSolves = (currentStats?.speedSolves || 0) + (isSpeedSolve ? 1 : 0);
  const totalTimePlayed = (currentStats?.totalTimePlayed || 0) + (gameResult.timeSpent || 0);
  const weekendSolves = (currentStats?.weekendSolves || 0) + (gameResult.won && isWeekend ? 1 : 0);
  const easyPuzzlesSolved =
    (currentStats?.easyPuzzlesSolved || 0) + (gameResult.won && isEasy ? 1 : 0);
  const mediumPuzzlesSolved =
    (currentStats?.mediumPuzzlesSolved || 0) + (gameResult.won && isMedium ? 1 : 0);
  const hardPuzzlesSolved =
    (currentStats?.hardPuzzlesSolved || 0) + (gameResult.won && isHard ? 1 : 0);

  // Update fastest solve time
  let fastestSolveSeconds = currentStats?.fastestSolveSeconds;
  if (gameResult.won && gameResult.timeSpent !== undefined) {
    if (!fastestSolveSeconds || gameResult.timeSpent < fastestSolveSeconds) {
      fastestSolveSeconds = gameResult.timeSpent;
    }
  }

  // Update no-hint streak
  let noHintStreak = currentStats?.noHintStreak || 0;
  if (gameResult.won && isNoHint) {
    noHintStreak++;
  } else if (gameResult.won) {
    noHintStreak = 0; // Reset if hints were used
  }
  const maxNoHintStreak = Math.max(currentStats?.maxNoHintStreak || 0, noHintStreak);

  // Update consecutive perfect streak
  let consecutivePerfect = currentStats?.consecutivePerfect || 0;
  if (isPerfectSolve) {
    consecutivePerfect++;
  } else if (gameResult.won) {
    consecutivePerfect = 0; // Reset on non-perfect win
  }
  const maxConsecutivePerfect = Math.max(
    currentStats?.maxConsecutivePerfect || 0,
    consecutivePerfect
  );

  return {
    points: newPoints,
    streak: newStreak,
    maxStreak,
    totalGames: newTotalGames,
    wins: newWins,
    level: newLevel,
    dailyChallengeStreak: newDailyStreak,
    lastPlayDate: now,
    // Achievement tracking fields
    perfectSolves,
    clutchSolves,
    speedSolves,
    fastestSolveSeconds,
    totalTimePlayed,
    noHintStreak,
    maxNoHintStreak,
    consecutivePerfect,
    maxConsecutivePerfect,
    weekendSolves,
    easyPuzzlesSolved,
    mediumPuzzlesSolved,
    hardPuzzlesSolved,
    sharedResults: currentStats?.sharedResults || 0,
    // Psychological engagement fields - preserve existing or initialize
    streakFreezes: currentStats?.streakFreezes ?? 1,
    streakShields: currentStats?.streakShields ?? 0,
    luckySolveCount: currentStats?.luckySolveCount ?? 0,
  };
}

export async function updateUserStats(
  userId: string,
  gameResult: {
    won: boolean;
    attempts: number;
    timeSpent?: number;
    difficulty?: number;
  }
): Promise<boolean> {
  try {
    const currentStats = await db.userStatsOps.findByUserId(userId);
    const newStats = calculateNewStats(currentStats, gameResult);

    if (currentStats) {
      await db.userStatsOps.updateStats(userId, newStats);
    } else {
      await db.userStatsOps.create({
        id: crypto.randomUUID(),
        userId,
        ...newStats,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating user stats:", error);
    return false;
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  limit = 10,
  timeframe?: "today" | "week" | "month" | "allTime"
): Promise<
  Array<{
    rank: number;
    user: AuthUser;
    stats: UserStatsData;
  }>
> {
  try {
    const leaderboardData = await db.userStatsOps.getLeaderboard(limit, timeframe);

    return leaderboardData.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.user.id,
        username: entry.user.username,
        email: entry.user.email,
        createdAt: entry.user.createdAt,
        lastLogin: entry.user.lastLogin || undefined,
      },
      stats: {
        points: entry.points,
        streak: entry.streak,
        totalGames: entry.totalGames,
        wins: entry.wins,
        level: entry.level,
        dailyChallengeStreak: entry.dailyChallengeStreak,
        lastPlayDate: entry.lastPlayDate || undefined,
      },
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting leaderboard:", error);
    return [];
  }
}

/**
 * Get user's rank in leaderboard
 */
export async function getUserRank(
  userId: string,
  timeframe?: "today" | "week" | "month" | "allTime"
): Promise<number | null> {
  try {
    return await db.userStatsOps.getUserRank(userId, timeframe);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting user rank:", error);
    return null;
  }
}

/**
 * Get streak leaderboard - ranked by current active streak
 * Psychology: Streak competition drives daily returns
 */
export async function getStreakLeaderboard(limit = 25): Promise<
  Array<{
    rank: number;
    user: AuthUser;
    stats: UserStatsData;
  }>
> {
  try {
    // Get users sorted by streak (descending), only include users with active streaks
    const leaderboardData = await db.userStatsOps.getStreakLeaderboard(limit);

    return leaderboardData.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.user.id,
        username: entry.user.username,
        email: entry.user.email,
        createdAt: entry.user.createdAt,
        lastLogin: entry.user.lastLogin || undefined,
      },
      stats: {
        points: entry.points,
        streak: entry.streak,
        totalGames: entry.totalGames,
        wins: entry.wins,
        level: entry.level,
        dailyChallengeStreak: entry.dailyChallengeStreak,
        lastPlayDate: entry.lastPlayDate || undefined,
        maxStreak: entry.maxStreak,
      },
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting streak leaderboard:", error);
    return [];
  }
}

/**
 * Create or update user
 */
export async function createOrUpdateUser(userData: {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
}): Promise<boolean> {
  try {
    // Check if user exists
    const existingUser = await db.userOps.findById(userData.id);

    if (existingUser) {
      // Update existing user
      const updates: Partial<typeof existingUser> = {
        username: userData.username,
        email: userData.email,
        lastLogin: new Date(),
      };

      // Only update password hash if provided
      if (userData.passwordHash) {
        updates.passwordHash = userData.passwordHash;
      }

      await db.userOps.update(userData.id, updates);
    } else {
      // Create new user
      await db.userOps.create({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        passwordHash: userData.passwordHash || "",
        createdAt: new Date(),
        lastLogin: new Date(),
      });
    }

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating/updating user:", error);
    return false;
  }
}

/**
 * Verify user credentials
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; valid: boolean }> {
  try {
    const user = await db.userOps.findByEmail(email);

    if (!user?.passwordHash) {
      return { user: null, valid: false };
    }

    const { verifyPassword } = await import("./password");
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return { user: null, valid: false };
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || undefined,
      },
      valid: true,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error verifying credentials:", error);
    return { user: null, valid: false };
  }
}
