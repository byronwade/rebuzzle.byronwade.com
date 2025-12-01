/**
 * AI Response Caching System
 *
 * Caches AI responses to reduce costs and improve performance
 * Enhanced with semantic caching and AI SDK Tools cache integration
 */

import { createHash } from "crypto";
import { cosineSimilarity } from "@/db/utils/vector-operations";
import { AI_CONFIG } from "./config";
import { generateEmbedding } from "./services/embeddings";

/**
 * Cache entry with semantic embedding for similarity matching
 */
interface CacheEntry {
  value: unknown;
  expires: number;
  embedding?: number[]; // For semantic caching
  key: string;
}

/**
 * In-memory cache with TTL and semantic caching
 */
class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private semanticCache: CacheEntry[] = []; // For similarity matching
  private cleanupInterval: NodeJS.Timeout;
  private semanticSimilarityThreshold = 0.85; // Threshold for semantic cache hits

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        // Remove from semantic cache
        const index = this.semanticCache.findIndex((e) => e.key === key);
        if (index >= 0) {
          this.semanticCache.splice(index, 1);
        }
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      const index = this.semanticCache.findIndex((e) => e.key === key);
      if (index >= 0) {
        this.semanticCache.splice(index, 1);
      }
      return null;
    }

    return entry.value as T;
  }

  /**
   * Get cache entry by semantic similarity
   * Useful for finding similar cached results
   */
  async getBySimilarity<T>(
    queryEmbedding: number[],
    operation: string
  ): Promise<{ value: T; similarity: number } | null> {
    // Filter semantic cache entries by operation
    const operationEntries = this.semanticCache.filter((entry) =>
      entry.key.includes(operation)
    );

    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

    for (const entry of operationEntries) {
      if (!entry.embedding || entry.expires < Date.now()) continue;

      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      if (
        similarity >= this.semanticSimilarityThreshold &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = { entry, similarity };
      }
    }

    return bestMatch
      ? { value: bestMatch.entry.value as T, similarity: bestMatch.similarity }
      : null;
  }

  set(
    key: string,
    value: unknown,
    ttlSeconds: number,
    embedding?: number[]
  ): void {
    const entry: CacheEntry = {
      value,
      expires: Date.now() + ttlSeconds * 1000,
      embedding,
      key,
    };

    this.cache.set(key, entry);

    // Add to semantic cache if embedding provided
    if (embedding) {
      const existingIndex = this.semanticCache.findIndex((e) => e.key === key);
      if (existingIndex >= 0) {
        this.semanticCache[existingIndex] = entry;
      } else {
        this.semanticCache.push(entry);
      }
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
    // Remove from semantic cache
    const index = this.semanticCache.findIndex((e) => e.key === key);
    if (index >= 0) {
      this.semanticCache.splice(index, 1);
    }
  }

  clear(): void {
    this.cache.clear();
    this.semanticCache = [];
  }

  size(): number {
    return this.cache.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Singleton cache instance
let cacheInstance: InMemoryCache | null = null;

function getCache(): InMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache();
  }
  return cacheInstance;
}

/**
 * Generate cache key from parameters
 */
function generateCacheKey(
  operation: string,
  params: Record<string, unknown>
): string {
  const data = JSON.stringify({ operation, params });
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Cache wrapper for AI operations with semantic caching support
 */
export async function withCache<T>(
  operation: string,
  params: Record<string, unknown>,
  ttlSeconds: number,
  fn: () => Promise<T>,
  options?: {
    enableSemanticCache?: boolean;
    semanticCacheKey?: string; // Text to generate embedding from for semantic matching
  }
): Promise<T> {
  if (!AI_CONFIG.cache.enabled) {
    return await fn();
  }

  const cache = getCache();
  const key = generateCacheKey(operation, params);

  // Try to get from cache (exact match)
  const cached = cache.get<T>(key);
  if (cached !== null) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AI Cache] HIT (exact) for ${operation}`);
    }
    return cached;
  }

  // Try semantic cache if enabled
  if (options?.enableSemanticCache && options?.semanticCacheKey) {
    try {
      const queryEmbedding = await generateEmbedding(options.semanticCacheKey);
      const semanticMatch = await cache.getBySimilarity<T>(
        queryEmbedding,
        operation
      );

      if (semanticMatch && semanticMatch.similarity >= 0.85) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[AI Cache] HIT (semantic, similarity: ${semanticMatch.similarity.toFixed(2)}) for ${operation}`
          );
        }
        return semanticMatch.value;
      }
    } catch (error) {
      // If semantic cache fails, fall through to normal execution
      console.warn("[AI Cache] Semantic cache lookup failed:", error);
    }
  }

  // Cache miss - execute function
  if (process.env.NODE_ENV === "development") {
    console.log(`[AI Cache] MISS for ${operation}`);
  }

  const result = await fn();

  // Generate embedding for semantic caching if enabled
  let embedding: number[] | undefined;
  if (options?.enableSemanticCache && options?.semanticCacheKey) {
    try {
      embedding = await generateEmbedding(options.semanticCacheKey);
    } catch (error) {
      console.warn("[AI Cache] Failed to generate embedding for cache:", error);
    }
  }

  // Store in cache
  cache.set(key, result, ttlSeconds, embedding);

  return result;
}

/**
 * Cached puzzle generation
 */
export async function cachedPuzzleGeneration<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache(
    "puzzle_generation",
    params,
    AI_CONFIG.cache.ttl.puzzleGeneration,
    fn
  );
}

/**
 * Cached answer validation
 */
export async function cachedValidation<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache("validation", params, AI_CONFIG.cache.ttl.validation, fn);
}

/**
 * Cached hint generation
 */
export async function cachedHints<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache("hints", params, AI_CONFIG.cache.ttl.hints, fn);
}

/**
 * Clear all AI caches
 */
export function clearAICache(): void {
  const cache = getCache();
  cache.clear();
  console.log("[AI Cache] Cleared all caches");
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  semanticCacheSize: number;
  enabled: boolean;
} {
  const cache = getCache();
  const semanticCache = (cache as any).semanticCache as
    | CacheEntry[]
    | undefined;
  return {
    size: cache.size(),
    semanticCacheSize: semanticCache?.length || 0,
    enabled: AI_CONFIG.cache.enabled,
  };
}

/**
 * Destroy cache instance (cleanup)
 */
export function destroyCache(): void {
  if (cacheInstance) {
    cacheInstance.destroy();
    cacheInstance = null;
  }
}
