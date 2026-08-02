/**
 * User Profiler Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle, PuzzleAttempt } from "@/db/models";

jest.mock("@/db/mongodb");
jest.mock("@/db/operations");

import { getCollection } from "@/db/mongodb";
import { puzzleAttemptOps, userStatsOps } from "@/db/operations";
import {
  buildUserPuzzleProfile,
  calculateUserDifficultyPreference,
  estimateUserSkillLevel,
  identifyUserCategories,
  identifyUserPuzzleTypes,
} from "../user-profiler";

const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>;
const mockGetUserAttempts = puzzleAttemptOps.getUserAttempts as jest.MockedFunction<
  typeof puzzleAttemptOps.getUserAttempts
>;
const mockFindUserStats = userStatsOps.findByUserId as jest.MockedFunction<
  typeof userStatsOps.findByUserId
>;

const basePuzzle: Puzzle = {
  id: "puzzle-1",
  puzzle: "Test puzzle",
  answer: "Answer",
  difficulty: "medium",
  category: "animals",
  puzzleType: "rebus",
  publishedAt: new Date(),
  createdAt: new Date(),
  active: true,
};

function makeAttempt(index: number, isCorrect = true): PuzzleAttempt {
  return {
    id: `attempt-${index}`,
    userId: "user-1",
    puzzleId: `puzzle-${index}`,
    attemptedAnswer: isCorrect ? "Answer" : "Wrong",
    isCorrect,
    attemptedAt: new Date(Date.now() - index * 1000),
    timeSpentSeconds: 120,
    userSatisfaction: 5,
    hintsUsed: 0,
  };
}

function makeAttempts(total: number, solved: number): PuzzleAttempt[] {
  return Array.from({ length: total }, (_, index) => makeAttempt(index + 1, index < solved));
}

function mockPuzzles(puzzles: Puzzle[]): void {
  mockGetCollection.mockReturnValue({
    find: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue(puzzles),
    })),
  } as never);
}

describe("User Profiler Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUserStats.mockResolvedValue(null);
  });

  describe("buildUserPuzzleProfile", () => {
    it("should build a profile from current attempt and puzzle records", async () => {
      const attempts = [makeAttempt(1)];
      mockGetUserAttempts.mockResolvedValue(attempts);
      mockFindUserStats.mockResolvedValue({
        userId: "user-1",
        streak: 2,
        wins: 1,
        totalGames: 1,
        lastPlayDate: new Date(),
      } as never);
      mockPuzzles([basePuzzle]);

      const result = await buildUserPuzzleProfile("user-1");

      expect(result).toMatchObject({
        userId: "user-1",
        skillLevel: "beginner",
        favoriteCategories: ["animals"],
        preferredPuzzleTypes: ["rebus"],
        totalPuzzlesAttempted: 1,
        totalPuzzlesSolved: 1,
      });
    });
  });

  describe("estimateUserSkillLevel", () => {
    it("should return beginner for new users", async () => {
      mockGetUserAttempts.mockResolvedValue([]);

      await expect(estimateUserSkillLevel("user-1")).resolves.toMatchObject({
        level: "beginner",
      });
    });

    it("should return expert for high-performing experienced users", async () => {
      const attempts = makeAttempts(20, 20);
      mockGetUserAttempts.mockResolvedValue(attempts);
      mockFindUserStats.mockResolvedValue({ streak: 30, wins: 50 } as never);
      mockPuzzles(
        attempts.map((attempt) => ({
          ...basePuzzle,
          id: attempt.puzzleId,
          difficulty: "hard",
        }))
      );

      await expect(estimateUserSkillLevel("user-1")).resolves.toMatchObject({ level: "expert" });
    });

    it("should return advanced for good performers", async () => {
      const attempts = makeAttempts(10, 8);
      mockGetUserAttempts.mockResolvedValue(attempts);
      mockPuzzles(
        attempts.slice(0, 8).map((attempt) => ({
          ...basePuzzle,
          id: attempt.puzzleId,
          difficulty: "hard",
        }))
      );

      await expect(estimateUserSkillLevel("user-1")).resolves.toMatchObject({ level: "advanced" });
    });

    it("should return intermediate for average performers", async () => {
      const attempts = makeAttempts(10, 6);
      mockGetUserAttempts.mockResolvedValue(attempts);
      mockPuzzles(
        attempts.slice(0, 6).map((attempt) => ({
          ...basePuzzle,
          id: attempt.puzzleId,
          difficulty: "medium",
        }))
      );

      await expect(estimateUserSkillLevel("user-1")).resolves.toMatchObject({
        level: "intermediate",
      });
    });
  });

  describe("identifyUserCategories", () => {
    it("should identify top categories from solved puzzles", async () => {
      mockGetUserAttempts.mockResolvedValue(makeAttempts(3, 3));
      mockPuzzles([
        { ...basePuzzle, id: "puzzle-1", category: "animals" },
        { ...basePuzzle, id: "puzzle-2", category: "animals" },
        { ...basePuzzle, id: "puzzle-3", category: "nature" },
      ]);

      await expect(identifyUserCategories("user-1")).resolves.toEqual(["animals", "nature"]);
    });

    it("should use the general category when source data has no category", async () => {
      mockGetUserAttempts.mockResolvedValue([makeAttempt(1)]);
      mockPuzzles([{ ...basePuzzle, category: undefined, metadata: undefined }]);

      await expect(identifyUserCategories("user-1")).resolves.toEqual(["general"]);
    });
  });

  describe("identifyUserPuzzleTypes", () => {
    it("should identify top puzzle types", async () => {
      mockGetUserAttempts.mockResolvedValue(makeAttempts(3, 3));
      mockPuzzles([
        { ...basePuzzle, id: "puzzle-1", puzzleType: "rebus" },
        { ...basePuzzle, id: "puzzle-2", puzzleType: "rebus" },
        { ...basePuzzle, id: "puzzle-3", puzzleType: "riddle" },
      ]);

      await expect(identifyUserPuzzleTypes("user-1")).resolves.toEqual(["rebus", "riddle"]);
    });
  });

  describe("calculateUserDifficultyPreference", () => {
    it("should create a range around solved hard puzzles", async () => {
      mockGetUserAttempts.mockResolvedValue(makeAttempts(3, 3));
      mockPuzzles([
        { ...basePuzzle, id: "puzzle-1", difficulty: "hard" },
        { ...basePuzzle, id: "puzzle-2", difficulty: "hard" },
        { ...basePuzzle, id: "puzzle-3", difficulty: "hard" },
      ]);

      await expect(calculateUserDifficultyPreference("user-1")).resolves.toEqual({
        min: 6,
        max: 8,
      });
    });

    it("should cover a balanced easy-to-hard history", async () => {
      mockGetUserAttempts.mockResolvedValue(makeAttempts(3, 3));
      mockPuzzles([
        { ...basePuzzle, id: "puzzle-1", difficulty: "easy" },
        { ...basePuzzle, id: "puzzle-2", difficulty: "medium" },
        { ...basePuzzle, id: "puzzle-3", difficulty: "hard" },
      ]);

      await expect(calculateUserDifficultyPreference("user-1")).resolves.toEqual({
        min: 2,
        max: 8,
      });
    });
  });
});
