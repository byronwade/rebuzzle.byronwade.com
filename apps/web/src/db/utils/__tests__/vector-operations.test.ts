/**
 * Vector Operations Unit Tests
 */

import { describe, expect, it } from "@jest/globals";
import {
  cosineSimilarity,
  dotProduct,
  euclideanDistance,
  findTopKSimilar,
  normalizeVector,
} from "../vector-operations";

describe("Vector Operations", () => {
  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
    });

    it("should calculate similarity correctly", () => {
      const v1 = [1, 2, 3];
      const v2 = [2, 4, 6]; // Same direction, different magnitude
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1, 5);
    });

    it("should throw error for different dimension vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];
      expect(() => cosineSimilarity(v1, v2)).toThrow();
    });

    it("should handle zero vectors", () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });

    it("should handle negative values", () => {
      const v1 = [-1, -2, -3];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 5);
    });
  });

  describe("normalizeVector", () => {
    it("should normalize a vector to unit length", () => {
      const v = [3, 4, 0]; // Length 5
      const normalized = normalizeVector(v);
      const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("should handle zero vector", () => {
      const v = [0, 0, 0];
      const normalized = normalizeVector(v);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it("should preserve direction", () => {
      const v = [1, 2, 3];
      const normalized = normalizeVector(v);
      // All components should have same ratio
      expect(normalized[0] / normalized[1]).toBeCloseTo(v[0] / v[1], 5);
    });
  });

  describe("euclideanDistance", () => {
    it("should return 0 for identical vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2, 3];
      expect(euclideanDistance(v1, v2)).toBe(0);
    });

    it("should calculate distance correctly", () => {
      const v1 = [0, 0, 0];
      const v2 = [3, 4, 0];
      expect(euclideanDistance(v1, v2)).toBe(5);
    });

    it("should throw error for different dimension vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];
      expect(() => euclideanDistance(v1, v2)).toThrow();
    });
  });

  describe("dotProduct", () => {
    it("should calculate dot product correctly", () => {
      const v1 = [1, 2, 3];
      const v2 = [4, 5, 6];
      expect(dotProduct(v1, v2)).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    });

    it("should return 0 for orthogonal vectors", () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(dotProduct(v1, v2)).toBe(0);
    });

    it("should throw error for different dimension vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];
      expect(() => dotProduct(v1, v2)).toThrow();
    });
  });

  describe("findTopKSimilar", () => {
    it("should find top K most similar vectors", () => {
      const queryVector = [1, 0, 0];
      const vectors = [
        [1, 0, 0], // Should be rank 1 (identical)
        [0.9, 0.1, 0], // Should be rank 2
        [0.5, 0.5, 0], // Should be rank 3
        [0, 1, 0], // Should not be in top 3
      ];

      const result = findTopKSimilar(queryVector, vectors, 3);

      expect(result).toHaveLength(3);
      expect(result[0]?.index).toBe(0); // Most similar
      expect(result[0]?.similarity).toBeCloseTo(1, 5);
      expect(result[1]?.similarity).toBeGreaterThan(result[2]?.similarity);
    });

    it("should return empty array if K is 0", () => {
      const queryVector = [1, 0, 0];
      const vectors = [[1, 0, 0]];
      const result = findTopKSimilar(queryVector, vectors, 0);
      expect(result).toHaveLength(0);
    });

    it("should return all vectors if K is greater than vector count", () => {
      const queryVector = [1, 0, 0];
      const vectors = [
        [1, 0, 0],
        [0, 1, 0],
      ];
      const result = findTopKSimilar(queryVector, vectors, 10);
      expect(result).toHaveLength(2);
    });
  });
});
