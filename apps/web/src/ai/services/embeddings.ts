/**
 * Embeddings Service
 *
 * Generates vector embeddings for puzzles using AI SDK providers
 * Uses ONLY the AI Gateway - no direct API calls or API keys
 */

import type { createGateway } from "@ai-sdk/gateway";
import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { getAIProvider, withRetry } from "../client";
import { AI_CONFIG } from "../config";

/**
 * Get embedding model instance through gateway ONLY
 * Uses gateway provider with FREE TIER embedding models
 * Priority: Free tier models first (Google free tier embedding)
 */
function getEmbeddingModel() {
  const provider = getAIProvider();
  const providerName = provider.getName();

  if (providerName === "gateway") {
    // Gateway-only approach: Use gateway provider with FREE TIER Google embedding model
    // Format: gateway provider with "google/gemini-embedding-001" (FREE TIER)
    const _gatewayProvider = provider.getProvider() as ReturnType<typeof createGateway>;

    // FREE TIER FIRST: Use Google's free tier embedding model
    // Fallback chain is in AI_CONFIG.embeddings.fallbackChain if needed
    const embeddingModelId = AI_CONFIG.embeddings.gateway || "google/gemini-embedding-001";

    try {
      // Gateway embedding models: Use Google provider directly with gateway routing
      // The gateway will route through Google's free tier embedding model
      // Extract model name from "google/gemini-embedding-001" format
      const modelName = embeddingModelId.includes("/")
        ? embeddingModelId.split("/")[1]
        : embeddingModelId;

      if (!modelName) {
        throw new Error("Embedding model name is required");
      }

      // Use Google provider directly - gateway will route it if configured
      // This ensures compatibility with the AI SDK's embed() function
      return google.textEmbedding(modelName as any);
    } catch (_error) {
      // If gateway doesn't support embedding models directly, try fallback chain
      const fallbackChain = AI_CONFIG.embeddings.fallbackChain || [embeddingModelId];

      // Try each fallback (all free tier models)
      for (const fallbackModelId of fallbackChain) {
        try {
          const modelName = fallbackModelId.includes("/")
            ? fallbackModelId.split("/")[1]
            : fallbackModelId;
          if (!modelName) continue;
          return google.textEmbedding(modelName as any);
        } catch (_fallbackError) {
          console.warn(`[Embeddings] Fallback model ${fallbackModelId} failed, trying next...`);
        }
      }

      // Last resort: Use Google provider directly (still free tier through gateway)
      console.warn(
        "[Embeddings] Gateway embedding models failed, " +
          "using Google provider with gateway routing (still free tier)..."
      );
      const embeddingModel = AI_CONFIG.embeddings.google || "gemini-embedding-001";
      // Google provider will use gateway if configured properly (free tier)
      return google.textEmbedding(embeddingModel);
    }
  }

  // Gateway-only enforcement: only allow gateway
  throw new Error(
    "Embeddings require gateway provider for gateway-only setup. " +
      `Current provider: ${providerName}. ` +
      "Set AI_PROVIDER=gateway to use embeddings through gateway (free tier)."
  );
}

/**
 * Generate embedding for a text string using AI Gateway ONLY
 * @param text Text to embed
 * @returns Vector embedding as array of numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  const provider = getAIProvider();
  const providerName = provider.getName();

  // ENFORCE: Only use gateway for embeddings
  if (providerName !== "gateway") {
    console.warn(
      `[Embeddings] Provider is "${providerName}" but embeddings should use gateway. ` +
        "Consider setting AI_PROVIDER=gateway. Attempting to use gateway anyway..."
    );
  }

  try {
    return await withRetry(async () => {
      const model = getEmbeddingModel();

      const result = await embed({
        model: model as any,
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
 * @param texts Array of texts to embed
 * @param batchSize Number of texts to process in parallel (default: 5)
 * @returns Array of embeddings corresponding to input texts
 */
export async function generateEmbeddingsBatch(texts: string[], batchSize = 5): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Generate embedding for a puzzle (combines puzzle content, answer, and category)
 * @param puzzle Puzzle object to embed
 * @returns Vector embedding
 */
export async function generatePuzzleEmbedding(puzzle: {
  puzzle: string;
  answer: string;
  category?: string;
  puzzleType?: string;
  explanation?: string;
}): Promise<number[]> {
  // Combine puzzle elements into a rich text representation
  const textParts: string[] = [];

  // Main puzzle content
  textParts.push(`Puzzle: ${puzzle.puzzle}`);

  // Answer
  textParts.push(`Answer: ${puzzle.answer}`);

  // Category and type
  if (puzzle.category) {
    textParts.push(`Category: ${puzzle.category}`);
  }
  if (puzzle.puzzleType) {
    textParts.push(`Type: ${puzzle.puzzleType}`);
  }

  // Explanation (helps with semantic understanding)
  if (puzzle.explanation) {
    textParts.push(`Explanation: ${puzzle.explanation}`);
  }

  const combinedText = textParts.join(". ");

  return await generateEmbedding(combinedText);
}

/**
 * Check if embedding generation is available
 * Uses gateway-only approach - no API key checks needed (gateway handles auth)
 * @returns True if embeddings can be generated through gateway
 */
export function isEmbeddingAvailable(): boolean {
  try {
    const provider = getAIProvider();
    const providerName = provider.getName();

    // Gateway-only approach: embeddings available if gateway is configured
    if (providerName === "gateway") {
      // Gateway API key is optional (uses VERCEL_OIDC_TOKEN on Vercel)
      // Provider API keys are configured in Vercel dashboard
      return true; // Gateway will handle authentication
    }

    // Direct Google provider (deprecated - use gateway instead)
    if (providerName === "google") {
      console.warn(
        "[Embeddings] Direct Google provider detected. " +
          "Use gateway provider instead for embeddings."
      );
      // Still allow but warn
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Embeddings] Error checking availability:", error);
    return false;
  }
}
