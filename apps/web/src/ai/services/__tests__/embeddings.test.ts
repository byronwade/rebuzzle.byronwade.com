/**
 * Embeddings Service Unit Tests
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockEmbed = jest.fn();
const mockEmbeddingModel = { id: "google/gemini-embedding-001" };
const mockEmbeddingModelFactory = jest.fn(() => mockEmbeddingModel);
const mockGetAIProvider = jest.fn(() => ({
  getName: jest.fn(() => "gateway"),
}));
const mockWithRetry = jest.fn(async (fn: () => unknown) => fn());

jest.mock("ai", () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

jest.mock("@/ai/client", () => ({
  getAIProvider: () => mockGetAIProvider(),
  getAiGateway: () => ({ embeddingModel: mockEmbeddingModelFactory }),
  withRetry: (fn: () => unknown) => mockWithRetry(fn),
}));

jest.mock("@/ai/config", () => ({
  AI_CONFIG: {
    embeddings: { gateway: "google/gemini-embedding-001" },
  },
}));

import {
  generateEmbedding,
  generateEmbeddingsBatch,
  generatePuzzleEmbedding,
  isEmbeddingAvailable,
} from "../embeddings";

describe("Embeddings Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIProvider.mockReturnValue({
      getName: jest.fn(() => "gateway"),
    });
  });

  describe("generateEmbedding", () => {
    it("should throw error for empty text", async () => {
      await expect(generateEmbedding("")).rejects.toThrow("Text cannot be empty");
      await expect(generateEmbedding("   ")).rejects.toThrow("Text cannot be empty");
    });

    it("should generate an embedding through the configured gateway model", async () => {
      const embedding = new Array(768).fill(0).map((_, index) => index / 768);
      mockEmbed.mockResolvedValue({ embedding });

      const result = await generateEmbedding("test puzzle");

      expect(result).toEqual(embedding);
      expect(mockEmbeddingModelFactory).toHaveBeenCalledWith("google/gemini-embedding-001");
      expect(mockEmbed).toHaveBeenCalledWith({
        model: mockEmbeddingModel,
        value: "test puzzle",
      });
    });

    it("should reject an empty provider response", async () => {
      mockEmbed.mockResolvedValue({ embedding: [] });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Invalid embedding response - empty embedding array"
      );
    });

    it("should preserve useful provider errors", async () => {
      mockEmbed.mockRejectedValue(new Error("Gateway unavailable"));

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Embedding generation failed: Gateway unavailable"
      );
    });
  });

  describe("generateEmbeddingsBatch", () => {
    it("should return empty array for empty input", async () => {
      await expect(generateEmbeddingsBatch([])).resolves.toEqual([]);
    });

    it("should generate embeddings for multiple texts", async () => {
      mockEmbed
        .mockResolvedValueOnce({ embedding: [0.1, 0.2] })
        .mockResolvedValueOnce({ embedding: [0.3, 0.4] });

      await expect(generateEmbeddingsBatch(["first", "second"])).resolves.toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      expect(mockEmbed).toHaveBeenCalledTimes(2);
    });
  });

  describe("generatePuzzleEmbedding", () => {
    it("should combine puzzle fields into one semantic value", async () => {
      mockEmbed.mockResolvedValue({ embedding: [0.5, 0.6] });

      await generatePuzzleEmbedding({
        puzzle: "CAT over WALK",
        answer: "catwalk",
        category: "phrases",
        puzzleType: "rebus",
      });

      expect(mockEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.stringContaining("Puzzle: CAT over WALK"),
        })
      );
      expect(mockEmbed.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          value: expect.stringContaining("Category: phrases"),
        })
      );
    });
  });

  describe("isEmbeddingAvailable", () => {
    it("should return true for the gateway provider", () => {
      expect(isEmbeddingAvailable()).toBe(true);
    });

    it("should return false for a non-gateway provider", () => {
      mockGetAIProvider.mockReturnValue({
        getName: jest.fn(() => "disabled"),
      });

      expect(isEmbeddingAvailable()).toBe(false);
    });

    it("should return false when provider discovery fails", () => {
      mockGetAIProvider.mockImplementationOnce(() => {
        throw new Error("No provider");
      });

      expect(isEmbeddingAvailable()).toBe(false);
    });
  });
});
