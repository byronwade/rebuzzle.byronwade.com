/**
 * AI-Powered Answer Validation Service
 *
 * Intelligent answer checking with fuzzy matching, typo tolerance,
 * and semantic understanding. Uses AI for lenient validation that
 * accepts semantic equivalents, contractions, and word order variations.
 */

import { z } from "zod";
import { generateAIObject, withRetry } from "../client";
import { AI_CONFIG } from "../config";
import {
  ANSWER_VALIDATION_CONFIG,
  getAIValidationSystemPrompt,
  getAIValidationUserPrompt,
  matchWithWordOrderTolerance,
  normalizeForComparison,
} from "../config/answer-validation";

// =============================================================================
// STRING SIMILARITY (Levenshtein Distance)
// =============================================================================

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1]!;
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]!) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length]!;
}

// =============================================================================
// QUICK VALIDATION (No AI)
// =============================================================================

/**
 * Normalize answer for basic comparison (legacy compatibility)
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "") // Remove spaces
    .trim();
}

/**
 * Quick validation without AI - for fast initial checks
 */
export function quickValidateAnswer(
  guess: string,
  correctAnswer: string
): {
  isCorrect: boolean;
  similarity: number;
  normalized: {
    guess: string;
    answer: string;
  };
} {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(correctAnswer);

  return {
    isCorrect: normalizedGuess === normalizedAnswer,
    similarity: similarity(normalizedGuess, normalizedAnswer),
    normalized: {
      guess: normalizedGuess,
      answer: normalizedAnswer,
    },
  };
}

// =============================================================================
// AI VALIDATION
// =============================================================================

const ValidationSchema = z.object({
  isCorrect: z.boolean().describe("Whether the guess is semantically correct"),
  confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
  reasoning: z.string().describe("Explanation of the decision"),
  suggestions: z.array(z.string()).optional().describe("Suggestions if incorrect"),
});

/**
 * Smart validation with AI for semantic matching.
 * Uses lenient rules from config to accept equivalent answers.
 */
export async function smartValidateAnswer(params: {
  guess: string;
  correctAnswer: string;
  puzzleContext?: string;
  explanation?: string;
}): Promise<{
  isCorrect: boolean;
  confidence: number;
  reasoning: string;
  suggestions?: string[];
}> {
  const system = getAIValidationSystemPrompt();
  const prompt = getAIValidationUserPrompt(
    params.guess,
    params.correctAnswer,
    params.puzzleContext
  );

  return await withRetry(
    async () =>
      await generateAIObject({
        prompt,
        system,
        schema: ValidationSchema,
        temperature: AI_CONFIG.generation.temperature.factual,
        modelType: "fast",
      })
  );
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate answer with AI-powered semantic matching.
 *
 * Validation flow:
 * 1. Normalize and expand contractions
 * 2. Check for exact match after normalization
 * 3. Check word order variations
 * 4. Quick fuzzy check (95%+ = accept)
 * 5. AI validation for semantic equivalence
 * 6. Fallback to fuzzy if AI fails
 */
export async function validateAnswer(params: {
  guess: string;
  correctAnswer: string;
  puzzleContext?: string;
  explanation?: string;
  useAI?: boolean;
}): Promise<{
  isCorrect: boolean;
  confidence: number;
  method: "exact" | "fuzzy" | "ai" | "normalized";
  reasoning?: string;
  suggestions?: string[];
}> {
  const config = ANSWER_VALIDATION_CONFIG;

  // Step 1: Normalize with contraction expansion
  const normalizedGuess = normalizeForComparison(params.guess, config);
  const normalizedAnswer = normalizeForComparison(params.correctAnswer, config);

  // Step 2: Exact match after normalization (handles contractions)
  if (normalizedGuess === normalizedAnswer) {
    return {
      isCorrect: true,
      confidence: 1.0,
      method: "normalized",
      reasoning: "Exact match after normalization",
    };
  }

  // Step 3: Word order tolerance check
  if (matchWithWordOrderTolerance(params.guess, params.correctAnswer, config)) {
    return {
      isCorrect: true,
      confidence: 0.95,
      method: "normalized",
      reasoning: "Same words in different order",
    };
  }

  // Step 4: Quick fuzzy check
  const quick = quickValidateAnswer(params.guess, params.correctAnswer);

  // Near-exact match (98%+) - skip AI
  if (quick.similarity >= config.quickAcceptThreshold) {
    return {
      isCorrect: true,
      confidence: quick.similarity,
      method: "exact",
      reasoning: "Near-exact match",
    };
  }

  // Very close match (95%+) - likely typo
  if (quick.similarity >= 0.95) {
    return {
      isCorrect: true,
      confidence: quick.similarity,
      method: "fuzzy",
      reasoning: "Close enough to correct answer (minor typo)",
    };
  }

  // Step 5: AI validation (always use if enabled, with timeout)
  const shouldUseAI =
    config.alwaysUseAI ||
    (params.useAI !== false && quick.similarity >= config.aiMinimumSimilarity);

  if (shouldUseAI) {
    try {
      // Race AI call against timeout
      const aiResult = await Promise.race([
        smartValidateAnswer({
          guess: params.guess,
          correctAnswer: params.correctAnswer,
          puzzleContext: params.puzzleContext,
          explanation: params.explanation,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI validation timeout")), config.aiTimeoutMs)
        ),
      ]);

      return {
        ...aiResult,
        method: "ai",
      };
    } catch (error) {
      console.error("[AI Validation] Failed, falling back to fuzzy:", error);
      // Fall through to fuzzy fallback
    }
  }

  // Step 6: Fallback - not correct
  return {
    isCorrect: false,
    confidence: quick.similarity,
    method: "fuzzy",
    suggestions:
      quick.similarity > 0.5
        ? [
            "Check your spelling",
            `You're close! The answer has ${params.correctAnswer.length} letters`,
          ]
        : undefined,
  };
}

// =============================================================================
// FEEDBACK GENERATION
// =============================================================================

/**
 * Generate helpful feedback for wrong answers
 */
export async function generateFeedback(params: {
  guess: string;
  correctAnswer: string;
  similarity: number;
  attemptsLeft: number;
}): Promise<string> {
  const attempts = params.attemptsLeft === 1 ? "attempt" : "attempts";

  // Very different answer
  if (params.similarity < 0.3) {
    return `Not quite! ${params.attemptsLeft} ${attempts} remaining.`;
  }

  // Somewhat close
  if (params.similarity < 0.7) {
    const letterDiff = Math.abs(params.guess.length - params.correctAnswer.length);
    if (letterDiff > 3) {
      return `Getting warmer, but check the length! ${params.attemptsLeft} ${attempts} left.`;
    }
    return `You're on the right track! ${params.attemptsLeft} ${attempts} remaining.`;
  }

  // Very close
  return `So close! Check your spelling. ${params.attemptsLeft} ${attempts} left.`;
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

/**
 * Batch validate multiple guesses (for analysis)
 */
export async function batchValidate(params: {
  guesses: Array<{ guess: string; correctAnswer: string }>;
}): Promise<Array<{ guess: string; isCorrect: boolean; similarity: number }>> {
  return params.guesses.map(({ guess, correctAnswer }) => {
    const result = quickValidateAnswer(guess, correctAnswer);
    return {
      guess,
      isCorrect: result.isCorrect,
      similarity: result.similarity,
    };
  });
}
