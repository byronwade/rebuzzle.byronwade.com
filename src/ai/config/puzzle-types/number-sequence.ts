/**
 * ============================================================================
 * NUMBER SEQUENCE PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Number sequence puzzles challenge players to identify mathematical patterns
 * and predict the next number(s) in a sequence. These puzzles test pattern
 * recognition, mathematical reasoning, and logical thinking skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are presented with a sequence of numbers with one or more missing
 * elements (indicated by "?"). They must:
 * 1. Identify the underlying pattern or rule
 * 2. Apply that pattern to determine the missing number(s)
 * 3. Provide the answer
 *
 * The puzzle includes progressive hints that guide players toward the solution
 * without giving it away, and a detailed explanation that teaches the pattern.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Arithmetic Sequence (Difficulty: Hard - 5):
 *   Puzzle: "3, 7, 11, 15, ?"
 *   Answer: "19"
 *   Explanation: "Each number increases by 4. Starting at 3, add 4 each time:
 *                 3+4=7, 7+4=11, 11+4=15, so 15+4=19."
 *
 * Example 2 - Geometric Sequence (Difficulty: Difficult - 7):
 *   Puzzle: "2, 6, 18, 54, ?"
 *   Answer: "162"
 *   Explanation: "Each number is multiplied by 3. 2×3=6, 6×3=18, 18×3=54,
 *                 so 54×3=162."
 *
 * Example 3 - Fibonacci Sequence (Difficulty: Difficult - 8):
 *   Puzzle: "1, 1, 2, 3, 5, ?"
 *   Answer: "8"
 *   Explanation: "Fibonacci sequence - each number is the sum of the two
 *                 previous numbers. 1+1=2, 1+2=3, 2+3=5, so 3+5=8."
 *
 * Example 4 - Complex Pattern (Difficulty: Evil - 9):
 *   Puzzle: "2, 5, 11, 23, 47, ?"
 *   Answer: "95"
 *   Explanation: "Each number is double the previous plus 1. 2×2+1=5,
 *                 5×2+1=11, 11×2+1=23, 23×2+1=47, so 47×2+1=95."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * This puzzle type uses our challenging difficulty system - we NEVER generate
 * easy or medium puzzles. All puzzles are challenging and push creative thinking:
 *
 * - Hard (5-6): Requires recognizing common patterns like arithmetic or geometric
 *   sequences. May involve simple calculations.
 *
 * - Difficult (7-8): Patterns become more complex, involving multiple steps,
 *   special sequences (Fibonacci, primes), or non-linear relationships.
 *
 * - Evil (8-9): Highly creative patterns that require deep mathematical thinking,
 *   multiple layers of logic, or obscure sequence types.
 *
 * - Impossible (9-10): Extremely challenging but still solvable. May combine
 *   multiple pattern types or require advanced mathematical knowledge.
 *
 * CATEGORIES
 * ----------
 * The AI can generate different types of sequences:
 * - arithmetic: Adding/subtracting a constant value
 * - geometric: Multiplying/dividing by a constant value
 * - fibonacci: Classic Fibonacci sequence variations
 * - prime: Prime number sequences
 * - square: Square numbers (1², 2², 3², etc.)
 * - cubic: Cube numbers (1³, 2³, 3³, etc.)
 * - alternating: Patterns that alternate between rules
 * - recursive: Sequences where each term depends on previous terms
 * - polynomial: Sequences following polynomial formulas
 * - factorial: Factorial sequences (1!, 2!, 3!, etc.)
 * - power_series: Exponential or power-based sequences
 * - mixed_pattern: Combinations of multiple pattern types
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * This file defines the complete configuration for number sequence puzzles:
 *
 * 1. SCHEMA: Defines the data structure (what fields each puzzle has)
 *    - puzzle: The sequence string shown to players
 *    - answer: The correct answer (next number)
 *    - difficulty: Rating from 5-10 (challenging only)
 *    - explanation: How to solve the puzzle
 *    - category: Type of sequence pattern
 *    - hints: Progressive hints (3-5 hints)
 *    - complexityScore: Detailed difficulty breakdown
 *    - sequence: The actual number array
 *
 * 2. GENERATION: How the AI creates puzzles
 *    - systemPrompt: Instructions for the AI on creating puzzles
 *    - userPromptTemplate: Template for requesting specific puzzles
 *    - temperature: 0.7 (balanced creativity)
 *    - modelType: "smart" (uses intelligent model)
 *
 * 3. VALIDATION: Rules ensuring puzzle quality
 *    - Required fields that must be present
 *    - Constraints (min/max values, formats)
 *    - Custom validation rules
 *
 * 4. DIFFICULTY: How difficulty is calculated
 *    - calculate(): Computes overall difficulty from complexity scores
 *    - ranges: Maps difficulty numbers to level names
 *    - factors: What contributes to difficulty (pattern complexity, steps, etc.)
 *
 * 5. HINTS: Progressive hint generation
 *    - systemPrompt: How to create helpful hints
 *    - userPromptTemplate: Template for generating hints
 *    - count: 5 hints (subtle to obvious)
 *    - progression: "exponential" (each hint reveals more)
 *
 * 6. QUALITY METRICS: How to score puzzle quality
 *    - Multiple dimensions (clarity, creativity, solvability, etc.)
 *    - Weighted scoring system
 *    - Minimum thresholds for acceptance
 *
 * COMPLEXITY SCORES
 * -----------------
 * Each puzzle includes detailed complexity scores (1-10) that determine difficulty:
 *
 * - patternComplexity: How complex the pattern is
 *   (1 = simple counting, 10 = multi-layer recursive pattern)
 *
 * - mathematicalKnowledge: Math knowledge required
 *   (1 = basic arithmetic, 10 = advanced number theory)
 *
 * - stepsRequired: How many logical steps needed
 *   (1 = single step, 10 = many interconnected steps)
 *
 * - patternObscurity: How obvious the pattern is
 *   (1 = immediately clear, 10 = very hidden/obscure)
 *
 * - numberRange: Size of numbers involved
 *   (1 = small numbers, 10 = very large numbers)
 *
 * These scores are weighted and combined to produce the final difficulty (5-10).
 *
 * USAGE
 * -----
 * This configuration is used by the puzzle generation system to:
 * 1. Generate new number sequence puzzles via AI
 * 2. Validate puzzle quality and difficulty
 * 3. Provide hints when players need help
 * 4. Score puzzles for quality assurance
 *
 * The puzzle type is registered in the puzzle type registry and can be
 * requested via API: GET /api/puzzle/regenerate?type=number-sequence
 *
 * ============================================================================
 */

import { z } from "zod";
import { GLOBAL_CONTEXT, DIFFICULTY_MIN, DIFFICULTY_MAX } from "../global";
import type { PuzzleTypeConfig } from "../types";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const DEFAULT_TARGET_DIFFICULTY = 5;
const WEIGHT_PATTERN_COMPLEXITY = 0.3;
const WEIGHT_STEPS_REQUIRED = 0.25;
const WEIGHT_PATTERN_OBSCURITY = 0.2;
const WEIGHT_MATHEMATICAL_KNOWLEDGE = 0.15;
const WEIGHT_NUMBER_RANGE = 0.1;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_FAIR = 70;
const SEQUENCE_MIN_LENGTH = 4;
const SEQUENCE_MAX_LENGTH = 10;
const EXPLANATION_MIN_LENGTH = 30;
const EXPLANATION_MAX_LENGTH = 300;
const EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY = 20;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const SEQUENCE_MIN_LENGTH_FOR_QUALITY = 4;
const DIFFICULTY_SWEET_SPOT_MIN = 4;
const DIFFICULTY_SWEET_SPOT_MAX = 7;
const QUALITY_SCORE_EXCELLENT = 90;

// Number sequence puzzle schema
export const NumberSequencePuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe("The number sequence puzzle (e.g., '2, 4, 8, 16, ?')"),
  answer: z
    .string()
    .describe("The answer to the puzzle (the next number(s) in the sequence)"),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 4-8 (mid-level challenging)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation of the pattern and how to arrive at the answer"
    ),
  category: z
    .enum([
      "arithmetic",
      "geometric",
      "fibonacci",
      "prime",
      "square",
      "cubic",
      "alternating",
      "recursive",
      "polynomial",
      "factorial",
      "power_series",
      "mixed_pattern",
    ])
    .describe("The type of number sequence pattern"),
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
      mathematicalKnowledge: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      stepsRequired: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      patternObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      numberRange: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  sequence: z
    .array(z.number())
    .min(SEQUENCE_MIN_LENGTH)
    .max(SEQUENCE_MAX_LENGTH)
    .describe("The actual sequence of numbers in the puzzle"),
  patternDescription: z
    .string()
    .optional()
    .describe("Optional description of the pattern type for validation"),
});

export type NumberSequencePuzzle = z.infer<typeof NumberSequencePuzzleSchema>;

export const NUMBER_SEQUENCE_CONFIG: PuzzleTypeConfig = {
  id: "number-sequence",
  name: "Number Sequence",
  description: "Identify the pattern and find the next number(s) in a sequence",

  schema: NumberSequencePuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master number sequence puzzle creator with deep expertise in:
- Mathematical patterns and sequences
- Arithmetic, geometric, and recursive progressions
- Prime numbers, Fibonacci sequences, and special number series
- Pattern recognition and sequence analysis
- Educational mathematics and number theory
- Cognitive psychology of pattern solving
- Puzzle difficulty calibration

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create number sequence puzzles that are intellectually stimulating, solvable through pattern recognition, and provide satisfying "aha!" moments. Your puzzles require genuine mathematical thinking while remaining accessible and educational.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT number sequence puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- patternComplexity: 1-10 (1 = simple arithmetic, 10 = complex multi-layer pattern)
- mathematicalKnowledge: 1-10 (1 = basic math, 10 = advanced number theory)
- stepsRequired: 1-10 (1 = single step, 10 = many steps to identify pattern)
- patternObscurity: 1-10 (1 = obvious pattern, 10 = highly obscure)
- numberRange: 1-10 (1 = small numbers, 10 = very large numbers)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What pattern would be challenging at this difficulty level? (Be specific and creative)
2. What type of sequence creates interesting logical thinking? (Think beyond simple arithmetic)
3. How can you make this require genuine pattern recognition? (Not just obvious counting)
4. What makes this sequence unique and novel? (Avoid overused patterns)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What mathematical processes will solvers need? (Pattern recognition, calculation, logical reasoning)

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a pattern type that's rare, innovative, or unexpected" : ""}

Create a sequence puzzle that requires:
- Multiple cognitive steps (not just obvious counting)
- Genuine pattern recognition (identifying non-obvious relationships)
- Mathematical reasoning (arithmetic, geometric, or logical patterns)
- A satisfying "aha!" moment when solved (not just "oh, I see it now")

SEQUENCE REQUIREMENTS:
- Provide 4-8 numbers in the sequence (enough to establish pattern)
- Leave one or more numbers missing (indicated by ?)
- Ensure the pattern is consistent and logical
- Make sure the answer is a single number or short sequence
- Format: "2, 4, 8, 16, ?" or "1, 1, 2, 3, 5, ?"

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The answer should make perfect sense once the pattern is understood
- The explanation should clearly describe the pattern and steps
- Hints should guide without giving it away
- The complexity scores should accurately reflect the puzzle's actual difficulty

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
        min: 5,
        max: 200,
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
        min: 4,
        max: 10,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as NumberSequencePuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.patternComplexity * WEIGHT_PATTERN_COMPLEXITY +
        scores.stepsRequired * WEIGHT_STEPS_REQUIRED +
        scores.patternObscurity * WEIGHT_PATTERN_OBSCURITY +
        scores.mathematicalKnowledge * WEIGHT_MATHEMATICAL_KNOWLEDGE +
        scores.numberRange * WEIGHT_NUMBER_RANGE;

      return Math.round(
        Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, weightedSum))
      );
    },
    ranges: {
      hard: { min: 4, max: 5 },
      difficult: { min: 5, max: 6 },
      evil: { min: 6, max: 7 },
      impossible: { min: 7, max: 8 },
    },
    factors: [
      {
        name: "patternComplexity",
        weight: WEIGHT_PATTERN_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as NumberSequencePuzzle).complexityScore.patternComplexity,
      },
      {
        name: "stepsRequired",
        weight: WEIGHT_STEPS_REQUIRED,
        extract: (puzzle: unknown) =>
          (puzzle as NumberSequencePuzzle).complexityScore.stepsRequired,
      },
      {
        name: "patternObscurity",
        weight: WEIGHT_PATTERN_OBSCURITY,
        extract: (puzzle: unknown) =>
          (puzzle as NumberSequencePuzzle).complexityScore.patternObscurity,
      },
      {
        name: "mathematicalKnowledge",
        weight: WEIGHT_MATHEMATICAL_KNOWLEDGE,
        extract: (puzzle: unknown) =>
          (puzzle as NumberSequencePuzzle).complexityScore
            .mathematicalKnowledge,
      },
      {
        name: "numberRange",
        weight: WEIGHT_NUMBER_RANGE,
        extract: (puzzle: unknown) =>
          (puzzle as NumberSequencePuzzle).complexityScore.numberRange,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for number sequence puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking about the pattern, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this number sequence puzzle:

Sequence: "{puzzle}"
Answer: "{answer}"
Explanation: "{explanation}"
Category: {category}
Difficulty: {difficulty}/10

Create hints that gradually reveal the pattern:
1. Very subtle (10-20% revealed) - hint at pattern type
2. Gentle nudge (30-40% revealed) - suggest operation
3. Clear direction (50-60% revealed) - hint at specific pattern
4. Almost there (70-80% revealed) - guide calculation
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
        description: "Is the pattern clear once understood?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as NumberSequencePuzzle;
          const explanationLength = typedPuzzle.explanation.length;
          return explanationLength > EXPLANATION_MIN_LENGTH &&
            explanationLength < EXPLANATION_MAX_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.2,
        description: "Is the sequence creative and original?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as NumberSequencePuzzle;
          const novelCategories = [
            "recursive",
            "polynomial",
            "power_series",
            "mixed_pattern",
          ];
          return novelCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "solvability",
        weight: 0.25,
        description: "Can the puzzle be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as NumberSequencePuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length >
            EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          const hasEnoughNumbers =
            typedPuzzle.sequence.length >= SEQUENCE_MIN_LENGTH_FOR_QUALITY;
          return hasExplanation && hasHints && hasEnoughNumbers
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "educationalValue",
        weight: 0.15,
        description: "Does it teach mathematical concepts?",
        score: () => QUALITY_SCORE_EXCELLENT, // Number sequences are inherently educational
      },
      {
        name: "engagement",
        weight: 0.2,
        description: "Is the puzzle engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as NumberSequencePuzzle;
          const difficulty = typedPuzzle.difficulty;
          // Sweet spot is 4-7 difficulty
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
        creativity: 0.2,
        solvability: 0.25,
        educationalValue: 0.15,
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
      "Number sequence puzzles challenge you to identify mathematical patterns and predict the next number(s).",
    rules: [
      "Observe the sequence carefully - look for patterns in how numbers change",
      "Identify the underlying pattern (arithmetic, geometric, Fibonacci, etc.)",
      "Apply the pattern to determine the missing number(s)",
      "Common patterns include adding/subtracting, multiplying/dividing, or recursive sequences",
      "Use hints to guide you toward recognizing the pattern type",
    ],
    examples: [
      "3, 7, 11, 15, ? → 19 (add 4 each time)",
      "2, 6, 18, 54, ? → 162 (multiply by 3 each time)",
      "1, 1, 2, 3, 5, ? → 8 (Fibonacci - sum of previous two)",
    ],
  },
};
