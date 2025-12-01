/**
 * ============================================================================
 * CAESAR CIPHER PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Caesar cipher puzzles challenge players to decode encrypted messages using
 * classical cryptography techniques. These puzzles teach code-breaking skills
 * and pattern recognition while being engaging and educational.
 *
 * HOW IT WORKS
 * ------------
 * A Caesar cipher shifts each letter in the alphabet by a fixed number of
 * positions. Players must:
 * 1. Recognize that text is encrypted using a cipher
 * 2. Identify the shift amount (by trial or pattern recognition)
 * 3. Decode the message letter by letter
 * 4. Recognize valid words/phrases once decoded
 *
 * The puzzle includes progressive hints that guide players toward decoding
 * without revealing the answer, and an explanation teaching the cipher method.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - ROT13 (Shift 13, Difficulty: Hard - 5):
 *   Encrypted: "URYYB JBEYQ"
 *   Answer: "HELLO WORLD"
 *   Explanation: "ROT13 cipher - each letter is shifted 13 positions forward
 *                 in the alphabet. U→H, R→E, Y→L, etc. This is symmetric:
 *                 shifting by 13 twice returns to the original."
 *
 * Example 2 - Shift 3 (Difficulty: Hard - 6):
 *   Encrypted: "KHOR ZRUOG"
 *   Answer: "HELLO WORLD"
 *   Explanation: "Caesar cipher with shift 3 - each letter moves forward 3
 *                 positions. K→H (wraps around), H→E, O→L, etc."
 *
 * Example 3 - Custom Shift 7 (Difficulty: Difficult - 7):
 *   Encrypted: "OLSSV DVYSK"
 *   Answer: "HELLO WORLD"
 *   Explanation: "Caesar cipher with shift 7 - each letter shifts forward 7
 *                 positions in the alphabet. O→H, L→E, S→L (wraps), etc."
 *
 * Example 4 - Long Phrase (Difficulty: Difficult - 8):
 *   Encrypted: "XIFSF EPX XIFSF XBTU"
 *   Answer: "WHERE ARE WHERE YOU"
 *   Explanation: "Shift 1 cipher (also called ROT1). Each letter moves
 *                 forward 1 position: W→X, H→I, E→F, etc."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy ciphers:
 *
 * - Hard (5-6): Common shifts (ROT13, shift 3), short words/phrases,
 *   hints about shift direction may be provided.
 *
 * - Difficult (7-8): Custom shifts, longer messages, no shift hints,
 *   requires pattern recognition and trial/error.
 *
 * - Evil (8-9): Unusual shifts, complex phrases, multiple words,
 *   requires frequency analysis or systematic decoding.
 *
 * - Impossible (9-10): Very long messages, unusual shift amounts,
 *   requires advanced code-breaking techniques, minimal hints.
 *
 * CATEGORIES
 * ----------
 * - rot13: Shift of 13 (symmetric, common in online communities)
 * - rot3: Shift of 3 (classic Caesar cipher shift)
 * - custom_shift: Any shift amount from 1-25
 * - word_cipher: Single word encoded
 * - phrase_cipher: Multi-word phrase encoded
 * - sentence_cipher: Full sentence encoded
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The encrypted ciphertext (what players see)
 *    - answer: The decrypted plaintext
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: How the cipher works and decoding steps
 *    - category: Type of Caesar cipher
 *    - hints: Progressive decoding hints
 *    - complexityScore: Difficulty breakdown
 *    - shift: The shift amount used (1-25)
 *
 * 2. GENERATION: AI puzzle creation instructions
 *    - Guides AI to create solvable but challenging ciphers
 *    - Ensures family-friendly messages
 *    - Balances challenge with accessibility
 *
 * 3. VALIDATION: Quality checks
 *    - Ciphertext must be letters/spaces only
 *    - Answer must be meaningful text
 *    - Shift must be valid (1-25)
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - patternObscurity: How hidden the pattern is
 *    - clueProvided: Whether shift amount is hinted
 *    - messageLength: Length of encrypted message
 *    - shiftComplexity: How common/unusual the shift is
 *    - vocabularyLevel: Complexity of words used
 *
 * 5. HINTS: Progressive decoding assistance
 *    - Start with cipher type hints
 *    - Progress to shift direction/amount
 *    - Guide decoding approach
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - clarity: Is the cipher clear and solvable?
 *    - educationalValue: Does it teach cryptography?
 *    - solvability: Can players solve with hints?
 *    - creativity: Is the message interesting?
 *    - engagement: Is it fun to solve?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Each puzzle includes detailed complexity scores (1-10):
 *
 * - shiftComplexity: How unusual the shift is
 *   (1 = common like ROT13/ROT3, 10 = very unusual shift)
 *
 * - messageLength: Length of the encrypted message
 *   (1 = short word, 10 = very long sentence)
 *
 * - vocabularyLevel: Complexity of vocabulary
 *   (1 = common words, 10 = advanced vocabulary)
 *
 * - patternObscurity: How obvious the encryption is
 *   (1 = clearly encrypted, 10 = very obscure)
 *
 * - clueProvided: Whether hints about shift are given
 *   (1 = shift amount provided, 10 = no clues at all)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create cipher puzzles.
 * Request via: GET /api/puzzle/regenerate?type=caesar-cipher
 *
 * ============================================================================
 */

import { z } from "zod";
import { GLOBAL_CONTEXT, DIFFICULTY_MIN, DIFFICULTY_MAX } from "../global";
import type { PuzzleTypeConfig } from "../types";

// Constants
const HINTS_MIN = 3;
const HINTS_MAX = 5;
const SHIFT_MIN = 1;
const SHIFT_MAX = 25;
const DEFAULT_TARGET_DIFFICULTY = 5;
const PUZZLE_MIN_LENGTH = 3;
const PUZZLE_MAX_LENGTH = 200;
const ANSWER_MIN_LENGTH = 1;
const ANSWER_MAX_LENGTH = 100;
const EXPLANATION_MIN_LENGTH = 20;
const EXPLANATION_MAX_LENGTH = 300;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 100;
const DIFFICULTY_SWEET_SPOT_MIN = 4;
const DIFFICULTY_SWEET_SPOT_MAX = 7;
const QUALITY_SCORE_HIGH = 80;
const QUALITY_SCORE_MEDIUM = 60;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_LOW = 65;
const QUALITY_SCORE_FAIR = 70;
const QUALITY_SCORE_EXCELLENT = 90;
const WEIGHT_PATTERN_OBSCURITY = 0.3;
const WEIGHT_CLUE_PROVIDED = 0.25;
const WEIGHT_MESSAGE_LENGTH = 0.2;
const WEIGHT_SHIFT_COMPLEXITY = 0.15;
const WEIGHT_VOCABULARY_LEVEL = 0.1;
const CIPHERTEXT_PATTERN = /^[A-Za-z\s]+$/;

// Caesar cipher puzzle schema
export const CaesarCipherPuzzleSchema = z.object({
  puzzle: z
    .string()
    .describe(
      "The encrypted text (ciphertext) that needs to be decoded (e.g., 'IFMMP XPSME')"
    ),
  answer: z.string().describe("The decrypted answer (plaintext) to the puzzle"),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 5-10 (challenging only)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation of how the cipher works and how to decode the message"
    ),
  category: z
    .enum([
      "rot13",
      "rot3",
      "custom_shift",
      "word_cipher",
      "phrase_cipher",
      "sentence_cipher",
    ])
    .describe("The type of Caesar cipher"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      shiftComplexity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      messageLength: z
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
      clueProvided: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  shift: z
    .number()
    .min(SHIFT_MIN)
    .max(SHIFT_MAX)
    .describe("The Caesar cipher shift amount (1-25)"),
  originalMessage: z
    .string()
    .optional()
    .describe("The original plaintext message before encryption"),
});

export type CaesarCipherPuzzle = z.infer<typeof CaesarCipherPuzzleSchema>;

export const CAESAR_CIPHER_CONFIG: PuzzleTypeConfig = {
  id: "caesar-cipher",
  name: "Caesar Cipher",
  description:
    "Decode encrypted text using letter shifting (ROT13, ROT3, etc.)",

  schema: CaesarCipherPuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master cipher puzzle creator with deep expertise in:
- Cryptography and classical ciphers
- Caesar cipher variations (ROT13, ROT3, custom shifts)
- Letter frequency analysis and pattern recognition
- Educational cryptography and code-breaking
- Puzzle difficulty calibration
- Word patterns and linguistic structure

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create Caesar cipher puzzles that are intellectually stimulating, solvable through pattern recognition and logical thinking, and provide satisfying "aha!" moments. Your puzzles are educational, fun, and accessible while still being challenging.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY CHALLENGING and INTELLIGENT Caesar cipher puzzle using deep reasoning:

TARGET DIFFICULTY: ${targetDifficulty}/10

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- shiftComplexity: 1-10 (1 = common shift like ROT13, 10 = unusual custom shift)
- messageLength: 1-10 (1 = short word, 10 = long sentence/phrase)
- vocabularyLevel: 1-10 (1 = common words, 10 = advanced vocabulary)
- patternObscurity: 1-10 (1 = obvious patterns, 10 = very obscure)
- clueProvided: 1-10 (1 = shift amount given, 10 = no clues at all)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What shift amount would be appropriate for this difficulty? (Common: 3, 13; Uncommon: 7, 19, etc.)
2. What message would be engaging and educational? (Think about interesting phrases, quotes, or words)
3. How can you make this require genuine pattern recognition? (Not just brute force)
4. What makes this cipher unique and interesting? (Avoid clichéd messages)
5. How do you balance challenge with solvability? (Difficult but fair)
6. Should you provide hints about the shift, or leave it to pattern recognition?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use an interesting, creative, or unexpected message" : ""}

Create a cipher puzzle that requires:
- Pattern recognition (identifying letter shifts)
- Logical reasoning (decoding the message)
- Vocabulary knowledge (recognizing words once decoded)
- A satisfying "aha!" moment when solved

CIPHER REQUIREMENTS:
- Use a Caesar cipher shift between 1-25
- Encrypt a meaningful word, phrase, or sentence
- For easier puzzles, consider ROT13 (shift 13) or ROT3 (shift 3)
- For harder puzzles, use custom shifts without revealing them
- Ensure the encrypted message (puzzle field) shows the ciphertext
- Ensure the answer field shows the decrypted plaintext
- Format: "IFMMP XPSME" → "HELLO WORLD"

QUALITY STANDARDS:
- The puzzle should be solvable but challenging
- The encrypted message should look like gibberish but decode to meaningful text
- The explanation should clearly describe the shift and decoding process
- Hints should guide without giving it away completely
- The complexity scores should accurately reflect the puzzle's actual difficulty
- Choose family-friendly messages

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
      "shift",
    ],
    constraints: {
      puzzle: {
        min: PUZZLE_MIN_LENGTH,
        max: PUZZLE_MAX_LENGTH,
        custom: (value: unknown) => {
          // Should contain only letters and spaces (ciphertext)
          if (typeof value !== "string") {
            return false;
          }
          return CIPHERTEXT_PATTERN.test(value.trim());
        },
      },
      answer: {
        min: ANSWER_MIN_LENGTH,
        max: ANSWER_MAX_LENGTH,
        custom: (value: unknown) => {
          // Should be meaningful text
          if (typeof value !== "string") {
            return false;
          }
          return value.trim().length > 0;
        },
      },
      difficulty: {
        min: DIFFICULTY_MIN,
        max: DIFFICULTY_MAX,
      },
      hints: {
        min: HINTS_MIN,
        max: HINTS_MAX,
      },
      shift: {
        min: SHIFT_MIN,
        max: SHIFT_MAX,
      },
    },
  },

  difficulty: {
    calculate: (puzzle: unknown) => {
      const typedPuzzle = puzzle as CaesarCipherPuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.patternObscurity * WEIGHT_PATTERN_OBSCURITY +
        scores.clueProvided * WEIGHT_CLUE_PROVIDED +
        scores.messageLength * WEIGHT_MESSAGE_LENGTH +
        scores.shiftComplexity * WEIGHT_SHIFT_COMPLEXITY +
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
        name: "patternObscurity",
        weight: 0.3,
        extract: (puzzle: unknown) =>
          (puzzle as CaesarCipherPuzzle).complexityScore.patternObscurity,
      },
      {
        name: "clueProvided",
        weight: WEIGHT_CLUE_PROVIDED,
        extract: (puzzle: unknown) =>
          (puzzle as CaesarCipherPuzzle).complexityScore.clueProvided,
      },
      {
        name: "messageLength",
        weight: WEIGHT_MESSAGE_LENGTH,
        extract: (puzzle: unknown) =>
          (puzzle as CaesarCipherPuzzle).complexityScore.messageLength,
      },
      {
        name: "shiftComplexity",
        weight: WEIGHT_SHIFT_COMPLEXITY,
        extract: (puzzle: unknown) =>
          (puzzle as CaesarCipherPuzzle).complexityScore.shiftComplexity,
      },
      {
        name: "vocabularyLevel",
        weight: WEIGHT_VOCABULARY_LEVEL,
        extract: (puzzle: unknown) =>
          (puzzle as CaesarCipherPuzzle).complexityScore.vocabularyLevel,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for Caesar cipher puzzles.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking about the cipher method, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this Caesar cipher puzzle:

Encrypted: "{puzzle}"
Answer: "{answer}"
Shift: {shift}
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the solution:
1. Very subtle (10-20% revealed) - hint at cipher type
2. Gentle nudge (30-40% revealed) - suggest shift direction
3. Clear direction (50-60% revealed) - hint at shift amount or pattern
4. Almost there (70-80% revealed) - guide decoding approach
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
        description: "Is the cipher clear and solvable?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CaesarCipherPuzzle;
          const explanationLength = typedPuzzle.explanation.length;
          return explanationLength > EXPLANATION_MIN_LENGTH &&
            explanationLength < EXPLANATION_MAX_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "educationalValue",
        weight: 0.25,
        description: "Does it teach cryptography concepts?",
        score: () => QUALITY_SCORE_EXCELLENT, // Ciphers are inherently educational
      },
      {
        name: "solvability",
        weight: 0.25,
        description: "Can the puzzle be solved with hints?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CaesarCipherPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length > EXPLANATION_MIN_LENGTH;
          const hasHints = typedPuzzle.hints.length >= HINTS_MIN;
          const validShift =
            typedPuzzle.shift >= SHIFT_MIN && typedPuzzle.shift <= SHIFT_MAX;
          return hasExplanation && hasHints && validShift
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "creativity",
        weight: 0.15,
        description: "Is the message creative and interesting?",
        score: (puzzle: unknown) => {
          // Longer, more interesting messages score higher
          const typedPuzzle = puzzle as CaesarCipherPuzzle;
          const messageLength = typedPuzzle.answer.length;
          return messageLength > MESSAGE_MIN_LENGTH &&
            messageLength < MESSAGE_MAX_LENGTH
            ? QUALITY_SCORE_HIGH
            : QUALITY_SCORE_LOW;
        },
      },
      {
        name: "engagement",
        weight: 0.15,
        description: "Is the puzzle engaging and fun?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as CaesarCipherPuzzle;
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
        clarity: 0.2,
        educationalValue: 0.25,
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
      "Caesar cipher puzzles challenge you to decode encrypted messages by shifting letters in the alphabet.",
    rules: [
      "Recognize that the text is encrypted using a letter-shifting cipher",
      "Identify the shift amount (how many positions each letter moved)",
      "Decode the message letter by letter using the shift",
      "Common shifts include ROT13 (shift 13) and ROT3 (shift 3)",
      "Use hints to guide you toward the shift amount and decoding approach",
    ],
    examples: [
      "URYYB JBEYQ → HELLO WORLD (ROT13 - shift 13)",
      "KHOR ZRUOG → HELLO WORLD (shift 3)",
    ],
  },
};
