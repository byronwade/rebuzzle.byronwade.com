/**
 * Game Logic - Answer Validation
 *
 * Uses AI-powered semantic validation to accept equivalent answers.
 * Handles contractions, word order variations, and minor typos.
 */

import { validateAnswer } from "@/ai/services/answer-validation";

/**
 * Check if guess matches answer using AI-powered semantic validation.
 *
 * Accepts:
 * - Contractions: "you're" = "you are"
 * - Word order variations: "Time flies when having fun" = "When having fun time flies"
 * - Minor typos (1-2 characters)
 * - Capitalization and punctuation differences
 */
export async function checkGuess(
  guess: string,
  answer: string
): Promise<{
  correct: boolean;
  normalizedGuess: string;
  normalizedAnswer: string;
  similarity: number;
  exactMatch: boolean;
  method?: string;
  reasoning?: string;
}> {
  const result = await validateAnswer({
    guess,
    correctAnswer: answer,
  });

  return {
    correct: result.isCorrect,
    normalizedGuess: guess.toLowerCase().trim(),
    normalizedAnswer: answer.toLowerCase().trim(),
    similarity: result.confidence,
    exactMatch: result.method === "exact" || result.method === "normalized",
    method: result.method,
    reasoning: result.reasoning,
  };
}
