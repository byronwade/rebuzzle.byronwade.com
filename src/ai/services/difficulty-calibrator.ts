/**
 * Difficulty Calibration Engine
 *
 * Validates and calibrates puzzle difficulty using:
 * - AI self-testing
 * - Multi-dimensional difficulty scoring
 * - Player performance data
 * - Cognitive complexity analysis
 */

import { z } from "zod"
import { generateAIObject, withRetry } from "../client"
import { AI_CONFIG } from "../config"

// ============================================================================
// MULTI-DIMENSIONAL DIFFICULTY
// ============================================================================

export interface DifficultyProfile {
  visualAmbiguity: number      // 1-10: How clear are the visual elements?
  cognitiveSteps: number        // 1-10: How many mental leaps needed?
  culturalKnowledge: number     // 1-10: How much cultural context required?
  vocabularyLevel: number       // 1-10: How advanced is the vocabulary?
  patternNovelty: number        // 1-10: How unexpected is the pattern?
  overallDifficulty: number     // Calculated composite score
}

/**
 * Calculate multi-dimensional difficulty score
 */
export function calculateDifficultyProfile(puzzle: {
  rebusPuzzle: string
  answer: string
  explanation: string
  category: string
}): DifficultyProfile {
  // Visual ambiguity: count visual elements and potential interpretations
  const emojiCount = (puzzle.rebusPuzzle.match(/[\p{Emoji}]/gu) || []).length
  const visualAmbiguity = Math.min(10, Math.max(1, emojiCount * 1.5))

  // Cognitive steps: analyze explanation for steps
  const stepIndicators = ["+", "→", "=", "sounds like", "positioned", "represents"]
  const cognitiveSteps = Math.min(10, stepIndicators.filter(indicator =>
    puzzle.explanation.toLowerCase().includes(indicator)
  ).length * 2)

  // Cultural knowledge: check for idioms, phrases, cultural references
  const isIdiom = puzzle.category.includes("idiom") || puzzle.category.includes("phrase")
  const culturalKnowledge = isIdiom ? 7 : puzzle.answer.split(/\s+/).length * 2

  // Vocabulary level: answer length and complexity
  const vocabularyLevel = Math.min(10, Math.max(1,
    puzzle.answer.length / 3 + (puzzle.answer.split(/\s+/).length - 1) * 2
  ))

  // Pattern novelty: based on category rarity
  const rarePatterns = ["positional", "mathematical", "lateral_thinking", "multi_layer"]
  const patternNovelty = rarePatterns.includes(puzzle.category) ? 8 : 5

  // Calculate overall difficulty (weighted average)
  const overallDifficulty = Math.round(
    visualAmbiguity * 0.2 +
    cognitiveSteps * 0.3 +
    culturalKnowledge * 0.2 +
    vocabularyLevel * 0.15 +
    patternNovelty * 0.15
  )

  return {
    visualAmbiguity,
    cognitiveSteps,
    culturalKnowledge,
    vocabularyLevel,
    patternNovelty,
    overallDifficulty,
  }
}

// ============================================================================
// AI SELF-TESTING
// ============================================================================

const SelfTestSchema = z.object({
  solvingProcess: z.object({
    initialThoughts: z.string(),
    steps: z.array(z.string()),
    ahaMoment: z.string(),
    finalAnswer: z.string(),
  }),
  difficulty: z.object({
    perceivedDifficulty: z.number().min(1).max(10),
    timeToSolve: z.enum(["instant", "quick", "moderate", "challenging", "very_hard"]),
    requiredKnowledge: z.array(z.string()),
    trickiness: z.number().min(1).max(10),
  }),
  feedback: z.object({
    isSolvable: z.boolean(),
    isWellCrafted: z.boolean(),
    improvements: z.array(z.string()),
  }),
})

/**
 * Have AI solve the puzzle and rate its difficulty
 */
export async function aiSelfTest(puzzle: {
  rebusPuzzle: string
  answer: string
  hints?: string[]
}): Promise<z.infer<typeof SelfTestSchema>> {
  const system = `You are a puzzle solver. Try to solve this rebus puzzle and report your experience.

Be honest about:
- How difficult it was
- What made it challenging
- Whether it's fair and solvable
- Any issues with the puzzle`

  const prompt = `Solve this rebus puzzle:

Puzzle: "${puzzle.rebusPuzzle}"
${puzzle.hints ? `Hints available: ${puzzle.hints.join(", ")}` : ""}

Think through it step-by-step:
1. What do you see first?
2. What strategies do you try?
3. What's the "aha!" moment?
4. What's your final answer?

Then rate:
- How difficult was it (1-10)?
- How long did it take conceptually?
- What knowledge was required?
- How tricky/clever was it?

Finally provide feedback on quality and suggest improvements.`

  return await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: SelfTestSchema,
      temperature: AI_CONFIG.generation.temperature.balanced,
      modelType: "smart",
    })
  })
}

/**
 * Calibrate difficulty based on self-test results
 */
export async function calibrateDifficulty(puzzle: {
  rebusPuzzle: string
  answer: string
  proposedDifficulty: number
  hints?: string[]
}): Promise<{
  calibratedDifficulty: number
  difficultyProfile: DifficultyProfile
  testResults: z.infer<typeof SelfTestSchema>
  recommendation: string
}> {
  // Get multi-dimensional difficulty
  const profile = calculateDifficultyProfile({
    rebusPuzzle: puzzle.rebusPuzzle,
    answer: puzzle.answer,
    explanation: "",
    category: "",
  })

  // AI self-test
  const testResults = await aiSelfTest(puzzle)

  // Combine proposed, calculated, and tested difficulty
  const weights = {
    proposed: 0.3,
    calculated: 0.3,
    tested: 0.4,
  }

  const calibratedDifficulty = Math.round(
    puzzle.proposedDifficulty * weights.proposed +
    profile.overallDifficulty * weights.calculated +
    testResults.difficulty.perceivedDifficulty * weights.tested
  )

  // Generate recommendation
  const delta = Math.abs(calibratedDifficulty - puzzle.proposedDifficulty)
  const recommendation = delta > 2
    ? `Difficulty mismatch! Proposed: ${puzzle.proposedDifficulty}, Actual: ${calibratedDifficulty}. Consider regenerating.`
    : delta > 1
    ? `Minor difficulty adjustment: ${puzzle.proposedDifficulty} → ${calibratedDifficulty}`
    : "Difficulty accurately calibrated."

  return {
    calibratedDifficulty,
    difficultyProfile: profile,
    testResults,
    recommendation,
  }
}

// ============================================================================
// PLAYER PERFORMANCE ANALYSIS
// ============================================================================

/**
 * Analyze player performance to adjust future difficulty
 */
export async function analyzePlayerPerformance(puzzleId: string): Promise<{
  avgSolveTime: number
  avgAttempts: number
  successRate: number
  perceivedDifficulty: number
  shouldAdjust: boolean
  adjustment: number
}> {
  // This would query actual player data from database
  // For now, return structure for implementation

  return {
    avgSolveTime: 0,
    avgAttempts: 0,
    successRate: 0,
    perceivedDifficulty: 0,
    shouldAdjust: false,
    adjustment: 0,
  }
}

/**
 * Adaptive difficulty adjustment based on player cohort
 */
export function calculateAdaptiveDifficulty(params: {
  baselineDifficulty: number
  playerSkillLevel: number
  recentPerformance: Array<{ difficulty: number; solved: boolean; attempts: number }>
}): number {
  // Calculate player's effective skill
  const avgSuccess = params.recentPerformance.length > 0
    ? params.recentPerformance.filter(p => p.solved).length / params.recentPerformance.length
    : 0.5

  // If player is succeeding too easily, increase difficulty
  if (avgSuccess > 0.8 && params.recentPerformance.length >= 3) {
    return Math.min(10, params.baselineDifficulty + 1)
  }

  // If player is struggling, decrease slightly
  if (avgSuccess < 0.3 && params.recentPerformance.length >= 3) {
    return Math.max(1, params.baselineDifficulty - 1)
  }

  // Sweet spot: maintain current difficulty
  return params.baselineDifficulty
}
