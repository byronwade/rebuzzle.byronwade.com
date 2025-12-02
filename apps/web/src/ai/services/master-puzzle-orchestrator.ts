/**
 * Master Puzzle Generation Orchestrator
 *
 * Coordinates all advanced AI systems to generate truly unique,
 * challenging, and high-quality rebus puzzles
 */

import { orchestratePuzzleGeneration } from "../agents/orchestrator";
import { getFeatureFlags } from "../config/feature-flags";
import { GLOBAL_CONTEXT } from "../config/global";
import { getPuzzleTypeConfig } from "../config/puzzle-types";
import { generateWithChainOfThought } from "./advanced-puzzle-generator";
import { calibrateDifficulty } from "./difficulty-calibrator";
import { runQualityPipeline } from "./quality-assurance";
import { getAdaptiveDifficulty } from "./recommendations";
import {
  calculateUniquenessScore,
  createPuzzleFingerprint,
  validateUniqueness,
} from "./uniqueness-tracker";

// ============================================================================
// MASTER GENERATION PIPELINE
// ============================================================================

export interface MasterGenerationParams {
  targetDifficulty: number;
  category?: string;
  theme?: string;
  requireNovelty?: boolean;
  qualityThreshold?: number;
  maxAttempts?: number;
  puzzleType?: string; // New: specify puzzle type (defaults to "rebus")
  userId?: string; // Optional: for personalized generation and learning feedback
  useLearningFeedback?: boolean; // Optional: use feedback from similar puzzles
}

export interface GeneratedPuzzleResult {
  puzzle: {
    rebusPuzzle: string;
    answer: string;
    difficulty: number;
    explanation: string;
    category: string;
    hints: string[];
  };
  metadata: {
    fingerprint: string;
    uniquenessScore: number;
    difficultyProfile: any;
    calibratedDifficulty: number;
    qualityMetrics: any;
    generationAttempts: number;
    generationTimeMs: number;
    aiThinking: any;
  };
  status: "success" | "retry" | "failed";
  recommendations: string[];
}

/**
 * Generate a single high-quality, unique puzzle
 * This is the main entry point that uses ALL advanced techniques
 */
export async function generateMasterPuzzle(
  params: MasterGenerationParams
): Promise<GeneratedPuzzleResult> {
  const startTime = Date.now();
  const maxAttempts = params.maxAttempts ?? 3;
  const puzzleType = params.puzzleType ?? "rebus";
  const featureFlags = getFeatureFlags();

  // Get puzzle type config
  const config = getPuzzleTypeConfig(puzzleType);

  // Enhanced: Apply learning feedback and personalization if enabled
  let effectiveDifficulty = params.targetDifficulty;
  if (featureFlags.learning && params.useLearningFeedback !== false) {
    try {
      // If category is provided, try to get actual difficulty from similar puzzles
      if (params.category) {
        // This will be enhanced with learning integration
        console.log(
          `[Master Generator] Learning feedback enabled for category: ${params.category}`
        );
      }
    } catch (error) {
      console.warn("[Master Generator] Learning feedback failed, using default difficulty:", error);
    }
  }

  // Enhanced: Apply personalization if userId provided
  if (featureFlags.recommendations && params.userId) {
    try {
      const adaptiveResult = await getAdaptiveDifficulty(params.userId);
      effectiveDifficulty = adaptiveResult.recommended;
      console.log(
        `[Master Generator] Personalized difficulty for user ${params.userId}: ${effectiveDifficulty} (${adaptiveResult.reasoning})`
      );
    } catch (error) {
      console.warn("[Master Generator] Personalization failed, using default difficulty:", error);
    }
  }

  // Use global context quality thresholds
  const baseQualityThreshold =
    params.qualityThreshold ?? GLOBAL_CONTEXT.qualityStandards.publishThreshold;
  // Use lower threshold on first attempt to reduce retries
  const getQualityThreshold = (attempt: number) => {
    if (attempt === 1)
      return Math.max(GLOBAL_CONTEXT.qualityStandards.revisionThreshold, baseQualityThreshold - 10); // Lower on first attempt
    return baseQualityThreshold;
  };

  let attempt = 0;
  let bestResult: GeneratedPuzzleResult | null = null;
  let bestQualityScore = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      console.log(`[Master Generator] Attempt ${attempt}/${maxAttempts} (type: ${puzzleType})`);

      // ========================================================================
      // STAGE 1: ADVANCED GENERATION (with optional agent orchestration)
      // ========================================================================

      let candidatePuzzle: any;
      let chainResult: any;
      let uniquenessScore = 0;
      let calibratedDifficulty: number = effectiveDifficulty;
      let difficultyProfile: any = {};
      let qualityResults: any;
      let orchestrationMetadata: any = null;

      // Use agent orchestration if enabled, otherwise use traditional pipeline
      if (featureFlags.agentOrchestration) {
        try {
          console.log("[Stage 1] Using agent orchestration for generation...");
          const orchestrationResult = await orchestratePuzzleGeneration({
            targetDifficulty: effectiveDifficulty,
            puzzleType,
            category: params.category,
            theme: params.theme,
            requireNovelty: params.requireNovelty,
            userId: params.userId,
          });

          // Extract puzzle and metadata from orchestration result
          candidatePuzzle = orchestrationResult.puzzle as any;
          uniquenessScore = orchestrationResult.metadata?.uniquenessScore || 0;
          calibratedDifficulty =
            orchestrationResult.metadata?.calibratedDifficulty || candidatePuzzle.difficulty;
          difficultyProfile = orchestrationResult.metadata?.difficultyProfile || {};
          orchestrationMetadata = orchestrationResult.metadata;

          // Handle uniqueness failures by retrying
          if (!orchestrationResult.isUnique) {
            console.log("[Stage 1] Puzzle failed uniqueness check in orchestration, retrying...");
            continue; // Try again
          }

          // Extract quality results from orchestration
          const qualityPuzzleData: any = {
            answer: candidatePuzzle.answer,
            explanation: candidatePuzzle.explanation,
            difficulty: calibratedDifficulty,
            hints: candidatePuzzle.hints || [],
          };

          // Add type-specific fields
          if (puzzleType === "rebus") {
            const puzzleDisplayField = "rebusPuzzle";
            const puzzleAny = candidatePuzzle as any;
            const puzzleText = puzzleAny[puzzleDisplayField] || puzzleAny.puzzle || "";
            if (puzzleText) {
              qualityPuzzleData.rebusPuzzle = puzzleText;
            }
          }

          // Get quality results from orchestration - map to expected format
          const orchestrationQualityMetrics = orchestrationResult.metadata?.qualityMetrics;
          const orchestrationVerdict = orchestrationQualityMetrics?.analysis?.verdict;
          const isPublishVerdict =
            orchestrationVerdict === "excellent" || orchestrationVerdict === "good";

          qualityResults = {
            finalScore: orchestrationResult.qualityScore,
            qualityMetrics: orchestrationQualityMetrics || {
              scores: { overall: orchestrationResult.qualityScore },
              analysis: {
                strengths: [],
                weaknesses: [],
                improvements: [],
                verdict: "acceptable" as const,
              },
              detailedFeedback: orchestrationResult.reasoning || "",
            },
            passed: isPublishVerdict,
            verdict: isPublishVerdict ? ("publish" as const) : ("revise" as const),
            actionItems: orchestrationResult.suggestions || [],
            adversarialResults: null, // Orchestration may skip adversarial for performance
          };

          // Create chain result structure for compatibility
          chainResult = {
            puzzle: candidatePuzzle,
            thinking: orchestrationMetadata?.aiThinking,
          };

          console.log("[Stage 1] Agent orchestration completed successfully");
        } catch (error) {
          // If orchestration fails (e.g., uniqueness check), fall back to traditional pipeline
          console.warn(
            "[Stage 1] Agent orchestration failed, falling back to traditional pipeline:",
            error
          );
          // Continue to traditional pipeline below
        }
      }

      // Traditional pipeline (used if orchestration is disabled or failed)
      if (!(featureFlags.agentOrchestration && candidatePuzzle)) {
        console.log("[Stage 1] Generating with chain-of-thought...");
        chainResult = await generateWithChainOfThought({
          targetDifficulty: effectiveDifficulty, // Use personalized/learning-adjusted difficulty
          requireNovelty: params.requireNovelty,
          puzzleType,
        });

        candidatePuzzle = chainResult.puzzle;

        // Validate puzzle using config validation rules
        if (config.validation.validate) {
          const validation = config.validation.validate(candidatePuzzle);
          if (!validation.valid) {
            console.log(`[Stage 1] Validation failed: ${validation.errors.join(", ")}`);
            continue; // Try again
          }
        }

        // ========================================================================
        // STAGE 2: UNIQUENESS VALIDATION
        // ========================================================================

        // Uniqueness validation is currently rebus-specific
        // TODO: Make this generic for all puzzle types
        if (puzzleType === "rebus" && candidatePuzzle.rebusPuzzle) {
          console.log("[Stage 2] Validating uniqueness...");
          const uniquenessCheck = await validateUniqueness({
            rebusPuzzle: candidatePuzzle.rebusPuzzle,
            answer: candidatePuzzle.answer,
            category: candidatePuzzle.category,
            explanation: candidatePuzzle.explanation,
          });

          if (!uniquenessCheck.isUnique && uniquenessCheck.similarityScore > 0.8) {
            console.log("[Stage 2] Failed uniqueness check, retrying...");
            continue; // Try again
          }

          uniquenessScore = await calculateUniquenessScore({
            rebusPuzzle: candidatePuzzle.rebusPuzzle,
            answer: candidatePuzzle.answer,
            category: candidatePuzzle.category,
            explanation: candidatePuzzle.explanation,
          });
        } else {
          // For non-rebus puzzles, set a default uniqueness score
          // TODO: Implement generic uniqueness validation
          uniquenessScore = 50;
        }

        // ========================================================================
        // STAGE 3: DIFFICULTY CALIBRATION
        // ========================================================================

        console.log("[Stage 3] Calibrating difficulty...");
        // Use config's difficulty calculation if available, otherwise use AI calibration
        calibratedDifficulty = candidatePuzzle.difficulty;

        if (config.difficulty.calculate) {
          // Use config's difficulty calculation
          calibratedDifficulty = config.difficulty.calculate(candidatePuzzle);
          // Extract difficulty profile from config factors
          difficultyProfile = {
            factors: config.difficulty.factors.map((factor) => ({
              name: factor.name,
              value: factor.extract(candidatePuzzle),
              weight: factor.weight,
            })),
            overall: calibratedDifficulty,
          };
        } else {
          // Fallback to AI calibration (for rebus puzzles)
          const calibration = await calibrateDifficulty({
            rebusPuzzle: candidatePuzzle.rebusPuzzle || "",
            answer: candidatePuzzle.answer,
            proposedDifficulty: candidatePuzzle.difficulty,
            hints: candidatePuzzle.hints || [],
          });
          calibratedDifficulty = calibration.calibratedDifficulty;
          difficultyProfile = calibration.difficultyProfile;
        }

        // ========================================================================
        // STAGE 4: QUALITY ASSURANCE
        // ========================================================================

        console.log("[Stage 4] Running quality pipeline...");
        // Skip adversarial test on first attempt to reduce API calls
        // Only run full pipeline if quality is borderline (60-70) or on later attempts
        const skipAdversarial = attempt === 1;

        // Prepare puzzle data for quality pipeline (handle both rebus and other types)
        const qualityPuzzleData: any = {
          answer: candidatePuzzle.answer,
          explanation: candidatePuzzle.explanation,
          difficulty: calibratedDifficulty,
          hints: candidatePuzzle.hints || [],
        };

        // Add type-specific fields
        if (puzzleType === "rebus" && candidatePuzzle.rebusPuzzle) {
          qualityPuzzleData.rebusPuzzle = candidatePuzzle.rebusPuzzle;
        }

        qualityResults = await runQualityPipeline(qualityPuzzleData, {
          skipAdversarial,
        });
      }

      // ========================================================================
      // STAGE 5: DECISION
      // ========================================================================

      const generationTime = Date.now() - startTime;

      // Extract puzzle fields - handle both rebus and other types
      const puzzleData: any = {
        answer: candidatePuzzle.answer,
        difficulty: calibratedDifficulty,
        explanation: candidatePuzzle.explanation,
        category: candidatePuzzle.category,
        hints: candidatePuzzle.hints,
      };

      // Add type-specific fields (e.g., rebusPuzzle for rebus type)
      if (puzzleType === "rebus" && candidatePuzzle.rebusPuzzle) {
        puzzleData.rebusPuzzle = candidatePuzzle.rebusPuzzle;
      }

      // Add any other fields from candidatePuzzle
      Object.keys(candidatePuzzle).forEach((key) => {
        if (!puzzleData[key]) {
          puzzleData[key] = candidatePuzzle[key];
        }
      });

      // Use orchestration metadata if available, otherwise create our own
      const fingerprint =
        orchestrationMetadata?.fingerprint ||
        createPuzzleFingerprint({
          rebusPuzzle:
            puzzleType === "rebus"
              ? candidatePuzzle.rebusPuzzle || candidatePuzzle.puzzle || ""
              : "",
          answer: candidatePuzzle.answer,
          category: candidatePuzzle.category || params.category || "general",
        });

      const result: GeneratedPuzzleResult = {
        puzzle: puzzleData,
        metadata: {
          fingerprint,
          uniquenessScore: orchestrationMetadata?.uniquenessScore || uniquenessScore,
          difficultyProfile: orchestrationMetadata?.difficultyProfile || difficultyProfile,
          calibratedDifficulty: orchestrationMetadata?.calibratedDifficulty || calibratedDifficulty,
          qualityMetrics: orchestrationMetadata?.qualityMetrics || qualityResults.qualityMetrics,
          generationAttempts: attempt,
          generationTimeMs: generationTime,
          aiThinking: orchestrationMetadata?.aiThinking || chainResult.thinking,
        },
        status: qualityResults.verdict === "publish" ? "success" : "retry",
        recommendations: qualityResults.actionItems || [],
      };

      // Check if this is good enough
      // Accept if: (1) finalScore meets threshold AND passed, OR (2) overall quality is high (>= 70) even if robustness is low
      const overallQuality = qualityResults.qualityMetrics.scores.overall;
      const isHighQuality = overallQuality >= 70;
      const currentThreshold = getQualityThreshold(attempt);
      const meetsThreshold = qualityResults.finalScore >= currentThreshold && qualityResults.passed;

      if (meetsThreshold || (isHighQuality && attempt >= 2)) {
        // High quality puzzles can be accepted even if robustness is low (especially on later attempts)
        console.log(
          `[Master Generator] ✓ Success on attempt ${attempt}! Quality: ${qualityResults.finalScore} (overall: ${overallQuality}, threshold: ${currentThreshold})`
        );
        return result;
      }

      // Track best result
      if (qualityResults.finalScore > bestQualityScore) {
        bestQualityScore = qualityResults.finalScore;
        bestResult = result;
      }

      console.log(
        `[Master Generator] Quality ${qualityResults.finalScore} below threshold ${currentThreshold}, retrying...`
      );
      const robustness = qualityResults.adversarialResults?.overallRobustness ?? "skipped";
      console.log(
        `[Master Generator] Quality breakdown: overall=${qualityResults.qualityMetrics.scores.overall}, robustness=${robustness}, passed=${qualityResults.passed}`
      );
      if (qualityResults.actionItems && qualityResults.actionItems.length > 0) {
        console.log(
          `[Master Generator] Action items: ${qualityResults.actionItems.slice(0, 3).join("; ")}`
        );
      }
    } catch (error) {
      console.error(`[Master Generator] Attempt ${attempt} failed:`, error);
      // Continue to next attempt
    }
  }

  // If we exhausted attempts, return best result if it's acceptable
  // Lowered from 70 to 55 to be more lenient - puzzles scoring 55+ are still decent
  if (bestResult && bestQualityScore >= 55) {
    console.log(
      `[Master Generator] Returning best result with quality ${bestQualityScore} (below ideal threshold ${baseQualityThreshold} but acceptable for daily puzzle)`
    );
    bestResult.status = "success";
    return bestResult;
  }

  // If we have any result at all, log why it failed
  if (bestResult) {
    console.error(
      `[Master Generator] Best quality score ${bestQualityScore} is below minimum acceptable threshold of 55`
    );
    console.error(
      "[Master Generator] Quality metrics:",
      JSON.stringify(bestResult.metadata.qualityMetrics?.scores, null, 2)
    );
  }

  throw new Error(`Failed to generate acceptable puzzle after ${maxAttempts} attempts`);
}

/**
 * Generate batch of master puzzles for upcoming days
 */
export async function generateMasterBatch(params: {
  count: number;
  startDifficulty: number;
  difficultyProgression?: "linear" | "sine_wave" | "random";
  ensureVariety?: boolean;
}): Promise<GeneratedPuzzleResult[]> {
  const results: GeneratedPuzzleResult[] = [];
  const usedPatterns = new Set<string>();

  for (let i = 0; i < params.count; i++) {
    // Calculate difficulty for this puzzle
    let difficulty = params.startDifficulty;

    if (params.difficultyProgression === "sine_wave") {
      // Vary difficulty in a wave pattern
      difficulty = Math.round(
        params.startDifficulty + 2 * Math.sin((i / params.count) * Math.PI * 2)
      );
    } else if (params.difficultyProgression === "linear") {
      // Gradually increase
      difficulty = Math.min(10, params.startDifficulty + Math.floor(i / 2));
    } else if (params.difficultyProgression === "random") {
      difficulty = Math.floor(Math.random() * 3) + params.startDifficulty - 1;
    }

    difficulty = Math.max(1, Math.min(10, difficulty));

    // Generate puzzle
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: params.ensureVariety,
      maxAttempts: 2, // Less attempts for batch
    });

    // Track pattern for variety
    const pattern = result.metadata.difficultyProfile.patternType || "unknown";
    usedPatterns.add(pattern);

    results.push(result);

    console.log(
      `[Master Batch] Generated ${i + 1}/${params.count}: ${result.puzzle.answer} (difficulty: ${difficulty}, quality: ${result.metadata.qualityMetrics.scores.overall})`
    );
  }

  // Log variety metrics
  console.log(
    `[Master Batch] Complete! Used ${usedPatterns.size} different patterns for ${params.count} puzzles`
  );

  return results;
}

/**
 * Smart puzzle selector - picks best puzzle for specific context
 */
export async function selectOptimalPuzzle(params: {
  playerSkillLevel?: number;
  recentDifficulties?: number[];
  avoidCategories?: string[];
  preferNovelty?: boolean;
}): Promise<GeneratedPuzzleResult> {
  // Calculate optimal difficulty based on player history
  const optimalDifficulty = params.playerSkillLevel ?? 5;

  // Adjust based on recent performance
  let adjustedDifficulty = optimalDifficulty;
  if (params.recentDifficulties && params.recentDifficulties.length >= 3) {
    const recentAvg =
      params.recentDifficulties.reduce((a, b) => a + b, 0) / params.recentDifficulties.length;
    adjustedDifficulty = Math.round((optimalDifficulty + recentAvg) / 2);
  }

  // Generate with adjusted parameters
  return await generateMasterPuzzle({
    targetDifficulty: adjustedDifficulty,
    requireNovelty: params.preferNovelty,
    qualityThreshold: 85,
  });
}
