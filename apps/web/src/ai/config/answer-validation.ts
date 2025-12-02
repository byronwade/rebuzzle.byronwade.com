/**
 * Answer Validation Configuration
 *
 * Configures AI-powered lenient answer validation with semantic matching,
 * contraction handling, and word order tolerance.
 *
 * This config enables the game to accept semantically equivalent answers:
 * - "Time flies when you're having fun" = "Time flies when you are having fun"
 * - "When having fun time flies" (word order variation)
 * - Minor typos and spelling variations
 */

import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Threshold for immediate acceptance without AI (near-exact match) */
export const QUICK_ACCEPT_THRESHOLD = 0.98;

/** Minimum similarity to even attempt AI validation */
export const AI_MINIMUM_SIMILARITY = 0.3;

/** Maximum time to wait for AI validation before falling back */
export const AI_TIMEOUT_MS = 5000;

/** Maximum typo ratio allowed (typos / total chars) */
export const MAX_TYPO_RATIO = 0.15;

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const AnswerValidationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  alwaysUseAI: z.boolean().default(true),
  quickAcceptThreshold: z.number().min(0).max(1).default(0.98),
  aiMinimumSimilarity: z.number().min(0).max(1).default(0.3),
  aiTimeoutMs: z.number().positive().default(5000),
  tolerateWordOrderVariations: z.boolean().default(true),
  expandContractions: z.boolean().default(true),
  ignorePunctuation: z.boolean().default(true),
  ignoreCapitalization: z.boolean().default(true),
  maxTypoRatio: z.number().min(0).max(0.3).default(0.15),
});

export type AnswerValidationConfig = z.infer<typeof AnswerValidationConfigSchema>;

// =============================================================================
// CONTRACTION EXPANSIONS
// =============================================================================

/**
 * Map of contractions to their expanded forms.
 * Used to normalize answers before comparison.
 */
export const CONTRACTION_MAP: Record<string, string> = {
  // You
  "you're": "you are",
  youre: "you are",
  "you'll": "you will",
  youll: "you will",
  "you've": "you have",
  youve: "you have",
  "you'd": "you would",
  youd: "you would",

  // I
  "i'm": "i am",
  im: "i am",
  "i've": "i have",
  ive: "i have",
  "i'll": "i will",
  ill: "i will",
  "i'd": "i would",
  id: "i would",

  // We/They
  "we're": "we are",
  were: "we are",
  "we've": "we have",
  weve: "we have",
  "we'll": "we will",
  well: "we will",
  "they're": "they are",
  theyre: "they are",
  "they've": "they have",
  theyve: "they have",
  "they'll": "they will",
  theyll: "they will",

  // It/That/There/What
  "it's": "it is",
  its: "it is",
  "that's": "that is",
  thats: "that is",
  "there's": "there is",
  theres: "there is",
  "what's": "what is",
  whats: "what is",
  "who's": "who is",
  whos: "who is",
  "here's": "here is",
  heres: "here is",

  // Negatives
  "can't": "cannot",
  cant: "cannot",
  "won't": "will not",
  wont: "will not",
  "don't": "do not",
  dont: "do not",
  "doesn't": "does not",
  doesnt: "does not",
  "didn't": "did not",
  didnt: "did not",
  "isn't": "is not",
  isnt: "is not",
  "aren't": "are not",
  arent: "are not",
  "wasn't": "was not",
  wasnt: "was not",
  "weren't": "were not",
  werent: "were not",
  "haven't": "have not",
  havent: "have not",
  "hasn't": "has not",
  hasnt: "has not",
  "hadn't": "had not",
  hadnt: "had not",
  "wouldn't": "would not",
  wouldnt: "would not",
  "couldn't": "could not",
  couldnt: "could not",
  "shouldn't": "should not",
  shouldnt: "should not",

  // Others
  "let's": "let us",
  lets: "let us",
  "how's": "how is",
  hows: "how is",
  "where's": "where is",
  wheres: "where is",
  "when's": "when is",
  whens: "when is",
};

// =============================================================================
// SEMANTIC EQUIVALENCE RULES
// =============================================================================

/**
 * Groups of words that can be considered semantically equivalent
 * in certain contexts.
 */
export const EQUIVALENT_WORD_GROUPS: string[][] = [
  ["hi", "hello", "hey"],
  ["bye", "goodbye", "farewell"],
  ["yeah", "yes", "yep", "yup"],
  ["nope", "no", "nah"],
  ["okay", "ok", "alright", "fine"],
  ["thanks", "thank you", "ty"],
];

/**
 * Words that can often be ignored without changing meaning.
 */
export const IGNORABLE_WORDS: string[] = ["a", "an", "the"];

// =============================================================================
// MAIN CONFIG EXPORT
// =============================================================================

export const ANSWER_VALIDATION_CONFIG: AnswerValidationConfig = {
  enabled: true,
  alwaysUseAI: true, // Always use AI for best semantic matching
  quickAcceptThreshold: 0.98, // Skip AI if nearly exact
  aiMinimumSimilarity: 0.3, // Don't bother AI for very different answers
  aiTimeoutMs: 5000, // Don't block UX too long
  tolerateWordOrderVariations: true,
  expandContractions: true,
  ignorePunctuation: true,
  ignoreCapitalization: true,
  maxTypoRatio: 0.15, // Allow ~15% typo characters
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Expand contractions in text to their full forms.
 * e.g., "you're" -> "you are"
 */
export function expandContractions(text: string): string {
  let result = text.toLowerCase();

  // Sort by length (longest first) to handle overlapping patterns
  const sortedContractions = Object.entries(CONTRACTION_MAP).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [contraction, expansion] of sortedContractions) {
    const regex = new RegExp(`\\b${contraction}\\b`, "gi");
    result = result.replace(regex, expansion);
  }

  return result;
}

/**
 * Normalize text for comparison.
 * Applies configured normalization rules.
 */
export function normalizeForComparison(
  text: string,
  config: AnswerValidationConfig = ANSWER_VALIDATION_CONFIG
): string {
  let result = text;

  if (config.ignoreCapitalization) {
    result = result.toLowerCase();
  }

  if (config.ignorePunctuation) {
    // Remove all punctuation except apostrophes (for contractions)
    result = result.replace(/[^\w\s']/g, "");
  }

  if (config.expandContractions) {
    result = expandContractions(result);
  }

  // Normalize whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Check if two answers match when considering word order tolerance.
 * Returns true if all words are present regardless of order.
 */
export function matchWithWordOrderTolerance(
  guess: string,
  answer: string,
  config: AnswerValidationConfig = ANSWER_VALIDATION_CONFIG
): boolean {
  const normalizedGuess = normalizeForComparison(guess, config);
  const normalizedAnswer = normalizeForComparison(answer, config);

  // Exact match after normalization
  if (normalizedGuess === normalizedAnswer) {
    return true;
  }

  if (!config.tolerateWordOrderVariations) {
    return false;
  }

  // Split into words and sort for order-independent comparison
  const guessWords = normalizedGuess.split(" ").filter(Boolean).sort();
  const answerWords = normalizedAnswer.split(" ").filter(Boolean).sort();

  // Must have same number of words
  if (guessWords.length !== answerWords.length) {
    return false;
  }

  // All words must match
  return guessWords.every((word, i) => word === answerWords[i]);
}

/**
 * Generate the AI validation prompt for semantic matching.
 */
export function getAIValidationSystemPrompt(): string {
  return `You are an expert at validating puzzle answers with LENIENT semantic matching.

CRITICAL: Be LENIENT and ACCEPT semantically equivalent answers:

1. CONTRACTIONS ARE EQUIVALENT:
   - "you're" = "you are"
   - "it's" = "it is"
   - "don't" = "do not"
   - Accept with or without apostrophe

2. WORD ORDER VARIATIONS:
   - Accept if all words are present and meaning is preserved
   - "Time flies when having fun" = "When having fun time flies"

3. MINOR TYPOS (1-2 characters):
   - "tiem" for "time"
   - "haivng" for "having"
   - Missing or extra letters

4. PUNCTUATION & CAPITALIZATION:
   - Completely ignore these
   - "Hello, World!" = "hello world"

5. ARTICLES (a, an, the):
   - Often can be ignored
   - "The answer" = "Answer"

ONLY REJECT if the meaning is fundamentally different or the answer is clearly wrong.

Respond with your analysis and decision.`;
}

/**
 * Generate the user prompt for AI validation.
 */
export function getAIValidationUserPrompt(
  guess: string,
  correctAnswer: string,
  puzzleContext?: string
): string {
  let prompt = `Validate if this puzzle answer is semantically correct.

CORRECT ANSWER: "${correctAnswer}"
PLAYER'S GUESS: "${guess}"`;

  if (puzzleContext) {
    prompt += `\nPUZZLE CONTEXT: "${puzzleContext}"`;
  }

  prompt += `

Based on the leniency rules, should this answer be ACCEPTED or REJECTED?
Remember: Be LENIENT. Accept semantic equivalents, contractions, word order variations, and minor typos.`;

  return prompt;
}
