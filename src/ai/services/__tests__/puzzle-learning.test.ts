/**
 * Puzzle Learning Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle, PuzzleAttempt } from "@/db/models";
import {
  analyzePuzzlePerformance,
  calculateActualDifficulty,
  generateImprovementSuggestions,
  identifyProblematicPuzzles,
} from "../puzzle-learning";

// Mock dependencies
jest.mock("@/db/mongodb");
jest.mock("@/db/operations");
jest.mock("@/ai/client");

import { generateAIObject } from "@/ai/client";
import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "@/db/operations";

const mockGetCollection = getCollection as jest.MockedFunction<
  typeof getCollection
>;
const mockPuzzleOps = puzzleOps as jest.Mocked<typeof puzzleOps>;
const mockGenerateAIObject = generateAIObject as jest.MockedFunction<
  typeof generateAIObject
>;

describe("Puzzle Learning Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzePuzzlePerformance", () => {
    const mockPuzzle: Puzzle = {
      id: "puzzle-1",
      puzzle: "Test puzzle",
      answer: "Answer",
      difficulty: "medium",
      publishedAt: new Date(),
      createdAt: new Date(),
      active: true,
    };

    it("should analyze performance with attempts", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(mockPuzzle);

      const mockAttempts: PuzzleAttempt[] = [
        {
          id: "attempt-1",
          userId: "user-1",
          puzzleId: "puzzle-1",
          attemptedAnswer: "Answer",
          isCorrect: true,
          attemptedAt: new Date(),
          timeSpentSeconds: 30,
          hintsUsed: 0,
        },
        {
          id: "attempt-2",
          userId: "user-2",
          puzzleId: "puzzle-1",
          attemptedAnswer: "Wrong",
          isCorrect: false,
          attemptedAt: new Date(),
        },
      ];

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockAttempts),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      const result = await analyzePuzzlePerformance("puzzle-1");

      expect(result).toBeDefined();
      expect(result.totalAttempts).toBe(2);
      expect(result.solveRate).toBe(0.5);
      expect(mockPuzzleOps.findById).toHaveBeenCalledWith("puzzle-1");
    });

    it("should return empty metrics if no attempts", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(mockPuzzle);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      const result = await analyzePuzzlePerformance("puzzle-1");

      expect(result.totalAttempts).toBe(0);
      expect(result.solveRate).toBe(0);
      expect(result.issues).toContain("No attempts recorded yet");
    });

    it("should throw error if puzzle not found", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(null);

      await expect(analyzePuzzlePerformance("nonexistent")).rejects.toThrow(
        "Puzzle not found"
      );
    });
  });

  describe("calculateActualDifficulty", () => {
    it("should calculate difficulty from performance", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue({
        id: "puzzle-1",
        puzzle: "Test",
        answer: "Answer",
        difficulty: "medium",
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      });

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([
          {
            id: "attempt-1",
            puzzleId: "puzzle-1",
            userId: "user-1",
            attemptedAnswer: "Answer",
            isCorrect: true,
            attemptedAt: new Date(),
          },
        ]),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      const result = await calculateActualDifficulty("puzzle-1");

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    });
  });

  describe("identifyProblematicPuzzles", () => {
    it("should identify puzzles with low solve rate", async () => {
      const mockPuzzles: Puzzle[] = [
        {
          id: "puzzle-1",
          puzzle: "Hard puzzle",
          answer: "Answer",
          difficulty: "hard",
          publishedAt: new Date(),
          createdAt: new Date(),
          active: true,
        },
      ];

      const mockPuzzleCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockPuzzles),
      };

      const mockAttemptsCollection = {
        aggregate: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([
          {
            _id: "puzzle-1",
            totalAttempts: 10,
            correctAttempts: 2,
            successRate: 0.2, // Below threshold
          },
        ]),
      };

      mockGetCollection
        .mockReturnValueOnce(mockAttemptsCollection as any)
        .mockReturnValueOnce(mockPuzzleCollection as any);

      const result = await identifyProblematicPuzzles(0.3, 10);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("puzzle-1");
    });

    it("should return empty array if no problematic puzzles", async () => {
      const mockAttemptsCollection = {
        aggregate: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockGetCollection.mockReturnValue(mockAttemptsCollection as any);

      const result = await identifyProblematicPuzzles(0.3, 10);

      expect(result).toEqual([]);
    });
  });

  describe("generateImprovementSuggestions", () => {
    it("should generate improvement suggestions", async () => {
      const mockPuzzle: Puzzle = {
        id: "puzzle-1",
        puzzle: "Test puzzle",
        answer: "Answer",
        difficulty: "medium",
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      };

      const mockPerformance = {
        puzzleId: "puzzle-1",
        totalAttempts: 10,
        solveRate: 0.3,
        averageTimeToSolve: 0,
        averageHintsUsed: 0,
        abandonmentRate: 0.5,
        difficultyRating: 8,
        userSatisfaction: 3,
        issues: ["Too hard", "Unclear instructions"],
        strengths: [],
      };

      mockGenerateAIObject.mockResolvedValue({
        object: {
          suggestions: [
            "Simplify the puzzle",
            "Add clearer hints",
            "Reduce difficulty",
          ],
        },
        usage: { promptTokens: 100, completionTokens: 50 },
      });

      const result = await generateImprovementSuggestions(
        mockPuzzle,
        mockPerformance
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockGenerateAIObject).toHaveBeenCalled();
    });
  });
});
