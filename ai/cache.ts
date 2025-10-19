/**
 * AI Response Caching System
 *
 * Caches AI responses to reduce costs and improve performance
 */

import { createHash } from "crypto"
import { AI_CONFIG } from "./config"

/**
 * In-memory cache with TTL
 */
class InMemoryCache {
  private cache: Map<string, { value: unknown; expires: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key)
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  set(key: string, value: unknown, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.clear()
  }
}

// Singleton cache instance
let cacheInstance: InMemoryCache | null = null

function getCache(): InMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache()
  }
  return cacheInstance
}

/**
 * Generate cache key from parameters
 */
function generateCacheKey(operation: string, params: Record<string, unknown>): string {
  const data = JSON.stringify({ operation, params })
  return createHash("sha256").update(data).digest("hex")
}

/**
 * Cache wrapper for AI operations
 */
export async function withCache<T>(
  operation: string,
  params: Record<string, unknown>,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!AI_CONFIG.cache.enabled) {
    return await fn()
  }

  const cache = getCache()
  const key = generateCacheKey(operation, params)

  // Try to get from cache
  const cached = cache.get<T>(key)
  if (cached !== null) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AI Cache] HIT for ${operation}`)
    }
    return cached
  }

  // Cache miss - execute function
  if (process.env.NODE_ENV === "development") {
    console.log(`[AI Cache] MISS for ${operation}`)
  }

  const result = await fn()

  // Store in cache
  cache.set(key, result, ttlSeconds)

  return result
}

/**
 * Cached puzzle generation
 */
export async function cachedPuzzleGeneration<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache("puzzle_generation", params, AI_CONFIG.cache.ttl.puzzleGeneration, fn)
}

/**
 * Cached answer validation
 */
export async function cachedValidation<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache("validation", params, AI_CONFIG.cache.ttl.validation, fn)
}

/**
 * Cached hint generation
 */
export async function cachedHints<T>(
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return withCache("hints", params, AI_CONFIG.cache.ttl.hints, fn)
}

/**
 * Clear all AI caches
 */
export function clearAICache(): void {
  const cache = getCache()
  cache.clear()
  console.log("[AI Cache] Cleared all caches")
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  enabled: boolean
} {
  const cache = getCache()
  return {
    size: cache.size(),
    enabled: AI_CONFIG.cache.enabled,
  }
}

/**
 * Destroy cache instance (cleanup)
 */
export function destroyCache(): void {
  if (cacheInstance) {
    cacheInstance.destroy()
    cacheInstance = null
  }
}
