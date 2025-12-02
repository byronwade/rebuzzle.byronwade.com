/**
 * Achievement Service
 *
 * Handles checking and awarding achievements to users
 */

import {
  type AchievementCriteria,
  type AchievementDefinition,
  ALL_ACHIEVEMENTS,
} from "@rebuzzle/game-logic";
import type { NewUserAchievement, PuzzleAttempt, User, UserStats } from "@/db/models";
import {
  achievementOps,
  puzzleAttemptOps,
  userAchievementOps,
  userOps,
  userStatsOps,
} from "@/db/operations";
import { getUserRank } from "@/lib/auth";

export interface GameContext {
  puzzleId: string;
  attempts: number;
  maxAttempts: number;
  timeTaken?: number;
  hintsUsed: number;
  difficulty: "easy" | "medium" | "hard";
  isCorrect: boolean;
  score: number;
}

export interface AchievementCheckResult {
  newlyUnlocked: AchievementDefinition[];
  alreadyHad: string[];
}

/**
 * Initialize achievements in the database from definitions
 */
export async function initializeAchievements(): Promise<void> {
  const achievementsToUpsert = ALL_ACHIEVEMENTS.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    hint: def.hint,
    icon: def.icon,
    category: def.category,
    rarity: def.rarity,
    pointsAwarded: def.points,
    order: def.order,
    secret: def.secret,
    createdAt: new Date(),
  }));

  await achievementOps.upsertMany(achievementsToUpsert);
}

/**
 * Check and award achievements after a game completion
 */
export async function checkAndAwardAchievements(
  userId: string,
  gameContext: GameContext
): Promise<AchievementCheckResult> {
  // Fetch user data needed for checks
  const [user, stats, userAchievements, recentAttemptsResult] = await Promise.all([
    userOps.findById(userId),
    userStatsOps.findByUserId(userId),
    userAchievementOps.findByUser(userId),
    puzzleAttemptOps.getUserAttempts(userId, 100),
  ]);

  if (!user || !stats) {
    return { newlyUnlocked: [], alreadyHad: [] };
  }

  // Ensure recentAttempts is always an array (fallback to empty array if null/undefined)
  const recentAttempts = recentAttemptsResult ?? [];

  // Get set of already unlocked achievement IDs (fallback to empty array if null)
  const unlockedIds = new Set((userAchievements ?? []).map((ua) => ua.achievementId));

  // Check each achievement
  const newlyUnlocked: AchievementDefinition[] = [];
  const alreadyHad: string[] = [];
  const initialUnlockedCount = unlockedIds.size;

  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) {
      alreadyHad.push(achievement.id);
      continue;
    }

    // Pass total count: initial unlocked + newly unlocked in this session
    const totalAchievementCount = initialUnlockedCount + newlyUnlocked.length;
    const isUnlocked = await checkAchievementCriteria(
      achievement.criteria,
      user,
      stats,
      recentAttempts,
      gameContext,
      totalAchievementCount
    );

    if (isUnlocked) {
      newlyUnlocked.push(achievement);
      unlockedIds.add(achievement.id); // Track for recursive checks
    }
  }

  // Award all newly unlocked achievements
  if (newlyUnlocked.length > 0) {
    const newUserAchievements: NewUserAchievement[] = newlyUnlocked.map((achievement) => ({
      id: `ua_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId,
      achievementId: achievement.id,
      unlockedAt: new Date(),
      notifiedByEmail: false,
      context: {
        puzzleId: gameContext.puzzleId,
        score: gameContext.score,
        streak: stats.streak,
        timeTaken: gameContext.timeTaken,
        attempts: gameContext.attempts,
      },
    }));

    await userAchievementOps.createMany(newUserAchievements);
  }

  return { newlyUnlocked, alreadyHad };
}

/**
 * Check if a specific achievement criteria is met
 */
async function checkAchievementCriteria(
  criteria: AchievementCriteria,
  user: User,
  stats: UserStats,
  recentAttempts: PuzzleAttempt[],
  gameContext: GameContext,
  currentAchievementCount: number
): Promise<boolean> {
  switch (criteria.type) {
    case "first_puzzle":
      return stats.totalGames >= 1;

    case "puzzles_solved":
      return stats.wins >= criteria.count;

    case "puzzles_solved_no_hints": {
      const noHintWins = recentAttempts.filter(
        (a) => a.isCorrect && (!a.hintsUsed || a.hintsUsed === 0)
      ).length;
      return noHintWins >= criteria.count;
    }

    case "perfect_solves": {
      // Use stats tracking for perfect solves
      let perfectCount = stats.perfectSolves || 0;
      // Include current game if it's a perfect solve (for immediate feedback)
      if (gameContext.attempts === 1 && gameContext.isCorrect) {
        perfectCount += 1;
      }
      return perfectCount >= criteria.count;
    }

    case "streak_days":
      return stats.streak >= criteria.count;

    case "max_streak":
      return (stats.maxStreak || stats.streak) >= criteria.count;

    case "speed_solve":
      return (
        gameContext.isCorrect &&
        gameContext.timeTaken !== undefined &&
        gameContext.timeTaken <= criteria.seconds
      );

    case "speed_solve_count": {
      const fastSolves = recentAttempts.filter(
        (a) =>
          a.isCorrect && a.timeSpentSeconds !== undefined && a.timeSpentSeconds <= criteria.seconds
      ).length;
      return fastSolves >= criteria.count;
    }

    case "total_points":
      return stats.points >= criteria.points;

    case "level_reached":
      return stats.level >= criteria.level;

    case "clutch_solves": {
      // Use stats tracking for clutch solves
      let clutchCount = stats.clutchSolves || 0;
      // Include current game if it's a clutch solve (for immediate feedback)
      if (gameContext.isCorrect && gameContext.attempts === gameContext.maxAttempts) {
        clutchCount += 1;
      }
      return clutchCount >= criteria.count;
    }

    case "daily_challenges":
      return stats.dailyChallengeStreak >= criteria.count || stats.totalGames >= criteria.count;

    case "weekly_puzzles": {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyCount = recentAttempts.filter(
        (a) => a.isCorrect && new Date(a.attemptedAt) >= oneWeekAgo
      ).length;
      return weeklyCount >= criteria.count;
    }

    case "total_attempts":
      return recentAttempts.length >= criteria.count;

    case "win_rate": {
      if (stats.totalGames < criteria.minGames) return false;
      const winRate = (stats.wins / stats.totalGames) * 100;
      return winRate >= criteria.percentage;
    }

    case "difficulty_easy": {
      let easyCount = stats.easyPuzzlesSolved || 0;
      // Include current game if applicable
      if (gameContext.difficulty === "easy" && gameContext.isCorrect) {
        easyCount += 1;
      }
      return easyCount >= criteria.count;
    }

    case "difficulty_medium": {
      let mediumCount = stats.mediumPuzzlesSolved || 0;
      // Include current game if applicable
      if (gameContext.difficulty === "medium" && gameContext.isCorrect) {
        mediumCount += 1;
      }
      return mediumCount >= criteria.count;
    }

    case "difficulty_hard": {
      let hardCount = stats.hardPuzzlesSolved || 0;
      // Include current game if applicable
      if (gameContext.difficulty === "hard" && gameContext.isCorrect) {
        hardCount += 1;
      }
      return hardCount >= criteria.count;
    }

    case "all_difficulties_in_day": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttempts = recentAttempts.filter(
        (a) => a.isCorrect && new Date(a.attemptedAt) >= today
      );
      const difficulties = new Set(todayAttempts.map((a) => a.difficulty).filter(Boolean));
      // Include current game difficulty
      if (gameContext.isCorrect) {
        difficulties.add(gameContext.difficulty);
      }
      return difficulties.has("easy") && difficulties.has("medium") && difficulties.has("hard");
    }

    case "comeback": {
      return gameContext.isCorrect && gameContext.attempts >= criteria.behindAttempts;
    }

    case "no_hints_streak": {
      // Use stats tracking for no-hint streak
      const currentNoHintStreak = stats.noHintStreak || 0;
      const maxNoHintStreak = stats.maxNoHintStreak || 0;
      return Math.max(currentNoHintStreak, maxNoHintStreak) >= criteria.count;
    }

    case "account_age_days": {
      const accountAge = Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return accountAge >= criteria.days;
    }

    case "games_in_day": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = recentAttempts.filter(
        (a) => a.isCorrect && new Date(a.attemptedAt) >= today
      ).length;
      return todayCount >= criteria.count;
    }

    case "consecutive_perfect": {
      // Use stats tracking for consecutive perfect
      const currentStreak = stats.consecutivePerfect || 0;
      const maxStreak = stats.maxConsecutivePerfect || 0;
      return Math.max(currentStreak, maxStreak) >= criteria.count;
    }

    case "total_time_played": {
      // Use stats tracking for total time played
      const totalTime = stats.totalTimePlayed || 0;
      return totalTime >= criteria.minutes * 60;
    }

    case "categories_completed":
      return false; // Needs category tracking

    case "hints_used_total": {
      const totalHints = recentAttempts.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);
      return totalHints >= criteria.count;
    }

    case "share_result":
      // Check if user has shared results (tracked in stats)
      return (stats.sharedResults || 0) >= 1;

    case "profile_complete":
      // Check if user has completed profile
      return !!(user.username && user.avatarColorIndex !== undefined);

    case "leaderboard_top": {
      // Check user's all-time leaderboard position
      const allTimeRank = await getUserRank(user.id, "allTime");
      return allTimeRank !== null && allTimeRank <= criteria.position;
    }

    case "leaderboard_top_weekly": {
      // Check user's weekly leaderboard position
      const weeklyRank = await getUserRank(user.id, "week");
      return weeklyRank !== null && weeklyRank <= criteria.position;
    }

    case "special_date": {
      const today = new Date();
      const [month, day] = criteria.date.split("-").map(Number);
      return today.getMonth() + 1 === month && today.getDate() === day;
    }

    case "night_owl": {
      const hour = new Date().getHours();
      return gameContext.isCorrect && hour >= 0 && hour < 5;
    }

    case "early_bird": {
      const hour = new Date().getHours();
      return gameContext.isCorrect && hour >= 5 && hour < criteria.hour;
    }

    case "weekend_warrior": {
      // Use stats tracking for weekend solves
      const weekendCount = stats.weekendSolves || 0;
      return weekendCount >= criteria.count;
    }

    case "custom":
      return checkCustomAchievement(
        criteria.check,
        user,
        stats,
        recentAttempts,
        gameContext,
        currentAchievementCount
      );

    default:
      return false;
  }
}

/**
 * Check custom achievement criteria
 */
function checkCustomAchievement(
  checkName: string,
  _user: User,
  stats: UserStats,
  _recentAttempts: PuzzleAttempt[],
  gameContext: GameContext,
  currentAchievementCount: number
): boolean {
  switch (checkName) {
    case "hard_perfect_solve":
      return (
        gameContext.isCorrect && gameContext.attempts === 1 && gameContext.difficulty === "hard"
      );

    case "hard_speed_solve":
      return (
        gameContext.isCorrect &&
        gameContext.difficulty === "hard" &&
        gameContext.timeTaken !== undefined &&
        gameContext.timeTaken < 30
      );

    case "achievements_unlocked_75":
      return currentAchievementCount >= 75;

    case "achievements_unlocked_90":
      return currentAchievementCount >= 90;

    case "achievements_unlocked_100":
      return currentAchievementCount >= 100;

    case "puzzle_god":
      return (
        stats.level >= 100 &&
        stats.streak >= 365 &&
        stats.totalGames >= 200 &&
        (stats.wins / stats.totalGames) * 100 >= 95
      );

    default:
      return false;
  }
}

/**
 * Get user's achievement progress
 */
export async function getUserAchievementProgress(userId: string): Promise<{
  unlocked: number;
  total: number;
  percentage: number;
  pointsEarned: number;
  totalPossiblePoints: number;
  recentUnlocks: Array<{
    achievementId: string;
    unlockedAt: Date;
    achievement: {
      name: string;
      description: string;
      icon: string;
      rarity: string;
      points: number;
    };
  }>;
}> {
  const [userAchievements, recentUnlocks] = await Promise.all([
    userAchievementOps.findByUser(userId),
    userAchievementOps.getRecentUnlocks(userId, 5),
  ]);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

  let pointsEarned = 0;
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) {
      pointsEarned += achievement.points;
    }
  }

  const totalPossiblePoints = ALL_ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);

  return {
    unlocked: userAchievements.length,
    total: ALL_ACHIEVEMENTS.length,
    percentage: Math.round((userAchievements.length / ALL_ACHIEVEMENTS.length) * 100),
    pointsEarned,
    totalPossiblePoints,
    recentUnlocks: recentUnlocks.map((u) => ({
      achievementId: u.achievementId,
      unlockedAt: u.unlockedAt,
      achievement: {
        name: u.achievement.name,
        description: u.achievement.description,
        icon: u.achievement.icon,
        rarity: u.achievement.rarity,
        points: u.achievement.pointsAwarded,
      },
    })),
  };
}

/**
 * Get all achievements with user's unlock status
 */
export async function getAllAchievementsWithStatus(userId: string): Promise<
  Array<{
    definition: AchievementDefinition;
    unlocked: boolean;
    unlockedAt?: Date;
  }>
> {
  const userAchievements = await userAchievementOps.findByUser(userId);
  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

  return ALL_ACHIEVEMENTS.map((definition) => ({
    definition,
    unlocked: unlockedMap.has(definition.id),
    unlockedAt: unlockedMap.get(definition.id),
  }));
}

/**
 * Manually award an achievement (for special cases)
 */
export async function awardAchievement(
  userId: string,
  achievementId: string,
  context?: NewUserAchievement["context"]
): Promise<boolean> {
  const hasAlready = await userAchievementOps.hasAchievement(userId, achievementId);
  if (hasAlready) {
    return false;
  }

  const newUserAchievement: NewUserAchievement = {
    id: `ua_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    achievementId,
    unlockedAt: new Date(),
    notifiedByEmail: false,
    context,
  };

  await userAchievementOps.create(newUserAchievement);
  return true;
}
