/**
 * Advanced AI-Powered Puzzle Generator
 *
 * Uses sophisticated AI techniques to generate truly unique,
 * challenging, and high-quality puzzles
 *
 * Now config-driven to support multiple puzzle types
 */

import { z } from "zod";
import { generateAIObject, withRetry } from "../client";
import { getPuzzleTypeConfig } from "../config/puzzle-types";
import { ChainOfThoughtRebusSchema } from "../config/puzzle-types/rebus";

// ============================================================================
// SCHEMAS
// ============================================================================

const ChainOfThoughtPuzzleSchema = z.object({
  thinking: z.object({
    concept: z.string().describe("The core concept to represent"),
    visualStrategy: z.string().describe("How to represent it visually"),
    layers: z.array(z.string()).describe("Multiple layers of meaning"),
    challengeElements: z
      .array(z.string())
      .describe("What makes this challenging"),
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
    complexityScore: z
      .object({
        visualAmbiguity: z
          .number()
          .min(1)
          .max(10)
          .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
        cognitiveSteps: z
          .number()
          .min(1)
          .max(10)
          .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
        culturalKnowledge: z
          .number()
          .min(1)
          .max(10)
          .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
        vocabularyLevel: z
          .number()
          .min(1)
          .max(10)
          .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
        patternNovelty: z
          .number()
          .min(1)
          .max(10)
          .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      })
      .describe(
        "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
      ),
  }),
});

// ============================================================================
// ADVANCED GENERATION TECHNIQUES
// ============================================================================

/**
 * Generate puzzle using Chain-of-Thought reasoning
 * This forces the AI to think deeply about the puzzle structure
 *
 * Now config-driven - uses puzzle type config for prompts and schema
 */
export async function generateWithChainOfThought(params: {
  targetDifficulty: number;
  avoidPatterns?: string[];
  requireNovelty?: boolean;
  puzzleType?: string; // New: specify puzzle type (defaults to "rebus")
}): Promise<{
  puzzle: any;
  thinking?: any;
}> {
  // Get puzzle type config (default to rebus for backward compatibility)
  const puzzleType = params.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);

  // For rebus puzzles, use the chain-of-thought schema with thinking
  // For other types, we'll use the base schema
  const useChainOfThought = puzzleType === "rebus";
  const schema = useChainOfThought ? ChainOfThoughtRebusSchema : config.schema;

  // Get system prompt from config
  const systemPrompt =
    typeof config.generation.systemPrompt === "function"
      ? config.generation.systemPrompt(params)
      : config.generation.systemPrompt;

  // Get user prompt from config
  const userPrompt =
    typeof config.generation.userPromptTemplate === "function"
      ? config.generation.userPromptTemplate(params)
      : config.generation.userPromptTemplate;

  const result = await withRetry(
    async () =>
      await generateAIObject({
        prompt: userPrompt,
        system: systemPrompt,
        schema,
        temperature: config.generation.temperature,
        modelType: config.generation.modelType,
      })
  );

  // Extract puzzle and thinking based on schema structure
  if (useChainOfThought && "thinking" in result && "puzzle" in result) {
    return {
      puzzle: result.puzzle,
      thinking: result.thinking,
    };
  }

  // For non-chain-of-thought schemas, return the result directly as puzzle
  return {
    puzzle: result,
    thinking: undefined,
  };
}

// ============================================================================
// DEPRECATED FUNCTIONS REMOVED
// ============================================================================
// All deprecated functions have been removed:
// - generateWithEnsemble: Use generateWithChainOfThought instead
// - generateWithIterativeRefinement: Use generateWithChainOfThought with quality pipeline instead
// - generateWithConstitution: Quality rules handled by quality-assurance pipeline
// - generateUltraChallengingPuzzle: Use generateMasterPuzzle from master-puzzle-orchestrator instead
// ============================================================================
