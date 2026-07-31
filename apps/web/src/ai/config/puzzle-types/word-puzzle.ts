/**
 * ============================================================================
 * WORD PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Word puzzle is a general category for various word-based puzzles including
 * anagrams, word searches, crossword clues, and cryptograms. These puzzles
 * test vocabulary knowledge, pattern recognition, and word manipulation skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are presented with a word puzzle that requires solving through
 * word manipulation, pattern recognition, or code-breaking. They must:
 * 1. Understand the puzzle type and requirements
 * 2. Apply wordplay, anagram skills, or decoding techniques
 * 3. Find the solution through logical reasoning
 * 4. Provide the answer
 *
 * The puzzle includes progressive hints and an explanation of the solution method.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Anagram (Difficulty: Hard - 5):
 *   Puzzle: "RAGEM"
 *   Answer: "IMAGE"
 *   Explanation: "Rearrange the letters R-A-G-E-M to form IMAGE."
 *
 * Example 2 - Cryptogram (Difficulty: Difficult - 7):
 *   Puzzle: "IFMMP XPSME"
 *   Answer: "HELLO WORLD"
 *   Explanation: "Caesar cipher with shift 1 - each letter shifted forward."
 *
 * Example 3 - Crossword Clue (Difficulty: Difficult - 8):
 *   Puzzle: "A large feline (3)"
 *   Answer: "CAT"
 *   Explanation: "A three-letter word for a large feline is CAT."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy puzzles:
 *
 * - Hard (5-6): Common word puzzles, straightforward anagrams or clues,
 *   accessible vocabulary.
 *
 * - Difficult (7-8): More complex wordplay, longer words, multiple steps,
 *   requires deeper vocabulary knowledge.
 *
 * - Evil (8-9): Advanced wordplay, obscure vocabulary, complex patterns,
 *   requires extensive word knowledge.
 *
 * - Impossible (9-10): Extremely challenging but solvable. May combine
 *   multiple puzzle types or require advanced linguistic knowledge.
 *
 * CATEGORIES
 * ----------
 * - anagram: Rearranging letters to form words
 * - word_search: Finding words in grids or patterns
 * - crossword_clue: Traditional crossword-style clues
 * - word_ladder: Transforming one word into another
 * - cryptogram: Encrypted word puzzles
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The word puzzle challenge
 *    - answer: The solution
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: How to solve
 *    - category: Type of word puzzle
 *    - hints: Progressive hints
 *    - complexityScore: Detailed difficulty breakdown
 *
 * 2. GENERATION: AI creates word puzzles
 *    - Designs appropriate puzzle type
 *    - Ensures solvability and challenge
 *    - Balances difficulty with accessibility
 *
 * 3. VALIDATION: Quality checks
 *    - Puzzle must be clear and solvable
 *    - Answer must be correct
 *    - Difficulty must be 5-10
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - answerLength: Length of answer
 *    - categoryComplexity: Complexity of puzzle type
 *
 * 5. HINTS: Progressive solving assistance
 *    - Guide toward solution method
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clarity: Is puzzle clear?
 *    - creativity: Is it creative?
 *    - solvability: Can players solve?
 *    - appropriateness: Family-friendly?
 *    - educationalValue: Does it teach?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - wordLength: Length of words involved
 *   (1 = short words, 10 = very long words)
 *
 * - manipulationComplexity: How complex the word manipulation is
 *   (1 = simple rearrangement, 10 = complex multi-step manipulation)
 *
 * - vocabularyLevel: Rarity of vocabulary
 *   (1 = common words, 10 = advanced/obscure vocabulary)
 *
 * - patternObscurity: How obvious the pattern is
 *   (1 = immediately clear, 10 = very obscure)
 *
 * - cognitiveSteps: Number of mental steps required
 *   (1 = single step, 10 = many complex steps)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create word puzzles.
 * Request via: GET /api/puzzle/regenerate?type=word-puzzle
 *
 * ============================================================================
 */

import { z } from "zod";
import { DIFFICULTY_MAX, DIFFICULTY_MIN, GLOBAL_CONTEXT } from "../global";
import type { PuzzleTypeConfig } from "../types";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const DEFAULT_TARGET_DIFFICULTY = 5;
const _WEIGHT_ANSWER_LENGTH = 0.4;
const _WEIGHT_CATEGORY_COMPLEXITY = 0.6;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_FAIR = 75;
const QUALITY_SCORE_EXCELLENT = 100;
const EXPLANATION_MIN_LENGTH = 20;
const ANSWER_MAX_LENGTH = 50;
const DIFFICULTY_INVERT_MULTIPLIER = 10;
const DIFFICULTY_INVERT_BASE = 11;
const ANSWER_LENGTH_DIVISOR = 5;
const ANSWER_LENGTH_EXTRACT_DIVISOR = 2;
const CATEGORY_MULTIPLIER_CRYPTOGRAM = 1.5;
const CATEGORY_MULTIPLIER_DEFAULT = 1.0;
const _CATEGORY_COMPLEXITY_ANAGRAM = 3;
const _CATEGORY_COMPLEXITY_WORD_SEARCH = 4;
const _CATEGORY_COMPLEXITY_CROSSWORD = 6;
const _CATEGORY_COMPLEXITY_WORD_LADDER = 7;
const _CATEGORY_COMPLEXITY_CRYPTOGRAM = 9;
const _CATEGORY_COMPLEXITY_DEFAULT = 5;

// Word puzzle schema
export const WordPuzzleSchema = z.object({
  puzzle: z.string().describe("The word puzzle (e.g., anagram, word search clue, etc.)"),
  answer: z.string().describe("The answer to the puzzle"),
  difficulty: z
    .number()
    .min(4)
    .max(8)
    .describe("Difficulty rating from 4-8 (mid-level challenging)"),
  explanation: z.string().describe("Explanation of how to solve the puzzle"),
  category: z
    .enum(["anagram", "word_search", "crossword_clue", "word_ladder", "cryptogram"])
    .describe("The type of word puzzle"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      wordLength: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      manipulationComplexity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      vocabularyLevel: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      patternObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      cognitiveSteps: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
});

export type WordPuzzle = z.infer<typeof WordPuzzleSchema>;

export const WORD_PUZZLE_CONFIG: PuzzleTypeConfig = {
  id: "word-puzzle",
  name: "Word Puzzle",
  description: "Various word-based puzzles including anagrams, word searches, and more",

  schema: WordPuzzleSchema,

  generation: {
    systemPrompt: `You are an expert word puzzle creator with expertise in:
- Linguistics and wordplay
- Anagram construction
- Cryptography and codes
- Word patterns and relationships
- Educational puzzle design

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

Create engaging word puzzles that are intellectually stimulating and fun to solve.`,

    userPromptTemplate: (params) => {
      const targetDifficulty = params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns) ? params.avoidPatterns : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT word puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- wordLength: 1-10 (1 = short words, 10 = very long words)
- manipulationComplexity: 1-10 (1 = simple rearrangement, 10 = complex multi-step)
- vocabularyLevel: 1-10 (1 = common words, 10 = advanced vocabulary)
- patternObscurity: 1-10 (1 = obvious pattern, 10 = very obscure)
- cognitiveSteps: 1-10 (1 = single step, 10 = many complex steps)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What word puzzle type would be challenging at this difficulty? (Be specific)
2. What makes this puzzle require genuine thinking? (Not just obvious)
3. How can you make this unique and interesting? (Avoid clichés)
4. How do you balance challenge with solvability? (Difficult but fair)
5. What vocabulary and word knowledge is needed?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use an interesting, creative, or unexpected approach" : ""}

Create a word puzzle that requires:
- Multiple cognitive steps (not just surface-level)
- Genuine word manipulation or pattern recognition
- Vocabulary knowledge (when appropriate)
- A satisfying "aha!" moment when solved

PUZZLE REQUIREMENTS:
- Make it solvable but challenging
- Provide clear explanation
- Include progressive hints
- Ensure it's family-friendly
- Make it educational and fun
- Category: ${params.category || "anagram"}

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The answer should make perfect sense once understood
- The explanation should be clear and logical
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
      "complexityScore",
    ],
    constraints: {
      puzzle: {
        min: 1,
      },
      answer: {
        min: 1,
        max: ANSWER_MAX_LENGTH,
      },
      difficulty: {
        min: DIFFICULTY_MIN,
        max: DIFFICULTY_MAX,
      },
      hints: {
        min: HINTS_MIN,
        max: HINTS_MAX,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as WordPuzzle;
      const scores = typedPuzzle.complexityScore;
      if (!scores) {
        // Fallback calculation based on answer length and category
        const baseDifficulty = typedPuzzle.answer.length / ANSWER_LENGTH_DIVISOR;
        const categoryMultiplier =
          typedPuzzle.category === "cryptogram"
            ? CATEGORY_MULTIPLIER_CRYPTOGRAM
            : CATEGORY_MULTIPLIER_DEFAULT;
        return Math.round(
          Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, baseDifficulty * categoryMultiplier))
        );
      }

      // Use complexity scores if available
      const weightedSum =
        scores.wordLength * 0.2 +
        scores.manipulationComplexity * 0.25 +
        scores.vocabularyLevel * 0.2 +
        scores.patternObscurity * 0.2 +
        scores.cognitiveSteps * 0.15;

      return Math.round(Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, weightedSum)));
    },
    ranges: {
      hard: { min: 4, max: 5 },
      difficult: { min: 5, max: 6 },
      evil: { min: 6, max: 7 },
      impossible: { min: 7, max: 8 },
    },
    factors: [
      {
        name: "wordLength",
        weight: 0.2,
        extract: (puzzle: unknown) =>
          (puzzle as WordPuzzle).complexityScore?.wordLength ||
          Math.min(10, (puzzle as WordPuzzle).answer.length / ANSWER_LENGTH_EXTRACT_DIVISOR),
      },
      {
        name: "manipulationComplexity",
        weight: 0.25,
        extract: (puzzle: unknown) =>
          (puzzle as WordPuzzle).complexityScore?.manipulationComplexity || 5,
      },
      {
        name: "vocabularyLevel",
        weight: 0.2,
        extract: (puzzle: unknown) => (puzzle as WordPuzzle).complexityScore?.vocabularyLevel || 5,
      },
      {
        name: "patternObscurity",
        weight: 0.2,
        extract: (puzzle: unknown) => (puzzle as WordPuzzle).complexityScore?.patternObscurity || 5,
      },
      {
        name: "cognitiveSteps",
        weight: 0.15,
        extract: (puzzle: unknown) => (puzzle as WordPuzzle).complexityScore?.cognitiveSteps || 5,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for word puzzles.

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this word puzzle:

Puzzle: "{puzzle}"
Answer: "{answer}"
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the answer.`,

    count: 5,
    progression: "linear",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "clarity",
        weight: 0.2,
        description: "How clear is the puzzle?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordPuzzle;
          return typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.2,
        description: "How creative is it?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordPuzzle;
          // Higher score for complex categories
          const complexCategories = ["cryptogram", "word_ladder", "crossword_clue"];
          return complexCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "solvability",
        weight: 0.3,
        description: "Is it reasonably solvable?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordPuzzle;
          const difficultyScore =
            (DIFFICULTY_INVERT_BASE - typedPuzzle.difficulty) * DIFFICULTY_INVERT_MULTIPLIER;
          return Math.min(QUALITY_SCORE_EXCELLENT, difficultyScore);
        },
      },
      {
        name: "appropriateness",
        weight: 0.1,
        description: "Family-friendly?",
        score: () => QUALITY_SCORE_EXCELLENT, // Assume validated elsewhere
      },
      {
        name: "educationalValue",
        weight: 0.2,
        description: "Does it teach something?",
        score: () => QUALITY_SCORE_HIGH, // Word puzzles are inherently educational
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        clarity: 0.2,
        creativity: 0.2,
        solvability: 0.3,
        appropriateness: 0.1,
        educationalValue: 0.2,
      };

      let total = 0;
      let totalWeight = 0;

      for (const [dimension, score] of Object.entries(scores)) {
        const weight = weights[dimension] ?? 0;
        total += score * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? Math.round(total / totalWeight) : 0;
    },
  },

  howToPlay: {
    description:
      "Word puzzles include anagrams, word searches, crossword clues, and cryptograms that test vocabulary and word manipulation skills.",
    rules: [
      "Understand the puzzle type and requirements (anagram, cryptogram, etc.)",
      "Apply wordplay, anagram skills, or decoding techniques",
      "Use pattern recognition to identify word relationships",
      "Manipulate letters or decode encrypted text to find the solution",
      "Use hints to guide you toward the solution method",
    ],
    examples: [
      "RAGEM → IMAGE (anagram - rearrange letters)",
      "IFMMP XPSME → HELLO WORLD (Caesar cipher)",
      "A large feline (3) → CAT (crossword clue)",
    ],
  },
};
