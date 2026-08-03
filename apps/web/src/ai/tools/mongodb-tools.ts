/**
 * MongoDB Tools for AI Agents (AI SDK tool() + Gateway-compatible)
 */

import { type Tool, type ToolSet, tool } from "ai";
import { z } from "zod";
import { puzzleAttemptOps, puzzleOps } from "@/db/operations";
import { analyzePuzzlePerformance, calculateActualDifficulty } from "../services/puzzle-learning";
import { findSimilarPuzzles, searchPuzzlesByConcept } from "../services/semantic-search";
import { buildUserPuzzleProfile } from "../services/user-profiler";

export const findSimilarPuzzlesTool: Tool = tool({
  description: "Find puzzles similar to a given puzzle ID using semantic similarity.",
  inputSchema: z.object({
    puzzleId: z.string().describe("The ID of the puzzle to find similar ones for"),
    limit: z.number().optional().default(5),
    minSimilarity: z.number().optional().default(0.7),
  }),
  execute: async ({ puzzleId, limit, minSimilarity }) => {
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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

export const searchPuzzlesByConceptTool: Tool = tool({
  description: "Search for puzzles by semantic concept or theme.",
  inputSchema: z.object({
    concept: z.string().describe("Concept, theme, or topic"),
    limit: z.number().optional().default(10),
    minSimilarity: z.number().optional().default(0.6),
  }),
  execute: async ({ concept, limit, minSimilarity }) => {
    try {
      const results = await searchPuzzlesByConcept(concept, limit, minSimilarity);
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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

export const getUserHistoryTool: Tool = tool({
  description: "Get a user's recent puzzle attempt history.",
  inputSchema: z.object({
    userId: z.string(),
    limit: z.number().optional().default(20),
  }),
  execute: async ({ userId, limit }) => {
    try {
      const attempts = await puzzleAttemptOps.getUserAttempts(userId, limit);
      return {
        success: true,
        attempts: attempts.map((a) => ({
          puzzleId: a.puzzleId,
          correct: a.isCorrect,
          attemptedAnswer: a.attemptedAnswer,
          attemptedAt: a.attemptedAt,
        })),
        count: attempts.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

export const getUserProfileTool: Tool = tool({
  description: "Build a player skill/preference profile from attempt history.",
  inputSchema: z.object({
    userId: z.string(),
  }),
  execute: async ({ userId }) => {
    try {
      const profile = await buildUserPuzzleProfile(userId);
      return { success: true, profile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

export const analyzePuzzlePerformanceTool: Tool = tool({
  description: "Analyze how players perform on a puzzle and estimate true difficulty.",
  inputSchema: z.object({
    puzzleId: z.string(),
  }),
  execute: async ({ puzzleId }) => {
    try {
      const analysis = await analyzePuzzlePerformance(puzzleId);
      const actualDifficulty = await calculateActualDifficulty(puzzleId);
      const puzzle = await puzzleOps.findById(puzzleId);
      return {
        success: true,
        analysis,
        actualDifficulty,
        statedDifficulty: puzzle?.difficulty ?? null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

export const allMongoDBTools: ToolSet = {
  findSimilarPuzzles: findSimilarPuzzlesTool,
  searchPuzzlesByConcept: searchPuzzlesByConceptTool,
  getUserHistory: getUserHistoryTool,
  getUserProfile: getUserProfileTool,
  analyzePuzzlePerformance: analyzePuzzlePerformanceTool,
};
