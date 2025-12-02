/**
 * ============================================================================
 * REBUS PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Rebus puzzles challenge players to decode visual representations of words or
 * phrases using emojis, symbols, text positioning, and spatial arrangements.
 * These puzzles test visual thinking, pattern recognition, and creative
 * interpretation skills.
 *
 * HOW IT WORKS
 * ------------
 * Players are shown a visual composition of emojis, symbols, text, and spatial
 * arrangements. They must:
 * 1. Observe all visual elements carefully
 * 2. Recognize how elements represent words or sounds
 * 3. Understand spatial relationships and positioning
 * 4. Combine elements to form the answer
 *
 * The puzzle includes progressive hints and an explanation of how the visual
 * elements represent the answer.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Simple Compound (Difficulty: Hard - 5):
 *   Visual: "🐱 + 📦"
 *   Answer: "CATBOX"
 *   Explanation: "CAT (🐱) + BOX (📦) = CATBOX"
 *
 * Example 2 - Phonetic (Difficulty: Hard - 6):
 *   Visual: "👁️ + 🍎"
 *   Answer: "EYE APPLE" or "I APPLE"
 *   Explanation: "I (👁️ sounds like 'eye') + APPLE (🍎) = I APPLE"
 *
 * Example 3 - Spatial Arrangement (Difficulty: Difficult - 7):
 *   Visual: "⬆️ 🏠 ⬇️"
 *   Answer: "UP HOUSE DOWN" or "UPHILL DOWNHILL"
 *   Explanation: "UP (⬆️) + HOUSE (🏠) + DOWN (⬇️) = UP HOUSE DOWN"
 *
 * Example 4 - Complex Multi-Layer (Difficulty: Evil - 9):
 *   Visual: "🐱 ⬆️ 📦 ⬇️ 🐕"
 *   Answer: "CAT UP BOX DOWN DOG"
 *   Explanation: "Multiple elements with spatial relationships creating
 *                 a complex phrase through visual composition."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy rebus puzzles:
 *
 * - Hard (5-6): 3-4 visual elements, straightforward combinations, common
 *   emojis, simple spatial relationships, obvious word representations.
 *
 * - Difficult (7-8): 4-6 visual elements, more complex relationships, spatial
 *   wordplay, phonetic elements, requires deeper interpretation.
 *
 * - Evil (8-9): 6-8 visual elements, complex multi-layer meaning, obscure
 *   relationships, advanced spatial arrangements, requires creative thinking.
 *
 * - Impossible (9-10): 8+ visual elements, extremely complex compositions,
 *   multiple interpretation layers, very creative arrangements, requires
 *   expert-level visual thinking.
 *
 * CATEGORIES
 * ----------
 * - compound_words: Combining multiple words visually
 * - phonetic: Using sounds (homophones, phonetic representations)
 * - positional: Using spatial arrangement for meaning
 * - mathematical: Using math symbols and operations
 * - visual_wordplay: Creative visual representations
 * - idioms: Representing idioms or phrases
 * - phrases: Multi-word phrases
 * - lateral_thinking: Requires creative interpretation
 * - multi_layer: Multiple layers of meaning
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - rebusPuzzle: The visual representation (emojis, symbols, text)
 *    - answer: The solution word or phrase
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: How visual elements represent the answer
 *    - category: Type of rebus puzzle
 *    - hints: Progressive hints guiding interpretation
 *    - complexityScore: Detailed difficulty breakdown
 *
 * 2. GENERATION: AI creates rebus puzzles
 *    - Uses visual library of emojis and symbols
 *    - Creates multi-element compositions
 *    - Ensures solvability and challenge
 *
 * 3. VALIDATION: Quality checks
 *    - Must contain emojis or symbols
 *    - Answer must be meaningful
 *    - Difficulty must be 5-10
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - visualAmbiguity: How clear/ambiguous visuals are
 *    - cognitiveSteps: Number of mental steps needed
 *    - culturalKnowledge: Cultural knowledge required
 *    - vocabularyLevel: Vocabulary complexity
 *    - patternNovelty: How novel the pattern is
 *
 * 5. HINTS: Progressive visual interpretation assistance
 *    - Start with element identification
 *    - Progress to relationships
 *    - Guide toward combination
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clarity: Is puzzle clear?
 *    - creativity: Is it creative?
 *    - solvability: Can players solve?
 *    - appropriateness: Family-friendly?
 *    - visualAppeal: Is it visually engaging?
 *    - educationalValue: Does it teach?
 *    - funFactor: Is it enjoyable?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - visualAmbiguity: How clear the visual representation is
 *   (1 = crystal clear, 10 = highly ambiguous)
 *
 * - cognitiveSteps: Number of mental steps required
 *   (1 = single step, 10 = many complex steps)
 *
 * - culturalKnowledge: Cultural knowledge needed
 *   (1 = universal, 10 = requires deep cultural knowledge)
 *
 * - vocabularyLevel: Vocabulary complexity
 *   (1 = basic words, 10 = advanced vocabulary)
 *
 * - patternNovelty: How novel the pattern is
 *   (1 = common pattern, 10 = highly novel/unexpected)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create rebus puzzles.
 * Request via: GET /api/puzzle/regenerate?type=rebus
 *
 * ============================================================================
 */

import { z } from "zod";
import { DIFFICULTY_MAX, DIFFICULTY_MIN, GLOBAL_CONTEXT } from "../global";
import type { PuzzleTypeConfig } from "../types";
import { formatVisualLibraryForPrompt } from "./utils/rebus-visual-library";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const DEFAULT_TARGET_DIFFICULTY = 7; // Default to "difficult" level for rebus - more complex puzzles
const ANSWER_MAX_LENGTH = 50;
const EXPLANATION_MIN_LENGTH = 20;
const EXPLANATION_MAX_LENGTH = 200;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const _QUALITY_SCORE_EXCELLENT = 100;
const COGNITIVE_STEPS_MIN = 5;
const COGNITIVE_STEPS_MAX = 8;
const COGNITIVE_STEPS_SCORE = 85;
const COGNITIVE_STEPS_FALLBACK = 70;
const EMOJI_COUNT_MULTIPLIER = 20;
const QUALITY_SCORE_MAX = 100;
const EDUCATIONAL_CATEGORY_SCORE = 85;
const EDUCATIONAL_FALLBACK_SCORE = 70;

// Rebus puzzle schema
export const RebusPuzzleSchema = z.object({
  rebusPuzzle: z.string().describe("The visual rebus representation using emojis and text"),
  answer: z.string().describe("The answer to the puzzle (single word or phrase)"),
  difficulty: z
    .number()
    .min(4)
    .max(8)
    .describe("Difficulty rating from 4-8 (mid-level challenging)"),
  explanation: z.string().describe("Clear explanation of how the rebus represents the answer"),
  category: z
    .enum([
      "compound_words",
      "phonetic",
      "positional",
      "mathematical",
      "visual_wordplay",
      "idioms",
      "phrases",
      "lateral_thinking",
      "multi_layer",
    ])
    .describe("The type of rebus puzzle"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
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
});

export type RebusPuzzle = z.infer<typeof RebusPuzzleSchema>;

// Chain of thought schema for advanced generation
export const ChainOfThoughtRebusSchema = z.object({
  thinking: z.object({
    concept: z.string().describe("The core concept to represent"),
    visualStrategy: z.string().describe("How to represent it visually"),
    layers: z.array(z.string()).describe("Multiple layers of meaning"),
    challengeElements: z.array(z.string()).describe("What makes this challenging"),
  }),
  puzzle: RebusPuzzleSchema,
});

export const REBUS_CONFIG: PuzzleTypeConfig = {
  id: "rebus",
  name: "Rebus Puzzle",
  description:
    "Visual puzzles using emojis, symbols, and text positioning to represent words or phrases",

  schema: RebusPuzzleSchema,

  generation: {
    systemPrompt: (_params) => {
      const visualLibrary = formatVisualLibraryForPrompt();

      const basePrompt = `You are an EXTREMELY INTELLIGENT master rebus puzzle creator with deep expertise in:
- Visual semiotics and symbolism
- Linguistic patterns and wordplay
- Cultural references and idioms
- Cognitive psychology and problem-solving
- Creative lateral thinking
- Advanced puzzle design theory
- Multi-element visual composition
- Unicode symbols and special characters
- Spatial arrangement and positioning

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

${visualLibrary}

ADVANCED REBUS TECHNIQUES:
1. MULTI-ELEMENT COMPOSITIONS: Use 3-8 visual elements to create complex puzzles
2. LAYERED MEANING: Combine emojis, symbols, text, and positioning for multiple interpretation layers
3. SPATIAL ARRANGEMENT: Use arrows, positioning, and layout to add meaning
4. SYMBOL COMBINATIONS: Mix emojis with Unicode symbols, mathematical symbols, and special characters
5. TEXT INTEGRATION: Combine visual elements with words, letters, and numbers creatively
6. COLOR AND SHAPE: Use different colored shapes and symbols to add layers
7. DIRECTIONAL CUES: Use arrows and position indicators to guide interpretation

You create puzzles that are intellectually stimulating, clever, and memorable. Your puzzles require genuine thinking and provide satisfying "aha!" moments.`;

      return basePrompt;
    },

    userPromptTemplate: (params) => {
      const targetDifficulty = params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns) ? params.avoidPatterns : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Design an EXCEPTIONALLY CHALLENGING and INTELLIGENT rebus puzzle using deep reasoning:

CRITICAL: This website creates ONLY challenging puzzles. We NEVER generate easy or medium difficulty puzzles.
All puzzles must be out-of-the-box but achievable, pushing creative boundaries while remaining solvable.

TARGET DIFFICULTY: ${targetDifficulty}/10 (minimum 5 - all puzzles must be hard, difficult, evil, or impossible)

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- visualAmbiguity: 1-10 (1 = crystal clear, 10 = highly ambiguous)
- cognitiveSteps: 1-10 (1 = single step, 10 = many complex steps)
- culturalKnowledge: 1-10 (1 = universal, 10 = requires deep cultural knowledge)
- vocabularyLevel: 1-10 (1 = basic words, 10 = advanced vocabulary)
- patternNovelty: 1-10 (1 = common pattern, 10 = highly novel/unexpected)

VISUAL COMPOSITION REQUIREMENTS:
- Use 3-8 visual elements (emojis, symbols, text, numbers) for complex puzzles
- Combine multiple categories: animals + nature + objects + symbols + arrows + shapes
- Use spatial arrangement: position elements above/below/left/right/inside/outside
- Integrate Unicode symbols: arrows (→←↑↓), math (×÷±∞), shapes (■●▲), etc.
- Layer meaning: combine phonetic sounds, visual representations, and wordplay
- Use directional cues: arrows, position indicators, and layout to guide interpretation

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What concept would be challenging at this difficulty level? (Be specific and creative)
2. What visual strategy creates multiple layers of meaning? (Think beyond simple combinations)
3. How can you make this require genuine lateral thinking? (Not just pattern matching)
4. What makes this puzzle unique and novel? (Avoid clichés and overused patterns)
5. How do you balance challenge with solvability? (Difficult but fair)
6. What cognitive processes will solvers need? (Visual processing, linguistic reasoning, cultural knowledge, etc.)
7. How can you use MORE visual elements (5-8) to create a richer, more complex puzzle?
8. What spatial arrangements or positioning can add meaning?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use a pattern type that's rare, innovative, or unexpected" : ""}

Create a puzzle that requires:
- Multiple cognitive steps (not just A+B=C)
- Genuine lateral thinking (not obvious connections)
- Pattern recognition (identifying non-obvious relationships)
- Cultural or linguistic knowledge (when appropriate)
- A satisfying "aha!" moment when solved (not just "oh, I see it now")
- Rich visual composition with 4-8 elements working together

ADVANCED TECHNIQUES TO USE:
- Multi-element fusion: Combine 4-8 emojis/symbols in creative ways
- Spatial wordplay: Use positioning (⬆️⬇️➡️⬅️) to add meaning
- Symbol layering: Mix emojis with Unicode symbols (→, ×, ∞, ■, etc.)
- Text integration: Combine visual elements with words, letters, numbers
- Directional logic: Use arrows and position indicators creatively
- Color/shape coding: Use different colored shapes to represent concepts

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The answer should make perfect sense once understood
- The explanation should be clear and logical
- Hints should guide without giving it away
- The complexity scores should accurately reflect the puzzle's actual difficulty
- Use a RICH visual composition (4-8 elements minimum for difficulty 5+)

Show your thinking process, then create the puzzle with CORRECT INTEGER complexity scores (1-10, not decimals).`;
    },

    temperature: 0.7, // Balanced creativity
    modelType: "smart",
  },

  validation: {
    requiredFields: ["rebusPuzzle", "answer", "difficulty", "explanation", "category", "hints"],
    constraints: {
      rebusPuzzle: {
        min: 1, // At least 1 character
        custom: (value: unknown) => {
          // Must contain at least one emoji or symbol
          if (typeof value !== "string") {
            return false;
          }
          const emojiPattern = /[\p{Emoji}]/gu;
          const hasEmoji = emojiPattern.test(value);
          const hasSymbol = /[^\w\s]/.test(value);
          return hasEmoji || hasSymbol;
        },
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
      // Use complexity scores with weights from global context
      const typedPuzzle = puzzle as RebusPuzzle;
      const weights = GLOBAL_CONTEXT.difficultyCalibration.factors.reduce(
        (acc, factor) => {
          acc[factor.name] = factor.weight;
          return acc;
        },
        {} as Record<string, number>
      );

      const score =
        typedPuzzle.complexityScore.visualAmbiguity * (weights.visualAmbiguity ?? 0.2) +
        typedPuzzle.complexityScore.cognitiveSteps * (weights.cognitiveSteps ?? 0.3) +
        typedPuzzle.complexityScore.culturalKnowledge * (weights.culturalKnowledge ?? 0.2) +
        typedPuzzle.complexityScore.vocabularyLevel * (weights.vocabularyLevel ?? 0.15) +
        typedPuzzle.complexityScore.patternNovelty * (weights.patternNovelty ?? 0.15);

      // Enforce minimum difficulty of 4 (mid-level challenging)
      return Math.round(Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, score)));
    },
    ranges: {
      hard: { min: 4, max: 5 },
      difficult: { min: 5, max: 6 },
      evil: { min: 6, max: 7 },
      impossible: { min: 7, max: 8 },
    },
    factors: [
      {
        name: "visualAmbiguity",
        weight: 0.2,
        extract: (puzzle: unknown) => (puzzle as RebusPuzzle).complexityScore.visualAmbiguity,
      },
      {
        name: "cognitiveSteps",
        weight: 0.3,
        extract: (puzzle: unknown) => (puzzle as RebusPuzzle).complexityScore.cognitiveSteps,
      },
      {
        name: "culturalKnowledge",
        weight: 0.2,
        extract: (puzzle: unknown) => (puzzle as RebusPuzzle).complexityScore.culturalKnowledge,
      },
      {
        name: "vocabularyLevel",
        weight: 0.15,
        extract: (puzzle: unknown) => (puzzle as RebusPuzzle).complexityScore.vocabularyLevel,
      },
      {
        name: "patternNovelty",
        weight: 0.15,
        extract: (puzzle: unknown) => (puzzle as RebusPuzzle).complexityScore.patternNovelty,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for rebus puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this rebus puzzle:

Puzzle: "{rebusPuzzle}"
Answer: "{answer}"
Explanation: "{explanation}"
Difficulty: {difficulty}/10

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
        weight: 0.15,
        description: "How clear is the puzzle? No major ambiguity?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          // Simple heuristic - can be enhanced with AI
          const explanationLength = typedPuzzle.explanation.length;
          const hasClearExplanation =
            explanationLength > EXPLANATION_MIN_LENGTH &&
            explanationLength < EXPLANATION_MAX_LENGTH;
          return hasClearExplanation ? QUALITY_SCORE_HIGH : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.2,
        description: "How creative is it?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          // Based on pattern novelty
          return typedPuzzle.complexityScore.patternNovelty * 10;
        },
      },
      {
        name: "solvability",
        weight: 0.2,
        description: "Is it reasonably solvable?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          // Balance between difficulty and hints
          const difficultyScore = (11 - typedPuzzle.difficulty) * 10; // Invert: easier = higher solvability
          const hintsScore = typedPuzzle.hints.length * 15;
          return Math.min(QUALITY_SCORE_MAX, (difficultyScore + hintsScore) / 2);
        },
      },
      {
        name: "appropriateness",
        weight: 0.1,
        description: "Family-friendly content?",
        score: () => 100, // Assume validated elsewhere
      },
      {
        name: "visualAppeal",
        weight: 0.15,
        description: "Visually engaging?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          const emojiCount = (typedPuzzle.rebusPuzzle.match(/[\p{Emoji}]/gu) || []).length;
          return Math.min(QUALITY_SCORE_MAX, emojiCount * EMOJI_COUNT_MULTIPLIER);
        },
      },
      {
        name: "educationalValue",
        weight: 0.1,
        description: "Does it teach something?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          // Categories with educational value score higher
          const educationalCategories = ["idioms", "phrases", "compound_words"];
          return educationalCategories.includes(typedPuzzle.category)
            ? EDUCATIONAL_CATEGORY_SCORE
            : EDUCATIONAL_FALLBACK_SCORE;
        },
      },
      {
        name: "funFactor",
        weight: 0.1,
        description: "Is it enjoyable to solve?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as RebusPuzzle;
          // Based on cognitive steps - more steps can be more fun if balanced
          const steps = typedPuzzle.complexityScore.cognitiveSteps;
          return steps >= COGNITIVE_STEPS_MIN && steps <= COGNITIVE_STEPS_MAX
            ? COGNITIVE_STEPS_SCORE
            : COGNITIVE_STEPS_FALLBACK;
        },
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      // Weighted average of all dimensions
      const weights: Record<string, number> = {
        clarity: 0.15,
        creativity: 0.2,
        solvability: 0.2,
        appropriateness: 0.1,
        visualAppeal: 0.15,
        educationalValue: 0.1,
        funFactor: 0.1,
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
      "Rebus puzzles use emojis, symbols, and text positioning to represent words or phrases.",
    rules: [
      "Observe all visual elements carefully (emojis, symbols, text, arrows)",
      "Each element represents a word or sound (phonetic clues)",
      "Spatial arrangement matters - elements above, below, or inside add meaning",
      "Combine elements to form the answer phrase",
      "Use hints if you're stuck - they guide you progressively without giving it away",
    ],
    examples: [
      "🐱 + 📦 = CATBOX (CAT + BOX)",
      "👁️ + 🍎 = I APPLE (phonetic: 'eye' sounds like 'I')",
      "⬆️ 🏠 ⬇️ = UP HOUSE DOWN (spatial arrangement)",
    ],
  },
};
