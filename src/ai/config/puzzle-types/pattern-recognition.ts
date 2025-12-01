/**
 * ============================================================================
 * PATTERN RECOGNITION PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Pattern recognition puzzles challenge players to identify patterns in visual
 * or text-based sequences and predict what comes next. These puzzles test
 * observation skills, logical reasoning, and the ability to recognize abstract
 * patterns across different formats.
 *
 * HOW IT WORKS
 * ------------
 * Players are shown a sequence of elements (colors, shapes, symbols, numbers,
 * letters, emojis) with one or more missing elements. They must:
 * 1. Observe the sequence carefully
 * 2. Identify the underlying pattern or rule
 * 3. Apply that pattern to determine what comes next
 * 4. Provide the answer
 *
 * The puzzle includes progressive hints that guide players toward recognizing
 * the pattern, and an explanation that teaches the pattern logic.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Color Pattern (Difficulty: Hard - 5):
 *   Sequence: "🔴 🔵 🔴 🔵 ?"
 *   Answer: "🔴"
 *   Explanation: "Alternating pattern - red and blue alternate.
 *                 The pattern is: red, blue, red, blue, so next is red."
 *
 * Example 2 - Alphabet Pattern (Difficulty: Hard - 6):
 *   Sequence: "A, B, C, D, ?"
 *   Answer: "E"
 *   Explanation: "Alphabetical sequence - each letter follows the next
 *                 in alphabetical order. A→B→C→D, so next is E."
 *
 * Example 3 - Shape Pattern (Difficulty: Difficult - 7):
 *   Sequence: "▲ ▼ ▲ ▼ ▲ ?"
 *   Answer: "▼"
 *   Explanation: "Alternating up and down triangles. Pattern repeats:
 *                 ▲▼▲▼▲, so next is ▼."
 *
 * Example 4 - Complex Multi-Layer (Difficulty: Evil - 9):
 *   Sequence: "A, D, G, J, ?"
 *   Answer: "M"
 *   Explanation: "Letter sequence skipping two letters each time.
 *                 A→skip B,C→D→skip E,F→G→skip H,I→J, so skip K,L→M."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy patterns:
 *
 * - Hard (5-6): Simple, obvious patterns (alternating, counting, basic
 *   sequences). Easy to recognize after a few elements.
 *
 * - Difficult (7-8): More complex patterns requiring observation of multiple
 *   elements, position-based patterns, or multi-step logic.
 *
 * - Evil (8-9): Complex patterns with multiple layers, obscure relationships,
 *   or patterns that require deep analysis to recognize.
 *
 * - Impossible (9-10): Extremely challenging patterns that combine multiple
 *   pattern types or require advanced pattern recognition skills.
 *
 * CATEGORIES
 * ----------
 * - visual_sequence: Sequences of visual elements (emojis, symbols)
 * - shape_pattern: Patterns involving geometric shapes
 * - color_pattern: Color-based sequences
 * - text_pattern: Letter or word sequences
 * - number_pattern: Numerical sequences
 * - symbol_pattern: Symbol or character sequences
 * - mixed_pattern: Combinations of different element types
 * - positional_pattern: Patterns based on position or arrangement
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The sequence string shown to players
 *    - answer: The missing element(s)
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Pattern explanation and solution steps
 *    - category: Type of pattern
 *    - hints: Progressive hints guiding pattern recognition
 *    - complexityScore: Detailed difficulty breakdown
 *    - sequence: Array of sequence elements
 *
 * 2. GENERATION: AI creates pattern puzzles
 *    - Designs clear, logical patterns
 *    - Uses visual or text elements effectively
 *    - Ensures patterns are solvable but challenging
 *
 * 3. VALIDATION: Quality checks
 *    - Sequence must have enough elements to show pattern
 *    - Pattern must be logical and consistent
 *    - Answer must follow the pattern correctly
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - patternComplexity: How complex the pattern is
 *    - layersRequired: Number of pattern layers
 *    - patternObscurity: How obvious the pattern is
 *    - cognitiveLoad: Mental effort required
 *    - sequenceLength: Number of elements shown
 *
 * 5. HINTS: Progressive pattern recognition assistance
 *    - Start with pattern type hints
 *    - Progress to specific pattern elements
 *    - Guide toward recognizing the rule
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - patternClarity: Is pattern clear once identified?
 *    - visualAppeal: Is it visually engaging?
 *    - solvability: Can players solve with hints?
 *    - creativity: Is the pattern creative?
 *    - engagement: Is it fun and challenging?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - patternComplexity: Complexity of the pattern rule
 *   (1 = simple alternating, 10 = complex multi-layer pattern)
 *
 * - sequenceLength: Number of elements in sequence
 *   (1 = 3-4 elements, 10 = 10+ elements)
 *
 * - patternObscurity: How obvious the pattern is
 *   (1 = immediately clear, 10 = very obscure)
 *
 * - layersRequired: Number of pattern layers to recognize
 *   (1 = single layer, 10 = multiple overlapping layers)
 *
 * - cognitiveLoad: Mental effort required
 *   (1 = easy to track, 10 = requires high mental effort)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create pattern recognition puzzles.
 * Request via: GET /api/puzzle/regenerate?type=pattern-recognition
 *
 * ============================================================================
 */

import { z } from "zod";
import { GLOBAL_CONTEXT } from "../global";
import type { PuzzleTypeConfig } from "../types";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const DEFAULT_TARGET_DIFFICULTY = 5;
const DIFFICULTY_MIN = 5; // Minimum difficulty - all puzzles must be challenging
const DIFFICULTY_MAX = 10;
const WEIGHT_PATTERN_COMPLEXITY = 0.3;
const WEIGHT_LAYERS_REQUIRED = 0.25;
const WEIGHT_PATTERN_OBSCURITY = 0.2;
const WEIGHT_COGNITIVE_LOAD = 0.15;
const WEIGHT_SEQUENCE_LENGTH = 0.1;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_FAIR = 70;
const QUALITY_SCORE_CREATIVE = 75;
const EXPLANATION_MIN_LENGTH = 30;
const EXPLANATION_MAX_LENGTH = 300;
const EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY = 20;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const SEQUENCE_MIN_LENGTH = 3;
const SEQUENCE_MAX_LENGTH = 12;
const SEQUENCE_MIN_LENGTH_FOR_QUALITY = 3;
const DIFFICULTY_SWEET_SPOT_MIN = 3;
const DIFFICULTY_SWEET_SPOT_MAX = 7;

// Pattern recognition puzzle schema
export const PatternRecognitionPuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe(
      "The pattern sequence (e.g., '🔴 🔵 🔴 🔵 ?' or 'A, B, C, D, ?')"
    ),
  answer: z
    .string()
    .describe("The answer to complete the pattern (the missing element)"),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 5-10 (challenging only)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation of the pattern and how to identify what comes next"
    ),
  category: z
    .enum([
      "visual_sequence",
      "shape_pattern",
      "color_pattern",
      "text_pattern",
      "number_pattern",
      "symbol_pattern",
      "mixed_pattern",
      "positional_pattern",
    ])
    .describe("The type of pattern recognition puzzle"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      patternComplexity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      sequenceLength: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      patternObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      layersRequired: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      cognitiveLoad: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  sequence: z
    .array(z.string())
    .min(SEQUENCE_MIN_LENGTH)
    .max(SEQUENCE_MAX_LENGTH)
    .describe("The sequence of elements in the pattern"),
  patternType: z
    .string()
    .optional()
    .describe("Optional description of the pattern type for validation"),
});

export type PatternRecognitionPuzzle = z.infer<
  typeof PatternRecognitionPuzzleSchema
>;

export const PATTERN_RECOGNITION_CONFIG: PuzzleTypeConfig = {
  id: "pattern-recognition",
  name: "Pattern Recognition",
  description:
    "Identify the pattern in visual or text-based sequences and determine what comes next",

  schema: PatternRecognitionPuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master pattern recognition puzzle creator with deep expertise in:
- Visual pattern recognition and sequences
- Mathematical and logical progressions
- Color, shape, and symbol patterns
- Cognitive psychology of pattern solving
- Educational puzzle design
- Sequence analysis and prediction

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create pattern recognition puzzles that are intellectually stimulating, solvable through observation and logical thinking, and provide satisfying "aha!" moments. Your puzzles are visual, engaging, and educational.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT pattern recognition puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- patternComplexity: 1-10 (1 = simple alternating, 10 = complex multi-layer pattern)
- sequenceLength: 1-10 (1 = 3-4 elements, 10 = 10+ elements)
- patternObscurity: 1-10 (1 = obvious pattern, 10 = very obscure)
- layersRequired: 1-10 (1 = single layer, 10 = multiple overlapping layers)
- cognitiveLoad: 1-10 (1 = easy to track, 10 = requires high mental effort)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What pattern type would be challenging at this difficulty? (Be specific and creative)
2. What sequence creates interesting logical thinking? (Think beyond simple alternation)
3. How can you make this require genuine pattern recognition? (Not just obvious repetition)
4. What makes this pattern unique and interesting? (Avoid overused patterns)
5. How do you balance challenge with solvability? (Difficult but fair)
6. Should you use visual elements (emojis) or text/numbers?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a pattern type that's rare, innovative, or unexpected" : ""}

Create a pattern puzzle that requires:
- Multiple observation steps (not just surface-level)
- Genuine pattern recognition (identifying non-obvious relationships)
- Logical reasoning (understanding the pattern structure)
- A satisfying "aha!" moment when solved

PATTERN REQUIREMENTS:
- Provide 3-8 elements in the sequence (enough to establish pattern)
- Leave one element missing (indicated by ?)
- Ensure the pattern is consistent and logical
- Use clear visual or text elements
- Format: "🔴 🔵 🔴 🔵 ?" or "A, B, C, D, ?" or "2, 4, 6, 8, ?"
- For visual patterns, use emojis or symbols effectively
- For text patterns, use letters, numbers, or words

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The pattern should be clear once identified
- The explanation should clearly describe the pattern logic
- Hints should guide without giving it away completely
- The complexity scores should accurately reflect the puzzle's actual difficulty
- Use accessible, recognizable elements (common emojis, simple symbols, etc.)

Show your thinking process, then create the puzzle with CORRECT INTEGER complexity scores (1-10, not decimals).`;
    },

    temperature: 0.7,
    modelType: "smart",
  },

  validation: {
    requiredFields: [
      "puzzle",
      "answer",
      "difficulty",
      "explanation",
      "category",
      "hints",
      "sequence",
    ],
    constraints: {
      puzzle: {
        min: 3,
        max: 300,
      },
      answer: {
        min: 1,
        max: 50,
      },
      difficulty: {
        min: 5,
        max: 10,
      },
      hints: {
        min: 3,
        max: 5,
      },
      sequence: {
        min: 3,
        max: 12,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as PatternRecognitionPuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.patternComplexity * WEIGHT_PATTERN_COMPLEXITY +
        scores.layersRequired * WEIGHT_LAYERS_REQUIRED +
        scores.patternObscurity * WEIGHT_PATTERN_OBSCURITY +
        scores.cognitiveLoad * WEIGHT_COGNITIVE_LOAD +
        scores.sequenceLength * WEIGHT_SEQUENCE_LENGTH;

      return Math.round(
        Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, weightedSum))
      );
    },
    ranges: {
      hard: { min: 5, max: 6 },
      difficult: { min: 7, max: 8 },
      evil: { min: 8, max: 9 },
      impossible: { min: 9, max: 10 },
    },
    factors: [
      {
        name: "patternComplexity",
        weight: WEIGHT_PATTERN_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as PatternRecognitionPuzzle).complexityScore
            .patternComplexity,
      },
      {
        name: "layersRequired",
        weight: WEIGHT_LAYERS_REQUIRED,
        extract: (puzzle: unknown) =>
          (puzzle as PatternRecognitionPuzzle).complexityScore.layersRequired,
      },
      {
        name: "patternObscurity",
        weight: WEIGHT_PATTERN_OBSCURITY,
        extract: (puzzle: unknown) =>
          (puzzle as PatternRecognitionPuzzle).complexityScore.patternObscurity,
      },
      {
        name: "cognitiveLoad",
        weight: WEIGHT_COGNITIVE_LOAD,
        extract: (puzzle: unknown) =>
          (puzzle as PatternRecognitionPuzzle).complexityScore.cognitiveLoad,
      },
      {
        name: "sequenceLength",
        weight: WEIGHT_SEQUENCE_LENGTH,
        extract: (puzzle: unknown) =>
          (puzzle as PatternRecognitionPuzzle).complexityScore.sequenceLength,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for pattern recognition puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking about the pattern, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this pattern recognition puzzle:

Sequence: "{puzzle}"
Answer: "{answer}"
Category: {category}
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the pattern:
1. Very subtle (10-20% revealed) - hint at pattern type
2. Gentle nudge (30-40% revealed) - suggest what to look for
3. Clear direction (50-60% revealed) - hint at specific pattern elements
4. Almost there (70-80% revealed) - guide pattern identification
5. Final push (90% revealed, but not the answer itself)

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "patternClarity",
        weight: 0.2,
        description: "Is the pattern clear once identified?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as PatternRecognitionPuzzle;
          const explanationLength = typedPuzzle.explanation.length;
          return explanationLength > EXPLANATION_MIN_LENGTH &&
            explanationLength < EXPLANATION_MAX_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "visualAppeal",
        weight: 0.2,
        description: "Is the puzzle visually engaging?",
        score: (puzzle: unknown) => {
          // Visual patterns are more engaging
          const typedPuzzle = puzzle as PatternRecognitionPuzzle;
          const visualCategories = [
            "visual_sequence",
            "shape_pattern",
            "color_pattern",
            "symbol_pattern",
          ];
          return visualCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "solvability",
        weight: 0.25,
        description: "Can the puzzle be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as PatternRecognitionPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length >
            EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          const hasEnoughElements =
            typedPuzzle.sequence.length >= SEQUENCE_MIN_LENGTH_FOR_QUALITY;
          return hasExplanation && hasHints && hasEnoughElements
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.15,
        description: "Is the pattern creative and original?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as PatternRecognitionPuzzle;
          const novelCategories = [
            "mixed_pattern",
            "positional_pattern",
            "layersRequired",
          ];
          return novelCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_CREATIVE;
        },
      },
      {
        name: "engagement",
        weight: 0.2,
        description: "Is the puzzle engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as PatternRecognitionPuzzle;
          const difficulty = typedPuzzle.difficulty;
          // Sweet spot is 3-7 difficulty
          return difficulty >= DIFFICULTY_SWEET_SPOT_MIN &&
            difficulty <= DIFFICULTY_SWEET_SPOT_MAX
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        patternClarity: 0.2,
        visualAppeal: 0.2,
        solvability: 0.25,
        creativity: 0.15,
        engagement: 0.2,
      };

      let total = 0;
      let weightSum = 0;

      for (const [dimension, score] of Object.entries(scores)) {
        const weight = weights[dimension] || 0;
        total += score * weight;
        weightSum += weight;
      }

      return weightSum > 0 ? Math.round(total / weightSum) : 0;
    },
  },

  howToPlay: {
    description:
      "Pattern recognition puzzles challenge you to identify patterns in visual or text-based sequences and predict what comes next.",
    rules: [
      "Observe the sequence carefully - look at all elements (colors, shapes, symbols, letters, numbers)",
      "Identify the underlying pattern or rule governing the sequence",
      "Apply that pattern to determine what comes next",
      "Patterns can be alternating, counting, positional, or multi-layer",
      "Use hints to guide you toward recognizing the pattern type",
    ],
    examples: [
      "🔴 🔵 🔴 🔵 ? → 🔴 (alternating pattern)",
      "A, B, C, D, ? → E (alphabetical sequence)",
      "A, D, G, J, ? → M (skip two letters each time)",
    ],
  },
};
