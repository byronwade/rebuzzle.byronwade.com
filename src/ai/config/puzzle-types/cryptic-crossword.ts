/**
 * ============================================================================
 * CRYPTIC CROSSWORD CLUE PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Cryptic crossword clues challenge players to solve British-style cryptic clues
 * using wordplay, anagrams, homophones, hidden words, and double definitions.
 * These puzzles test linguistic knowledge, pattern recognition, and creative
 * thinking skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are given a cryptic clue that contains both a definition and wordplay
 * (or uses double definition). They must:
 * 1. Identify the clue structure (definition + wordplay, or double definition)
 * 2. Recognize wordplay indicators (anagram, hidden, homophone, etc.)
 * 3. Apply the wordplay technique to decode the clue
 * 4. Verify the answer matches both definition and wordplay
 *
 * The puzzle includes progressive hints and an explanation breaking down the
 * clue structure and wordplay technique.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Anagram Clue (Difficulty: Hard - 5):
 *   Clue: "Brave insect goes back and forth (4)"
 *   Answer: "LION"
 *   Explanation: "Anagram clue - 'Brave' is the definition (LION = brave),
 *                 'insect goes back and forth' indicates anagram of 'insect'.
 *                 Rearranging INSECT gives LION (with letters going back and forth)."
 *
 * Example 2 - Hidden Word (Difficulty: Difficult - 7):
 *   Clue: "Part of tree in forest (4)"
 *   Answer: "ROOT"
 *   Explanation: "Hidden word clue - 'Part of tree' is the definition,
 *                 'in forest' indicates the word is hidden in 'forest'.
 *                 ROOT is hidden in fo-ROOT-st."
 *
 * Example 3 - Double Definition (Difficulty: Difficult - 8):
 *   Clue: "Animal and container (3)"
 *   Answer: "CAN"
 *   Explanation: "Double definition - CAN means both 'animal' (a type of dog)
 *                 and 'container' (a tin can)."
 *
 * Example 4 - Charade (Difficulty: Evil - 9):
 *   Clue: "Start of game and end of play (4)"
 *   Answer: "GAPY"
 *   Explanation: "Charade clue - 'Start of game' = G, 'end of play' = Y,
 *                 combined gives GAPY (though this is a simplified example)."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy cryptic clues:
 *
 * - Hard (5-6): Simple wordplay techniques, common indicators, straightforward
 *   definitions, familiar vocabulary.
 *
 * - Difficult (7-8): More complex wordplay, subtle indicators, less common
 *   techniques, requires deeper linguistic knowledge.
 *
 * - Evil (8-9): Complex multi-layer wordplay, very subtle indicators, obscure
 *   techniques, advanced vocabulary.
 *
 * - Impossible (9-10): Extremely challenging but solvable. May combine multiple
 *   techniques or require extensive cryptic crossword experience.
 *
 * CATEGORIES
 * ----------
 * - anagram_clue: Letters rearranged (indicators: mixed, confused, changed)
 * - hidden_word: Word hidden in clue text (indicators: in, inside, part of)
 * - homophone: Sounds like (indicators: sounds, heard, say)
 * - double_definition: Two definitions for same word
 * - charade: Word built from parts (indicators: with, and, plus)
 * - reversal: Word reversed (indicators: back, return, reversed)
 * - deletion: Remove letters (indicators: without, losing)
 * - container: Word contains another (indicators: in, around)
 * - initial_letters: First letters of words (indicators: start, initially)
 * - mixed: Combination of multiple techniques
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The cryptic clue text
 *    - answer: The solution word/phrase
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Breakdown of definition and wordplay
 *    - category: Type of cryptic technique
 *    - hints: Progressive hints guiding solution
 *    - complexityScore: Detailed difficulty breakdown
 *    - clueBreakdown: Optional breakdown of clue components
 *    - answerLength: Optional length indicator
 *
 * 2. GENERATION: AI creates cryptic clues
 *    - Follows proper cryptic conventions
 *    - Uses clear indicators
 *    - Ensures fairness and solvability
 *
 * 3. VALIDATION: Quality checks
 *    - Clue must follow cryptic conventions
 *    - Must have definition and wordplay (or double definition)
 *    - Indicators must be clear
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - wordplayComplexity: How complex the wordplay is
 *    - layersRequired: Number of wordplay layers
 *    - clueObscurity: How obvious the clue structure is
 *    - linguisticKnowledge: Language knowledge required
 *    - culturalKnowledge: Cultural knowledge needed
 *
 * 5. HINTS: Progressive clue-solving assistance
 *    - Start with clue structure hints
 *    - Progress to wordplay type
 *    - Guide toward specific technique
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clueValidity: Does it follow conventions?
 *    - creativity: Is it creative?
 *    - solvability: Can players solve?
 *    - educationalValue: Does it teach wordplay?
 *    - engagement: Is it fun?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - wordplayComplexity: Complexity of wordplay technique
 *   (1 = simple anagram, 10 = complex multi-layer wordplay)
 *
 * - linguisticKnowledge: Language knowledge required
 *   (1 = basic vocabulary, 10 = advanced linguistic knowledge)
 *
 * - clueObscurity: How obvious the clue structure is
 *   (1 = clear indicators, 10 = very subtle/obscure)
 *
 * - layersRequired: Number of wordplay layers
 *   (1 = single layer, 10 = multiple overlapping layers)
 *
 * - culturalKnowledge: Cultural knowledge needed
 *   (1 = universal, 10 = requires British/UK cultural knowledge)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create cryptic crossword clues.
 * Request via: GET /api/puzzle/regenerate?type=cryptic-crossword
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
const WEIGHT_WORDPLAY_COMPLEXITY = 0.3;
const WEIGHT_LAYERS_REQUIRED = 0.25;
const WEIGHT_CLUE_OBSCURITY = 0.2;
const WEIGHT_LINGUISTIC_KNOWLEDGE = 0.15;
const WEIGHT_CULTURAL_KNOWLEDGE = 0.1;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_MEDIUM = 65;
const QUALITY_SCORE_FAIR = 70;
const QUALITY_SCORE_GOOD = 80;
const QUALITY_SCORE_LOW = 60;
const QUALITY_SCORE_EXCELLENT = 90;
const EXPLANATION_MIN_LENGTH = 30;
const EXPLANATION_MIN_LENGTH_FOR_BREAKDOWN = 50;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const DIFFICULTY_SWEET_SPOT_MIN_CRYPTIC = 6;
const DIFFICULTY_SWEET_SPOT_MAX_CRYPTIC = 9;

// Cryptic crossword puzzle schema
export const CrypticCrosswordPuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe(
      "The cryptic crossword clue (e.g., 'Brave insect goes back and forth (4)')"
    ),
  answer: z
    .string()
    .describe("The answer to the cryptic clue (single word or phrase)"),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 4-8 (mid-level challenging)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation of how the cryptic clue works, breaking down the wordplay"
    ),
  category: z
    .enum([
      "anagram_clue",
      "hidden_word",
      "homophone",
      "double_definition",
      "charade",
      "reversal",
      "deletion",
      "container",
      "initial_letters",
      "mixed",
    ])
    .describe("The type of cryptic clue"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      wordplayComplexity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      linguisticKnowledge: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      clueObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      layersRequired: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      culturalKnowledge: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  clueBreakdown: z
    .object({
      definition: z.string().describe("The definition part of the clue"),
      wordplay: z.string().describe("The wordplay part of the clue"),
      indicators: z
        .array(z.string())
        .optional()
        .describe("Words that indicate the type of wordplay"),
    })
    .optional()
    .describe("Breakdown of the clue components"),
  answerLength: z
    .number()
    .optional()
    .describe("Length of the answer (in letters or words)"),
});

export type CrypticCrosswordPuzzle = z.infer<
  typeof CrypticCrosswordPuzzleSchema
>;

export const CRYPTIC_CROSSWORD_CONFIG: PuzzleTypeConfig = {
  id: "cryptic-crossword",
  name: "Cryptic Crossword Clue",
  description:
    "British-style cryptic clues using wordplay, anagrams, homophones, hidden words, and double definitions",

  schema: CrypticCrosswordPuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master cryptic crossword clue creator with deep expertise in:
- British cryptic crossword conventions and rules
- Wordplay techniques: anagrams, homophones, hidden words, charades, reversals
- Double definitions and puns
- Cryptic clue structure and indicators
- Linguistic patterns and word manipulation
- Educational puzzle design

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create cryptic crossword clues that are intellectually stimulating, solvable through wordplay and linguistic thinking, and provide satisfying "aha!" moments. Your clues follow proper cryptic conventions and are fair, solvable, and educational.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT cryptic crossword clue using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- wordplayComplexity: 1-10 (1 = simple anagram, 10 = complex multi-layer wordplay)
- linguisticKnowledge: 1-10 (1 = basic vocabulary, 10 = advanced linguistic knowledge)
- clueObscurity: 1-10 (1 = clear indicators, 10 = very subtle/obscure)
- layersRequired: 1-10 (1 = single layer, 10 = multiple overlapping layers)
- culturalKnowledge: 1-10 (1 = universal, 10 = requires British/UK cultural knowledge)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What word would be interesting to clue at this difficulty? (Be specific and creative)
2. What wordplay technique creates interesting logical thinking? (Think beyond simple anagrams)
3. How can you make this require genuine wordplay recognition? (Not just obvious definitions)
4. What makes this clue unique and interesting? (Avoid overused patterns)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What linguistic and wordplay knowledge is needed? (Consider clue structure and indicators)

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a wordplay technique that's rare, innovative, or unexpected" : ""}

Create a cryptic clue that requires:
- Wordplay recognition (identifying the technique used)
- Linguistic reasoning (understanding the clue structure)
- Vocabulary knowledge (knowing the answer)
- A satisfying "aha!" moment when solved

CRYPTIC CLUE REQUIREMENTS:
- Follow proper cryptic crossword conventions
- Include both definition and wordplay (or use double definition)
- Use clear indicators for wordplay type (anagram, hidden, homophone, etc.)
- Provide answer length if helpful: "(4)" for 4 letters
- Format: "Clue text here (4)" or "Clue text here"
- Ensure the clue is fair and solvable (not impossible)
- Use family-friendly language and topics

COMMON CRYPTIC TECHNIQUES:
- Anagram: Letters rearranged (indicators: mixed, confused, changed, etc.)
- Hidden word: Word hidden in the clue (indicators: in, inside, part of, etc.)
- Homophone: Sounds like (indicators: sounds, heard, say, etc.)
- Double definition: Two definitions for the same word
- Charade: Word built from parts (indicators: with, and, plus, etc.)
- Reversal: Word reversed (indicators: back, return, reversed, etc.)
- Deletion: Remove letters (indicators: without, losing, etc.)
- Container: Word contains another (indicators: in, around, etc.)
- Initial letters: First letters of words (indicators: start, initially, etc.)

QUALITY STANDARDS:
- The clue should be solvable but challenging
- The wordplay should be clear once understood
- The explanation should break down the clue structure clearly
- Hints should guide without giving it away completely
- The complexity scores should accurately reflect the clue's actual difficulty
- Follow proper cryptic conventions (fair and solvable)

Show your thinking process, then create the clue with CORRECT INTEGER complexity scores (1-10, not decimals).`;
    },

    temperature: 0.9,
    modelType: "creative",
  },

  validation: {
    requiredFields: [
      "puzzle",
      "answer",
      "difficulty",
      "explanation",
      "category",
      "hints",
    ],
    constraints: {
      puzzle: {
        min: 10,
        max: 200,
      },
      answer: {
        min: 2,
        max: 30,
      },
      difficulty: {
        min: 5,
        max: 10,
      },
      hints: {
        min: 3,
        max: 5,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as CrypticCrosswordPuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.wordplayComplexity * WEIGHT_WORDPLAY_COMPLEXITY +
        scores.layersRequired * WEIGHT_LAYERS_REQUIRED +
        scores.clueObscurity * WEIGHT_CLUE_OBSCURITY +
        scores.linguisticKnowledge * WEIGHT_LINGUISTIC_KNOWLEDGE +
        scores.culturalKnowledge * WEIGHT_CULTURAL_KNOWLEDGE;

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
        name: "wordplayComplexity",
        weight: WEIGHT_WORDPLAY_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as CrypticCrosswordPuzzle).complexityScore.wordplayComplexity,
      },
      {
        name: "layersRequired",
        weight: WEIGHT_LAYERS_REQUIRED,
        extract: (puzzle: unknown) =>
          (puzzle as CrypticCrosswordPuzzle).complexityScore.layersRequired,
      },
      {
        name: "clueObscurity",
        weight: WEIGHT_CLUE_OBSCURITY,
        extract: (puzzle: unknown) =>
          (puzzle as CrypticCrosswordPuzzle).complexityScore.clueObscurity,
      },
      {
        name: "linguisticKnowledge",
        weight: WEIGHT_LINGUISTIC_KNOWLEDGE,
        extract: (puzzle: unknown) =>
          (puzzle as CrypticCrosswordPuzzle).complexityScore
            .linguisticKnowledge,
      },
      {
        name: "culturalKnowledge",
        weight: WEIGHT_CULTURAL_KNOWLEDGE,
        extract: (puzzle: unknown) =>
          (puzzle as CrypticCrosswordPuzzle).complexityScore.culturalKnowledge,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for cryptic crossword clues.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking about the wordplay technique, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this cryptic crossword clue:

Clue: "{puzzle}"
Answer: "{answer}"
Category: {category}
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the solution:
1. Very subtle (10-20% revealed) - hint at wordplay type or structure
2. Gentle nudge (30-40% revealed) - suggest what technique to look for
3. Clear direction (50-60% revealed) - hint at specific clue elements
4. Almost there (70-80% revealed) - guide wordplay breakdown
5. Final push (90% revealed, but not the answer itself)

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "clueValidity",
        weight: 0.25,
        description: "Does the clue follow cryptic conventions?",
        score: (puzzle: unknown) => {
          // Check if explanation breaks down the clue properly
          const typedPuzzle = puzzle as CrypticCrosswordPuzzle;
          const hasBreakdown =
            typedPuzzle.explanation.includes("definition") ||
            typedPuzzle.explanation.includes("wordplay") ||
            typedPuzzle.explanation.length >
              EXPLANATION_MIN_LENGTH_FOR_BREAKDOWN;
          return hasBreakdown ? QUALITY_SCORE_VERY_HIGH : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.25,
        description: "Is the clue creative and original?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CrypticCrosswordPuzzle;
          const complexCategories = [
            "mixed",
            "container",
            "charade",
            "reversal",
          ];
          return complexCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "solvability",
        weight: 0.2,
        description: "Can the clue be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CrypticCrosswordPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          return hasExplanation && hasHints
            ? QUALITY_SCORE_GOOD
            : QUALITY_SCORE_LOW;
        },
      },
      {
        name: "educationalValue",
        weight: 0.15,
        description: "Does it teach wordplay concepts?",
        score: () => QUALITY_SCORE_EXCELLENT, // Cryptic clues are inherently educational
      },
      {
        name: "engagement",
        weight: 0.15,
        description: "Is the clue engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CrypticCrosswordPuzzle;
          const difficulty = typedPuzzle.difficulty;
          // Sweet spot is 6-9 difficulty for cryptic clues
          return difficulty >= DIFFICULTY_SWEET_SPOT_MIN_CRYPTIC &&
            difficulty <= DIFFICULTY_SWEET_SPOT_MAX_CRYPTIC
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        clueValidity: 0.25,
        creativity: 0.25,
        solvability: 0.2,
        educationalValue: 0.15,
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
      "Cryptic crossword clues use wordplay, anagrams, homophones, and double definitions to create challenging puzzles.",
    rules: [
      "Identify the clue structure - usually definition + wordplay (or double definition)",
      "Look for wordplay indicators (anagram, hidden, homophone, etc.)",
      "Apply the wordplay technique to decode the clue",
      "Verify the answer matches both the definition and wordplay",
      "Use hints to understand the clue structure and wordplay type",
    ],
    examples: [
      "Brave insect goes back and forth (4) → LION (anagram of 'insect')",
      "Part of tree in forest (4) → ROOT (hidden in 'fo-ROOT-st')",
    ],
  },
};
