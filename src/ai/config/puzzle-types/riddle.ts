/**
 * ============================================================================
 * RIDDLE PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Riddle puzzles challenge players to solve text-based puzzles that require
 * lateral thinking, wordplay, and creative problem-solving. These puzzles test
 * linguistic reasoning, metaphorical thinking, and the ability to see beyond
 * literal meanings.
 *
 * HOW IT WORKS
 * ------------
 * Players are given a riddle question or statement. They must:
 * 1. Read the riddle carefully and identify key words
 * 2. Recognize wordplay, double meanings, or metaphorical language
 * 3. Apply lateral thinking to see beyond literal interpretation
 * 4. Find the answer that satisfies the riddle's logic
 *
 * The puzzle includes progressive hints and an explanation of the riddle's
 * logic and wordplay.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Wordplay (Difficulty: Hard - 5):
 *   Riddle: "I speak without a mouth and hear without ears. I have no body,
 *            but I come alive with wind. What am I?"
 *   Answer: "ECHO"
 *   Explanation: "An echo 'speaks' (repeats sounds) without a mouth and
 *                 'hears' (responds to) sounds without ears. It has no physical
 *                 body but is created by wind/sound waves."
 *
 * Example 2 - Double Meaning (Difficulty: Difficult - 7):
 *   Riddle: "The more you take, the more you leave behind. What am I?"
 *   Answer: "FOOTSTEPS"
 *   Explanation: "Taking footsteps means leaving them behind. The word 'take'
 *                 has a double meaning here."
 *
 * Example 3 - Lateral Thinking (Difficulty: Difficult - 8):
 *   Riddle: "I have cities, but no houses. I have mountains, but no trees.
 *            I have water, but no fish. What am I?"
 *   Answer: "MAP"
 *   Explanation: "A map shows cities, mountains, and water, but they are
 *                 representations, not the actual things."
 *
 * Example 4 - Paradox (Difficulty: Evil - 9):
 *   Riddle: "What gets wetter as it dries?"
 *   Answer: "TOWEL"
 *   Explanation: "A towel gets wetter (absorbs more water) as it dries
 *                 (removes water from other things)."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy riddles:
 *
 * - Hard (5-6): Straightforward wordplay, common metaphors, obvious double
 *   meanings, familiar concepts, minimal lateral thinking required.
 *
 * - Difficult (7-8): More complex wordplay, subtle metaphors, less obvious
 *   connections, requires deeper lateral thinking.
 *
 * - Evil (8-9): Complex multi-layer wordplay, obscure metaphors, very subtle
 *   connections, requires advanced lateral thinking skills.
 *
 * - Impossible (9-10): Extremely challenging but solvable. May combine multiple
 *   wordplay techniques or require expert-level lateral thinking.
 *
 * CATEGORIES
 * ----------
 * - logic: Logical reasoning puzzles
 * - wordplay: Puns, double meanings, word tricks
 * - lateral_thinking: Requires thinking outside the box
 * - math: Mathematical riddles
 * - nature: Nature-based riddles
 * - objects: Object-based riddles
 * - metaphor: Metaphorical thinking
 * - paradox: Paradoxical statements
 * - homophone: Sound-based wordplay
 * - double_meaning: Words with multiple meanings
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The riddle question or statement
 *    - answer: The solution word or phrase
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Logic and wordplay breakdown
 *    - category: Type of riddle
 *    - hints: Progressive hints guiding solution
 *    - complexityScore: Detailed difficulty breakdown
 *
 * 2. GENERATION: AI creates riddles
 *    - Designs clever wordplay
 *    - Ensures logical consistency
 *    - Balances challenge with solvability
 *
 * 3. VALIDATION: Quality checks
 *    - Riddle must be clear
 *    - Answer must be logical
 *    - Explanation must make sense
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - lateralThinking: How much lateral thinking needed
 *    - wordplayComplexity: Complexity of wordplay
 *    - logicalSteps: Number of logical steps
 *    - culturalKnowledge: Cultural knowledge required
 *    - vocabularyLevel: Vocabulary complexity
 *
 * 5. HINTS: Progressive riddle-solving assistance
 *    - Start with general direction
 *    - Progress to wordplay hints
 *    - Guide toward specific interpretation
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clarity: Is riddle clear?
 *    - creativity: Is it creative?
 *    - solvability: Can players solve?
 *    - logicalConsistency: Does logic hold?
 *    - engagement: Is it engaging?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - lateralThinking: How much lateral thinking required
 *   (1 = straightforward, 10 = requires major lateral thinking)
 *
 * - wordplayComplexity: Complexity of wordplay
 *   (1 = simple wordplay, 10 = complex multi-layer wordplay)
 *
 * - logicalSteps: Number of logical steps needed
 *   (1 = single step, 10 = many complex logical steps)
 *
 * - culturalKnowledge: Cultural knowledge required
 *   (1 = universal, 10 = requires deep cultural knowledge)
 *
 * - vocabularyLevel: Vocabulary complexity
 *   (1 = basic words, 10 = advanced vocabulary)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create riddle puzzles.
 * Request via: GET /api/puzzle/regenerate?type=riddle
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
const WEIGHT_LATERAL_THINKING = 0.3;
const WEIGHT_WORDPLAY_COMPLEXITY = 0.25;
const WEIGHT_LOGICAL_STEPS = 0.2;
const WEIGHT_CULTURAL_KNOWLEDGE = 0.15;
const WEIGHT_VOCABULARY_LEVEL = 0.1;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_VERY_HIGH = 75;
const QUALITY_SCORE_FAIR = 65;
const QUALITY_SCORE_EXCELLENT = 100;
const PUZZLE_MIN_LENGTH = 20;
const PUZZLE_MAX_LENGTH = 300;
const EXPLANATION_MIN_LENGTH = 30;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const DIFFICULTY_SWEET_SPOT_MIN = 5;
const DIFFICULTY_SWEET_SPOT_MAX = 7;
const DIFFICULTY_SCORE_BONUS = 10;
const DIFFICULTY_SCORE_PENALTY = 5;
const COMPLEXITY_MULTIPLIER = 2;
const BASE_SCORE_NOVEL = 75;
const BASE_SCORE_STANDARD = 65;

// Riddle puzzle schema
export const RiddlePuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe("The riddle question or statement that needs to be solved"),
  answer: z
    .string()
    .describe("The answer to the riddle (single word or phrase)"),
  difficulty: z
    .number()
    .min(5)
    .max(10)
    .describe("Difficulty rating from 5-10 (challenging only)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation of the riddle's logic and how to arrive at the answer"
    ),
  category: z
    .enum([
      "logic",
      "wordplay",
      "lateral_thinking",
      "math",
      "nature",
      "objects",
      "metaphor",
      "paradox",
      "homophone",
      "double_meaning",
    ])
    .describe("The type of riddle"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      lateralThinking: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      wordplayComplexity: z
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
      logicalSteps: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
});

export type RiddlePuzzle = z.infer<typeof RiddlePuzzleSchema>;

export const RIDDLE_CONFIG: PuzzleTypeConfig = {
  id: "riddle",
  name: "Riddle",
  description:
    "Text-based puzzles that require lateral thinking, wordplay, and creative problem-solving",

  schema: RiddlePuzzleSchema,

  generation: {
    systemPrompt: (
      params
    ) => `You are an EXTREMELY INTELLIGENT master riddle creator with deep expertise in:
- Lateral thinking and creative problem-solving
- Wordplay, puns, and linguistic tricks
- Metaphorical thinking and symbolism
- Logic puzzles and paradoxes
- Cultural references and idioms
- Cognitive psychology and puzzle design
- Classic riddle structures and modern innovations

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create riddles that are intellectually stimulating, clever, and memorable. Your riddles require genuine thinking, provide satisfying "aha!" moments, and are solvable with progressive hints.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT riddle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- lateralThinking: 1-10 (1 = straightforward, 10 = requires major lateral thinking)
- wordplayComplexity: 1-10 (1 = simple wordplay, 10 = complex multi-layer wordplay)
- culturalKnowledge: 1-10 (1 = universal, 10 = requires deep cultural knowledge)
- vocabularyLevel: 1-10 (1 = basic words, 10 = advanced vocabulary)
- logicalSteps: 1-10 (1 = single step, 10 = many complex logical steps)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What concept would be challenging at this difficulty level? (Be specific and creative)
2. What type of wordplay or logic creates the puzzle? (Think beyond simple puns)
3. How can you make this require genuine lateral thinking? (Not just obvious connections)
4. What makes this riddle unique and novel? (Avoid clichés and overused patterns)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What cognitive processes will solvers need? (Lateral thinking, wordplay recognition, logical reasoning, etc.)

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a pattern type that's rare, innovative, or unexpected" : ""}

Create a riddle that requires:
- Multiple cognitive steps (not just surface-level reading)
- Genuine lateral thinking (not obvious connections)
- Wordplay or logical reasoning (identifying non-obvious relationships)
- Cultural or linguistic knowledge (when appropriate)
- A satisfying "aha!" moment when solved (not just "oh, I see it now")

QUALITY STANDARDS:
- The riddle should be solvable but challenging
- The answer should make perfect sense once understood
- The explanation should be clear and logical
- Hints should guide without giving it away
- The complexity scores should accurately reflect the riddle's actual difficulty

Show your thinking process, then create the riddle with CORRECT INTEGER complexity scores (1-10, not decimals).`;
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
      "complexityScore",
    ],
    constraints: {
      puzzle: {
        min: 10,
        max: 500,
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
        min: HINTS_MIN,
        max: HINTS_MAX,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      // Use the AI's provided complexity scores for overall difficulty
      const typedPuzzle = puzzle as RiddlePuzzle;
      const scores = typedPuzzle.complexityScore;
      if (!scores) {
        return typedPuzzle.difficulty;
      } // Fallback if scores are missing

      const weightedSum =
        scores.lateralThinking * WEIGHT_LATERAL_THINKING +
        scores.wordplayComplexity * WEIGHT_WORDPLAY_COMPLEXITY +
        scores.logicalSteps * WEIGHT_LOGICAL_STEPS +
        scores.culturalKnowledge * WEIGHT_CULTURAL_KNOWLEDGE +
        scores.vocabularyLevel * WEIGHT_VOCABULARY_LEVEL;

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
        name: "lateralThinking",
        weight: WEIGHT_LATERAL_THINKING,
        extract: (puzzle: unknown) =>
          (puzzle as RiddlePuzzle).complexityScore.lateralThinking,
      },
      {
        name: "wordplayComplexity",
        weight: WEIGHT_WORDPLAY_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as RiddlePuzzle).complexityScore.wordplayComplexity,
      },
      {
        name: "logicalSteps",
        weight: WEIGHT_LOGICAL_STEPS,
        extract: (puzzle: unknown) =>
          (puzzle as RiddlePuzzle).complexityScore.logicalSteps,
      },
      {
        name: "culturalKnowledge",
        weight: WEIGHT_CULTURAL_KNOWLEDGE,
        extract: (puzzle: unknown) =>
          (puzzle as RiddlePuzzle).complexityScore.culturalKnowledge,
      },
      {
        name: "vocabularyLevel",
        weight: WEIGHT_VOCABULARY_LEVEL,
        extract: (puzzle: unknown) =>
          (puzzle as RiddlePuzzle).complexityScore.vocabularyLevel,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for riddles.
Your brand voice is ${GLOBAL_CONTEXT.brandVoice.tone}.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

PROGRESSION EXAMPLE:
Level 1 (10-20%): "Think about what you see every day"
Level 2 (30-40%): "It's something that can be both literal and metaphorical"
Level 3 (50-60%): "Consider the double meaning of the key word"
Level 4 (70-80%): "The answer relates to a common object or concept"
Level 5 (90%): "Think about the opposite or reverse of what's stated"`,

    userPromptTemplate: `Generate {count} progressive hints for this riddle:

Riddle: "{puzzle}"
Answer: "{answer}"
Explanation: "{explanation}"
Difficulty: {difficulty}/10
Category: {category}

Create hints that gradually reveal the answer:
1. Very subtle (10-20% revealed)
2. Gentle nudge (30-40% revealed)
3. Clear direction (50-60% revealed)
4. Almost there (70-80% revealed)
5. Final push (90% revealed, but not the answer itself)

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "clarity",
        weight: 0.2,
        description: "Is the riddle clear and understandable?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RiddlePuzzle;
          // Check if riddle is clear (not too ambiguous)
          const length = typedPuzzle.puzzle.length;
          const hasQuestion =
            typedPuzzle.puzzle.includes("?") ||
            typedPuzzle.puzzle.includes("what") ||
            typedPuzzle.puzzle.includes("who");
          return hasQuestion &&
            length > PUZZLE_MIN_LENGTH &&
            length < PUZZLE_MAX_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.25,
        description: "Is the riddle creative and original?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RiddlePuzzle;
          // Higher score for novel categories and complex wordplay
          const noveltyCategories = [
            "lateral_thinking",
            "paradox",
            "double_meaning",
          ];
          const baseScore = noveltyCategories.includes(typedPuzzle.category)
            ? BASE_SCORE_NOVEL
            : BASE_SCORE_STANDARD;
          const complexity =
            typedPuzzle.complexityScore?.wordplayComplexity || 5;
          return Math.min(
            QUALITY_SCORE_EXCELLENT,
            baseScore + complexity * COMPLEXITY_MULTIPLIER
          );
        },
      },
      {
        name: "solvability",
        weight: 0.2,
        description: "Can the riddle be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RiddlePuzzle;
          // Check if explanation is clear and hints are provided
          const hasExplanation =
            typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          return hasExplanation && hasHints
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "logicalConsistency",
        weight: 0.15,
        description: "Does the riddle's logic hold up?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RiddlePuzzle;
          // Check if explanation makes sense
          const explanationLength = typedPuzzle.explanation.length;
          return explanationLength > EXPLANATION_MIN_LENGTH
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "engagement",
        weight: 0.2,
        description: "Is the riddle engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RiddlePuzzle;
          // Higher score for interesting categories and good difficulty balance
          const interestingCategories = [
            "lateral_thinking",
            "wordplay",
            "paradox",
          ];
          const baseScore = interestingCategories.includes(typedPuzzle.category)
            ? BASE_SCORE_NOVEL
            : BASE_SCORE_STANDARD;
          const difficulty = typedPuzzle.difficulty;
          // Sweet spot is 5-7 difficulty
          const difficultyScore =
            difficulty >= DIFFICULTY_SWEET_SPOT_MIN &&
            difficulty <= DIFFICULTY_SWEET_SPOT_MAX
              ? DIFFICULTY_SCORE_BONUS
              : DIFFICULTY_SCORE_PENALTY;
          return Math.min(QUALITY_SCORE_EXCELLENT, baseScore + difficultyScore);
        },
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        clarity: 0.2,
        creativity: 0.25,
        solvability: 0.2,
        logicalConsistency: 0.15,
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
      "Riddle puzzles require lateral thinking, wordplay, and creative problem-solving to decode metaphorical language.",
    rules: [
      "Read the riddle carefully and identify key words",
      "Recognize wordplay, double meanings, or metaphorical language",
      "Apply lateral thinking - look beyond literal interpretation",
      "Consider homophones, puns, and creative word associations",
      "Use hints to guide you toward the riddle's logic and wordplay",
    ],
    examples: [
      "I speak without a mouth and hear without ears. What am I? → ECHO",
      "The more you take, the more you leave behind. What am I? → FOOTSTEPS",
    ],
  },
};
