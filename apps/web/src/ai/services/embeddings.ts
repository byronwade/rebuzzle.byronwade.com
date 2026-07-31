/**
 * Embeddings Service — Vercel AI Gateway only
 */

import { embed } from "ai";
import { getAIProvider, getAiGateway, withRetry } from "../client";
import { AI_CONFIG } from "../config";

function getEmbeddingModel() {
  const embeddingModelId = AI_CONFIG.embeddings.gateway || "google/gemini-embedding-001";
  return getAiGateway().embeddingModel(embeddingModelId);
}

/**
 * Generate embedding for a text string via AI Gateway
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    return await withRetry(async () => {
      const model = getEmbeddingModel();
      const result = await embed({
        model,
        value: text,
      });

      if (!result.embedding || result.embedding.length === 0) {
        throw new Error("Invalid embedding response - empty embedding array");
      }

      return result.embedding;
    });
  } catch (error) {
    console.error("[Embeddings] Failed to generate embedding:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[], batchSize = 5): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}

/**
 * Generate embedding for a puzzle (combines display, answer, category).
 */
export async function generatePuzzleEmbedding(puzzle: {
  puzzle: string;
  answer: string;
  category?: string;
  puzzleType?: string;
  explanation?: string;
}): Promise<number[]> {
  const textParts: string[] = [`Puzzle: ${puzzle.puzzle}`, `Answer: ${puzzle.answer}`];
  if (puzzle.category) textParts.push(`Category: ${puzzle.category}`);
  if (puzzle.puzzleType) textParts.push(`Type: ${puzzle.puzzleType}`);
  if (puzzle.explanation) textParts.push(`Explanation: ${puzzle.explanation}`);
  return generateEmbedding(textParts.join(". "));
}

/**
 * Check if embedding generation is available through the gateway.
 */
export function isEmbeddingAvailable(): boolean {
  try {
    return getAIProvider().getName() === "gateway";
  } catch (error) {
    console.error("[Embeddings] Error checking availability:", error);
    return false;
  }
}
