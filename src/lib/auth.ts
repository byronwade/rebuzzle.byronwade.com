/**
 * Neon Auth Configuration
 *
 * This module provides authentication using Neon Auth
 * with proper integration for leaderboard and statistics
 */

import { db } from "@/db";
import type { UserStats } from "@/db/models";

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
 */
function calculatePointsEarned(gameResult: {
  won: boolean;
  attempts: number;
}): number {
  if (!gameResult.won) {
    return 0;
  }

  const BASE_POINTS = 100;
  const POINTS_PER_ATTEMPT = 10;
  const MIN_POINTS = 10;

  return Math.max(
    BASE_POINTS - (gameResult.attempts - 1) * POINTS_PER_ATTEMPT,
    MIN_POINTS
  );
}

function calculateStreak(
  currentStats: UserStats | null,
  gameResult: { won: boolean },
  isNewDay: boolean
): number {
  if (!gameResult.won) {
    return 0;
  }

  const currentStreak = currentStats?.streak || 0;
  return isNewDay ? currentStreak + 1 : currentStreak;
}

function calculateDailyStreak(
  currentStats: UserStats | null,
  gameResult: { won: boolean },
  isNewDay: boolean
): number {
  if (!gameResult.won) {
    return currentStats?.dailyChallengeStreak || 0;
  }

  const currentDailyStreak = currentStats?.dailyChallengeStreak || 0;
  return isNewDay ? currentDailyStreak + 1 : currentDailyStreak;
}

function calculateNewStats(
  currentStats: UserStats | null,
  gameResult: { won: boolean; attempts: number; timeSpent?: number }
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

  const POINTS_PER_LEVEL = 1000;
  const pointsEarned = calculatePointsEarned(gameResult);
  const newPoints = (currentStats?.points || 0) + pointsEarned;
  const newWins = (currentStats?.wins || 0) + (gameResult.won ? 1 : 0);
  const newTotalGames = (currentStats?.totalGames || 0) + 1;

  const newStreak = calculateStreak(currentStats, gameResult, isNewDay);
  const newDailyStreak = calculateDailyStreak(
    currentStats,
    gameResult,
    isNewDay
  );
  const newLevel = Math.floor(newPoints / POINTS_PER_LEVEL) + 1;

  return {
    points: newPoints,
    streak: newStreak,
    totalGames: newTotalGames,
    wins: newWins,
    level: newLevel,
    dailyChallengeStreak: newDailyStreak,
    lastPlayDate: now,
  };
}

export async function updateUserStats(
  userId: string,
  gameResult: {
    won: boolean;
    attempts: number;
    timeSpent?: number;
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
    const leaderboardData = await db.userStatsOps.getLeaderboard(
      limit,
      timeframe
    );

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
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    return await db.userStatsOps.getUserRank(userId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting user rank:", error);
    return null;
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

    if (!(user && user.passwordHash)) {
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
