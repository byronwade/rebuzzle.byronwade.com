/**
 * Fuzzy String Matching Utility
 *
 * Provides fuzzy matching for answer validation, allowing slight spelling variations
 * Optimized with LRU cache and early exit optimizations
 */

/**
 * Simple LRU Cache implementation for memoization
 */
class LRUCache<K, V> {
  private readonly cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
      }
    }
    return;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache size constants
const SIMILARITY_CACHE_SIZE = 100;
const NORMALIZE_CACHE_SIZE = 200;
const LENGTH_DIFF_THRESHOLD = 0.5;
const PERFECT_SIMILARITY = 100;
const DEFAULT_FUZZY_THRESHOLD = 85;

// Global cache for similarity calculations
const similarityCache = new LRUCache<string, number>(SIMILARITY_CACHE_SIZE);

/**
 * Create cache key from two strings
 */
function createCacheKey(str1: string, str2: string): string {
  // Sort strings to ensure same key regardless of order
  return str1 < str2 ? `${str1}::${str2}` : `${str2}::${str1}`;
}

/**
 * Calculate Levenshtein distance between two strings
 * Optimized with early exits and memoization
 */
function levenshteinDistance(str1: string, str2: string): number {
  // Early exit: identical strings
  if (str1 === str2) {
    return 0;
  }

  // Early exit: one string is empty
  if (str1.length === 0) {
    return str2.length;
  }
  if (str2.length === 0) {
    return str1.length;
  }

  // Early exit: if length difference is too large, use simpler calculation
  const lengthDiff = Math.abs(str1.length - str2.length);
  const maxLength = Math.max(str1.length, str2.length);
  if (lengthDiff > maxLength * LENGTH_DIFF_THRESHOLD) {
    // If strings are very different in length, return max length
    return maxLength;
  }

  return computeLevenshtein(str1, str2);
}

/**
 * Compute Levenshtein distance using dynamic programming
 * Separated to reduce complexity
 */
function computeLevenshtein(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Use space-optimized version (only need previous row)
  const prevRow: number[] = new Array(n + 1)
    .fill(0)
    .map((_, i) => i);

  for (let i = 1; i <= m; i++) {
    const currRow: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const prevJ = prevRow[j] ?? Number.POSITIVE_INFINITY;
      const prevJMinus1 = prevRow[j - 1] ?? Number.POSITIVE_INFINITY;
      const currJMinus1 = currRow[j - 1] ?? Number.POSITIVE_INFINITY;

      if (str1[i - 1] === str2[j - 1]) {
        currRow[j] = prevJMinus1;
      } else {
        const deletion = prevJ + 1;
        const insertion = currJMinus1 + 1;
        const substitution = prevJMinus1 + 1;
        currRow[j] = Math.min(deletion, insertion, substitution);
      }
    }
    prevRow.splice(0, prevRow.length, ...currRow);
  }

  const result = prevRow[n];
  return result ?? Math.max(str1.length, str2.length);
}

/**
 * Normalize string for comparison (lowercase, trim, remove extra spaces)
 * Memoized for performance
 */
const normalizeCache = new LRUCache<string, string>(NORMALIZE_CACHE_SIZE);

export function normalizeString(str: string): string {
  // Check cache first
  const cached = normalizeCache.get(str);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " "); // Normalize whitespace

  normalizeCache.set(str, normalized);
  return normalized;
}

/**
 * Calculate similarity percentage between two strings
 * Optimized with caching and early exits
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Early exit: identical strings
  if (str1 === str2) {
    return PERFECT_SIMILARITY;
  }

  // Normalize strings
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  // Early exit: identical after normalization
  if (normalized1 === normalized2) {
    return PERFECT_SIMILARITY;
  }

  // Check cache
  const cacheKey = createCacheKey(normalized1, normalized2);
  const cached = similarityCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) {
    similarityCache.set(cacheKey, PERFECT_SIMILARITY);
    return PERFECT_SIMILARITY;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const similarity = ((maxLength - distance) / maxLength) * PERFECT_SIMILARITY;

  // Cache result
  similarityCache.set(cacheKey, similarity);
  return similarity;
}

/**
 * Check if two strings match with fuzzy tolerance
 */
export function fuzzyMatch(
  input: string,
  target: string,
  threshold = DEFAULT_FUZZY_THRESHOLD
): boolean {
  const similarity = calculateSimilarity(input, target);
  return similarity >= threshold;
}

/**
 * Check if input contains the target word/phrase with fuzzy matching
 */
export function containsFuzzyMatch(
  input: string,
  target: string,
  threshold = DEFAULT_FUZZY_THRESHOLD
): boolean {
  const normalizedInput = normalizeString(input);
  const normalizedTarget = normalizeString(target);

  // Exact match
  if (normalizedInput.includes(normalizedTarget)) {
    return true;
  }

  // Check if input is close enough to target
  return fuzzyMatch(input, target, threshold);
}

/**
 * Validate individual words in a multi-word answer
 * Returns array of booleans indicating which words are correct
 * Optimized with Set for O(1) exact match lookups
 */
export function validateWords(
  input: string,
  correctAnswer: string,
  threshold = DEFAULT_FUZZY_THRESHOLD
): boolean[] {
  // Pre-normalize once
  const normalizedInput = normalizeString(input);
  const normalizedAnswer = normalizeString(correctAnswer);

  const inputWords = normalizedInput.split(" ").filter((w) => w.length > 0);
  const answerWords = normalizedAnswer.split(" ").filter((w) => w.length > 0);

  // Create Set for O(1) exact match lookups
  const answerWordsSet = new Set(answerWords);

  // Pre-normalize answer words for fuzzy matching
  const normalizedAnswerWords = answerWords.map((w) => normalizeString(w));

  return inputWords.map((inputWord) => {
    const normalizedInputWord = normalizeString(inputWord);

    // Early exit: exact match (O(1) lookup)
    if (answerWordsSet.has(normalizedInputWord)) {
      return true;
    }

    // Fallback to fuzzy matching only if no exact match
    return normalizedAnswerWords.some((answerWord) =>
      fuzzyMatch(normalizedInputWord, answerWord, threshold)
    );
  });
}
