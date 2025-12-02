/**
 * Vector Operations Utility
 *
 * Helper functions for vector similarity calculations and operations
 */

/**
 * Calculate cosine similarity between two vectors
 * @param vectorA First vector
 * @param vectorB Second vector
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same length. Got ${vectorA.length} and ${vectorB.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const valA = vectorA[i] ?? 0;
    const valB = vectorB[i] ?? 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Normalize a vector to unit length
 * @param vector Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Calculate Euclidean distance between two vectors
 * @param vectorA First vector
 * @param vectorB Second vector
 * @returns Distance (lower = more similar)
 */
export function euclideanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same length. Got ${vectorA.length} and ${vectorB.length}`
    );
  }

  let sumSquaredDiffs = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const valA = vectorA[i] ?? 0;
    const valB = vectorB[i] ?? 0;
    const diff = valA - valB;
    sumSquaredDiffs += diff * diff;
  }

  return Math.sqrt(sumSquaredDiffs);
}

/**
 * Calculate dot product of two vectors
 * @param vectorA First vector
 * @param vectorB Second vector
 * @returns Dot product
 */
export function dotProduct(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same length. Got ${vectorA.length} and ${vectorB.length}`
    );
  }

  return vectorA.reduce((sum, val, i) => sum + val * (vectorB[i] ?? 0), 0);
}

/**
 * Find the top K most similar vectors using cosine similarity
 * @param queryVector Query vector
 * @param vectors Array of vectors to search
 * @param k Number of results to return
 * @returns Array of indices and similarity scores, sorted by similarity
 */
export function findTopKSimilar(
  queryVector: number[],
  vectors: number[][],
  k: number
): Array<{ index: number; similarity: number }> {
  const similarities = vectors.map((vector, index) => ({
    index,
    similarity: cosineSimilarity(queryVector, vector),
  }));

  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}
