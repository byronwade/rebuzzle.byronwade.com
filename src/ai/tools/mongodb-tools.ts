/**
 * MongoDB Tools for AI Agents
 *
 * Provides AI tools that agents can use to query MongoDB
 * for semantic search, user history, analytics, and puzzle data
 */

import { tool } from "ai";
import { z } from "zod";
import type { Puzzle } from "@/db/models";
import { puzzleAttemptOps, puzzleOps } from "@/db/operations";
import {
  analyzePuzzlePerformance,
  calculateActualDifficulty,
} from "../services/puzzle-learning";
import {
  findSimilarPuzzles,
  searchPuzzlesByConcept,
} from "../services/semantic-search";
import { buildUserPuzzleProfile } from "../services/user-profiler";

/**
 * Tool: Find similar puzzles using semantic search
 */
export const findSimilarPuzzlesTool = (tool as any)({
  description:
    "Find puzzles similar to a given puzzle ID using semantic similarity. Useful for recommending related puzzles or finding variations.",
  parameters: z.object({
    puzzleId: z
      .string()
      .describe("The ID of the puzzle to find similar ones for"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of similar puzzles to return"),
    minSimilarity: z
      .number()
      .optional()
      .default(0.7)
      .describe("Minimum similarity threshold (0-1)"),
  }),
  execute: async ({
    puzzleId,
    limit,
    minSimilarity,
  }: {
    puzzleId: string;
    limit?: number;
    minSimilarity?: number;
  }) => {
    try {
      const results = await findSimilarPuzzles(puzzleId, limit, minSimilarity);
      return {
        success: true,
        results: results.map((r) => ({
          puzzleId: r.puzzle.id,
          answer: r.puzzle.answer,
          similarity: r.similarity,
          category: r.puzzle.category,
          difficulty: r.puzzle.difficulty,
        })),
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Tool: Search puzzles by semantic concept
 */
export const searchPuzzlesByConceptTool = (tool as any)({
  description:
    "Search for puzzles by semantic concept or theme. Can find puzzles about specific topics, themes, or concepts even if they don't match exact keywords.",
  parameters: z.object({
    concept: z
      .string()
      .describe(
        "The concept, theme, or topic to search for (e.g., 'nature', 'food and cooking', 'technology')"
      ),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of results to return"),
    minSimilarity: z
      .number()
      .optional()
      .default(0.6)
      .describe("Minimum similarity threshold (0-1)"),
  }),
  execute: async ({
    concept,
    limit,
    minSimilarity,
  }: {
    concept: string;
    limit?: number;
    minSimilarity?: number;
  }) => {
    try {
      const results = await searchPuzzlesByConcept(
        concept,
        limit,
        minSimilarity
      );
      return {
        success: true,
        results: results.map((r) => ({
          puzzleId: r.puzzle.id,
          answer: r.puzzle.answer,
          similarity: r.similarity,
          category: r.puzzle.category,
          difficulty: r.puzzle.difficulty,
        })),
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Tool: Get user puzzle history
 */
export const getUserHistoryTool = (tool as any)({
  description:
    "Get a user's puzzle attempt history including solved puzzles, difficulty levels attempted, and performance metrics. Useful for understanding user preferences and skill level.",
  parameters: z.object({
    userId: z.string().describe("The ID of the user"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum number of attempts to return"),
  }),
  execute: async ({ userId, limit }: { userId: string; limit?: number }) => {
    try {
      const attempts = await puzzleAttemptOps.getUserAttempts(userId, limit);
      const puzzleIds = Array.from(new Set(attempts.map((a) => a.puzzleId)));
      const puzzles = await Promise.all(
        puzzleIds.map((id) => puzzleOps.findById(id))
      );

      const solvedCount = attempts.filter((a) => a.isCorrect).length;
      const averageTime =
        attempts
          .filter((a) => a.timeSpentSeconds)
          .reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) /
        attempts.filter((a) => a.timeSpentSeconds).length;

      return {
        success: true,
        totalAttempts: attempts.length,
        solvedCount,
        solveRate: attempts.length > 0 ? solvedCount / attempts.length : 0,
        averageTimeToSolve: averageTime || 0,
        recentAttempts: attempts.slice(0, 10).map((a) => ({
          puzzleId: a.puzzleId,
          isCorrect: a.isCorrect,
          attemptedAt: a.attemptedAt,
          timeSpent: a.timeSpentSeconds,
          hintsUsed: a.hintsUsed,
        })),
        uniquePuzzlesAttempted: puzzleIds.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Tool: Analyze puzzle performance metrics
 */
export const analyzePuzzlePerformanceTool = (tool as any)({
  description:
    "Analyze how users are performing on a specific puzzle. Returns solve rates, average time, abandonment rates, and identifies issues or strengths.",
  parameters: z.object({
    puzzleId: z.string().describe("The ID of the puzzle to analyze"),
  }),
  execute: async ({ puzzleId }: { puzzleId: string }) => {
    try {
      const performance = await analyzePuzzlePerformance(puzzleId);
      const actualDifficulty = await calculateActualDifficulty(puzzleId);

      return {
        success: true,
        puzzleId,
        metrics: {
          totalAttempts: performance.totalAttempts,
          solveRate: performance.solveRate,
          averageTimeToSolve: performance.averageTimeToSolve,
          averageHintsUsed: performance.averageHintsUsed,
          abandonmentRate: performance.abandonmentRate,
          difficultyRating: performance.difficultyRating,
          actualDifficulty,
          userSatisfaction: performance.userSatisfaction,
        },
        issues: performance.issues,
        strengths: performance.strengths,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Tool: Get puzzle statistics
 */
export const getPuzzleStatisticsTool = (tool as any)({
  description:
    "Get general statistics about puzzles in the database including counts by difficulty, category, and puzzle type.",
  parameters: z.object({
    category: z.string().optional().describe("Filter by category (optional)"),
    puzzleType: z
      .string()
      .optional()
      .describe("Filter by puzzle type (optional)"),
  }),
  execute: async ({
    category,
    puzzleType,
  }: {
    category?: string;
    puzzleType?: string;
  }) => {
    try {
      const { getCollection } = await import("@/db/mongodb");
      const collection = getCollection<Puzzle>("puzzles");

      const filter: Record<string, unknown> = { active: true };
      if (category) filter.category = category;
      if (puzzleType) {
        filter.$or = [{ puzzleType }, { "metadata.puzzleType": puzzleType }];
      }

      const puzzles = await collection.find(filter).toArray();

      // Calculate statistics
      const byDifficulty: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const puzzle of puzzles) {
        // Difficulty stats
        const difficulty =
          typeof puzzle.difficulty === "number"
            ? puzzle.difficulty.toString()
            : puzzle.difficulty || "unknown";
        byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;

        // Category stats
        const cat = puzzle.category || puzzle.metadata?.category || "general";
        byCategory[cat] = (byCategory[cat] || 0) + 1;

        // Type stats
        const type =
          puzzle.puzzleType || puzzle.metadata?.puzzleType || "rebus";
        byType[type] = (byType[type] || 0) + 1;
      }

      return {
        success: true,
        totalPuzzles: puzzles.length,
        statistics: {
          byDifficulty,
          byCategory,
          byType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Tool: Get user profile
 */
export const getUserProfileTool = (tool as any)({
  description:
    "Get a comprehensive user profile including skill level, preferences, favorite categories, and engagement metrics. Useful for personalization.",
  parameters: z.object({
    userId: z.string().describe("The ID of the user"),
  }),
  execute: async ({ userId }: { userId: string }) => {
    try {
      const profile = await buildUserPuzzleProfile(userId);

      return {
        success: true,
        profile: {
          userId: profile.userId,
          skillLevel: profile.skillLevel,
          skillScore: profile.skillScore,
          preferredDifficultyRange: profile.preferredDifficultyRange,
          favoriteCategories: profile.favoriteCategories,
          preferredPuzzleTypes: profile.preferredPuzzleTypes,
          averageTimeToSolve: profile.averageTimeToSolve,
          hintUsagePattern: profile.hintUsagePattern,
          engagementLevel: profile.engagementLevel,
          totalPuzzlesAttempted: profile.totalPuzzlesAttempted,
          totalPuzzlesSolved: profile.totalPuzzlesSolved,
          solveRate: profile.solveRate,
          streakDays: profile.streakDays,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
