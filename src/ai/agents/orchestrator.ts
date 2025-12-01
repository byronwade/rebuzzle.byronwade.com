/**
 * Multi-Agent Orchestrator
 *
 * Coordinates multiple specialized AI agents for complex puzzle generation workflows
 * Uses AI SDK Tools for agent orchestration and tool calling
 */

import { generateObject, type generateText } from "ai";
import { z } from "zod";
import type { Puzzle } from "@/db/models";
import { getAIProvider } from "../client";
import { getPuzzleTypeConfig } from "../config/puzzle-types";
import { generateWithChainOfThought } from "../services/advanced-puzzle-generator";
import { calibrateDifficulty } from "../services/difficulty-calibrator";
import { runQualityPipeline } from "../services/quality-assurance";
import {
  calculateUniquenessScore,
  createPuzzleFingerprint,
  validateUniqueness,
} from "../services/uniqueness-tracker";
import {
  analyzePuzzlePerformanceTool,
  findSimilarPuzzlesTool,
  getUserHistoryTool,
  getUserProfileTool,
  searchPuzzlesByConceptTool,
} from "../tools/mongodb-tools";

/**
 * Available MongoDB tools for agents
 */
const MONGODB_TOOLS = {
  findSimilarPuzzles: findSimilarPuzzlesTool,
  searchPuzzlesByConcept: searchPuzzlesByConceptTool,
  getUserHistory: getUserHistoryTool,
  getUserProfile: getUserProfileTool,
  analyzePuzzlePerformance: analyzePuzzlePerformanceTool,
};

/**
 * Orchestrate puzzle generation with quality review
 * Coordinates multiple agents to generate and validate puzzles
 * Enhanced with uniqueness validation, config support, and comprehensive metadata
 */
export async function orchestratePuzzleGeneration(params: {
  targetDifficulty: number;
  category?: string;
  theme?: string;
  puzzleType?: string;
  requireNovelty?: boolean;
  userId?: string; // Optional: for personalized generation
}): Promise<{
  puzzle: Puzzle;
  qualityScore: number;
  reasoning: string;
  suggestions?: string[];
  metadata?: {
    fingerprint: string;
    uniquenessScore: number;
    difficultyProfile: any;
    calibratedDifficulty: number;
    qualityMetrics: any;
    aiThinking?: any;
  };
  isUnique?: boolean;
}> {
  const puzzleType = params.puzzleType || "rebus";
  const config = getPuzzleTypeConfig(puzzleType);

  const provider = getAIProvider();
  const modelInstance = provider.getModelInstance("smart");

  // Agent 1: Puzzle Generator Agent (uses chain-of-thought)
  console.log(
    "[Orchestrator] Agent 1: Generating puzzle with chain-of-thought..."
  );
  const generationResult = await generateWithGeneratorAgent(
    modelInstance,
    params
  );

  // Validate puzzle using config validation rules
  if (config.validation.validate) {
    const validation = config.validation.validate(generationResult.puzzle);
    if (!validation.valid) {
      throw new Error(
        `Puzzle validation failed: ${validation.errors.join(", ")}`
      );
    }
  }

  // Uniqueness validation (currently rebus-specific, but structure is ready for extension)
  let uniquenessScore = 0;
  let isUnique = true;
  let fingerprint = "";

  if (puzzleType === "rebus") {
    const puzzleDisplayField = "rebusPuzzle";
    const puzzleAny = generationResult.puzzle as any;
    const puzzleText = puzzleAny[puzzleDisplayField] || puzzleAny.puzzle || "";

    if (puzzleText) {
      console.log("[Orchestrator] Validating uniqueness...");

      fingerprint = createPuzzleFingerprint({
        rebusPuzzle: puzzleText,
        answer: generationResult.puzzle.answer,
        category:
          generationResult.puzzle.category || params.category || "general",
      });

      const uniquenessCheck = await validateUniqueness({
        rebusPuzzle: puzzleText,
        answer: generationResult.puzzle.answer,
        category:
          generationResult.puzzle.category || params.category || "general",
        explanation: generationResult.puzzle.explanation || "",
      });

      isUnique = uniquenessCheck.isUnique;
      if (!isUnique && uniquenessCheck.similarityScore > 0.8) {
        throw new Error(
          `Puzzle failed uniqueness check (similarity: ${uniquenessCheck.similarityScore})`
        );
      }

      uniquenessScore = await calculateUniquenessScore({
        rebusPuzzle: puzzleText,
        answer: generationResult.puzzle.answer,
        category:
          generationResult.puzzle.category || params.category || "general",
        explanation: generationResult.puzzle.explanation || "",
      });
    }
  } else {
    // For non-rebus puzzles, set default values
    fingerprint = createPuzzleFingerprint({
      rebusPuzzle: generationResult.puzzle.puzzle || "",
      answer: generationResult.puzzle.answer,
      category:
        generationResult.puzzle.category || params.category || "general",
    });
    uniquenessScore = 50; // Default score for non-rebus puzzles
  }

  // Agent 2: Quality Evaluator Agent (uses quality pipeline)
  console.log("[Orchestrator] Agent 2: Evaluating quality with pipeline...");
  const qualityResult = await evaluateQualityWithAgent(
    modelInstance,
    generationResult.puzzle,
    {
      skipAdversarial: false, // Can be made configurable
    }
  );

  // Agent 3: Difficulty Calibrator Agent (uses calibrateDifficulty or config)
  console.log("[Orchestrator] Agent 3: Calibrating difficulty...");
  const difficultyResult = await calibrateDifficultyWithAgent(
    modelInstance,
    generationResult.puzzle,
    params.targetDifficulty,
    puzzleType
  );

  // Final puzzle with adjustments
  const finalPuzzle: Puzzle = {
    ...generationResult.puzzle,
    difficulty: difficultyResult.adjustedDifficulty,
  };

  return {
    puzzle: finalPuzzle,
    qualityScore: qualityResult.qualityScore,
    reasoning: qualityResult.reasoning,
    suggestions: qualityResult.suggestions,
    metadata: {
      fingerprint,
      uniquenessScore,
      difficultyProfile: difficultyResult.difficultyProfile || {},
      calibratedDifficulty: difficultyResult.adjustedDifficulty,
      qualityMetrics: qualityResult.qualityMetrics,
      aiThinking: generationResult.thinking,
    },
    isUnique,
  };
}

/**
 * Orchestrate quality review of an existing puzzle
 * Uses multiple agents to thoroughly evaluate puzzle quality
 */
export async function orchestrateQualityReview(puzzle: Puzzle): Promise<{
  qualityScore: number;
  issues: string[];
  strengths: string[];
  suggestions: string[];
  reasoning: string;
}> {
  const provider = getAIProvider();
  const modelInstance = provider.getModelInstance("smart");

  // Use tools to gather context
  // Directly import and call the underlying function instead of using the tool wrapper
  const { findSimilarPuzzles } = await import("../services/semantic-search");
  const similarPuzzlesResults = await findSimilarPuzzles(puzzle.id, 5, 0.7);
  const similarPuzzles = {
    success: true as const,
    results: similarPuzzlesResults.map((r) => ({
      puzzleId: r.puzzle.id,
      answer: r.puzzle.answer,
      similarity: r.similarity,
      category: r.puzzle.category,
      difficulty: r.puzzle.difficulty,
    })),
    count: similarPuzzlesResults.length,
  };

  // Agent: Comprehensive Quality Evaluator
  const reviewResult = await evaluateQualityWithAgent(modelInstance, puzzle, {
    similarPuzzles: similarPuzzles.success ? similarPuzzles.results : [],
  });

  return {
    qualityScore: reviewResult.qualityScore,
    issues: reviewResult.issues,
    strengths: reviewResult.strengths,
    suggestions: reviewResult.suggestions,
    reasoning: reviewResult.reasoning,
  };
}

/**
 * Orchestrate personalized puzzle generation for a user
 * Considers user history, preferences, and skill level
 */
export async function orchestratePersonalizedGeneration(
  userId: string,
  params: {
    targetDifficulty?: number;
    category?: string;
    theme?: string;
    puzzleType?: string;
  }
): Promise<{
  puzzle: Puzzle;
  qualityScore: number;
  personalizationScore: number;
  reasoning: string;
}> {
  const provider = getAIProvider();
  const modelInstance = provider.getModelInstance("smart");

  // Get user context using underlying services directly
  const { buildUserPuzzleProfile } = await import("../services/user-profiler");
  const { puzzleAttemptOps } = await import("@/db/operations");
  const { puzzleOps } = await import("@/db/operations");

  let userProfile = null;
  let userHistory = null;

  try {
    const profile = await buildUserPuzzleProfile(userId);
    userProfile = {
      userId: profile.userId,
      skillLevel: profile.skillLevel,
      skillScore: profile.skillScore,
      preferredDifficultyRange: profile.preferredDifficultyRange,
      favoriteCategories: profile.favoriteCategories,
      preferredPuzzleTypes: profile.preferredPuzzleTypes,
      averageTimeToSolve: profile.averageTimeToSolve,
      hintUsagePattern: profile.hintUsagePattern,
      engagementLevel: profile.engagementLevel,
      totalPuzzlesAttempted: profile.totalPuzzlesAttempted,
      totalPuzzlesSolved: profile.totalPuzzlesSolved,
      solveRate: profile.solveRate,
      streakDays: profile.streakDays,
    };
  } catch (error) {
    console.error("Error building user profile:", error);
  }

  try {
    const attempts = await puzzleAttemptOps.getUserAttempts(userId, 20);
    const puzzleIds = Array.from(new Set(attempts.map((a) => a.puzzleId)));
    const puzzles = await Promise.all(
      puzzleIds.map((id) => puzzleOps.findById(id))
    );

    const solvedCount = attempts.filter((a) => a.isCorrect).length;
    const averageTime =
      attempts
        .filter((a) => a.timeSpentSeconds)
        .reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) /
      attempts.filter((a) => a.timeSpentSeconds).length;

    userHistory = {
      totalAttempts: attempts.length,
      solvedCount,
      solveRate: attempts.length > 0 ? solvedCount / attempts.length : 0,
      averageTimeToSolve: averageTime || 0,
      recentAttempts: attempts.slice(0, 10).map((a) => ({
        puzzleId: a.puzzleId,
        isCorrect: a.isCorrect,
        attemptedAt: a.attemptedAt,
        timeSpent: a.timeSpentSeconds,
        hintsUsed: a.hintsUsed,
      })),
      uniquePuzzlesAttempted: puzzleIds.length,
    };
  } catch (error) {
    console.error("Error getting user history:", error);
  }

  const userContext = {
    profile: userProfile,
    history: userHistory,
  };

  // Agent: Personalized Generator Agent
  const personalizedResult = await generatePersonalizedWithAgent(
    modelInstance,
    {
      ...params,
      userContext,
    }
  );

  return {
    puzzle: personalizedResult.puzzle,
    qualityScore: personalizedResult.qualityScore,
    personalizationScore: personalizedResult.personalizationScore,
    reasoning: personalizedResult.reasoning,
  };
}

// ============================================================================
// AGENT IMPLEMENTATIONS
// ============================================================================

/**
 * Puzzle Generator Agent
 * Enhanced to use chain-of-thought generation with config support
 */
async function generateWithGeneratorAgent(
  model: Parameters<typeof generateObject>[0]["model"] | any,
  params: {
    targetDifficulty: number;
    category?: string;
    theme?: string;
    puzzleType?: string;
    requireNovelty?: boolean;
  }
): Promise<{
  puzzle: Puzzle;
  thinking?: any;
}> {
  // Use sophisticated chain-of-thought generation
  const puzzleType = params.puzzleType || "rebus";
  const chainResult = await generateWithChainOfThought({
    targetDifficulty: params.targetDifficulty,
    requireNovelty: params.requireNovelty,
    puzzleType,
  });

  const candidatePuzzle = chainResult.puzzle;

  // Convert to Puzzle format - handle both rebus and other puzzle types
  const puzzleDisplayField = puzzleType === "rebus" ? "rebusPuzzle" : "puzzle";
  const puzzleAny = candidatePuzzle as any;
  const puzzleText =
    puzzleAny[puzzleDisplayField] ||
    puzzleAny.puzzle ||
    puzzleAny.rebusPuzzle ||
    "";

  return {
    puzzle: {
      id: `temp-${Date.now()}`,
      puzzle: puzzleText,
      puzzleType,
      answer: candidatePuzzle.answer,
      difficulty: candidatePuzzle.difficulty,
      category: candidatePuzzle.category || params.category || "general",
      explanation: candidatePuzzle.explanation || "",
      hints: candidatePuzzle.hints || [],
      publishedAt: new Date(),
      createdAt: new Date(),
      active: false,
      // Preserve rebusPuzzle field for backward compatibility if it's a rebus puzzle
      ...(puzzleType === "rebus" && puzzleText
        ? { rebusPuzzle: puzzleText }
        : {}),
    } as Puzzle,
    thinking: chainResult.thinking,
  };
}

/**
 * Quality Evaluator Agent
 * Enhanced to use sophisticated quality assurance pipeline
 */
async function evaluateQualityWithAgent(
  model: Parameters<typeof generateText>[0]["model"] | any,
  puzzle: Puzzle,
  context?: { similarPuzzles?: unknown[]; skipAdversarial?: boolean }
): Promise<{
  qualityScore: number;
  issues: string[];
  strengths: string[];
  suggestions: string[];
  reasoning: string;
  qualityMetrics: any;
  verdict: "publish" | "revise" | "reject";
}> {
  // Prepare puzzle data for quality pipeline
  // Handle both rebus and other puzzle types
  const puzzleType = puzzle.puzzleType || "rebus";
  const puzzleDisplayField = puzzleType === "rebus" ? "rebusPuzzle" : "puzzle";
  const puzzleAny = puzzle as any;
  const puzzleText = puzzleAny[puzzleDisplayField] || puzzleAny.puzzle || "";

  const qualityPuzzleData: any = {
    answer: puzzle.answer,
    explanation: puzzle.explanation || "",
    difficulty: typeof puzzle.difficulty === "number" ? puzzle.difficulty : 5,
    hints: puzzle.hints || [],
  };

  // Add type-specific fields
  if (puzzleType === "rebus" && puzzleText) {
    qualityPuzzleData.rebusPuzzle = puzzleText;
  } else if (puzzleText) {
    // For non-rebus puzzles, use puzzle field
    qualityPuzzleData.puzzle = puzzleText;
  }

  // Use sophisticated quality pipeline
  const qualityResults = await runQualityPipeline(qualityPuzzleData, {
    skipAdversarial: context?.skipAdversarial,
  });

  // Extract results in agent-compatible format
  return {
    qualityScore: qualityResults.finalScore,
    issues: qualityResults.qualityMetrics.analysis.weaknesses || [],
    strengths: qualityResults.qualityMetrics.analysis.strengths || [],
    suggestions: qualityResults.actionItems || [],
    reasoning: qualityResults.qualityMetrics.detailedFeedback || "",
    qualityMetrics: qualityResults.qualityMetrics,
    verdict: qualityResults.verdict,
  };
}

/**
 * Difficulty Calibrator Agent
 * Enhanced to use sophisticated difficulty calibration service or config-driven calculation
 */
async function calibrateDifficultyWithAgent(
  model: Parameters<typeof generateText>[0]["model"] | any,
  puzzle: Puzzle,
  targetDifficulty: number,
  puzzleType?: string
): Promise<{
  adjustedDifficulty: number;
  reasoning: string;
  factors: Array<{ factor: string; impact: string }>;
  difficultyProfile?: any;
}> {
  const puzzleTypeToUse = puzzleType || puzzle.puzzleType || "rebus";
  const config = getPuzzleTypeConfig(puzzleTypeToUse);

  let calibratedDifficulty: number = targetDifficulty;
  let difficultyProfile: any;
  let reasoning = "Difficulty calibration not available";
  let factors: Array<{ factor: string; impact: string }> = [];
  let configCalculationSuccessful = false;

  // Use config's difficulty calculation if available
  if (config.difficulty.calculate) {
    // Config-driven difficulty calculation
    const puzzleAny = puzzle as any;
    try {
      calibratedDifficulty = config.difficulty.calculate(puzzleAny);
      configCalculationSuccessful = true;

      // Extract difficulty profile from config factors
      difficultyProfile = {
        factors: config.difficulty.factors.map((factor) => ({
          name: factor.name,
          value: factor.extract(puzzleAny),
          weight: factor.weight,
        })),
        overall: calibratedDifficulty,
      };

      // Build factors array for return
      factors = config.difficulty.factors.map((factor) => ({
        factor: factor.name,
        impact: `Weight: ${factor.weight}, Value: ${factor.extract(puzzleAny)}`,
      }));

      reasoning = `Difficulty calculated using config-driven factors: ${calibratedDifficulty}/10 (target: ${targetDifficulty}/10)`;
    } catch (error) {
      // Config calculation failed - fall back to service-based calibration
      console.warn(
        `[Orchestrator] Config difficulty calculation failed, falling back to service: ${error instanceof Error ? error.message : String(error)}`
      );
      // calibratedDifficulty already initialized to targetDifficulty, will trigger fallback check
    }
  }

  // If config calculation failed or wasn't available, use service-based calibration
  if (!configCalculationSuccessful) {
    // Fallback to AI calibration (for rebus puzzles)
    const puzzleTypeForCalibration =
      puzzleTypeToUse === "rebus" ? puzzleTypeToUse : "rebus";
    const puzzleDisplayField =
      puzzleTypeForCalibration === "rebus" ? "rebusPuzzle" : "puzzle";
    const puzzleAny = puzzle as any;
    const puzzleText = puzzleAny[puzzleDisplayField] || puzzleAny.puzzle || "";

    if (puzzleTypeForCalibration === "rebus" && puzzleText) {
      const calibration = await calibrateDifficulty({
        rebusPuzzle: puzzleText,
        answer: puzzle.answer,
        proposedDifficulty:
          typeof puzzle.difficulty === "number" ? puzzle.difficulty : 5,
        hints: puzzle.hints || [],
      });

      calibratedDifficulty = calibration.calibratedDifficulty;
      difficultyProfile = calibration.difficultyProfile;
      reasoning = calibration.recommendation;

      // Convert difficulty profile to factors format
      factors = Object.entries(difficultyProfile)
        .filter(([key]) => key !== "overallDifficulty")
        .map(([key, value]) => ({
          factor: key,
          impact: `Score: ${value}`,
        }));
    } else {
      // Default fallback
      calibratedDifficulty =
        typeof puzzle.difficulty === "number"
          ? puzzle.difficulty
          : targetDifficulty;
      difficultyProfile = {};
      reasoning =
        "Using proposed difficulty (no calibration available for this puzzle type)";
      factors = [];
    }
  }

  return {
    adjustedDifficulty: calibratedDifficulty,
    reasoning,
    factors,
    difficultyProfile,
  };
}

/**
 * Personalized Generator Agent
 */
async function generatePersonalizedWithAgent(
  model: Parameters<typeof generateObject>[0]["model"] | any,
  params: {
    targetDifficulty?: number;
    category?: string;
    theme?: string;
    puzzleType?: string;
    userContext: {
      profile: unknown;
      history: unknown;
    };
  }
) {
  const PersonalizedSchema = z.object({
    puzzle: z.object({
      puzzle: z.string(),
      answer: z.string(),
      difficulty: z.number(),
      category: z.string(),
      explanation: z.string(),
      hints: z.array(z.string()),
    }),
    qualityScore: z.number(),
    personalizationScore: z.number(),
    reasoning: z.string(),
  });

  const systemPrompt =
    "You are a personalized puzzle generation expert. Create puzzles tailored to individual user preferences and skill levels.";

  const userInfo = params.userContext.profile
    ? `User Profile: ${JSON.stringify(params.userContext.profile, null, 2)}`
    : "";
  const historyInfo = params.userContext.history
    ? `User History: ${JSON.stringify(params.userContext.history, null, 2)}`
    : "";

  const prompt = `Generate a personalized puzzle:

${userInfo}
${historyInfo}

Target Difficulty: ${params.targetDifficulty || "user preference"}
${params.category ? `Category: ${params.category}` : ""}
${params.theme ? `Theme: ${params.theme}` : ""}
${params.puzzleType ? `Type: ${params.puzzleType}` : ""}

Create a puzzle that matches the user's skill level, preferences, and history while still providing a fresh challenge.`;

  const result = await generateObject({
    model,
    prompt,
    system: systemPrompt,
    schema: PersonalizedSchema,
  });

  return {
    puzzle: {
      id: `temp-${Date.now()}`,
      puzzle: result.object.puzzle.puzzle,
      puzzleType: params.puzzleType || "rebus",
      answer: result.object.puzzle.answer,
      difficulty: result.object.puzzle.difficulty,
      category: result.object.puzzle.category,
      explanation: result.object.puzzle.explanation,
      hints: result.object.puzzle.hints,
      publishedAt: new Date(),
      createdAt: new Date(),
      active: false,
    } as Puzzle,
    qualityScore: result.object.qualityScore,
    personalizationScore: result.object.personalizationScore,
    reasoning: result.object.reasoning,
  };
}
