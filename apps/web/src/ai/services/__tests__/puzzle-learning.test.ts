/**
 * Puzzle Learning Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle, PuzzleAttempt } from "@/db/models";

jest.mock("@/db/mongodb");
jest.mock("@/db/operations", () => ({
  puzzleOps: { findById: jest.fn() },
}));
jest.mock("@/ai/client", () => ({
  generateAIObject: jest.fn(),
}));

import { generateAIObject } from "@/ai/client";
import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "@/db/operations";
import {
  analyzePuzzlePerformance,
  calculateActualDifficulty,
  generateImprovementSuggestions,
  identifyProblematicPuzzles,
} from "../puzzle-learning";

const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>;
const mockFindPuzzle = puzzleOps.findById as jest.MockedFunction<typeof puzzleOps.findById>;
const mockGenerateAIObject = generateAIObject as jest.MockedFunction<typeof generateAIObject>;

const puzzle: Puzzle = {
  id: "puzzle-1",
  puzzle: "Test puzzle",
  answer: "Answer",
  difficulty: "medium",
  category: "phrases",
  publishedAt: new Date(),
  createdAt: new Date(),
  active: true,
};

function makeAttempt(index: number, isCorrect: boolean): PuzzleAttempt {
  return {
    id: `attempt-${index}`,
    userId: `user-${index}`,
    puzzleId: puzzle.id,
    attemptedAnswer: isCorrect ? puzzle.answer : "Wrong",
    isCorrect,
    attemptedAt: new Date(),
    timeSpentSeconds: isCorrect ? 90 : 180,
    hintsUsed: isCorrect ? 0 : 2,
    abandoned: !isCorrect,
    difficultyPerception: 7,
    userSatisfaction: isCorrect ? 4 : 1,
  };
}

function attemptsCollection(attempts: PuzzleAttempt[]) {
  return {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue(attempts),
      })),
    })),
  };
}

describe("Puzzle Learning Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindPuzzle.mockResolvedValue(puzzle);
  });

  describe("analyzePuzzlePerformance", () => {
    it("should calculate metrics and attach AI insights", async () => {
      mockGetCollection.mockReturnValue(
        attemptsCollection([makeAttempt(1, true), makeAttempt(2, false)]) as never
      );
      mockGenerateAIObject.mockResolvedValue({
        issues: ["High abandonment"],
        strengths: ["Clear answer"],
      } as never);

      await expect(analyzePuzzlePerformance(puzzle.id)).resolves.toMatchObject({
        puzzleId: puzzle.id,
        totalAttempts: 2,
        solveRate: 0.5,
        abandonmentRate: 0.5,
        issues: ["High abandonment"],
        strengths: ["Clear answer"],
      });
    });

    it("should return deterministic empty metrics when there are no attempts", async () => {
      mockGetCollection.mockReturnValue(attemptsCollection([]) as never);

      await expect(analyzePuzzlePerformance(puzzle.id)).resolves.toMatchObject({
        totalAttempts: 0,
        solveRate: 0,
        issues: ["No attempts recorded yet"],
      });
      expect(mockGenerateAIObject).not.toHaveBeenCalled();
    });

    it("should reject an unknown puzzle", async () => {
      mockFindPuzzle.mockResolvedValue(null);

      await expect(analyzePuzzlePerformance("missing")).rejects.toThrow("Puzzle not found");
    });
  });

  describe("calculateActualDifficulty", () => {
    it("should retain the configured difficulty until enough attempts exist", async () => {
      mockGetCollection.mockReturnValue(attemptsCollection([makeAttempt(1, true)]) as never);
      mockGenerateAIObject.mockResolvedValue({ issues: [], strengths: [] } as never);

      await expect(calculateActualDifficulty(puzzle.id)).resolves.toBe(5);
    });
  });

  describe("identifyProblematicPuzzles", () => {
    it("should rank a low-performing puzzle as high severity", async () => {
      const attempts = Array.from({ length: 10 }, (_, index) => makeAttempt(index, index < 2));
      const aggregateCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([{ _id: puzzle.id, count: attempts.length }]),
        })),
      };
      mockGetCollection
        .mockReturnValueOnce(aggregateCollection as never)
        .mockReturnValueOnce(attemptsCollection(attempts) as never);
      mockGenerateAIObject.mockResolvedValue({
        issues: ["Solve rate is too low"],
        strengths: [],
      } as never);

      await expect(identifyProblematicPuzzles(5)).resolves.toEqual([
        expect.objectContaining({
          puzzleId: puzzle.id,
          severity: "high",
          issues: ["Solve rate is too low"],
        }),
      ]);
    });

    it("should return no records when no puzzle meets the attempt threshold", async () => {
      mockGetCollection.mockReturnValue({
        aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      } as never);

      await expect(identifyProblematicPuzzles(5)).resolves.toEqual([]);
    });
  });

  describe("generateImprovementSuggestions", () => {
    it("should return the structured AI suggestions for the current puzzle", async () => {
      mockGetCollection.mockReturnValue(
        attemptsCollection([makeAttempt(1, false), makeAttempt(2, false)]) as never
      );
      mockGenerateAIObject
        .mockResolvedValueOnce({ issues: ["Too hard"], strengths: [] } as never)
        .mockResolvedValueOnce({
          suggestions: [
            {
              category: "clarity",
              suggestion: "Simplify the visual relationship",
              priority: "high",
            },
          ],
          reasoning: "Players are abandoning before solving.",
        } as never);

      await expect(generateImprovementSuggestions(puzzle.id)).resolves.toMatchObject({
        reasoning: "Players are abandoning before solving.",
        suggestions: [expect.objectContaining({ priority: "high" })],
      });
      expect(mockGenerateAIObject).toHaveBeenCalledTimes(2);
    });
  });
});
