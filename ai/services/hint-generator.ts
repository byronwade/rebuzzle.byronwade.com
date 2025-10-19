/**
 * AI-Powered Hint Generation Service
 *
 * Generates progressive hints that guide players without giving away the answer
 */

import { z } from "zod"
import { generateAIObject, withRetry } from "../client"
import { AI_CONFIG } from "../config"

const HintsSchema = z.object({
  hints: z.array(z.object({
    level: z.number().min(1).max(5),
    text: z.string(),
    reveals: z.number().min(0).max(100).describe("Percentage of answer revealed (0-100)"),
  })).min(3).max(5),
})

/**
 * Generate progressive hints for a puzzle
 */
export async function generateHints(params: {
  puzzle: string
  answer: string
  explanation: string
  difficulty: number
  count?: number
}): Promise<Array<{
  level: number
  text: string
  reveals: number
}>> {
  const system = `You are an expert at creating progressive hints for rebus puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

PROGRESSION EXAMPLE:
Level 1 (10-20%): "Think about what you see in the morning"
Level 2 (30-40%): "The first element represents something bright in the sky"
Level 3 (50-60%): "Combine a celestial body with a garden plant"
Level 4 (70-80%): "It's a yellow flower that follows the sun"
Level 5 (90%): "This flower's name literally describes what it does"`

  const hintCount = params.count ?? 5

  const prompt = `Generate ${hintCount} progressive hints for this rebus puzzle:

Puzzle: "${params.puzzle}"
Answer: "${params.answer}"
Explanation: "${params.explanation}"
Difficulty: ${params.difficulty}/10

Create hints that gradually reveal the answer:
1. Very subtle (10-20% revealed)
2. Gentle nudge (30-40% revealed)
3. Clear direction (50-60% revealed)
4. Almost there (70-80% revealed)
5. Final push (90% revealed, but not the answer itself)

Each hint should be helpful and lead the player closer to the solution.`

  const result = await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: HintsSchema,
      temperature: AI_CONFIG.generation.temperature.balanced,
      modelType: "smart",
    })
  })

  return result.hints.sort((a, b) => a.level - b.level)
}

/**
 * Generate a single contextual hint based on player progress
 */
export async function generateContextualHint(params: {
  puzzle: string
  answer: string
  previousGuesses?: string[]
  hintsUsed?: number
}): Promise<string> {
  const system = `You are helping a player who is stuck on a rebus puzzle.
Create a hint that's appropriate for their progress without giving away the answer.`

  const guessContext = params.previousGuesses && params.previousGuesses.length > 0
    ? `\nPrevious guesses: ${params.previousGuesses.join(", ")}`
    : ""

  const prompt = `Help this player with a hint:

Puzzle: "${params.puzzle}"
Answer: "${params.answer}"
Hints already used: ${params.hintsUsed ?? 0}${guessContext}

Based on their progress, give them one helpful hint that nudges them in the right direction without revealing the answer.`

  const result = await withRetry(async () => {
    const response = await generateAIText({
      prompt,
      system,
      temperature: AI_CONFIG.generation.temperature.balanced,
      maxTokens: AI_CONFIG.generation.maxTokens.short,
      modelType: "fast",
    })
    return response.text
  })

  return result.trim()
}

/**
 * Generate hint based on wrong answer
 */
export async function generateCorrectionHint(params: {
  puzzle: string
  correctAnswer: string
  wrongGuess: string
}): Promise<string> {
  const system = `You are providing gentle correction to a player who guessed incorrectly.
Acknowledge their thinking but guide them toward the right answer.`

  const prompt = `A player guessed "${params.wrongGuess}" for this puzzle:

Puzzle: "${params.puzzle}"
Correct Answer: "${params.correctAnswer}"

Provide a helpful hint that:
1. Acknowledges their guess was creative
2. Explains why it's not quite right (without being discouraging)
3. Guides them toward the correct answer

Keep it encouraging and brief.`

  const result = await withRetry(async () => {
    const response = await generateAIText({
      prompt,
      system,
      temperature: AI_CONFIG.generation.temperature.balanced,
      maxTokens: AI_CONFIG.generation.maxTokens.short,
      modelType: "fast",
    })
    return response.text
  })

  return result.trim()
}

/**
 * Explain why answer is correct (educational)
 */
export async function generateExplanation(params: {
  puzzle: string
  answer: string
}): Promise<string> {
  const system = `You are explaining how a rebus puzzle works to help players learn.
Be clear, educational, and encouraging.`

  const prompt = `Explain this rebus puzzle:

Puzzle: "${params.puzzle}"
Answer: "${params.answer}"

Provide a clear, step-by-step explanation of how the visual elements combine to form the answer.
Make it educational and help the player understand the pattern.`

  const result = await withRetry(async () => {
    const response = await generateAIText({
      prompt,
      system,
      temperature: AI_CONFIG.generation.temperature.factual,
      maxTokens: AI_CONFIG.generation.maxTokens.short,
      modelType: "fast",
    })
    return response.text
  })

  return result.trim()
}

/**
 * Generate adaptive hint based on difficulty and time spent
 */
export async function generateAdaptiveHint(params: {
  puzzle: string
  answer: string
  difficulty: number
  timeSpentSeconds: number
  attemptsUsed: number
}): Promise<{
  hint: string
  urgency: "low" | "medium" | "high"
}> {
  const system = `You are an adaptive hint system that provides help based on player struggle.
Adjust hint directness based on time spent and attempts made.`

  // Calculate urgency
  const expectedTime = params.difficulty * 30 // seconds
  const timeRatio = params.timeSpentSeconds / expectedTime
  const urgency = timeRatio > 2 ? "high" : timeRatio > 1.5 ? "medium" : "low"

  const prompt = `Generate an adaptive hint:

Puzzle: "${params.puzzle}"
Answer: "${params.answer}"
Difficulty: ${params.difficulty}/10
Time spent: ${params.timeSpentSeconds}s (expected: ~${expectedTime}s)
Attempts: ${params.attemptsUsed}

Player seems to be ${urgency === "high" ? "really stuck" : urgency === "medium" ? "struggling a bit" : "doing okay"}.

Provide a hint with appropriate directness for their situation.`

  const result = await withRetry(async () => {
    const response = await generateAIText({
      prompt,
      system,
      temperature: AI_CONFIG.generation.temperature.balanced,
      maxTokens: AI_CONFIG.generation.maxTokens.short,
      modelType: "fast",
    })
    return response.text
  })

  return {
    hint: result.trim(),
    urgency,
  }
}
