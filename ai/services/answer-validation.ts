/**
 * AI-Powered Answer Validation Service
 *
 * Intelligent answer checking with fuzzy matching, typo tolerance,
 * and semantic understanding
 */

import { z } from "zod"
import { generateAIObject, generateAIText, withRetry } from "../client"
import { AI_CONFIG } from "../config"

// Simple string similarity (Levenshtein distance)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]!
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]!) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]!
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "") // Remove spaces
    .trim()
}

/**
 * Quick validation (no AI)
 */
export function quickValidateAnswer(guess: string, correctAnswer: string): {
  isCorrect: boolean
  similarity: number
  normalized: {
    guess: string
    answer: string
  }
} {
  const normalizedGuess = normalizeAnswer(guess)
  const normalizedAnswer = normalizeAnswer(correctAnswer)

  return {
    isCorrect: normalizedGuess === normalizedAnswer,
    similarity: similarity(normalizedGuess, normalizedAnswer),
    normalized: {
      guess: normalizedGuess,
      answer: normalizedAnswer,
    },
  }
}

/**
 * Smart validation with AI (for close matches)
 */
const ValidationSchema = z.object({
  isCorrect: z.boolean().describe("Whether the guess is semantically correct"),
  confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
  reasoning: z.string().describe("Explanation of the decision"),
  suggestions: z.array(z.string()).optional().describe("Suggestions if incorrect"),
})

export async function smartValidateAnswer(params: {
  guess: string
  correctAnswer: string
  puzzleContext?: string
  explanation?: string
}): Promise<{
  isCorrect: boolean
  confidence: number
  reasoning: string
  suggestions?: string[]
}> {
  const system = `You are an expert at validating puzzle answers with understanding of:
- Common misspellings and typos
- Alternative phrasings
- Singular/plural variations
- British vs American spelling
- Abbreviations and contractions
- Semantic equivalence

Be lenient with minor variations but strict with wrong answers.`

  const prompt = `Validate if this guess is correct for a rebus puzzle:

Correct Answer: "${params.correctAnswer}"
Player's Guess: "${params.guess}"
${params.puzzleContext ? `Puzzle: "${params.puzzleContext}"` : ""}
${params.explanation ? `Explanation: "${params.explanation}"` : ""}

Consider:
1. Are they semantically equivalent?
2. Is it just a typo or misspelling?
3. Is it an acceptable variation?
4. Should we accept it as correct?

Be fair but accurate.`

  return await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: ValidationSchema,
      temperature: AI_CONFIG.generation.temperature.factual,
      modelType: "fast",
    })
  })
}

/**
 * Validate answer with fallback to AI
 */
export async function validateAnswer(params: {
  guess: string
  correctAnswer: string
  puzzleContext?: string
  explanation?: string
  useAI?: boolean
}): Promise<{
  isCorrect: boolean
  confidence: number
  method: "exact" | "fuzzy" | "ai"
  reasoning?: string
  suggestions?: string[]
}> {
  // First try quick validation
  const quick = quickValidateAnswer(params.guess, params.correctAnswer)

  // Exact match
  if (quick.isCorrect) {
    return {
      isCorrect: true,
      confidence: 1.0,
      method: "exact",
    }
  }

  // Very close match (95%+ similarity)
  if (quick.similarity >= 0.95) {
    return {
      isCorrect: true,
      confidence: quick.similarity,
      method: "fuzzy",
      reasoning: "Close enough to correct answer (minor typo)",
    }
  }

  // If AI is enabled and answer is somewhat close, use AI validation
  if (params.useAI && quick.similarity >= 0.7) {
    try {
      const aiResult = await smartValidateAnswer({
        guess: params.guess,
        correctAnswer: params.correctAnswer,
        puzzleContext: params.puzzleContext,
        explanation: params.explanation,
      })

      return {
        ...aiResult,
        method: "ai",
      }
    } catch (error) {
      console.error("[AI Validation] Failed, falling back to fuzzy:", error)
    }
  }

  // Not correct
  return {
    isCorrect: false,
    confidence: quick.similarity,
    method: "fuzzy",
    suggestions: quick.similarity > 0.5
      ? ["Check your spelling", `You're close! The answer has ${params.correctAnswer.length} letters`]
      : undefined,
  }
}

/**
 * Generate helpful feedback for wrong answers
 */
export async function generateFeedback(params: {
  guess: string
  correctAnswer: string
  similarity: number
  attemptsLeft: number
}): Promise<string> {
  // Simple feedback for very different answers
  if (params.similarity < 0.3) {
    return `Not quite! ${params.attemptsLeft} ${params.attemptsLeft === 1 ? "attempt" : "attempts"} remaining.`
  }

  // Closer feedback
  if (params.similarity < 0.7) {
    const letterDiff = Math.abs(params.guess.length - params.correctAnswer.length)
    if (letterDiff > 3) {
      return `Getting warmer, but check the length! ${params.attemptsLeft} ${params.attemptsLeft === 1 ? "attempt" : "attempts"} left.`
    }
    return `You're on the right track! ${params.attemptsLeft} ${params.attemptsLeft === 1 ? "attempt" : "attempts"} remaining.`
  }

  // Very close
  return `So close! Check your spelling. ${params.attemptsLeft} ${params.attemptsLeft === 1 ? "attempt" : "attempts"} left.`
}

/**
 * Batch validate multiple guesses (for analysis)
 */
export async function batchValidate(params: {
  guesses: Array<{ guess: string; correctAnswer: string }>
}): Promise<Array<{ guess: string; isCorrect: boolean; similarity: number }>> {
  return params.guesses.map(({ guess, correctAnswer }) => {
    const result = quickValidateAnswer(guess, correctAnswer)
    return {
      guess,
      isCorrect: result.isCorrect,
      similarity: result.similarity,
    }
  })
}
