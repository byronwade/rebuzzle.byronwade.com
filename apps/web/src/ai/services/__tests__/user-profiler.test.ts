/**
 * User Profiler Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle, PuzzleAttempt } from "@/db/models";
import {
  buildUserPuzzleProfile,
  calculateUserDifficultyPreference,
  estimateUserSkillLevel,
  identifyUserCategories,
  identifyUserPuzzleTypes,
} from "../user-profiler";

// Mock dependencies BEFORE imports
jest.mock("@/db/mongodb");
jest.mock("@/db/operations");
jest.mock("@/db/analytics-ops");

import { getCollection } from "@/db/mongodb";
import { puzzleAttemptOps, puzzleOps, userStatsOps } from "@/db/operations";

const _mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>;
const _mockPuzzleOps = puzzleOps as jest.Mocked<typeof puzzleOps>;

describe("User Profiler Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildUserPuzzleProfile", () => {
    const mockPuzzles: Puzzle[] = [
      {
        id: "puzzle-1",
        puzzle: "Test puzzle",
        answer: "Answer",
        difficulty: "easy",
        category: "animals",
        puzzleType: "rebus",
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      },
    ];

    it("should build profile for user with history", async () => {
      const mockAttempts: PuzzleAttempt[] = [
        {
          id: "attempt-1",
          userId: "user-1",
          puzzleId: "puzzle-1",
          attemptedAnswer: "Answer",
          isCorrect: true,
          attemptedAt: new Date(),
        },
      ];

      // Mock the operations
      (userStatsOps.findByUserId as jest.Mock) = jest.fn().mockResolvedValue({
        userId: "user-1",
        totalPuzzlesSolved: 1,
      });

      (puzzleAttemptOps.getUserAttempts as jest.Mock) = jest.fn().mockResolvedValue(mockAttempts);
      (puzzleOps.findById as jest.Mock) = jest.fn().mockResolvedValue(mockPuzzles[0]);

      // Mock helper functions
      jest
        .spyOn(require("../user-profiler"), "estimateUserSkillLevel")
        .mockResolvedValue({ level: "intermediate", score: 50 });
      jest
        .spyOn(require("../user-profiler"), "calculateUserDifficultyPreference")
        .mockResolvedValue("easy");
      jest
        .spyOn(require("../user-profiler"), "identifyUserCategories")
        .mockResolvedValue(["animals"]);
      jest
        .spyOn(require("../user-profiler"), "identifyUserPuzzleTypes")
        .mockResolvedValue(["rebus"]);

      const result = await buildUserPuzzleProfile("user-1");

      expect(result).toBeDefined();
      expect(result?.userId).toBe("user-1");
    });
  });

  describe("estimateUserSkillLevel", () => {
    it("should return beginner for new users", () => {
      const result = estimateUserSkillLevel(0, 0);
      expect(result).toBe("beginner");
    });

    it("should return expert for high-performing experienced users", () => {
      const result = estimateUserSkillLevel(0.85, 25);
      expect(result).toBe("expert");
    });

    it("should return advanced for good performers", () => {
      const result = estimateUserSkillLevel(0.65, 15);
      expect(result).toBe("advanced");
    });

    it("should return intermediate for average performers", () => {
      const result = estimateUserSkillLevel(0.5, 10);
      expect(result).toBe("intermediate");
    });
  });

  describe("identifyUserCategories", () => {
    it("should identify top categories from solved puzzles", () => {
      const puzzles: Puzzle[] = [
        { ...mockPuzzles[0], category: "animals" },
        { ...mockPuzzles[0], id: "puzzle-2", category: "animals" },
        { ...mockPuzzles[0], id: "puzzle-3", category: "nature" },
      ] as Puzzle[];

      const result = identifyUserCategories(puzzles);

      expect(result).toContain("animals");
      expect(result[0]).toBe("animals"); // Most frequent
    });

    it("should return empty array for puzzles without categories", () => {
      const puzzles: Puzzle[] = [{ ...mockPuzzles[0], category: undefined }] as Puzzle[];

      const result = identifyUserCategories(puzzles);

      expect(result).toEqual([]);
    });
  });

  describe("identifyUserPuzzleTypes", () => {
    it("should identify top puzzle types", () => {
      const puzzles: Puzzle[] = [
        { ...mockPuzzles[0], puzzleType: "rebus" },
        { ...mockPuzzles[0], id: "puzzle-2", puzzleType: "rebus" },
        { ...mockPuzzles[0], id: "puzzle-3", puzzleType: "riddle" },
      ] as Puzzle[];

      const result = identifyUserPuzzleTypes(puzzles);

      expect(result).toContain("rebus");
      expect(result[0]).toBe("rebus");
    });
  });

  describe("calculateUserDifficultyPreference", () => {
    it("should identify hard preference", () => {
      const puzzles: Puzzle[] = [
        { ...mockPuzzles[0], difficulty: "hard" },
        { ...mockPuzzles[0], id: "puzzle-2", difficulty: "hard" },
        { ...mockPuzzles[0], id: "puzzle-3", difficulty: "hard" },
      ] as Puzzle[];

      const result = calculateUserDifficultyPreference(puzzles);

      expect(result).toBe("hard");
    });

    it("should return mixed for balanced preferences", () => {
      const puzzles: Puzzle[] = [
        { ...mockPuzzles[0], difficulty: "easy" },
        { ...mockPuzzles[0], id: "puzzle-2", difficulty: "medium" },
        { ...mockPuzzles[0], id: "puzzle-3", difficulty: "hard" },
      ] as Puzzle[];

      const result = calculateUserDifficultyPreference(puzzles);

      expect(result).toBe("mixed");
    });
  });
});
