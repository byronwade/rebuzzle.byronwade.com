/**
 * Master Puzzle Generation Orchestrator
 *
 * Coordinates all advanced AI systems to generate truly unique,
 * challenging, and high-quality rebus puzzles
 */

import { generateWithChainOfThought, generateWithEnsemble, generateWithIterativeRefinement } from "./advanced-puzzle-generator"
import { validateUniqueness, calculateUniquenessScore, createPuzzleFingerprint, extractComponents } from "./uniqueness-tracker"
import { calibrateDifficulty, calculateDifficultyProfile } from "./difficulty-calibrator"
import { runQualityPipeline, analyzeQuality } from "./quality-assurance"
import { PuzzlesRepo } from "@/db"

// ============================================================================
// MASTER GENERATION PIPELINE
// ============================================================================

export interface MasterGenerationParams {
  targetDifficulty: number
  category?: string
  theme?: string
  requireNovelty?: boolean
  qualityThreshold?: number
  maxAttempts?: number
}

export interface GeneratedPuzzleResult {
  puzzle: {
    rebusPuzzle: string
    answer: string
    difficulty: number
    explanation: string
    category: string
    hints: string[]
  }
  metadata: {
    fingerprint: string
    uniquenessScore: number
    difficultyProfile: any
    calibratedDifficulty: number
    qualityMetrics: any
    generationAttempts: number
    generationTimeMs: number
    aiThinking: any
  }
  status: "success" | "retry" | "failed"
  recommendations: string[]
}

/**
 * Generate a single high-quality, unique puzzle
 * This is the main entry point that uses ALL advanced techniques
 */
export async function generateMasterPuzzle(
  params: MasterGenerationParams
): Promise<GeneratedPuzzleResult> {
  const startTime = Date.now()
  const maxAttempts = params.maxAttempts ?? 3
  const qualityThreshold = params.qualityThreshold ?? 85

  let attempt = 0
  let bestResult: GeneratedPuzzleResult | null = null
  let bestQualityScore = 0

  while (attempt < maxAttempts) {
    attempt++

    try {
      console.log(`[Master Generator] Attempt ${attempt}/${maxAttempts}`)

      // ========================================================================
      // STAGE 1: ADVANCED GENERATION
      // ========================================================================

      console.log("[Stage 1] Generating with chain-of-thought...")
      const chainResult = await generateWithChainOfThought({
        targetDifficulty: params.targetDifficulty,
        requireNovelty: params.requireNovelty,
      })

      const candidatePuzzle = chainResult.puzzle

      // ========================================================================
      // STAGE 2: UNIQUENESS VALIDATION
      // ========================================================================

      console.log("[Stage 2] Validating uniqueness...")
      const uniquenessCheck = await validateUniqueness({
        rebusPuzzle: candidatePuzzle.rebusPuzzle,
        answer: candidatePuzzle.answer,
        category: candidatePuzzle.category,
        explanation: candidatePuzzle.explanation,
      })

      if (!uniquenessCheck.isUnique && uniquenessCheck.similarityScore > 0.8) {
        console.log("[Stage 2] Failed uniqueness check, retrying...")
        continue // Try again
      }

      const uniquenessScore = await calculateUniquenessScore({
        rebusPuzzle: candidatePuzzle.rebusPuzzle,
        answer: candidatePuzzle.answer,
        category: candidatePuzzle.category,
        explanation: candidatePuzzle.explanation,
      })

      // ========================================================================
      // STAGE 3: DIFFICULTY CALIBRATION
      // ========================================================================

      console.log("[Stage 3] Calibrating difficulty...")
      const calibration = await calibrateDifficulty({
        rebusPuzzle: candidatePuzzle.rebusPuzzle,
        answer: candidatePuzzle.answer,
        proposedDifficulty: candidatePuzzle.difficulty,
        hints: candidatePuzzle.hints,
      })

      // ========================================================================
      // STAGE 4: QUALITY ASSURANCE
      // ========================================================================

      console.log("[Stage 4] Running quality pipeline...")
      const qualityResults = await runQualityPipeline({
        rebusPuzzle: candidatePuzzle.rebusPuzzle,
        answer: candidatePuzzle.answer,
        explanation: candidatePuzzle.explanation,
        difficulty: calibration.calibratedDifficulty,
        hints: candidatePuzzle.hints,
      })

      // ========================================================================
      // STAGE 5: DECISION
      // ========================================================================

      const generationTime = Date.now() - startTime

      const result: GeneratedPuzzleResult = {
        puzzle: {
          rebusPuzzle: candidatePuzzle.rebusPuzzle,
          answer: candidatePuzzle.answer,
          difficulty: calibration.calibratedDifficulty,
          explanation: candidatePuzzle.explanation,
          category: candidatePuzzle.category,
          hints: candidatePuzzle.hints,
        },
        metadata: {
          fingerprint: createPuzzleFingerprint({
            rebusPuzzle: candidatePuzzle.rebusPuzzle,
            answer: candidatePuzzle.answer,
            category: candidatePuzzle.category,
          }),
          uniquenessScore,
          difficultyProfile: calibration.difficultyProfile,
          calibratedDifficulty: calibration.calibratedDifficulty,
          qualityMetrics: qualityResults.qualityMetrics,
          generationAttempts: attempt,
          generationTimeMs: generationTime,
          aiThinking: chainResult.thinking,
        },
        status: qualityResults.verdict === "publish" ? "success" : "retry",
        recommendations: qualityResults.actionItems,
      }

      // Check if this is good enough
      if (qualityResults.finalScore >= qualityThreshold && qualityResults.passed) {
        console.log(`[Master Generator] ✓ Success on attempt ${attempt}! Quality: ${qualityResults.finalScore}`)
        return result
      }

      // Track best result
      if (qualityResults.finalScore > bestQualityScore) {
        bestQualityScore = qualityResults.finalScore
        bestResult = result
      }

      console.log(`[Master Generator] Quality ${qualityResults.finalScore} below threshold ${qualityThreshold}, retrying...`)

    } catch (error) {
      console.error(`[Master Generator] Attempt ${attempt} failed:`, error)
      // Continue to next attempt
    }
  }

  // If we exhausted attempts, return best result or fail
  if (bestResult && bestQualityScore >= 70) {
    console.log(`[Master Generator] Returning best result with quality ${bestQualityScore}`)
    bestResult.status = "success"
    return bestResult
  }

  throw new Error(`Failed to generate acceptable puzzle after ${maxAttempts} attempts`)
}

/**
 * Generate batch of master puzzles for upcoming days
 */
export async function generateMasterBatch(params: {
  count: number
  startDifficulty: number
  difficultyProgression?: "linear" | "sine_wave" | "random"
  ensureVariety?: boolean
}): Promise<GeneratedPuzzleResult[]> {
  const results: GeneratedPuzzleResult[] = []
  const usedPatterns = new Set<string>()

  for (let i = 0; i < params.count; i++) {
    // Calculate difficulty for this puzzle
    let difficulty = params.startDifficulty

    if (params.difficultyProgression === "sine_wave") {
      // Vary difficulty in a wave pattern
      difficulty = Math.round(
        params.startDifficulty + 2 * Math.sin((i / params.count) * Math.PI * 2)
      )
    } else if (params.difficultyProgression === "linear") {
      // Gradually increase
      difficulty = Math.min(10, params.startDifficulty + Math.floor(i / 2))
    } else if (params.difficultyProgression === "random") {
      difficulty = Math.floor(Math.random() * 3) + params.startDifficulty - 1
    }

    difficulty = Math.max(1, Math.min(10, difficulty))

    // Generate puzzle
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: params.ensureVariety,
      maxAttempts: 2, // Less attempts for batch
    })

    // Track pattern for variety
    const pattern = result.metadata.difficultyProfile.patternType || "unknown"
    usedPatterns.add(pattern)

    results.push(result)

    console.log(`[Master Batch] Generated ${i + 1}/${params.count}: ${result.puzzle.answer} (difficulty: ${difficulty}, quality: ${result.metadata.qualityMetrics.scores.overall})`)
  }

  // Log variety metrics
  console.log(`[Master Batch] Complete! Used ${usedPatterns.size} different patterns for ${params.count} puzzles`)

  return results
}

/**
 * Smart puzzle selector - picks best puzzle for specific context
 */
export async function selectOptimalPuzzle(params: {
  playerSkillLevel?: number
  recentDifficulties?: number[]
  avoidCategories?: string[]
  preferNovelty?: boolean
}): Promise<GeneratedPuzzleResult> {
  // Calculate optimal difficulty based on player history
  const optimalDifficulty = params.playerSkillLevel ?? 5

  // Adjust based on recent performance
  let adjustedDifficulty = optimalDifficulty
  if (params.recentDifficulties && params.recentDifficulties.length >= 3) {
    const recentAvg = params.recentDifficulties.reduce((a, b) => a + b, 0) / params.recentDifficulties.length
    adjustedDifficulty = Math.round((optimalDifficulty + recentAvg) / 2)
  }

  // Generate with adjusted parameters
  return await generateMasterPuzzle({
    targetDifficulty: adjustedDifficulty,
    requireNovelty: params.preferNovelty,
    qualityThreshold: 85,
  })
}
