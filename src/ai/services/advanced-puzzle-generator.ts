/**
 * Advanced AI-Powered Puzzle Generator
 *
 * Uses sophisticated AI techniques to generate truly unique,
 * challenging, and high-quality rebus puzzles
 */

import { z } from "zod"
import { generateAIObject, generateAIText, withRetry } from "../client"
import { AI_CONFIG } from "../config"

// ============================================================================
// SCHEMAS
// ============================================================================

const ChainOfThoughtPuzzleSchema = z.object({
  thinking: z.object({
    concept: z.string().describe("The core concept to represent"),
    visualStrategy: z.string().describe("How to represent it visually"),
    layers: z.array(z.string()).describe("Multiple layers of meaning"),
    challengeElements: z.array(z.string()).describe("What makes this challenging"),
  }),
  puzzle: z.object({
    rebusPuzzle: z.string(),
    answer: z.string(),
    difficulty: z.number().min(1).max(10),
    explanation: z.string(),
    category: z.enum([
      "compound_words",
      "phonetic",
      "positional",
      "mathematical",
      "visual_wordplay",
      "idioms",
      "phrases",
      "lateral_thinking",
      "multi_layer",
    ]),
    hints: z.array(z.string()).min(3).max(5),
    complexityScore: z.object({
      visualAmbiguity: z.number().min(1).max(10),
      cognitiveSteps: z.number().min(1).max(10),
      culturalKnowledge: z.number().min(1).max(10),
      vocabularyLevel: z.number().min(1).max(10),
      patternNovelty: z.number().min(1).max(10),
    }),
  }),
})

const EnsemblePuzzleSchema = z.object({
  candidates: z.array(z.object({
    rebusPuzzle: z.string(),
    answer: z.string(),
    difficulty: z.number(),
    explanation: z.string(),
    category: z.string(),
    hints: z.array(z.string()),
    uniquenessScore: z.number().min(0).max(100),
    creativityScore: z.number().min(0).max(100),
    clarityScore: z.number().min(0).max(100),
  })).min(5).max(5),
  recommendation: z.object({
    selectedIndex: z.number(),
    reasoning: z.string(),
  }),
})

// ============================================================================
// ADVANCED GENERATION TECHNIQUES
// ============================================================================

/**
 * Generate puzzle using Chain-of-Thought reasoning
 * This forces the AI to think deeply about the puzzle structure
 */
export async function generateWithChainOfThought(params: {
  targetDifficulty: number
  avoidPatterns?: string[]
  requireNovelty?: boolean
}): Promise<{
  puzzle: z.infer<typeof ChainOfThoughtPuzzleSchema>["puzzle"]
  thinking: z.infer<typeof ChainOfThoughtPuzzleSchema>["thinking"]
}> {
  const system = `You are a master rebus puzzle creator with deep understanding of:
- Visual semiotics and symbolism
- Linguistic patterns and wordplay
- Cultural references and idioms
- Cognitive psychology and problem-solving
- Creative lateral thinking

Use chain-of-thought reasoning to design truly challenging puzzles.`

  const prompt = `Design a challenging rebus puzzle using deep reasoning:

TARGET DIFFICULTY: ${params.targetDifficulty}/10

THINK STEP BY STEP:
1. What concept would be challenging at this level?
2. What visual strategy creates multiple layers of meaning?
3. How can you make this require lateral thinking?
4. What makes this puzzle unique and novel?
5. How do you balance challenge with solvability?

${params.avoidPatterns?.length ? `AVOID these patterns: ${params.avoidPatterns.join(", ")}` : ""}
${params.requireNovelty ? "REQUIRE: Use a pattern type that's rare or innovative" : ""}

Create a puzzle that requires:
- Multiple cognitive steps
- Lateral thinking
- Pattern recognition
- "Aha!" moment when solved

Show your thinking process, then create the puzzle.`

  const result = await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: ChainOfThoughtPuzzleSchema,
      temperature: AI_CONFIG.generation.temperature.creative,
      modelType: "smart",
    })
  })

  return {
    puzzle: result.puzzle,
    thinking: result.thinking,
  }
}

/**
 * Generate multiple candidates and select best (Ensemble Method)
 */
export async function generateWithEnsemble(params: {
  difficulty: number
  category?: string
}): Promise<{
  selected: z.infer<typeof EnsemblePuzzleSchema>["candidates"][0]
  candidates: z.infer<typeof EnsemblePuzzleSchema>["candidates"]
  reasoning: string
}> {
  const system = `You are a panel of expert rebus puzzle creators.
Generate 5 different puzzle candidates, then evaluate and select the best one.

EVALUATION CRITERIA:
- Uniqueness: How original is the pattern?
- Creativity: How clever is the representation?
- Clarity: Is it solvable but not obvious?
- Challenge: Does it require real thinking?
- Quality: Professional-grade puzzle?`

  const prompt = `Generate 5 diverse rebus puzzle candidates:

Difficulty: ${params.difficulty}/10
Category: ${params.category || "any"}

For each candidate:
1. Create a unique puzzle
2. Use different techniques/patterns
3. Score for uniqueness (0-100)
4. Score for creativity (0-100)
5. Score for clarity (0-100)

Then recommend which one is the best and explain why.`

  const result = await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: EnsemblePuzzleSchema,
      temperature: AI_CONFIG.generation.temperature.creative,
      modelType: "smart",
    })
  })

  const selected = result.candidates[result.recommendation.selectedIndex]!

  return {
    selected,
    candidates: result.candidates,
    reasoning: result.recommendation.reasoning,
  }
}

/**
 * Iterative refinement - keep improving until quality threshold met
 */
export async function generateWithIterativeRefinement(params: {
  difficulty: number
  qualityThreshold?: number
  maxIterations?: number
}): Promise<{
  puzzle: any
  iterations: number
  finalQuality: number
  improvements: string[]
}> {
  const qualityThreshold = params.qualityThreshold ?? 85
  const maxIterations = params.maxIterations ?? 3

  let currentPuzzle: any = null
  let currentQuality = 0
  const improvements: string[] = []

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const system = iteration === 1
      ? `Create an exceptional rebus puzzle that's truly challenging and creative.`
      : `Improve this rebus puzzle based on the feedback. Make it more creative, clear, and challenging.`

    const prompt = iteration === 1
      ? `Create a masterpiece rebus puzzle:

Difficulty: ${params.difficulty}/10

Make it:
- Require multiple cognitive leaps
- Use unexpected visual combinations
- Have an "aha!" moment
- Be memorable and clever

This should be puzzle-of-the-day quality.`
      : `Improve this puzzle:

Current: "${currentPuzzle.rebusPuzzle}"
Answer: "${currentPuzzle.answer}"
Current Quality: ${currentQuality}/100

Issues to fix:
${improvements.join("\n")}

Make it better while keeping the same answer (or change answer if needed for quality).`

    const PuzzleSchema = z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      difficulty: z.number(),
      explanation: z.string(),
      category: z.string(),
      hints: z.array(z.string()),
      qualityScore: z.number().min(0).max(100),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
    })

    currentPuzzle = await withRetry(async () => {
      return await generateAIObject({
        prompt,
        system,
        schema: PuzzleSchema,
        temperature: AI_CONFIG.generation.temperature.creative,
        modelType: "smart",
      })
    })

    currentQuality = currentPuzzle.qualityScore

    if (currentQuality >= qualityThreshold) {
      return {
        puzzle: currentPuzzle,
        iterations: iteration,
        finalQuality: currentQuality,
        improvements: currentPuzzle.improvements,
      }
    }

    improvements.push(...currentPuzzle.improvements)
  }

  return {
    puzzle: currentPuzzle,
    iterations: maxIterations,
    finalQuality: currentQuality,
    improvements,
  }
}

/**
 * Constitutional AI - Enforce quality rules
 */
export async function generateWithConstitution(params: {
  difficulty: number
  constitution: {
    mustHaveMultipleLayers: boolean
    mustRequireLateralThinking: boolean
    mustHaveAhaMoment: boolean
    mustBeOriginal: boolean
    mustBeSolvable: boolean
  }
}): Promise<any> {
  const constitution = params.constitution

  const system = `You are creating a rebus puzzle that MUST follow these constitutional rules:

${constitution.mustHaveMultipleLayers ? "✓ MUST have multiple layers of meaning (not just simple A+B)" : ""}
${constitution.mustRequireLateralThinking ? "✓ MUST require lateral thinking (not obvious)" : ""}
${constitution.mustHaveAhaMoment ? "✓ MUST have a clear 'aha!' moment when solved" : ""}
${constitution.mustBeOriginal ? "✓ MUST use a novel pattern or unexpected combination" : ""}
${constitution.mustBeSolvable ? "✓ MUST be solvable with hints (not impossible)" : ""}

These are HARD REQUIREMENTS. The puzzle will be rejected if it doesn't meet ALL of them.`

  const prompt = `Create a rebus puzzle following ALL constitutional rules above.

Difficulty: ${params.difficulty}/10

Show how your puzzle meets each requirement:
1. Multiple layers? (How?)
2. Lateral thinking? (What's non-obvious?)
3. Aha moment? (What's the realization?)
4. Original? (What's novel?)
5. Solvable? (How do hints guide?)

Then create the puzzle.`

  const ConstitutionalSchema = z.object({
    constitutionalCompliance: z.object({
      multipleLayers: z.object({ compliant: z.boolean(), explanation: z.string() }),
      lateralThinking: z.object({ compliant: z.boolean(), explanation: z.string() }),
      ahaMoment: z.object({ compliant: z.boolean(), explanation: z.string() }),
      originality: z.object({ compliant: z.boolean(), explanation: z.string() }),
      solvability: z.object({ compliant: z.boolean(), explanation: z.string() }),
    }),
    puzzle: z.object({
      rebusPuzzle: z.string(),
      answer: z.string(),
      difficulty: z.number(),
      explanation: z.string(),
      category: z.string(),
      hints: z.array(z.string()),
    }),
  })

  const result = await withRetry(async () => {
    return await generateAIObject({
      prompt,
      system,
      schema: ConstitutionalSchema,
      temperature: AI_CONFIG.generation.temperature.creative,
      modelType: "smart",
    })
  })

  // Verify all constitutional requirements are met
  const compliance = result.constitutionalCompliance
  const allCompliant = Object.values(compliance).every((c: any) => c.compliant)

  if (!allCompliant) {
    throw new Error("Puzzle failed constitutional requirements")
  }

  return result.puzzle
}

/**
 * Master generator - combines all advanced techniques
 */
export async function generateUltraChallengingPuzzle(params: {
  targetDifficulty: number
  avoidAnswers?: string[]
  avoidPatterns?: string[]
  requireNovelty?: boolean
}): Promise<{
  puzzle: any
  metadata: {
    generationMethod: string
    thinkingProcess: any
    qualityMetrics: any
    uniquenessScore: number
    challengeLevel: number
  }
}> {
  // Stage 1: Generate with chain-of-thought
  const chainResult = await generateWithChainOfThought({
    targetDifficulty: params.targetDifficulty,
    avoidPatterns: params.avoidPatterns,
    requireNovelty: params.requireNovelty,
  })

  // Stage 2: Validate with constitutional AI
  const constitutionalPuzzle = await generateWithConstitution({
    difficulty: params.targetDifficulty,
    constitution: {
      mustHaveMultipleLayers: params.targetDifficulty >= 5,
      mustRequireLateralThinking: params.targetDifficulty >= 6,
      mustHaveAhaMoment: true,
      mustBeOriginal: params.requireNovelty ?? true,
      mustBeSolvable: true,
    },
  })

  // Stage 3: Generate ensemble and pick best
  const ensembleResult = await generateWithEnsemble({
    difficulty: params.targetDifficulty,
  })

  // Stage 4: Iteratively refine the best candidate
  const refinedResult = await generateWithIterativeRefinement({
    difficulty: params.targetDifficulty,
    qualityThreshold: 90,
    maxIterations: 2,
  })

  return {
    puzzle: refinedResult.puzzle,
    metadata: {
      generationMethod: "multi-stage",
      thinkingProcess: chainResult.thinking,
      qualityMetrics: {
        finalQuality: refinedResult.finalQuality,
        iterations: refinedResult.iterations,
        complexityScores: chainResult.puzzle.complexityScore,
      },
      uniquenessScore: ensembleResult.selected.uniquenessScore,
      challengeLevel: params.targetDifficulty,
    },
  }
}
