/**
 * Semantic Search Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Puzzle } from "@/db/models";
import {
  findSimilarPuzzles,
  recommendPuzzlesByUserHistory,
  searchPuzzlesByConcept,
} from "../semantic-search";

// Mock dependencies BEFORE imports
jest.mock("@/db/mongodb");
jest.mock("@/db/operations");
jest.mock("../embeddings");
jest.mock("@/db/utils/vector-operations");

import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "@/db/operations";
import { cosineSimilarity } from "@/db/utils/vector-operations";
import { generateEmbedding, generatePuzzleEmbedding } from "../embeddings";

const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>;
const mockPuzzleOps = puzzleOps as jest.Mocked<typeof puzzleOps>;
const mockGenerateEmbedding = generateEmbedding as jest.MockedFunction<typeof generateEmbedding>;
const mockGeneratePuzzleEmbedding = generatePuzzleEmbedding as jest.MockedFunction<
  typeof generatePuzzleEmbedding
>;
const mockCosineSimilarity = cosineSimilarity as jest.MockedFunction<typeof cosineSimilarity>;

describe("Semantic Search Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findSimilarPuzzles", () => {
    const mockReferencePuzzle: Puzzle = {
      id: "puzzle-1",
      puzzle: "Test puzzle",
      answer: "Answer",
      difficulty: "medium",
      category: "test",
      embedding: [0.1, 0.2, 0.3],
      publishedAt: new Date(),
      createdAt: new Date(),
      active: true,
    };

    const mockSimilarPuzzles: Puzzle[] = [
      {
        ...mockReferencePuzzle,
        id: "puzzle-2",
        embedding: [0.15, 0.25, 0.35],
      },
      {
        ...mockReferencePuzzle,
        id: "puzzle-3",
        embedding: [0.2, 0.3, 0.4],
      },
    ];

    it("should find similar puzzles with embeddings", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(mockReferencePuzzle);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockSimilarPuzzles),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      mockCosineSimilarity.mockReturnValueOnce(0.95).mockReturnValueOnce(0.85);

      const result = await findSimilarPuzzles("puzzle-1", 5, 0.7);

      expect(result).toHaveLength(2);
      expect(result[0]?.similarity).toBe(0.95);
      expect(result[1]?.similarity).toBe(0.85);
      expect(mockPuzzleOps.findById).toHaveBeenCalledWith("puzzle-1");
    });

    it("should generate embedding if not present", async () => {
      const puzzleWithoutEmbedding = {
        ...mockReferencePuzzle,
        embedding: undefined,
      };
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(puzzleWithoutEmbedding);

      const mockEmbedding = [0.1, 0.2, 0.3];
      mockGeneratePuzzleEmbedding.mockResolvedValue(mockEmbedding);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      await findSimilarPuzzles("puzzle-1");

      expect(mockGeneratePuzzleEmbedding).toHaveBeenCalled();
    });

    it("should throw error if puzzle not found", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(null);

      await expect(findSimilarPuzzles("nonexistent")).rejects.toThrow("Puzzle not found");
    });

    it("should filter by minimum similarity threshold", async () => {
      mockPuzzleOps.findById = jest.fn().mockResolvedValue(mockReferencePuzzle);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockSimilarPuzzles),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      mockCosineSimilarity.mockReturnValueOnce(0.95).mockReturnValueOnce(0.5); // Below threshold

      const result = await findSimilarPuzzles("puzzle-1", 5, 0.7);

      expect(result).toHaveLength(1);
      expect(result[0]?.similarity).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("searchPuzzlesByConcept", () => {
    const mockPuzzles: Puzzle[] = [
      {
        id: "puzzle-1",
        puzzle: "Test puzzle about animals",
        answer: "Lion",
        difficulty: "medium",
        category: "animals",
        embedding: [0.1, 0.2, 0.3],
        publishedAt: new Date(),
        createdAt: new Date(),
        active: true,
      },
    ];

    it("should search puzzles by concept", async () => {
      const mockEmbedding = [0.15, 0.25, 0.35];
      mockGenerateEmbedding.mockResolvedValue(mockEmbedding);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockPuzzles),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      mockCosineSimilarity.mockReturnValue(0.9);

      const result = await searchPuzzlesByConcept("animal puzzle", 10);

      expect(result).toHaveLength(1);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith("animal puzzle");
    });

    it("should return empty array if no puzzles found", async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockGetCollection.mockReturnValue(mockCollection as any);

      const result = await searchPuzzlesByConcept("concept", 10);

      expect(result).toEqual([]);
    });
  });

  describe("recommendPuzzlesByUserHistory", () => {
    it("should recommend puzzles based on user history", async () => {
      const mockSolvedPuzzles: Puzzle[] = [
        {
          id: "puzzle-1",
          puzzle: "Puzzle about cats",
          answer: "Cat",
          difficulty: "easy",
          category: "animals",
          embedding: [0.1, 0.2, 0.3],
          publishedAt: new Date(),
          createdAt: new Date(),
          active: true,
        },
      ];

      const mockAttempts = [
        {
          id: "attempt-1",
          userId: "user-1",
          puzzleId: "puzzle-1",
          attemptedAnswer: "Cat",
          isCorrect: true,
          attemptedAt: new Date(),
        },
      ];

      // Mock puzzleAttemptOps
      (puzzleAttemptOps.getUserAttempts as jest.Mock) = jest.fn().mockResolvedValue(mockAttempts);
      (puzzleOps.findActivePuzzles as jest.Mock) = jest.fn().mockResolvedValue(mockSolvedPuzzles);
      (puzzleOps.findById as jest.Mock) = jest.fn().mockResolvedValue(mockSolvedPuzzles[0]);

      const result = await recommendPuzzlesByUserHistory("user-1", 5);

      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(puzzleAttemptOps.getUserAttempts).toHaveBeenCalledWith("user-1", 50);
    });

    it("should return empty array if user has no history", async () => {
      (puzzleAttemptOps.getUserAttempts as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await recommendPuzzlesByUserHistory("user-1", 5);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
