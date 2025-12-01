/**
 * Recommendations Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle } from "@/db/models";
import {
  getAdaptiveDifficulty,
  getPersonalizedPuzzles,
  recommendNextPuzzle,
} from "../recommendations";

// Mock dependencies
jest.mock("../user-profiler");
jest.mock("../semantic-search");
jest.mock("@/db/mongodb");

import { getCollection } from "@/db/mongodb";
import { findSimilarPuzzles, searchPuzzlesByConcept } from "../semantic-search";
import { buildUserPuzzleProfile } from "../user-profiler";

const mockBuildUserPuzzleProfile =
  buildUserPuzzleProfile as jest.MockedFunction<typeof buildUserPuzzleProfile>;
const mockSearchPuzzlesByConcept =
  searchPuzzlesByConcept as jest.MockedFunction<typeof searchPuzzlesByConcept>;
const mockFindSimilarPuzzles = findSimilarPuzzles as jest.MockedFunction<
  typeof findSimilarPuzzles
>;
const mockGetCollection = getCollection as jest.MockedFunction<
  typeof getCollection
>;

describe("Recommendations Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPersonalizedPuzzles", () => {
    const mockPuzzles: Puzzle[] = [
      {
        id: "puzzle-1",
        puzzle: "Test puzzle",
        answer: "Answer",
        difficulty: "medium",
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      },
    ];

    it("should return personalized puzzles based on profile", async () => {
      mockBuildUserPuzzleProfile.mockResolvedValue({
        userId: "user-1",
        totalPuzzlesSolved: 10,
        averageSuccessRate: 0.7,
        preferredCategories: ["animals"],
        preferredPuzzleTypes: ["rebus"],
        difficultyPreference: "medium",
        skillLevel: "intermediate",
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSearchPuzzlesByConcept.mockResolvedValue(mockPuzzles);

      const result = await getPersonalizedPuzzles("user-1", 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockBuildUserPuzzleProfile).toHaveBeenCalledWith("user-1");
    });

    it("should fallback to random puzzles if no profile", async () => {
      mockBuildUserPuzzleProfile.mockResolvedValue(null);

      const mockCollection = {
        aggregate: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockPuzzles),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      const result = await getPersonalizedPuzzles("user-1", 5);

      expect(result).toEqual(mockPuzzles);
    });
  });

  describe("recommendNextPuzzle", () => {
    const mockPuzzle: Puzzle = {
      id: "puzzle-1",
      puzzle: "Test puzzle",
      answer: "Answer",
      difficulty: "medium",
      publishedAt: new Date(),
      createdAt: new Date(),
      active: true,
    };

    it("should recommend similar puzzle", async () => {
      mockBuildUserPuzzleProfile.mockResolvedValue({
        userId: "user-1",
        totalPuzzlesSolved: 5,
        averageSuccessRate: 0.6,
        preferredCategories: [],
        preferredPuzzleTypes: [],
        difficultyPreference: "medium",
        skillLevel: "intermediate",
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockFindSimilarPuzzles.mockResolvedValue([
        { puzzle: mockPuzzle, similarity: 0.9 },
      ]);

      const result = await recommendNextPuzzle("user-1", "puzzle-0");

      expect(result).toBeDefined();
      expect(result?.puzzleId).toBe("puzzle-1");
      expect(mockFindSimilarPuzzles).toHaveBeenCalled();
    });

    it("should return null if no profile", async () => {
      mockBuildUserPuzzleProfile.mockResolvedValue(null);

      const result = await recommendNextPuzzle("user-1", "puzzle-0");

      expect(result).toBeNull();
    });
  });

  describe("getAdaptiveDifficulty", () => {
    it("should return difficulty based on preference", () => {
      const profile = {
        userId: "user-1",
        totalPuzzlesSolved: 10,
        averageSuccessRate: 0.7,
        preferredCategories: [],
        preferredPuzzleTypes: [],
        difficultyPreference: "hard",
        skillLevel: "advanced",
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = getAdaptiveDifficulty("user-1", profile);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    });

    it("should return default difficulty if no profile", () => {
      const result = getAdaptiveDifficulty("user-1", null);

      expect(result).toBe(5); // Default medium
    });
  });
});

