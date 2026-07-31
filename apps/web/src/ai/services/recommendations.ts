/**
 * Personalized Recommendations Service
 *
 * Provides personalized puzzle recommendations based on user profiles,
 * semantic search, and learning from user behavior
 */

import type { Puzzle } from "@/db/models";
import { puzzleOps } from "@/db/operations";
import { recommendPuzzlesByUserHistory, searchPuzzlesByConcept } from "./semantic-search";
import { buildUserPuzzleProfile } from "./user-profiler";

export interface PuzzleRecommendation {
  puzzle: Puzzle;
  score: number;
  reason: string;
  confidence: number;
}

/**
 * Get personalized puzzle recommendations for a user
 * @param userId User ID
 * @param limit Maximum number of recommendations
 * @returns Array of recommended puzzles with scores and reasons
 */
export async function getPersonalizedPuzzles(
  userId: string,
  limit = 10
): Promise<PuzzleRecommendation[]> {
  // Build user profile
  const profile = await buildUserPuzzleProfile(userId);

  // Get recommendations from multiple sources
  const [semanticRecommendations, categoryRecommendations, difficultyRecommendations, newPuzzles] =
    await Promise.all([
      // 1. Semantic search based on user history
      recommendPuzzlesByUserHistory(userId, limit * 2).catch(() => []),

      // 2. Recommendations based on favorite categories
      getCategoryBasedRecommendations(userId, profile, limit).catch(() => []),

      // 3. Recommendations based on preferred difficulty
      getDifficultyBasedRecommendations(userId, profile, limit).catch(() => []),

      // 4. New puzzles user hasn't tried
      getNewPuzzlesForUser(userId, limit).catch(() => []),
    ]);

  // Combine and deduplicate recommendations
  const puzzleMap = new Map<string, PuzzleRecommendation>();

  // Add semantic recommendations (highest weight)
  for (const rec of semanticRecommendations) {
    puzzleMap.set(rec.puzzle.id, {
      puzzle: rec.puzzle,
      score: rec.score * 1.0,
      reason: rec.reason,
      confidence: 0.8,
    });
  }

  // Add category-based recommendations
  for (const rec of categoryRecommendations) {
    const existing = puzzleMap.get(rec.puzzle.id);
    if (existing) {
      existing.score += rec.score * 0.7;
      existing.reason += `; ${rec.reason}`;
      existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
    } else {
      puzzleMap.set(rec.puzzle.id, {
        ...rec,
        score: rec.score * 0.7,
        confidence: 0.6,
      });
    }
  }

  // Add difficulty-based recommendations
  for (const rec of difficultyRecommendations) {
    const existing = puzzleMap.get(rec.puzzle.id);
    if (existing) {
      existing.score += rec.score * 0.6;
      existing.reason += `; ${rec.reason}`;
      existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
    } else {
      puzzleMap.set(rec.puzzle.id, {
        ...rec,
        score: rec.score * 0.6,
        confidence: 0.5,
      });
    }
  }

  // Add new puzzles (lower weight but still valuable)
  for (const rec of newPuzzles) {
    const existing = puzzleMap.get(rec.puzzle.id);
    if (!existing) {
      puzzleMap.set(rec.puzzle.id, {
        ...rec,
        score: rec.score * 0.4,
        confidence: 0.4,
      });
    }
  }

  // Convert to array, sort by score, and limit
  return Array.from(puzzleMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get next puzzle recommendation based on current puzzle
 * @param userId User ID
 * @param currentPuzzleId Current puzzle ID
 * @returns Recommended next puzzle
 */
export async function recommendNextPuzzle(
  userId: string,
  currentPuzzleId: string
): Promise<PuzzleRecommendation | null> {
  const currentPuzzle = await puzzleOps.findById(currentPuzzleId);
  if (!currentPuzzle) {
    return null;
  }

  const profile = await buildUserPuzzleProfile(userId);

  // Find similar puzzles that are slightly harder or in same category
  const { findSimilarPuzzles } = await import("./semantic-search");
  const similar = await findSimilarPuzzles(currentPuzzleId, 10, 0.6);

  if (similar.length === 0) {
    // Fallback to difficulty-based recommendations
    const difficultyRecs = await getDifficultyBasedRecommendations(userId, profile, 1);
    return difficultyRecs[0] || null;
  }

  // Filter by difficulty range and exclude current puzzle
  const filtered = similar
    .filter(
      (item) =>
        item.puzzle.id !== currentPuzzleId &&
        isDifficultyInRange(item.puzzle, profile.preferredDifficultyRange)
    )
    .slice(0, 5);

  if (filtered.length === 0) {
    return null;
  }

  // Select the best match
  const best = filtered[0];
  if (!best) {
    throw new Error("No similar puzzles found for recommendation");
  }
  return {
    puzzle: best.puzzle,
    score: best.similarity,
    reason: `Similar to "${currentPuzzle.answer}" but fresh challenge`,
    confidence: 0.8,
  };
}

/**
 * Get adaptive difficulty recommendation for a user
 * @param userId User ID
 * @returns Recommended difficulty range
 */
export async function getAdaptiveDifficulty(userId: string): Promise<{
  recommended: number;
  range: { min: number; max: number };
  reasoning: string;
}> {
  const profile = await buildUserPuzzleProfile(userId);

  // Adjust difficulty based on recent performance
  const { puzzleAttemptOps } = await import("@/db/operations");
  const recentAttempts = await puzzleAttemptOps.getUserAttempts(userId, 10);

  if (recentAttempts.length < 3) {
    // Not enough data - use profile preferences
    return {
      recommended:
        (profile.preferredDifficultyRange.min + profile.preferredDifficultyRange.max) / 2,
      range: profile.preferredDifficultyRange,
      reasoning: "Based on your profile preferences",
    };
  }

  // Analyze recent performance
  const recentSolved = recentAttempts.filter((a) => a.isCorrect);
  const recentSolveRate = recentSolved.length / recentAttempts.length;

  let recommended: number;
  let reasoning: string;

  if (recentSolveRate > 0.8) {
    // User is solving too easily - increase difficulty
    recommended = Math.min(10, profile.preferredDifficultyRange.max + 1);
    reasoning = "You're solving puzzles quickly - try something more challenging!";
  } else if (recentSolveRate < 0.3) {
    // User is struggling - decrease difficulty
    recommended = Math.max(1, profile.preferredDifficultyRange.min - 1);
    reasoning = "Let's try something a bit easier to build confidence";
  } else {
    // Good balance - stay in preferred range
    recommended = (profile.preferredDifficultyRange.min + profile.preferredDifficultyRange.max) / 2;
    reasoning = "Based on your recent performance and preferences";
  }

  return {
    recommended,
    range: {
      min: Math.max(1, recommended - 1),
      max: Math.min(10, recommended + 1),
    },
    reasoning,
  };
}

/**
 * Get category-based recommendations
 */
async function getCategoryBasedRecommendations(
  _userId: string,
  profile: Awaited<ReturnType<typeof buildUserPuzzleProfile>>,
  limit: number
): Promise<PuzzleRecommendation[]> {
  if (profile.favoriteCategories.length === 0) {
    return [];
  }

  // Search for puzzles in favorite categories
  const recommendations: PuzzleRecommendation[] = [];

  for (const category of profile.favoriteCategories.slice(0, 3)) {
    const results = await searchPuzzlesByConcept(
      `puzzle about ${category}`,
      Math.ceil(limit / profile.favoriteCategories.length),
      0.5
    );

    for (const result of results) {
      recommendations.push({
        puzzle: result.puzzle,
        score: result.similarity,
        reason: `Similar to your favorite ${category} puzzles`,
        confidence: 0.7,
      });
    }
  }

  return recommendations;
}

/**
 * Get difficulty-based recommendations
 */
async function getDifficultyBasedRecommendations(
  userId: string,
  profile: Awaited<ReturnType<typeof buildUserPuzzleProfile>>,
  limit: number
): Promise<PuzzleRecommendation[]> {
  const { puzzleAttemptOps } = await import("@/db/operations");
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const attemptedPuzzleIds = new Set(attempts.map((a) => a.puzzleId));

  const activePuzzles = await puzzleOps.findActivePuzzles(limit * 2);

  const recommendations: PuzzleRecommendation[] = [];

  for (const puzzle of activePuzzles) {
    if (attemptedPuzzleIds.has(puzzle.id)) continue;

    const difficulty =
      typeof puzzle.difficulty === "number"
        ? puzzle.difficulty
        : puzzle.difficulty === "easy"
          ? 3
          : puzzle.difficulty === "medium"
            ? 5
            : 7;

    if (
      difficulty >= profile.preferredDifficultyRange.min &&
      difficulty <= profile.preferredDifficultyRange.max
    ) {
      recommendations.push({
        puzzle,
        score: 0.8,
        reason: `Matches your preferred difficulty (${difficulty}/10)`,
        confidence: 0.7,
      });
    }
  }

  return recommendations.slice(0, limit);
}

/**
 * Get new puzzles user hasn't tried
 */
async function getNewPuzzlesForUser(
  userId: string,
  limit: number
): Promise<PuzzleRecommendation[]> {
  const { puzzleAttemptOps } = await import("@/db/operations");
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 100);
  const attemptedPuzzleIds = new Set(attempts.map((a) => a.puzzleId));

  const activePuzzles = await puzzleOps.findActivePuzzles(limit * 2);

  return activePuzzles
    .filter((puzzle) => !attemptedPuzzleIds.has(puzzle.id))
    .slice(0, limit)
    .map((puzzle) => ({
      puzzle,
      score: 0.5,
      reason: "New puzzle you haven't tried yet",
      confidence: 0.6,
    }));
}

/**
 * Check if puzzle difficulty is in user's preferred range
 */
function isDifficultyInRange(puzzle: Puzzle, range: { min: number; max: number }): boolean {
  const difficulty =
    typeof puzzle.difficulty === "number"
      ? puzzle.difficulty
      : puzzle.difficulty === "easy"
        ? 3
        : puzzle.difficulty === "medium"
          ? 5
          : 7;

  return difficulty >= range.min && difficulty <= range.max;
}
