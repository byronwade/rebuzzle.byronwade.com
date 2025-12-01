/**
 * Semantic Search Service
 *
 * Provides semantic search capabilities using vector embeddings
 * to find similar puzzles and enable personalized recommendations
 */

import type { WithId } from "mongodb";
import type { Puzzle } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "@/db/operations";
import { cosineSimilarity } from "@/db/utils/vector-operations";
import { generateEmbedding, generatePuzzleEmbedding } from "./embeddings";

/**
 * Find puzzles similar to a given puzzle using semantic similarity
 * @param puzzleId ID of the puzzle to find similar ones for
 * @param limit Maximum number of similar puzzles to return
 * @param minSimilarity Minimum similarity threshold (0-1, default: 0.7)
 * @returns Array of similar puzzles with similarity scores
 */
export async function findSimilarPuzzles(
  puzzleId: string,
  limit = 5,
  minSimilarity = 0.7
): Promise<Array<{ puzzle: Puzzle; similarity: number }>> {
  // Get the reference puzzle
  const referencePuzzle = await puzzleOps.findById(puzzleId);
  if (!referencePuzzle) {
    throw new Error(`Puzzle not found: ${puzzleId}`);
  }

  // Get or generate embedding for reference puzzle
  let referenceEmbedding: number[];
  if (referencePuzzle.embedding && referencePuzzle.embedding.length > 0) {
    referenceEmbedding = referencePuzzle.embedding;
  } else {
    // Generate embedding if not present
    referenceEmbedding = await generatePuzzleEmbedding({
      puzzle: referencePuzzle.puzzle,
      answer: referencePuzzle.answer,
      category: referencePuzzle.category,
      puzzleType: referencePuzzle.puzzleType,
      explanation: referencePuzzle.explanation,
    });

    // Save embedding back to database
    await updatePuzzleEmbedding(puzzleId, referenceEmbedding);
  }

  // Get all puzzles with embeddings (excluding the reference puzzle)
  const collection = getCollection<Puzzle>("puzzles");
  const puzzles: WithId<Puzzle>[] = await collection
    .find({
      active: true,
      id: { $ne: puzzleId },
      embedding: { $exists: true, $ne: null } as any,
    })
    .toArray();

  if (puzzles.length === 0) {
    return [];
  }

  // Calculate similarities
  const similarities = puzzles
    .map((puzzle) => {
      if (!puzzle.embedding || puzzle.embedding.length === 0) {
        return null;
      }

      const similarity = cosineSimilarity(referenceEmbedding, puzzle.embedding);

      return {
        puzzle,
        similarity,
      };
    })
    .filter(
      (item): item is { puzzle: WithId<Puzzle>; similarity: number } =>
        item !== null && item.similarity >= minSimilarity
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

/**
 * Search puzzles by semantic concept
 * @param concept Text description of the concept to search for
 * @param limit Maximum number of results
 * @param minSimilarity Minimum similarity threshold
 * @returns Array of matching puzzles with similarity scores
 */
export async function searchPuzzlesByConcept(
  concept: string,
  limit = 10,
  minSimilarity = 0.6
): Promise<Array<{ puzzle: Puzzle; similarity: number }>> {
  // Generate embedding for the concept
  const conceptEmbedding = await generateEmbedding(concept);

  // Get all puzzles with embeddings
  const collection = getCollection<Puzzle>("puzzles");
  const puzzles = await collection
    .find({
      active: true,
      embedding: { $exists: true, $ne: null } as any,
    })
    .toArray();

  if (puzzles.length === 0) {
    return [];
  }

  // Calculate similarities
  const similarities = puzzles
    .map((puzzle) => {
      if (!puzzle.embedding || puzzle.embedding.length === 0) {
        return null;
      }

      const similarity = cosineSimilarity(conceptEmbedding, puzzle.embedding);

      return {
        puzzle,
        similarity,
      };
    })
    .filter(
      (item): item is { puzzle: WithId<Puzzle>; similarity: number } =>
        item !== null && item.similarity >= minSimilarity
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

/**
 * Get personalized puzzle recommendations based on user history
 * @param userId User ID
 * @param limit Maximum number of recommendations
 * @returns Array of recommended puzzles with scores
 */
export async function recommendPuzzlesByUserHistory(
  userId: string,
  limit = 10
): Promise<Array<{ puzzle: Puzzle; score: number; reason: string }>> {
  const { puzzleAttemptOps } = await import("@/db/operations");

  // Get user's puzzle history
  const attempts = await puzzleAttemptOps.getUserAttempts(userId, 50);

  if (attempts.length === 0) {
    // No history - return popular puzzles
    const activePuzzles = await puzzleOps.findActivePuzzles(limit);
    return activePuzzles.map((puzzle) => ({
      puzzle,
      score: 1.0,
      reason: "Popular puzzle",
    }));
  }

  // Find puzzles the user liked (completed successfully, spent reasonable time)
  const likedPuzzles = attempts.filter(
    (attempt) =>
      attempt.isCorrect &&
      attempt.timeSpentSeconds &&
      attempt.timeSpentSeconds > 30 && // Took time to solve (engaged)
      attempt.timeSpentSeconds < 600 && // But not too long (not frustrating)
      (!attempt.difficultyPerception || attempt.difficultyPerception <= 7) // Not too difficult
  );

  if (likedPuzzles.length === 0) {
    // No clear preferences - return diverse puzzles
    const activePuzzles = await puzzleOps.findActivePuzzles(limit);
    return activePuzzles.map((puzzle) => ({
      puzzle,
      score: 1.0,
      reason: "Diverse puzzle selection",
    }));
  }

  // Get embeddings for liked puzzles
  const likedPuzzleIds = Array.from(
    new Set(likedPuzzles.map((a) => a.puzzleId))
  ).slice(0, 5); // Use top 5 liked puzzles

  const collection = getCollection<Puzzle>("puzzles");
  const likedPuzzleDocs = await collection
    .find({
      id: { $in: likedPuzzleIds },
      embedding: { $exists: true, $ne: null } as any,
    })
    .toArray();

  if (likedPuzzleDocs.length === 0) {
    // No embeddings yet - return active puzzles
    const activePuzzles = await puzzleOps.findActivePuzzles(limit);
    return activePuzzles.map((puzzle) => ({
      puzzle,
      score: 1.0,
      reason: "Active puzzle",
    }));
  }

  // Calculate average embedding of liked puzzles (user preference vector)
  const embeddings = likedPuzzleDocs
    .map((p) => p.embedding)
    .filter((e): e is number[] => !!e && e.length > 0);

  if (embeddings.length === 0) {
    const activePuzzles = await puzzleOps.findActivePuzzles(limit);
    return activePuzzles.map((puzzle) => ({
      puzzle,
      score: 1.0,
      reason: "Active puzzle",
    }));
  }

  // Average the embeddings
  const dimension = embeddings[0]!.length;
  const avgEmbedding = new Array(dimension).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      avgEmbedding[i] += embedding[i];
    }
  }
  for (let i = 0; i < dimension; i++) {
    avgEmbedding[i] /= embeddings.length;
  }

  // Find puzzles similar to user preferences
  const allPuzzles = await collection
    .find({
      active: true,
      id: { $nin: likedPuzzleIds }, // Exclude already liked puzzles
      embedding: { $exists: true, $ne: null } as any,
    })
    .toArray();

  // Calculate recommendations
  const recommendations = allPuzzles
    .map((puzzle) => {
      if (!puzzle.embedding || puzzle.embedding.length === 0) {
        return null;
      }

      const similarity = cosineSimilarity(avgEmbedding, puzzle.embedding);

      return {
        puzzle,
        score: similarity,
        reason: "Similar to puzzles you enjoyed",
      };
    })
    .filter(
      (
        item
      ): item is { puzzle: WithId<Puzzle>; score: number; reason: string } =>
        item !== null
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return recommendations;
}

/**
 * Update puzzle embedding in database
 * @param puzzleId Puzzle ID
 * @param embedding Vector embedding
 */
async function updatePuzzleEmbedding(
  puzzleId: string,
  embedding: number[]
): Promise<void> {
  const collection = getCollection<Puzzle>("puzzles");
  await collection.updateOne({ id: puzzleId }, { $set: { embedding } });
}
