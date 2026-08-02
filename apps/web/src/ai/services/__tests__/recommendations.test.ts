/**
 * Recommendations Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle } from "@/db/models";

jest.mock("../user-profiler", () => ({
  buildUserPuzzleProfile: jest.fn(),
}));
jest.mock("../semantic-search", () => ({
  findSimilarPuzzles: jest.fn(),
  recommendPuzzlesByUserHistory: jest.fn(),
  searchPuzzlesByConcept: jest.fn(),
}));
jest.mock("@/db/operations", () => ({
  puzzleOps: {
    findActivePuzzles: jest.fn(),
    findById: jest.fn(),
  },
  puzzleAttemptOps: {
    getUserAttempts: jest.fn(),
  },
}));

import { puzzleAttemptOps, puzzleOps } from "@/db/operations";
import {
  getAdaptiveDifficulty,
  getPersonalizedPuzzles,
  recommendNextPuzzle,
} from "../recommendations";
import {
  findSimilarPuzzles,
  recommendPuzzlesByUserHistory,
  searchPuzzlesByConcept,
} from "../semantic-search";
import { buildUserPuzzleProfile } from "../user-profiler";

const mockBuildProfile = buildUserPuzzleProfile as jest.MockedFunction<
  typeof buildUserPuzzleProfile
>;
const mockHistoryRecommendations = recommendPuzzlesByUserHistory as jest.MockedFunction<
  typeof recommendPuzzlesByUserHistory
>;
const mockSearchByConcept = searchPuzzlesByConcept as jest.MockedFunction<
  typeof searchPuzzlesByConcept
>;
const mockFindSimilar = findSimilarPuzzles as jest.MockedFunction<typeof findSimilarPuzzles>;
const mockFindActive = puzzleOps.findActivePuzzles as jest.MockedFunction<
  typeof puzzleOps.findActivePuzzles
>;
const mockFindPuzzle = puzzleOps.findById as jest.MockedFunction<typeof puzzleOps.findById>;
const mockGetAttempts = puzzleAttemptOps.getUserAttempts as jest.MockedFunction<
  typeof puzzleAttemptOps.getUserAttempts
>;

const puzzle: Puzzle = {
  id: "puzzle-1",
  puzzle: "Test puzzle",
  answer: "Answer",
  difficulty: "medium",
  publishedAt: new Date(),
  createdAt: new Date(),
  active: true,
};

const profile = {
  userId: "user-1",
  skillLevel: "intermediate" as const,
  skillScore: 50,
  preferredDifficultyRange: { min: 3, max: 7 },
  favoriteCategories: [],
  preferredPuzzleTypes: ["rebus"],
  averageTimeToSolve: 120,
  hintUsagePattern: "minimal" as const,
  engagementLevel: "medium" as const,
  lastActivityDate: new Date(),
  totalPuzzlesAttempted: 10,
  totalPuzzlesSolved: 7,
  solveRate: 0.7,
  streakDays: 3,
};

describe("Recommendations Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildProfile.mockResolvedValue(profile);
    mockHistoryRecommendations.mockResolvedValue([]);
    mockSearchByConcept.mockResolvedValue([]);
    mockFindActive.mockResolvedValue([]);
    mockGetAttempts.mockResolvedValue([]);
  });

  describe("getPersonalizedPuzzles", () => {
    it("should preserve the strongest semantic recommendation", async () => {
      mockHistoryRecommendations.mockResolvedValue([
        { puzzle, score: 0.9, reason: "Matches your solved puzzles" },
      ]);

      await expect(getPersonalizedPuzzles("user-1", 5)).resolves.toEqual([
        expect.objectContaining({
          puzzle,
          score: 0.9,
          confidence: 0.8,
        }),
      ]);
      expect(mockHistoryRecommendations).toHaveBeenCalledWith("user-1", 10);
    });

    it("should include a new in-range puzzle only once", async () => {
      mockFindActive.mockResolvedValue([puzzle]);

      const result = await getPersonalizedPuzzles("user-1", 5);

      expect(result).toHaveLength(1);
      expect(result[0]?.puzzle.id).toBe(puzzle.id);
    });
  });

  describe("recommendNextPuzzle", () => {
    it("should recommend a similar puzzle inside the preferred range", async () => {
      const nextPuzzle = { ...puzzle, id: "puzzle-2" };
      mockFindPuzzle.mockResolvedValue(puzzle);
      mockFindSimilar.mockResolvedValue([{ puzzle: nextPuzzle, similarity: 0.9 }]);

      await expect(recommendNextPuzzle("user-1", puzzle.id)).resolves.toMatchObject({
        puzzle: nextPuzzle,
        score: 0.9,
        confidence: 0.8,
      });
    });

    it("should return null when the current puzzle no longer exists", async () => {
      mockFindPuzzle.mockResolvedValue(null);

      await expect(recommendNextPuzzle("user-1", "missing")).resolves.toBeNull();
    });
  });

  describe("getAdaptiveDifficulty", () => {
    it("should use the profile midpoint when history is sparse", async () => {
      mockGetAttempts.mockResolvedValue([]);

      await expect(getAdaptiveDifficulty("user-1")).resolves.toMatchObject({
        recommended: 5,
        range: { min: 3, max: 7 },
      });
    });

    it("should raise difficulty after a strong recent solve rate", async () => {
      mockGetAttempts.mockResolvedValue(
        Array.from({ length: 5 }, (_, index) => ({
          id: `attempt-${index}`,
          userId: "user-1",
          puzzleId: `puzzle-${index}`,
          attemptedAnswer: "Answer",
          isCorrect: true,
          attemptedAt: new Date(),
        }))
      );

      await expect(getAdaptiveDifficulty("user-1")).resolves.toMatchObject({
        recommended: 8,
        range: { min: 7, max: 9 },
      });
    });
  });
});
