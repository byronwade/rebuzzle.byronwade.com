/**
 * ============================================================================
 * LOGIC GRID PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Logic grid puzzles (also known as Einstein puzzles or Zebra puzzles) challenge
 * players to use deductive reasoning to solve relationships between multiple
 * categories and items. These puzzles test logical thinking, systematic
 * elimination, and constraint satisfaction skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are given a scenario with multiple categories (e.g., People, Houses,
 * Pets, Drinks) and items in each category. They receive clues that describe
 * relationships between items. They must:
 * 1. Organize information systematically (often using a grid)
 * 2. Apply deductive reasoning to eliminate possibilities
 * 3. Use constraint satisfaction to find unique solutions
 * 4. Verify all clues are satisfied
 *
 * The puzzle includes progressive hints and a step-by-step explanation of the
 * deductive reasoning process.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Classic Einstein (Difficulty: Hard - 5):
 *   Scenario: "Five people live in five houses of different colors..."
 *   Clues: "The person in the red house has a dog..."
 *   Answer: "Complete solution showing all relationships"
 *   Explanation: "Step-by-step deduction using elimination method..."
 *
 * Example 2 - Who Owns What (Difficulty: Difficult - 7):
 *   Scenario: "Three people each have a pet, car, and hobby..."
 *   Clues: "Alice doesn't have a cat or drive a sedan..."
 *   Answer: "Alice: Dog, SUV, Reading; Bob: Cat, Sedan, Cooking..."
 *   Explanation: "Use elimination to determine each person's items..."
 *
 * Example 3 - Complex Relationships (Difficulty: Evil - 9):
 *   Scenario: "Six people, six jobs, six cities, six hobbies..."
 *   Clues: "Multiple conditional and negative clues..."
 *   Answer: "Complete solution with all relationships"
 *   Explanation: "Complex deduction requiring multiple elimination steps..."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy logic grids:
 *
 * - Hard (5-6): 3-4 categories, 3-4 items each, direct clues, straightforward
 *   relationships, minimal conditional logic.
 *
 * - Difficult (7-8): 4-5 categories, 4-5 items each, some conditional clues,
 *   indirect relationships, requires systematic elimination.
 *
 * - Evil (8-9): 5-6 categories, 5-6 items each, complex conditional clues,
 *   highly interdependent relationships, requires advanced deduction.
 *
 * - Impossible (9-10): 6+ categories, 6+ items each, very complex clues,
 *   multiple layers of logic, requires expert-level deduction skills.
 *
 * CATEGORIES
 * ----------
 * - classic_einstein: Traditional Einstein/Zebra puzzle format
 * - who_owns_what: People and their possessions
 * - who_lives_where: People and locations
 * - who_drinks_what: People and beverages
 * - who_plays_what: People and activities
 * - who_wears_what: People and clothing/accessories
 * - mixed_relationships: Multiple relationship types
 * - temporal_ordering: Time-based relationships
 * - spatial_relationships: Location-based relationships
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The scenario and clues text
 *    - answer: Complete solution showing all relationships
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Step-by-step deductive reasoning
 *    - category: Type of logic grid puzzle
 *    - hints: Progressive hints guiding deduction
 *    - complexityScore: Detailed difficulty breakdown
 *    - categories: Array of category names
 *    - items: Object mapping categories to item arrays
 *    - clues: Array of clue statements
 *    - grid: Optional grid representation
 *
 * 2. GENERATION: AI creates logic grid puzzles
 *    - Designs consistent scenarios
 *    - Creates sufficient clues for unique solution
 *    - Ensures logical consistency
 *
 * 3. VALIDATION: Quality checks
 *    - Must have 3-6 categories
 *    - Must have 5-15 clues
 *    - Clues must be sufficient for unique solution
 *    - All items must be defined
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - numberOfCategories: Number of categories
 *    - numberOfItems: Items per category
 *    - clueComplexity: Complexity of clues
 *    - deductiveSteps: Number of deduction steps needed
 *    - logicalInterdependence: How interdependent clues are
 *
 * 5. HINTS: Progressive deduction assistance
 *    - Start with general strategy
 *    - Progress to specific clues
 *    - Guide deduction steps
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clarity: Are clues clear?
 *    - solvability: Can puzzle be solved?
 *    - logicalConsistency: Is logic sound?
 *    - creativity: Is scenario interesting?
 *    - difficultyBalance: Is difficulty balanced?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - numberOfCategories: Number of categories in puzzle
 *   (1 = 3 categories, 10 = 6+ categories)
 *
 * - numberOfItems: Items per category
 *   (1 = 3 items, 10 = 6+ items)
 *
 * - clueComplexity: Complexity of clue statements
 *   (1 = simple direct clues, 10 = complex indirect/conditional clues)
 *
 * - deductiveSteps: Number of logical steps required
 *   (1 = few steps, 10 = many interconnected steps)
 *
 * - logicalInterdependence: How interdependent clues are
 *   (1 = independent clues, 10 = highly interdependent clues)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create logic grid puzzles.
 * Request via: GET /api/puzzle/regenerate?type=logic-grid
 *
 * ============================================================================
 */

import { z } from "zod";
import { GLOBAL_CONTEXT, DIFFICULTY_MIN, DIFFICULTY_MAX } from "../global";
import type { PuzzleTypeConfig } from "../types";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const CATEGORIES_MIN = 3;
const CATEGORIES_MAX = 6;
const CLUES_MIN = 5;
const CLUES_MAX = 15;
const DEFAULT_TARGET_DIFFICULTY = 5;
const WEIGHT_NUMBER_OF_CATEGORIES = 0.15;
const WEIGHT_NUMBER_OF_ITEMS = 0.15;
const WEIGHT_CLUE_COMPLEXITY = 0.25;
const WEIGHT_DEDUCTIVE_STEPS = 0.25;
const WEIGHT_LOGICAL_INTERDEPENDENCE = 0.2;
const PUZZLE_MIN_LENGTH_FOR_QUALITY = 100;
const CLUES_MIN_FOR_QUALITY = 5;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_FAIR = 70;
const QUALITY_SCORE_CREATIVE_BASE = 75;
const QUALITY_SCORE_CREATIVE_LOW = 65;
const QUALITY_SCORE_MAX = 100;
const EXPLANATION_MIN_LENGTH = 50;
const ANSWER_MIN_LENGTH = 20;
const COMPLEXITY_FALLBACK = 5;
const COMPLEXITY_MULTIPLIER = 2;
const DIFFICULTY_TOLERANCE = 2;
const DIFFICULTY_PENALTY_MULTIPLIER = 5;
const COMPLEXITY_SCORES_COUNT = 5;
const CLUES_PER_CATEGORY_MULTIPLIER = 2;

// Logic grid puzzle schema
export const LogicGridPuzzleSchema = z.object({
  puzzle: z.string().describe("The logic grid puzzle scenario and clues"),
  answer: z
    .string()
    .describe(
      "The complete solution to the puzzle (e.g., 'Person A has Item X, Person B has Item Y...')"
    ),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 4-8 (mid-level challenging)"),
  explanation: z
    .string()
    .describe(
      "Step-by-step explanation of how to solve the puzzle using deductive reasoning"
    ),
  category: z
    .enum([
      "classic_einstein",
      "who_owns_what",
      "who_lives_where",
      "who_drinks_what",
      "who_plays_what",
      "who_wears_what",
      "mixed_relationships",
      "temporal_ordering",
      "spatial_relationships",
    ])
    .describe("The type of logic grid puzzle"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      numberOfCategories: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      numberOfItems: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      clueComplexity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      deductiveSteps: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      logicalInterdependence: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  // Additional fields for logic grid puzzles
  categories: z
    .array(z.string())
    .min(CATEGORIES_MIN)
    .max(CATEGORIES_MAX)
    .describe(
      "The categories in the puzzle (e.g., ['People', 'Houses', 'Pets', 'Drinks'])"
    ),
  items: z
    .record(z.string(), z.array(z.string()))
    .describe(
      "Items in each category (e.g., { 'People': ['Alice', 'Bob', 'Charlie'], 'Houses': ['Red', 'Blue', 'Green'] })"
    ),
  clues: z
    .array(z.string())
    .min(CLUES_MIN)
    .max(CLUES_MAX)
    .describe("The clues/statements that help solve the puzzle"),
  grid: z
    .string()
    .optional()
    .describe("Optional grid representation of the puzzle"),
});

export type LogicGridPuzzle = z.infer<typeof LogicGridPuzzleSchema>;

export const LOGIC_GRID_CONFIG: PuzzleTypeConfig = {
  id: "logic-grid",
  name: "Logic Grid Puzzle",
  description:
    "Einstein-style puzzles requiring deductive reasoning to solve relationships between multiple categories",

  schema: LogicGridPuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master logic grid puzzle creator with deep expertise in:
- Deductive reasoning and logical inference
- Constraint satisfaction problems
- Grid-based puzzle design
- Classic Einstein/Zebra puzzle structures
- Multi-category relationship puzzles
- Step-by-step logical deduction
- Puzzle difficulty calibration
- Educational puzzle design

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create logic grid puzzles that are intellectually stimulating, solvable through pure deduction, and provide satisfying "aha!" moments. Your puzzles require genuine logical thinking and provide clear, step-by-step solutions.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT logic grid puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- numberOfCategories: 1-10 (1 = 3 categories, 10 = 6+ categories)
- numberOfItems: 1-10 (1 = 3 items per category, 10 = 6+ items per category)
- clueComplexity: 1-10 (1 = simple direct clues, 10 = complex indirect/conditional clues)
- deductiveSteps: 1-10 (1 = few steps, 10 = many interconnected steps)
- logicalInterdependence: 1-10 (1 = independent clues, 10 = highly interdependent clues)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What scenario would be engaging at this difficulty level? (Be specific and creative)
2. What categories and items create interesting relationships? (Think beyond clichés)
3. How can you make this require genuine deductive reasoning? (Not just pattern matching)
4. What makes this puzzle unique and novel? (Avoid overused scenarios)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What logical processes will solvers need? (Elimination, inference, constraint satisfaction, etc.)
7. How can clues be structured to require multiple deduction steps?
8. What relationships create interesting logical dependencies?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a scenario type that's rare, innovative, or unexpected" : ""}

Create a puzzle that requires:
- Multiple deduction steps (not just direct matching)
- Genuine logical reasoning (not guesswork)
- Constraint satisfaction (eliminating possibilities)
- Pattern recognition (identifying relationships)
- Systematic thinking (organizing information)
- A satisfying "aha!" moment when solved (not just "I see it now")

PUZZLE STRUCTURE REQUIREMENTS:
- 3-6 categories (e.g., People, Houses, Pets, Drinks, Hobbies)
- 3-6 items per category (e.g., ['Alice', 'Bob', 'Charlie'] for People)
- 5-15 clues that are:
  * Clear and unambiguous
  * Sufficient to solve the puzzle
  * Require logical deduction (not just direct statements)
  * Create interesting relationships and constraints
- A complete answer showing all relationships
- A step-by-step explanation of the solution process

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The answer should be unique and logically sound
- The explanation should be clear and comprehensive
- Hints should guide without giving it away
- The complexity scores should accurately reflect the puzzle's actual difficulty
- All clues must be consistent and lead to a single solution

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
      "complexityScore",
      "categories",
      "items",
      "clues",
    ],
    constraints: {
      puzzle: {
        min: 50,
        max: 2000,
      },
      answer: {
        min: 20,
        max: 500,
      },
      difficulty: {
        min: 5,
        max: 10,
      },
      hints: {
        min: HINTS_MIN,
        max: HINTS_MAX,
      },
      categories: {
        min: 3,
        max: 6,
      },
      clues: {
        min: 5,
        max: 15,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      // Use the AI's provided complexity scores for overall difficulty
      const typedPuzzle = puzzle as LogicGridPuzzle;
      const scores = typedPuzzle.complexityScore;
      if (!scores) {
        return typedPuzzle.difficulty; // Fallback if scores are missing
      }

      const weightedSum =
        scores.numberOfCategories * WEIGHT_NUMBER_OF_CATEGORIES +
        scores.numberOfItems * WEIGHT_NUMBER_OF_ITEMS +
        scores.clueComplexity * WEIGHT_CLUE_COMPLEXITY +
        scores.deductiveSteps * WEIGHT_DEDUCTIVE_STEPS +
        scores.logicalInterdependence * WEIGHT_LOGICAL_INTERDEPENDENCE;

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
        name: "numberOfCategories",
        weight: WEIGHT_NUMBER_OF_CATEGORIES,
        extract: (puzzle: unknown) =>
          (puzzle as LogicGridPuzzle).complexityScore.numberOfCategories,
      },
      {
        name: "numberOfItems",
        weight: WEIGHT_NUMBER_OF_ITEMS,
        extract: (puzzle: unknown) =>
          (puzzle as LogicGridPuzzle).complexityScore.numberOfItems,
      },
      {
        name: "clueComplexity",
        weight: WEIGHT_CLUE_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as LogicGridPuzzle).complexityScore.clueComplexity,
      },
      {
        name: "deductiveSteps",
        weight: WEIGHT_DEDUCTIVE_STEPS,
        extract: (puzzle: unknown) =>
          (puzzle as LogicGridPuzzle).complexityScore.deductiveSteps,
      },
      {
        name: "logicalInterdependence",
        weight: WEIGHT_LOGICAL_INTERDEPENDENCE,
        extract: (puzzle: unknown) =>
          (puzzle as LogicGridPuzzle).complexityScore.logicalInterdependence,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for logic grid puzzles.
Your brand voice is ${GLOBAL_CONTEXT.brandVoice.tone}.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

PROGRESSION EXAMPLE:
Level 1 (10-20%): "Start by identifying which clues give you direct information"
Level 2 (30-40%): "Look for clues that eliminate possibilities in multiple categories"
Level 3 (50-60%): "Consider which relationships can be deduced from the constraints"
Level 4 (70-80%): "Focus on the category that has the most constraints"
Level 5 (90%): "Use the elimination method to narrow down the remaining possibilities"`,

    userPromptTemplate: `Generate {count} progressive hints for this logic grid puzzle:

Puzzle: "{puzzle}"
Answer: "{answer}"
Explanation: "{explanation}"
Difficulty: {difficulty}/10
Categories: {categories}
Number of clues: {clues.length}

Create hints that gradually reveal the solution approach:
1. Very subtle (10-20% revealed) - General strategy
2. Gentle nudge (30-40% revealed) - Which clues to focus on
3. Clear direction (50-60% revealed) - Specific deduction steps
4. Almost there (70-80% revealed) - Key relationships
5. Final push (90% revealed, but not the answer itself) - Final deduction method

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "clarity",
        weight: 0.2,
        description: "Are the clues clear and unambiguous?",
        score: (puzzle: unknown) => {
          // Check if puzzle and clues are clear
          const typedPuzzle = puzzle as LogicGridPuzzle;
          const puzzleLength = typedPuzzle.puzzle.length;
          const cluesCount = typedPuzzle.clues.length;
          const hasClearStructure =
            typedPuzzle.categories.length >= CATEGORIES_MIN &&
            typedPuzzle.categories.length <= CATEGORIES_MAX;
          return hasClearStructure &&
            cluesCount >= CLUES_MIN_FOR_QUALITY &&
            puzzleLength > PUZZLE_MIN_LENGTH_FOR_QUALITY
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "solvability",
        weight: 0.25,
        description: "Can the puzzle be solved with the given clues?",
        score: (puzzle: unknown) => {
          // Check if there are enough clues and items are defined
          const typedPuzzle = puzzle as LogicGridPuzzle;
          const cluesCount = typedPuzzle.clues.length;
          const categoriesCount = typedPuzzle.categories.length;
          const itemsDefined =
            Object.keys(typedPuzzle.items).length === categoriesCount;
          const sufficientClues =
            cluesCount >= categoriesCount * CLUES_PER_CATEGORY_MULTIPLIER;
          return itemsDefined && sufficientClues
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "logicalConsistency",
        weight: 0.2,
        description: "Is the puzzle logically consistent?",
        score: (puzzle: unknown) => {
          // Check if explanation is clear and answer is provided
          const typedPuzzle = puzzle as LogicGridPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH;
          const hasAnswer = typedPuzzle.answer.length > ANSWER_MIN_LENGTH;
          return hasExplanation && hasAnswer
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.15,
        description: "Is the puzzle creative and engaging?",
        score: (puzzle: unknown) => {
          // Higher score for novel categories and interesting scenarios
          const typedPuzzle = puzzle as LogicGridPuzzle;
          const novelCategories = [
            "temporal_ordering",
            "spatial_relationships",
            "mixed_relationships",
          ];
          const baseScore = novelCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_CREATIVE_BASE
            : QUALITY_SCORE_CREATIVE_LOW;
          const complexity =
            typedPuzzle.complexityScore?.clueComplexity || COMPLEXITY_FALLBACK;
          return Math.min(
            QUALITY_SCORE_MAX,
            baseScore + complexity * COMPLEXITY_MULTIPLIER
          );
        },
      },
      {
        name: "difficultyBalance",
        weight: 0.2,
        description: "Is the difficulty balanced?",
        score: (puzzle: unknown) => {
          // Check if difficulty matches complexity scores
          const typedPuzzle = puzzle as LogicGridPuzzle;
          const calculatedDifficulty = typedPuzzle.difficulty;
          const complexityAvg =
            (typedPuzzle.complexityScore.numberOfCategories +
              typedPuzzle.complexityScore.numberOfItems +
              typedPuzzle.complexityScore.clueComplexity +
              typedPuzzle.complexityScore.deductiveSteps +
              typedPuzzle.complexityScore.logicalInterdependence) /
            COMPLEXITY_SCORES_COUNT;
          const diff = Math.abs(calculatedDifficulty - complexityAvg);
          return diff <= DIFFICULTY_TOLERANCE
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR - diff * DIFFICULTY_PENALTY_MULTIPLIER;
        },
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        clarity: 0.2,
        solvability: 0.25,
        logicalConsistency: 0.2,
        creativity: 0.15,
        difficultyBalance: 0.2,
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
      "Logic grid puzzles (Einstein puzzles) require deductive reasoning to solve relationships between multiple categories.",
    rules: [
      "Organize information systematically - often using a grid or table",
      "Apply deductive reasoning to eliminate possibilities",
      "Use constraint satisfaction - each clue narrows down options",
      "Look for clues that connect multiple categories",
      "Verify all clues are satisfied by your final solution",
    ],
    examples: [
      "Five people live in five houses of different colors - use clues to match each person to their house",
      "Three people each have a pet, car, and hobby - use elimination to determine each person's items",
    ],
  },
};
