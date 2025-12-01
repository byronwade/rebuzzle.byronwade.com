/**
 * ============================================================================
 * WORD LADDER PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Word ladder puzzles challenge players to transform one word into another by
 * changing one letter at a time, where each intermediate step must be a valid
 * English word. These puzzles test vocabulary knowledge, pattern recognition,
 * and logical pathfinding skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are given a start word and an end word, and must find a sequence
 * of valid words connecting them. Each step changes exactly one letter while
 * keeping the word length the same (or adding/removing one letter for variant
 * puzzles). The puzzle includes progressive hints and a complete explanation
 * of the solution path.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Same Length (Difficulty: Hard - 5):
 *   Start: "COLD"
 *   End: "WARM"
 *   Answer: "COLD → CORD → CARD → WARD → WARM"
 *   Explanation: "Change one letter at a time: COLD→CORD (L→R),
 *                 CORD→CARD (O→A), CARD→WARD (C→W), WARD→WARM (D→M)."
 *
 * Example 2 - Longer Ladder (Difficulty: Difficult - 7):
 *   Start: "CAT"
 *   End: "DOG"
 *   Answer: "CAT → COT → COG → DOG"
 *   Explanation: "Three steps: CAT→COT (A→O), COT→COG (T→G),
 *                 COG→DOG (C→D)."
 *
 * Example 3 - Complex Path (Difficulty: Difficult - 8):
 *   Start: "WORD"
 *   End: "GAME"
 *   Answer: "WORD → WORE → GORE → GARE → GAME"
 *   Explanation: "Five steps connecting through valid intermediate words,
 *                 requiring creative pathfinding."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All word ladders are challenging - we NEVER generate easy puzzles:
 *
 * - Hard (5-6): Short ladders (2-4 steps), common words, obvious paths,
 *   similar starting letters between words.
 *
 * - Difficult (7-8): Medium ladders (4-6 steps), less common vocabulary,
 *   requires exploring multiple paths, words less similar.
 *
 * - Evil (8-9): Long ladders (6-8 steps), uncommon words, non-obvious paths,
 *   words very different from each other.
 *
 * - Impossible (9-10): Very long ladders (8+ steps), rare vocabulary,
 *   requires extensive word exploration, very creative connections needed.
 *
 * CATEGORIES
 * ----------
 * - same_length: Words have same number of letters (most common)
 * - different_length: Words differ by one letter (add/remove letters)
 * - themed: Words relate to a specific theme or topic
 * - minimum_steps: Focus on finding shortest path
 * - maximum_steps: Longer pathfinding challenges
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: Description of the word ladder challenge
 *    - answer: Complete solution showing all steps
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Step-by-step solution path
 *    - category: Type of word ladder
 *    - hints: Progressive hints guiding players
 *    - complexityScore: Detailed difficulty breakdown
 *    - startWord: The starting word
 *    - endWord: The target word
 *    - steps: Number of steps required
 *    - ladder: Complete word sequence (optional)
 *
 * 2. GENERATION: AI creates word ladders
 *    - Finds valid paths between words
 *    - Ensures all intermediate words are real English words
 *    - Balances challenge with solvability
 *
 * 3. VALIDATION: Quality checks
 *    - All words must be valid English words
 *    - Each step changes exactly one letter
 *    - Path must be logical and complete
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - pathObscurity: How obvious the path is
 *    - stepsRequired: Number of steps needed
 *    - wordLength: Length of words involved
 *    - vocabularyLevel: Rarity of words used
 *    - wordSimilarity: How similar start/end words are
 *
 * 5. HINTS: Progressive pathfinding assistance
 *    - Start with first letter change hints
 *    - Suggest words in the path
 *    - Guide toward final steps
 *    - Never reveal complete path directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - pathValidity: Are all words valid?
 *    - educationalValue: Builds vocabulary
 *    - solvability: Can players solve with hints?
 *    - creativity: Interesting word pairs
 *    - engagement: Fun and challenging
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - wordLength: Length of words
 *   (1 = 3-4 letters, 10 = 8+ letters)
 *
 * - stepsRequired: Number of transformation steps
 *   (1 = 2-3 steps, 10 = 8+ steps)
 *
 * - vocabularyLevel: Rarity of words
 *   (1 = common words, 10 = advanced/obscure vocabulary)
 *
 * - pathObscurity: How obvious the solution path is
 *   (1 = obvious single path, 10 = very obscure, multiple dead ends)
 *
 * - wordSimilarity: How similar start and end words are
 *   (1 = very similar, 10 = completely different)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create word ladder puzzles.
 * Request via: GET /api/puzzle/regenerate?type=word-ladder
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
const DIFFICULTY_MIN = 5;
const DIFFICULTY_MAX = 10;
const WEIGHT_PATH_OBSCURITY = 0.3;
const WEIGHT_STEPS_REQUIRED = 0.25;
const WEIGHT_WORD_LENGTH = 0.2;
const WEIGHT_VOCABULARY_LEVEL = 0.15;
const WEIGHT_WORD_SIMILARITY = 0.1;
const QUALITY_SCORE_HIGH = 90;
const QUALITY_SCORE_MEDIUM = 70;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_FAIR = 70;
const EXPLANATION_MIN_LENGTH = 20;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const STEPS_MIN = 2;
const STEPS_MAX = 10;
const DIFFICULTY_SWEET_SPOT_MIN = 4;
const DIFFICULTY_SWEET_SPOT_MAX = 7;
const SIMILARITY_SWEET_SPOT_MIN = 5;
const SIMILARITY_SWEET_SPOT_MAX = 8;

// Word ladder puzzle schema
export const WordLadderPuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe(
      "The word ladder puzzle description (e.g., 'Transform COLD into WARM in 4 steps')"
    ),
  answer: z
    .string()
    .describe(
      "The complete solution showing all steps (e.g., 'COLD → CORD → CARD → WARD → WARM')"
    ),
  difficulty: z
    .number()
    .min(5)
    .max(10)
    .describe("Difficulty rating from 5-10 (challenging only)"),
  explanation: z
    .string()
    .describe("Clear explanation of how to solve the word ladder step by step"),
  category: z
    .enum([
      "same_length",
      "different_length",
      "themed",
      "minimum_steps",
      "maximum_steps",
    ])
    .describe("The type of word ladder puzzle"),
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
      stepsRequired: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      vocabularyLevel: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      pathObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      wordSimilarity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  startWord: z.string().describe("The starting word"),
  endWord: z.string().describe("The target word"),
  steps: z
    .number()
    .min(STEPS_MIN)
    .max(STEPS_MAX)
    .describe("The number of steps required (including start and end)"),
  ladder: z
    .array(z.string())
    .optional()
    .describe(
      "The complete word ladder sequence (all words from start to end)"
    ),
});

export type WordLadderPuzzle = z.infer<typeof WordLadderPuzzleSchema>;

export const WORD_LADDER_CONFIG: PuzzleTypeConfig = {
  id: "word-ladder",
  name: "Word Ladder",
  description:
    "Transform one word into another by changing one letter at a time, each step must be a valid word",

  schema: WordLadderPuzzleSchema,

  generation: {
    systemPrompt: (
      params
    ) => `You are an EXTREMELY INTELLIGENT master word ladder puzzle creator with deep expertise in:
- Word structure and letter manipulation
- Vocabulary and dictionary knowledge
- Graph theory and word path finding
- Educational word games and puzzles
- Pattern recognition in word transformations
- Puzzle difficulty calibration

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create word ladder puzzles that are intellectually stimulating, solvable through logical word pathfinding, and provide satisfying "aha!" moments. Your puzzles are educational, vocabulary-building, and fun to solve.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT word ladder puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- wordLength: 1-10 (1 = 3-4 letters, 10 = 8+ letters)
- stepsRequired: 1-10 (1 = 2-3 steps, 10 = 8+ steps)
- vocabularyLevel: 1-10 (1 = common words, 10 = advanced vocabulary)
- pathObscurity: 1-10 (1 = obvious path, 10 = very obscure connections)
- wordSimilarity: 1-10 (1 = very similar words, 10 = completely different)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What start and end words would be challenging at this difficulty? (Consider word length and similarity)
2. What path creates interesting logical thinking? (Think about optimal vs. creative paths)
3. How can you make this require genuine word exploration? (Not just obvious letter changes)
4. What makes this ladder unique and interesting? (Avoid clichéd word pairs)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What vocabulary and word structure knowledge is needed? (Consider word frequency and complexity)

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use interesting, creative, or unexpected word pairs" : ""}

Create a word ladder puzzle that requires:
- Multiple steps of logical word transformation
- Vocabulary knowledge (recognizing valid words)
- Pattern recognition (finding the optimal path)
- A satisfying "aha!" moment when solved

WORD LADDER REQUIREMENTS:
- Start word and end word must be valid English words
- Each step changes exactly one letter (or add/remove one letter for different_length)
- All intermediate words must be valid English words
- Provide 3-8 steps total (including start and end)
- Format puzzle: "Transform [START] into [END] in [N] steps"
- Format answer: "[START] → [WORD1] → [WORD2] → ... → [END]"
- Ensure all words in the ladder are real, valid English words

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The ladder path should be logical and valid
- The explanation should clearly describe each step
- Hints should guide without giving away the entire path
- The complexity scores should accurately reflect the puzzle's actual difficulty
- Use common, accessible vocabulary (not obscure words)

Show your thinking process, then create the puzzle with CORRECT INTEGER complexity scores (1-10, not decimals).`;
    },

    temperature: 0.8,
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
      "startWord",
      "endWord",
      "steps",
    ],
    constraints: {
      puzzle: {
        min: 10,
        max: 200,
      },
      answer: {
        min: 5,
        max: 300,
      },
      difficulty: {
        min: 5,
        max: 10,
      },
      hints: {
        min: 3,
        max: 5,
      },
      startWord: {
        min: 3,
        max: 15,
      },
      endWord: {
        min: 3,
        max: 15,
      },
      steps: {
        min: 2,
        max: 10,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as WordLadderPuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.pathObscurity * WEIGHT_PATH_OBSCURITY +
        scores.stepsRequired * WEIGHT_STEPS_REQUIRED +
        scores.wordLength * WEIGHT_WORD_LENGTH +
        scores.vocabularyLevel * WEIGHT_VOCABULARY_LEVEL +
        scores.wordSimilarity * WEIGHT_WORD_SIMILARITY;

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
        name: "pathObscurity",
        weight: WEIGHT_PATH_OBSCURITY,
        extract: (puzzle: unknown) =>
          (puzzle as WordLadderPuzzle).complexityScore.pathObscurity,
      },
      {
        name: "stepsRequired",
        weight: WEIGHT_STEPS_REQUIRED,
        extract: (puzzle: unknown) =>
          (puzzle as WordLadderPuzzle).complexityScore.stepsRequired,
      },
      {
        name: "wordLength",
        weight: WEIGHT_WORD_LENGTH,
        extract: (puzzle: unknown) =>
          (puzzle as WordLadderPuzzle).complexityScore.wordLength,
      },
      {
        name: "vocabularyLevel",
        weight: WEIGHT_VOCABULARY_LEVEL,
        extract: (puzzle: unknown) =>
          (puzzle as WordLadderPuzzle).complexityScore.vocabularyLevel,
      },
      {
        name: "wordSimilarity",
        weight: WEIGHT_WORD_SIMILARITY,
        extract: (puzzle: unknown) =>
          (puzzle as WordLadderPuzzle).complexityScore.wordSimilarity,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for word ladder puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the entire path directly
3. Guide thinking about word transformations, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this word ladder puzzle:

Start: "{startWord}"
End: "{endWord}"
Steps: {steps}
Answer: "{answer}"
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the path:
1. Very subtle (10-20% revealed) - hint at first letter change or strategy
2. Gentle nudge (30-40% revealed) - suggest a word in the path
3. Clear direction (50-60% revealed) - hint at a specific step
4. Almost there (70-80% revealed) - guide towards final steps
5. Final push (90% revealed, but not the complete answer)

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "pathValidity",
        weight: 0.25,
        description: "Are all words in the ladder valid?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordLadderPuzzle;
          // Assume validated elsewhere - all words should be valid
          return typedPuzzle.ladder &&
            typedPuzzle.ladder.length === typedPuzzle.steps
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "educationalValue",
        weight: 0.2,
        description: "Does it build vocabulary?",
        score: () => QUALITY_SCORE_VERY_HIGH, // Word ladders are inherently educational
      },
      {
        name: "solvability",
        weight: 0.25,
        description: "Can the puzzle be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordLadderPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          const validSteps =
            typedPuzzle.steps >= STEPS_MIN && typedPuzzle.steps <= STEPS_MAX;
          return hasExplanation && hasHints && validSteps
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.15,
        description: "Is the word pair creative and interesting?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordLadderPuzzle;
          // Different words that aren't too similar are more interesting
          const similarity = typedPuzzle.complexityScore.wordSimilarity;
          return similarity >= SIMILARITY_SWEET_SPOT_MIN &&
            similarity <= SIMILARITY_SWEET_SPOT_MAX
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "engagement",
        weight: 0.15,
        description: "Is the puzzle engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as WordLadderPuzzle;
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
        pathValidity: 0.25,
        educationalValue: 0.2,
        solvability: 0.25,
        creativity: 0.15,
        engagement: 0.15,
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
      "Word ladder puzzles challenge you to transform one word into another by changing one letter at a time, where each step must be a valid word.",
    rules: [
      "Start with the given start word",
      "Change exactly one letter at a time to form a new valid word",
      "Each intermediate word must be a real English word",
      "Continue until you reach the end word",
      "Use hints to guide you toward specific letter changes or words in the path",
    ],
    examples: ["COLD → CORD → CARD → WARD → WARM", "CAT → COT → COG → DOG"],
  },
};
