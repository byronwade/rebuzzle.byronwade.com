/**
 * Neon Auth Configuration
 *
 * This module provides authentication using Neon Auth
 * with proper integration for leaderboard and statistics
 */

import { db } from "@/db";
import type { UserStats } from "@/db/models";
import { getAchievementDifficultyCategory } from "@/lib/difficulty";
import {
  applyStreakProtection,
  bumpGuessDistribution,
  recordRecentPlayDate,
} from "@/lib/game/retention-stats";
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
  maxStreak?: number;
  totalGames: number;
  wins: number;
  level: number;
  dailyChallengeStreak: number;
  lastPlayDate?: Date;
  completionRate?: number; // Optional completion rate from analytics
  streakFreezes?: number;
  streakShields?: number;
  guessDistribution?: number[];
  recentPlayDates?: string[];
  fastestSolveSeconds?: number;
  noHintStreak?: number;
  luckySolveCount?: number;
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
            maxStreak: stats.maxStreak,
            totalGames: stats.totalGames,
            wins: stats.wins,
            level: stats.level,
            dailyChallengeStreak: stats.dailyChallengeStreak,
            lastPlayDate: stats.lastPlayDate || undefined,
            streakFreezes: stats.streakFreezes,
            streakShields: stats.streakShields,
            guessDistribution: stats.guessDistribution,
            recentPlayDates: stats.recentPlayDates,
            fastestSolveSeconds: stats.fastestSolveSeconds,
            noHintStreak: stats.noHintStreak,
            luckySolveCount: stats.luckySolveCount,
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
    pointsMultiplier?: number;
  },
  currentStreak: number
): number {
  if (!gameResult.won) {
    return 0;
  }

  const base = calculateGamePoints(
    gameResult.attempts,
    gameResult.timeSpent,
    currentStreak,
    gameResult.difficulty
  );
  const multiplier =
    typeof gameResult.pointsMultiplier === "number" && Number.isFinite(gameResult.pointsMultiplier)
      ? Math.max(0, gameResult.pointsMultiplier)
      : 1;
  return Math.floor(base * multiplier);
}

export type GameResultInput = {
  won: boolean;
  attempts: number;
  timeSpent?: number;
  difficulty?: number;
  maxAttempts?: number;
  hintsUsed?: number;
  /** 1 = full daily points; 0.5 = archive replay; may include engagement multipliers */
  pointsMultiplier?: number;
  /** When false (archive), streaks and lastPlayDate stay untouched */
  affectsStreak?: boolean;
  isLucky?: boolean;
  hasDailyBonus?: boolean;
  dailyBonusMultiplier?: number;
};

export type CalculatedStatsPatch = Omit<ReturnType<typeof buildStatsPatch>, "_meta">;

export type CalculatedStatsResult = {
  stats: CalculatedStatsPatch;
  pointsEarned: number;
  streakFrozen: boolean;
  freezeSource: "freeze" | "shield" | null;
};

function buildStatsPatch(currentStats: UserStats | null, gameResult: GameResultInput, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPlayDate = currentStats?.lastPlayDate
    ? new Date(
        currentStats.lastPlayDate.getFullYear(),
        currentStats.lastPlayDate.getMonth(),
        currentStats.lastPlayDate.getDate()
      )
    : null;

  const isNewDay = !lastPlayDate || lastPlayDate.getTime() !== today.getTime();
  const affectsStreak = gameResult.affectsStreak !== false;

  const priorStreak = currentStats?.streak || 0;
  const priorDaily = currentStats?.dailyChallengeStreak || 0;

  // Win: increment on a new day. Loss: protect or reset via streak freezes/shields.
  let tentativeStreak = priorStreak;
  let tentativeDaily = priorDaily;
  if (affectsStreak && gameResult.won) {
    tentativeStreak = isNewDay ? priorStreak + 1 : priorStreak;
    tentativeDaily = isNewDay ? priorDaily + 1 : priorDaily;
  }

  const protection = applyStreakProtection({
    won: gameResult.won,
    affectsStreak,
    currentStreak: gameResult.won ? tentativeStreak : priorStreak,
    currentDailyStreak: gameResult.won ? tentativeDaily : priorDaily,
    streakFreezes: currentStats?.streakFreezes ?? 1,
    streakShields: currentStats?.streakShields ?? 0,
    streakFreezeWeekStart: currentStats?.streakFreezeWeekStart,
    now,
  });

  const newStreak = protection.streak;
  const newDailyStreak = protection.dailyChallengeStreak;
  const maxStreak = Math.max(currentStats?.maxStreak || 0, newStreak);

  const streakForPoints = affectsStreak
    ? gameResult.won
      ? newStreak
      : priorStreak
    : currentStats?.streak || 0;
  const pointsEarned = calculatePointsEarned(gameResult, streakForPoints);
  const newPoints = (currentStats?.points || 0) + pointsEarned;
  const newWins = (currentStats?.wins || 0) + (gameResult.won ? 1 : 0);
  const newTotalGames = (currentStats?.totalGames || 0) + 1;
  const newLevel = calculateLevel(newPoints);

  const maxAttempts = gameResult.maxAttempts ?? 3;
  const isPerfectSolve = gameResult.won && gameResult.attempts === 1;
  const isClutchSolve = gameResult.won && gameResult.attempts === maxAttempts;
  const isSpeedSolve =
    gameResult.won && gameResult.timeSpent !== undefined && gameResult.timeSpent < 30;
  const isNoHint = !gameResult.hintsUsed || gameResult.hintsUsed === 0;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const difficultyLevel = gameResult.difficulty ?? 5;
  const difficultyCategory = getAchievementDifficultyCategory(difficultyLevel);
  const isEasy = difficultyCategory === "easy";
  const isMedium = difficultyCategory === "medium";
  const isHard = difficultyCategory === "hard";

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

  let fastestSolveSeconds = currentStats?.fastestSolveSeconds;
  if (gameResult.won && gameResult.timeSpent !== undefined) {
    if (!fastestSolveSeconds || gameResult.timeSpent < fastestSolveSeconds) {
      fastestSolveSeconds = gameResult.timeSpent;
    }
  }

  let noHintStreak = currentStats?.noHintStreak || 0;
  if (gameResult.won && isNoHint) {
    noHintStreak++;
  } else if (gameResult.won) {
    noHintStreak = 0;
  }
  const maxNoHintStreak = Math.max(currentStats?.maxNoHintStreak || 0, noHintStreak);

  let consecutivePerfect = currentStats?.consecutivePerfect || 0;
  if (isPerfectSolve) {
    consecutivePerfect++;
  } else if (gameResult.won) {
    consecutivePerfect = 0;
  }
  const maxConsecutivePerfect = Math.max(
    currentStats?.maxConsecutivePerfect || 0,
    consecutivePerfect
  );

  const luckySolveCount =
    (currentStats?.luckySolveCount ?? 0) + (gameResult.won && gameResult.isLucky ? 1 : 0);

  return {
    points: newPoints,
    streak: newStreak,
    maxStreak,
    totalGames: newTotalGames,
    wins: newWins,
    level: newLevel,
    dailyChallengeStreak: newDailyStreak,
    lastPlayDate: affectsStreak ? now : currentStats?.lastPlayDate || now,
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
    streakFreezes: protection.streakFreezes,
    streakShields: protection.streakShields,
    lastFreezeUsed: protection.lastFreezeUsed ?? currentStats?.lastFreezeUsed,
    streakFreezeWeekStart: protection.streakFreezeWeekStart ?? currentStats?.streakFreezeWeekStart,
    luckySolveCount,
    lastLuckySolve: gameResult.won && gameResult.isLucky ? now : currentStats?.lastLuckySolve,
    lastBonusMultiplier:
      gameResult.won && gameResult.hasDailyBonus
        ? gameResult.dailyBonusMultiplier
        : currentStats?.lastBonusMultiplier,
    lastBonusDate: gameResult.won && gameResult.hasDailyBonus ? now : currentStats?.lastBonusDate,
    guessDistribution: bumpGuessDistribution(
      currentStats?.guessDistribution,
      gameResult.attempts,
      gameResult.won,
      Math.min(3, Math.max(1, maxAttempts))
    ),
    recentPlayDates: recordRecentPlayDate(currentStats?.recentPlayDates, now, affectsStreak),
    _meta: {
      pointsEarned,
      streakFrozen: protection.streakFrozen,
      freezeSource: protection.freezeSource,
    },
  };
}

/** Pure stats calculator — exported for unit tests. */
export function calculateNewStats(
  currentStats: UserStats | null,
  gameResult: GameResultInput,
  now: Date = new Date()
): CalculatedStatsResult {
  const patch = buildStatsPatch(currentStats, gameResult, now);
  const { _meta, ...stats } = patch;
  return {
    stats,
    pointsEarned: _meta.pointsEarned,
    streakFrozen: _meta.streakFrozen,
    freezeSource: _meta.freezeSource,
  };
}

export type UpdateUserStatsResult = {
  ok: boolean;
  pointsEarned: number;
  streak: number;
  maxStreak: number;
  streakFreezes: number;
  streakFrozen: boolean;
  freezeSource: "freeze" | "shield" | null;
  guessDistribution: number[];
  recentPlayDates: string[];
};

export async function updateUserStats(
  userId: string,
  gameResult: GameResultInput
): Promise<UpdateUserStatsResult> {
  const empty: UpdateUserStatsResult = {
    ok: false,
    pointsEarned: 0,
    streak: 0,
    maxStreak: 0,
    streakFreezes: 0,
    streakFrozen: false,
    freezeSource: null,
    guessDistribution: [0, 0, 0],
    recentPlayDates: [],
  };
  try {
    const currentStats = await db.userStatsOps.findByUserId(userId);
    const { stats, pointsEarned, streakFrozen, freezeSource } = calculateNewStats(
      currentStats,
      gameResult
    );

    if (currentStats) {
      await db.userStatsOps.updateStats(userId, stats);
    } else {
      await db.userStatsOps.create({
        id: crypto.randomUUID(),
        userId,
        ...stats,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      ok: true,
      pointsEarned,
      streak: stats.streak,
      maxStreak: stats.maxStreak,
      streakFreezes: stats.streakFreezes,
      streakFrozen,
      freezeSource,
      guessDistribution: stats.guessDistribution,
      recentPlayDates: stats.recentPlayDates,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating user stats:", error);
    return empty;
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
