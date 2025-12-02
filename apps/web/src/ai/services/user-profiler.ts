/**
 * User Profiler Service
 *
 * Analyzes user preferences and skill levels to build comprehensive user profiles
 * for personalized puzzle recommendations
 */

import type { Puzzle, PuzzleAttempt, UserStats } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { puzzleAttemptOps, userStatsOps } from "@/db/operations";

export interface UserPuzzleProfile {
  userId: string;
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
  skillScore: number; // 0-100
  preferredDifficultyRange: { min: number; max: number };
  favoriteCategories: string[];
  preferredPuzzleTypes: string[];
  averageTimeToSolve: number;
  hintUsagePattern: "none" | "minimal" | "moderate" | "frequent";
  engagementLevel: "low" | "medium" | "high";
  lastActivityDate: Date | null;
  totalPuzzlesAttempted: number;
  totalPuzzlesSolved: number;
  solveRate: number;
  streakDays: number;
}

/**
 * Build comprehensive user puzzle profile
 * @param userId User ID
 * @returns User puzzle profile
 */
export async function buildUserPuzzleProfile(userId: string): Promise<UserPuzzleProfile> {
  // Get user stats
  const userStats = await userStatsOps.findByUserId(userId);

  // Get user attempts
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 200);

  // Calculate skill level
  const skillLevel = await estimateUserSkillLevel(userId);

  // Get preferred difficulty
  const preferredDifficulty = await calculateUserDifficultyPreference(userId);

  // Get favorite categories
  const favoriteCategories = await identifyUserCategories(userId);

  // Get preferred puzzle types
  const preferredPuzzleTypes = await identifyUserPuzzleTypes(userId);

  // Calculate metrics
  const totalAttempts = attempts.length;
  const solvedAttempts = attempts.filter((a) => a.isCorrect);
  const totalSolved = solvedAttempts.length;
  const solveRate = totalAttempts > 0 ? totalSolved / totalAttempts : 0;

  // Average time to solve
  const solvedWithTime = solvedAttempts.filter((a) => a.timeSpentSeconds && a.timeSpentSeconds > 0);
  const averageTimeToSolve =
    solvedWithTime.length > 0
      ? solvedWithTime.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) /
        solvedWithTime.length
      : 0;

  // Hint usage pattern
  const hintUsage = calculateHintUsagePattern(attempts);

  // Engagement level
  const engagementLevel = calculateEngagementLevel(attempts, userStats);

  // Last activity
  const lastActivityDate =
    attempts.length > 0 && attempts[0]?.attemptedAt
      ? attempts[0].attemptedAt
      : userStats?.lastPlayDate || null;

  // Skill score (0-100)
  const skillScore = calculateSkillScore({
    solveRate,
    averageTimeToSolve,
    userStats,
    totalSolved,
  });

  return {
    userId,
    skillLevel: skillLevel.level,
    skillScore,
    preferredDifficultyRange: preferredDifficulty,
    favoriteCategories,
    preferredPuzzleTypes,
    averageTimeToSolve,
    hintUsagePattern: hintUsage,
    engagementLevel,
    lastActivityDate,
    totalPuzzlesAttempted: totalAttempts,
    totalPuzzlesSolved: totalSolved,
    solveRate,
    streakDays: userStats?.streak || 0,
  };
}

/**
 * Calculate user's preferred difficulty range
 * @param userId User ID
 * @returns Preferred difficulty range
 */
export async function calculateUserDifficultyPreference(
  userId: string
): Promise<{ min: number; max: number }> {
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const puzzleCollection = getCollection<Puzzle>("puzzles");

  // Get puzzles that user solved successfully with satisfaction
  const solvedAttempts = attempts.filter(
    (a) =>
      a.isCorrect &&
      (!a.userSatisfaction || a.userSatisfaction >= 3) &&
      a.timeSpentSeconds &&
      a.timeSpentSeconds > 30 &&
      a.timeSpentSeconds < 600
  );

  if (solvedAttempts.length === 0) {
    // Default range for new users
    return { min: 3, max: 7 };
  }

  // Get difficulty values for solved puzzles
  const puzzleIds = solvedAttempts.map((a) => a.puzzleId);
  const puzzles = await puzzleCollection.find({ id: { $in: puzzleIds } }).toArray();

  const difficulties = puzzles.map((p) => {
    if (typeof p.difficulty === "number") return p.difficulty;
    return p.difficulty === "easy" ? 3 : p.difficulty === "medium" ? 5 : 7;
  });

  if (difficulties.length === 0) {
    return { min: 3, max: 7 };
  }

  const min = Math.max(1, Math.min(...difficulties) - 1);
  const max = Math.min(10, Math.max(...difficulties) + 1);

  return { min, max };
}

/**
 * Identify user's favorite puzzle categories
 * @param userId User ID
 * @returns Array of category names
 */
export async function identifyUserCategories(userId: string): Promise<string[]> {
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const puzzleCollection = getCollection<Puzzle>("puzzles");

  // Get puzzles user solved successfully
  const solvedAttempts = attempts.filter(
    (a) => a.isCorrect && (!a.userSatisfaction || a.userSatisfaction >= 3)
  );

  if (solvedAttempts.length === 0) {
    return [];
  }

  const puzzleIds = solvedAttempts.map((a) => a.puzzleId);
  const puzzles = await puzzleCollection.find({ id: { $in: puzzleIds } }).toArray();

  // Count categories
  const categoryCounts = new Map<string, number>();
  for (const puzzle of puzzles) {
    const category = puzzle.category || puzzle.metadata?.category || "general";
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  // Return top 5 categories
  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);
}

/**
 * Identify user's preferred puzzle types
 * @param userId User ID
 * @returns Array of puzzle type names
 */
export async function identifyUserPuzzleTypes(userId: string): Promise<string[]> {
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const puzzleCollection = getCollection<Puzzle>("puzzles");

  const solvedAttempts = attempts.filter(
    (a) => a.isCorrect && (!a.userSatisfaction || a.userSatisfaction >= 3)
  );

  if (solvedAttempts.length === 0) {
    return [];
  }

  const puzzleIds = solvedAttempts.map((a) => a.puzzleId);
  const puzzles = await puzzleCollection.find({ id: { $in: puzzleIds } }).toArray();

  const typeCounts = new Map<string, number>();
  for (const puzzle of puzzles) {
    const puzzleType = puzzle.puzzleType || puzzle.metadata?.puzzleType || "rebus";
    typeCounts.set(puzzleType, (typeCounts.get(puzzleType) || 0) + 1);
  }

  return Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
}

/**
 * Estimate user's skill level
 * @param userId User ID
 * @returns Skill level estimation
 */
export async function estimateUserSkillLevel(userId: string): Promise<{
  level: "beginner" | "intermediate" | "advanced" | "expert";
  confidence: number;
}> {
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const userStats = await userStatsOps.findByUserId(userId);

  if (attempts.length < 5) {
    return { level: "beginner", confidence: 0.3 };
  }

  const solvedAttempts = attempts.filter((a) => a.isCorrect);
  const solveRate = solvedAttempts.length / attempts.length;

  // Get difficulty distribution of solved puzzles
  const puzzleCollection = getCollection<Puzzle>("puzzles");
  const puzzleIds = solvedAttempts.map((a) => a.puzzleId);
  const puzzles = await puzzleCollection.find({ id: { $in: puzzleIds } }).toArray();

  const difficulties = puzzles.map((p) => {
    if (typeof p.difficulty === "number") return p.difficulty;
    return p.difficulty === "easy" ? 3 : p.difficulty === "medium" ? 5 : 7;
  });

  const avgDifficulty =
    difficulties.length > 0 ? difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length : 3;

  // Calculate skill score
  const skillScore =
    solveRate * 0.4 + // Solve rate weight: 40%
    (avgDifficulty / 10) * 0.3 + // Difficulty weight: 30%
    Math.min((userStats?.streak || 0) / 30, 1) * 0.15 + // Streak weight: 15%
    Math.min((userStats?.wins || 0) / 50, 1) * 0.15; // Wins weight: 15%

  // Determine level
  let level: "beginner" | "intermediate" | "advanced" | "expert";
  if (skillScore < 0.3) {
    level = "beginner";
  } else if (skillScore < 0.5) {
    level = "intermediate";
  } else if (skillScore < 0.75) {
    level = "advanced";
  } else {
    level = "expert";
  }

  const confidence = Math.min(attempts.length / 20, 1); // Higher confidence with more data

  return { level, confidence };
}

/**
 * Calculate hint usage pattern
 */
function calculateHintUsagePattern(
  attempts: PuzzleAttempt[]
): "none" | "minimal" | "moderate" | "frequent" {
  const attemptsWithHints = attempts.filter((a) => a.hintsUsed !== undefined);

  if (attemptsWithHints.length === 0) {
    return "none";
  }

  const avgHints =
    attemptsWithHints.reduce((sum, a) => sum + (a.hintsUsed || 0), 0) / attemptsWithHints.length;

  if (avgHints === 0) return "none";
  if (avgHints < 1) return "minimal";
  if (avgHints < 2) return "moderate";
  return "frequent";
}

/**
 * Calculate engagement level
 */
function calculateEngagementLevel(
  attempts: PuzzleAttempt[],
  userStats: UserStats | null
): "low" | "medium" | "high" {
  if (!userStats) return "low";

  const totalAttempts = attempts.length;
  const recentAttempts = attempts.filter(
    (a) => a.attemptedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const engagementScore =
    (totalAttempts > 50 ? 0.3 : totalAttempts / 166) + // Total attempts weight
    (recentAttempts > 10 ? 0.3 : recentAttempts / 33) + // Recent activity weight
    (userStats.streak > 7 ? 0.2 : userStats.streak / 35) + // Streak weight
    (userStats.totalGames > 20 ? 0.2 : userStats.totalGames / 100); // Total games weight

  if (engagementScore < 0.3) return "low";
  if (engagementScore < 0.6) return "medium";
  return "high";
}

/**
 * Calculate overall skill score
 */
function calculateSkillScore(params: {
  solveRate: number;
  averageTimeToSolve: number;
  userStats: UserStats | null;
  totalSolved: number;
}): number {
  const { solveRate, averageTimeToSolve, userStats, totalSolved } = params;

  // Time factor (faster solving = higher skill, but not too fast)
  const timeFactor =
    averageTimeToSolve > 0
      ? Math.min(
          Math.max(0, (300 - averageTimeToSolve) / 300), // Optimal around 120-180s
          1
        )
      : 0.5;

  const score =
    solveRate * 0.4 + // Solve rate: 40%
    timeFactor * 0.2 + // Speed: 20%
    Math.min(totalSolved / 100, 1) * 0.2 + // Experience: 20%
    Math.min((userStats?.streak || 0) / 30, 1) * 0.1 + // Consistency: 10%
    Math.min((userStats?.wins || 0) / 50, 1) * 0.1; // Wins: 10%

  return Math.round(score * 100);
}
