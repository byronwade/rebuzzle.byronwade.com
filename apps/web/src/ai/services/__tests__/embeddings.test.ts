/**
 * Embeddings Service Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock the AI client BEFORE importing the service
const mockGetAIProvider = jest.fn(() => ({
  getName: jest.fn(() => "google"),
}));

const mockWithRetry = jest.fn((fn) => fn());

jest.mock("@/ai/client", () => ({
  getAIProvider: () => mockGetAIProvider(),
  withRetry: mockWithRetry,
}));

jest.mock("@/ai/config", () => ({
  AI_CONFIG: {
    defaultProvider: "google",
  },
}));

import {
  generateEmbedding,
  generateEmbeddingsBatch,
  generatePuzzleEmbedding,
  isEmbeddingAvailable,
} from "../embeddings";

describe("Embeddings Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Mock fetch globally
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("generateEmbedding", () => {
    it("should throw error for empty text", async () => {
      await expect(generateEmbedding("")).rejects.toThrow("Text cannot be empty");
      await expect(generateEmbedding("   ")).rejects.toThrow("Text cannot be empty");
    });

    it("should generate embedding for valid text", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      (global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: {
            values: mockEmbedding,
          },
        }),
      });

      const result = await generateEmbedding("test puzzle");
      expect(result).toEqual(mockEmbedding);
      expect(result.length).toBe(768);
    });

    it("should throw error when API key is missing", async () => {
      process.env.GOOGLE_AI_API_KEY = undefined;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

      await expect(generateEmbedding("test")).rejects.toThrow();
    });

    it("should handle API errors gracefully", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(generateEmbedding("test")).rejects.toThrow();
    });
  });

  describe("generateEmbeddingsBatch", () => {
    it("should return empty array for empty input", async () => {
      const result = await generateEmbeddingsBatch([]);
      expect(result).toEqual([]);
    });

    it("should generate embeddings for multiple texts", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: {
            values: mockEmbedding,
          },
        }),
      });

      const texts = ["text1", "text2", "text3"];
      const result = await generateEmbeddingsBatch(texts);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should process in batches", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: {
            values: mockEmbedding,
          },
        }),
      });

      const texts = ["text1", "text2", "text3", "text4", "text5", "text6"];
      const result = await generateEmbeddingsBatch(texts, 2);

      expect(result).toHaveLength(6);
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });
  });

  describe("generatePuzzleEmbedding", () => {
    it("should generate embedding for puzzle with all fields", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: {
            values: mockEmbedding,
          },
        }),
      });

      const puzzle = {
        puzzle: "What has keys but no locks?",
        answer: "Piano",
        category: "Riddles",
        puzzleType: "riddle",
        explanation: "A piano has keys but no locks",
      };

      const result = await generatePuzzleEmbedding(puzzle);
      expect(result).toEqual(mockEmbedding);

      // Verify the fetch was called with combined text
      expect(global.fetch).toHaveBeenCalled();
      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body || "{}");
      expect(callBody.content.parts[0].text).toContain("Puzzle:");
      expect(callBody.content.parts[0].text).toContain("Answer:");
      expect(callBody.content.parts[0].text).toContain("Category:");
    });

    it("should handle puzzle with minimal fields", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: {
            values: mockEmbedding,
          },
        }),
      });

      const puzzle = {
        puzzle: "Test puzzle",
        answer: "Answer",
      };

      const result = await generatePuzzleEmbedding(puzzle);
      expect(result).toEqual(mockEmbedding);
    });
  });

  describe("isEmbeddingAvailable", () => {
    it("should return true when API key is available", () => {
      process.env.GOOGLE_AI_API_KEY = "test-key";
      expect(isEmbeddingAvailable()).toBe(true);
    });

    it("should return true with alternative API key name", () => {
      process.env.GOOGLE_AI_API_KEY = undefined;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      expect(isEmbeddingAvailable()).toBe(true);
    });

    it("should return false when API key is missing", () => {
      process.env.GOOGLE_AI_API_KEY = undefined;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      expect(isEmbeddingAvailable()).toBe(false);
    });
  });
});
