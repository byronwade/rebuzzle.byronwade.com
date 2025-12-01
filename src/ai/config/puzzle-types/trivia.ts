/**
 * ============================================================================
 * TRIVIA PUZZLE TYPE CONFIGURATION
 * ============================================================================
 *
 * OVERVIEW
 * --------
 * Trivia puzzles challenge players with knowledge-based questions about various
 * topics including geography, history, science, pop culture, literature, and
 * sports. These puzzles test factual knowledge, recall ability, and general
 * awareness.
 *
 * HOW IT WORKS
 * ------------
 * Players are presented with a trivia question. They must:
 * 1. Read and understand the question
 * 2. Recall relevant knowledge from memory
 * 3. Apply reasoning if needed (for some questions)
 * 4. Provide the correct answer
 *
 * The puzzle includes progressive hints that guide toward the answer and an
 * explanation providing context and additional information.
 *
 * EXAMPLES
 * --------
 *
 * Example 1 - Geography (Difficulty: Hard - 5):
 *   Question: "What is the capital of France?"
 *   Answer: "PARIS"
 *   Explanation: "Paris has been the capital of France since 987 AD and is
 *                 the country's largest city."
 *
 * Example 2 - History (Difficulty: Difficult - 7):
 *   Question: "In what year did World War II end?"
 *   Answer: "1945"
 *   Explanation: "World War II ended in 1945 with the surrender of Japan
 *                 on September 2, 1945, following the atomic bombings of
 *                 Hiroshima and Nagasaki."
 *
 * Example 3 - Science (Difficulty: Difficult - 8):
 *   Question: "What is the chemical symbol for gold?"
 *   Answer: "AU"
 *   Explanation: "The symbol AU comes from the Latin word 'aurum' meaning
 *                 gold. Gold is element 79 on the periodic table."
 *
 * Example 4 - Pop Culture (Difficulty: Evil - 9):
 *   Question: "Which actor played the character Tony Stark in the Marvel
 *              Cinematic Universe?"
 *   Answer: "ROBERT DOWNEY JR"
 *   Explanation: "Robert Downey Jr. portrayed Tony Stark/Iron Man in the
 *                 Marvel Cinematic Universe from 2008 to 2019."
 *
 * DIFFICULTY LEVELS
 * -----------------
 * All puzzles are challenging - we NEVER generate easy trivia questions:
 *
 * - Hard (5-6): Common knowledge questions, well-known facts, accessible
 *   topics, straightforward questions, general awareness level.
 *
 * - Difficult (7-8): More specialized knowledge, less common facts, requires
 *   deeper knowledge in specific areas, may require reasoning.
 *
 * - Evil (8-9): Highly specialized knowledge, obscure facts, requires expert
 *   knowledge, very specific details, advanced reasoning.
 *
 * - Impossible (9-10): Extremely challenging but answerable. Very obscure
 *   facts, requires extensive knowledge, may combine multiple knowledge areas.
 *
 * CATEGORIES
 * ----------
 * - geography: Countries, cities, landmarks, physical geography
 * - history: Historical events, dates, people, periods
 * - science: Biology, chemistry, physics, astronomy
 * - pop_culture: Movies, TV, music, celebrities
 * - literature: Books, authors, literary works
 * - sports: Athletes, teams, events, records
 * - art: Artists, artworks, movements
 * - technology: Computers, internet, innovations
 * - food: Cuisine, ingredients, cooking
 * - nature: Animals, plants, natural phenomena
 *
 * CONFIGURATION STRUCTURE
 * -----------------------
 * 1. SCHEMA: Puzzle data structure
 *    - puzzle: The trivia question
 *    - answer: The correct answer
 *    - difficulty: Rating 5-10 (challenging only)
 *    - explanation: Context and additional information
 *    - category: Topic category
 *    - hints: Progressive hints guiding toward answer
 *    - complexityScore: Detailed difficulty breakdown
 *
 * 2. GENERATION: AI creates trivia questions
 *    - Designs appropriate difficulty
 *    - Ensures factual accuracy
 *    - Provides educational value
 *
 * 3. VALIDATION: Quality checks
 *    - Question must be clear
 *    - Answer must be correct
 *    - Explanation must be informative
 *
 * 4. DIFFICULTY: Calculated from complexity scores
 *    - knowledgeSpecificity: How specific knowledge needed
 *    - recallDifficulty: How hard to recall
 *    - reasoningRequired: Reasoning needed
 *    - obscurity: How obscure the fact is
 *    - educationalValue: Educational benefit
 *
 * 5. HINTS: Progressive knowledge assistance
 *    - Start with general category hints
 *    - Progress to more specific hints
 *    - Guide toward answer
 *    - Never reveal answer directly
 *
 * 6. QUALITY METRICS: Scoring system
 *    - accuracy: Is answer correct?
 *    - clarity: Is question clear?
 *    - educationalValue: Does it teach?
 *    - engagement: Is it interesting?
 *    - appropriateness: Family-friendly?
 *
 * COMPLEXITY SCORES
 * -----------------
 * Detailed complexity breakdown (1-10 scale):
 *
 * - knowledgeSpecificity: How specific the knowledge needed is
 *   (1 = general knowledge, 10 = highly specialized knowledge)
 *
 * - recallDifficulty: How difficult to recall the answer
 *   (1 = easily recalled, 10 = very difficult to recall)
 *
 * - reasoningRequired: How much reasoning is needed
 *   (1 = pure recall, 10 = requires significant reasoning)
 *
 * - obscurity: How obscure the fact is
 *   (1 = well-known fact, 10 = very obscure fact)
 *
 * - educationalValue: Educational benefit of the question
 *   (1 = minimal learning, 10 = highly educational)
 *
 * USAGE
 * -----
 * Used by puzzle generation system to create trivia questions.
 * Request via: GET /api/puzzle/regenerate?type=trivia
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
const WEIGHT_KNOWLEDGE_DEPTH = 0.25;
const WEIGHT_TOPIC_OBSCURITY = 0.25;
const WEIGHT_RECALL_DIFFICULTY = 0.2;
const WEIGHT_CULTURAL_RELEVANCE = 0.15;
const WEIGHT_SPECIFICITY = 0.15;
const QUALITY_SCORE_MEDIUM = 65;
const QUALITY_SCORE_VERY_HIGH = 85;
const QUALITY_SCORE_FAIR = 70;
const QUALITY_SCORE_GOOD = 80;
const QUALITY_SCORE_LOW = 60;
const ANSWER_MIN_LENGTH = 1;
const ANSWER_MAX_LENGTH = 100;
const QUESTION_MIN_LENGTH = 15;
const QUESTION_MAX_LENGTH = 250;
const EXPLANATION_MIN_LENGTH = 30;
const EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY = 20;
const HINTS_MIN_FOR_SOLVABILITY = 3;
const QUALITY_SCORE_EXCELLENT = 95;

// Trivia puzzle schema
export const TriviaPuzzleSchema = z.object({
  puzzle: z.string().describe("The trivia question that needs to be answered"),
  answer: z
    .string()
    .describe("The answer to the trivia question (single word or phrase)"),
  difficulty: z
    .number()
    .min(DIFFICULTY_MIN)
    .max(DIFFICULTY_MAX)
    .describe("Difficulty rating from 5-10 (challenging only)"),
  explanation: z
    .string()
    .describe(
      "Clear explanation or context for the answer, including interesting facts"
    ),
  category: z
    .enum([
      "geography",
      "history",
      "science",
      "pop_culture",
      "literature",
      "sports",
      "nature",
      "technology",
      "arts",
      "general_knowledge",
    ])
    .describe("The category of trivia"),
  hints: z
    .array(z.string())
    .min(HINTS_MIN)
    .max(HINTS_MAX)
    .describe("Progressive hints from subtle to obvious"),
  complexityScore: z
    .object({
      knowledgeDepth: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      topicObscurity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      recallDifficulty: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      culturalRelevance: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
      specificity: z
        .number()
        .min(1)
        .max(10)
        .transform((val) => Math.max(1, Math.min(10, Math.round(val)))),
    })
    .describe(
      "Complexity scores MUST be integers 1-10. Values will be automatically rounded and clamped."
    ),
  facts: z
    .array(z.string())
    .optional()
    .describe("Additional interesting facts related to the trivia topic"),
});

export type TriviaPuzzle = z.infer<typeof TriviaPuzzleSchema>;

export const TRIVIA_CONFIG: PuzzleTypeConfig = {
  id: "trivia",
  name: "Trivia Question",
  description: "Knowledge-based questions about various topics",

  schema: TriviaPuzzleSchema,

  generation: {
    systemPrompt: (
      _params
    ) => `You are an EXTREMELY INTELLIGENT master trivia question creator with deep expertise in:
- General knowledge across multiple domains
- Geography, history, science, and culture
- Educational content and fact-checking
- Question formulation and clarity
- Cultural sensitivity and inclusivity
- Engaging and interesting trivia topics

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}

You create trivia questions that are intellectually stimulating, educational, and provide interesting facts. Your questions are clear, accurate, and engaging while remaining accessible and family-friendly.`,

    userPromptTemplate: (params) => {
      const targetDifficulty =
        params.targetDifficulty ?? DEFAULT_TARGET_DIFFICULTY;
      const category = params.category;
      const avoidPatterns = Array.isArray(params.avoidPatterns)
        ? params.avoidPatterns
        : [];
      const requireNovelty = params.requireNovelty ?? false;

      return `Create an EXCEPTIONALLY ENGAGING and INTELLIGENT trivia question using deep knowledge:

TARGET DIFFICULTY: ${targetDifficulty}/10
${category ? `CATEGORY: ${category}` : "CATEGORY: Any (choose an interesting one)"}

CRITICAL REQUIREMENTS FOR COMPLEXITY SCORES:
- ALL complexityScore values MUST be INTEGERS between 1 and 10 (inclusive)
- knowledgeDepth: 1-10 (1 = surface knowledge, 10 = deep specialized knowledge)
- topicObscurity: 1-10 (1 = very common topic, 10 = very obscure topic)
- recallDifficulty: 1-10 (1 = easy to remember, 10 = very difficult to recall)
- culturalRelevance: 1-10 (1 = universal, 10 = very culturally specific)
- specificity: 1-10 (1 = general question, 10 = very specific detail)

THINK STEP BY STEP WITH DEEP ANALYSIS:
1. What topic would be interesting at this difficulty level? (Be specific and engaging)
2. What question format creates the best learning experience? (Think beyond simple facts)
3. How can you make this educational and memorable? (Not just random facts)
4. What makes this trivia question unique and interesting? (Avoid clichéd questions)
5. How do you balance challenge with accessibility? (Difficult but fair)
6. What knowledge would make someone feel accomplished for knowing this?

${avoidPatterns.length ? `AVOID these patterns: ${avoidPatterns.join(", ")}` : ""}
${requireNovelty ? "REQUIRE: Use an interesting, creative, or unexpected topic" : ""}

Create a trivia question that:
- Tests genuine knowledge (not just guesswork)
- Is educational and informative
- Provides interesting context in the explanation
- Has a clear, unambiguous answer
- Is family-friendly and appropriate

TRIVIA REQUIREMENTS:
- Question should be clear and unambiguous
- Answer should be a single word or short phrase
- Explanation should provide interesting context and facts
- Category should be appropriate and relevant
- Format: "What is the capital of France?" or "Who wrote 'Romeo and Juliet'?"
- Avoid controversial topics, keep it educational and fun

QUALITY STANDARDS:
- The question should be solvable with knowledge (not pure guesswork)
- The answer should be accurate and verifiable
- The explanation should be educational and interesting
- Hints should guide without giving it away completely
- The complexity scores should accurately reflect the question's difficulty
- Ensure all facts are accurate and up-to-date

Show your thinking process, then create the trivia question with CORRECT INTEGER complexity scores (1-10, not decimals).`;
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
    ],
    constraints: {
      puzzle: {
        min: 10,
        max: 300,
        custom: (value: unknown) => {
          // Should be a question
          if (typeof value !== "string") {
            return false;
          }
          return (
            value.includes("?") ||
            value.toLowerCase().includes("what") ||
            value.toLowerCase().includes("who") ||
            value.toLowerCase().includes("where") ||
            value.toLowerCase().includes("when") ||
            value.toLowerCase().includes("which") ||
            value.toLowerCase().includes("how")
          );
        },
      },
      answer: {
        min: ANSWER_MIN_LENGTH,
        max: ANSWER_MAX_LENGTH,
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
      const typedPuzzle = puzzle as TriviaPuzzle;
      const scores = typedPuzzle.complexityScore;
      const weightedSum =
        scores.knowledgeDepth * WEIGHT_KNOWLEDGE_DEPTH +
        scores.topicObscurity * WEIGHT_TOPIC_OBSCURITY +
        scores.recallDifficulty * WEIGHT_RECALL_DIFFICULTY +
        scores.specificity * WEIGHT_SPECIFICITY +
        scores.culturalRelevance * WEIGHT_CULTURAL_RELEVANCE;

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
        name: "knowledgeDepth",
        weight: WEIGHT_KNOWLEDGE_DEPTH,
        extract: (puzzle: unknown) =>
          (puzzle as TriviaPuzzle).complexityScore.knowledgeDepth,
      },
      {
        name: "topicObscurity",
        weight: WEIGHT_TOPIC_OBSCURITY,
        extract: (puzzle: unknown) =>
          (puzzle as TriviaPuzzle).complexityScore.topicObscurity,
      },
      {
        name: "recallDifficulty",
        weight: WEIGHT_RECALL_DIFFICULTY,
        extract: (puzzle: unknown) =>
          (puzzle as TriviaPuzzle).complexityScore.recallDifficulty,
      },
      {
        name: "specificity",
        weight: WEIGHT_SPECIFICITY,
        extract: (puzzle: unknown) =>
          (puzzle as TriviaPuzzle).complexityScore.specificity,
      },
      {
        name: "culturalRelevance",
        weight: WEIGHT_CULTURAL_RELEVANCE,
        extract: (puzzle: unknown) =>
          (puzzle as TriviaPuzzle).complexityScore.culturalRelevance,
      },
    ],
  },

  hints: {
    systemPrompt: `You are an expert at creating progressive hints for trivia questions.

HINT PRINCIPLES:
1. Start subtle, get more obvious
2. Never give away the answer directly
3. Guide thinking about the topic, don't solve for them
4. Make each hint genuinely helpful
5. Keep hints concise and clear

${GLOBAL_CONTEXT.brandVoice.guidelines.map((g) => `- ${g}`).join("\n")}`,

    userPromptTemplate: `Generate {count} progressive hints for this trivia question:

Question: "{puzzle}"
Answer: "{answer}"
Category: {category}
Explanation: "{explanation}"
Difficulty: {difficulty}/10

Create hints that gradually reveal the answer:
1. Very subtle (10-20% revealed) - hint at category or general topic
2. Gentle nudge (30-40% revealed) - suggest time period, location, or context
3. Clear direction (50-60% revealed) - hint at specific details
4. Almost there (70-80% revealed) - guide towards the answer
5. Final push (90% revealed, but not the answer itself)

Each hint should be helpful and lead the player closer to the solution.`,

    count: 5,
    progression: "exponential",
  },

  qualityMetrics: {
    dimensions: [
      {
        name: "clarity",
        weight: 0.25,
        description: "Is the question clear and unambiguous?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as TriviaPuzzle;
          const questionLength = typedPuzzle.puzzle.length;
          const hasQuestionMark = typedPuzzle.puzzle.includes("?");
          return hasQuestionMark &&
            questionLength > QUESTION_MIN_LENGTH &&
            questionLength < QUESTION_MAX_LENGTH
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_MEDIUM;
        },
      },
      {
        name: "educationalValue",
        weight: 0.25,
        description: "Does it teach something interesting?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as TriviaPuzzle;
          const explanationLength = typedPuzzle.explanation.length;
          return explanationLength > EXPLANATION_MIN_LENGTH
            ? QUALITY_SCORE_VERY_HIGH
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "solvability",
        weight: 0.2,
        description: "Can the question be answered with knowledge?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as TriviaPuzzle;
          const hasExplanation =
            typedPuzzle.explanation.length >
            EXPLANATION_MIN_LENGTH_FOR_SOLVABILITY;
          const hasHints =
            typedPuzzle.hints.length >= HINTS_MIN_FOR_SOLVABILITY;
          return hasExplanation && hasHints
            ? QUALITY_SCORE_GOOD
            : QUALITY_SCORE_LOW;
        },
      },
      {
        name: "engagement",
        weight: 0.15,
        description: "Is the question engaging and interesting?",
        score: (puzzle: unknown) => {
          const typedPuzzle = puzzle as TriviaPuzzle;
          const interestingCategories = [
            "science",
            "history",
            "geography",
            "nature",
          ];
          return interestingCategories.includes(typedPuzzle.category)
            ? QUALITY_SCORE_GOOD
            : QUALITY_SCORE_FAIR;
        },
      },
      {
        name: "appropriateness",
        weight: 0.15,
        description: "Is it family-friendly and appropriate?",
        score: () => QUALITY_SCORE_EXCELLENT, // Assume validated elsewhere
      },
    ],
    calculateOverall: (scores: Record<string, number>) => {
      const weights: Record<string, number> = {
        clarity: 0.25,
        educationalValue: 0.25,
        solvability: 0.2,
        engagement: 0.15,
        appropriateness: 0.15,
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
      "Trivia puzzles test your knowledge across various topics including geography, history, science, and pop culture.",
    rules: [
      "Read the question carefully and understand what's being asked",
      "Recall relevant knowledge from memory",
      "Apply reasoning if needed (for some questions)",
      "Provide the correct answer based on your knowledge",
      "Use hints to get clues about the topic, time period, or context",
    ],
    examples: [
      "What is the capital of France? → PARIS",
      "In what year did World War II end? → 1945",
      "What is the chemical symbol for gold? → AU",
    ],
  },
};
