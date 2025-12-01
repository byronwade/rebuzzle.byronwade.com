/**
 * Text Area Configuration for AI-Powered Difficulty-Based Feedback
 *
 * This configuration links puzzle difficulty to text area behavior,
 * providing adaptive feedback, hints, and suggestions based on how
 * challenging the puzzle is.
 */

import { GLOBAL_CONTEXT } from "./global";

/**
 * Difficulty level classification
 */
export type DifficultyLevel = "hard" | "difficult" | "evil" | "impossible";

/**
 * Feedback granularity level
 */
export type FeedbackGranularity = "character" | "word" | "minimal";

/**
 * Suggestion timing strategy
 */
export type SuggestionTiming = "immediate" | "moderate" | "on-request" | "none";

/**
 * Text area behavior configuration for a specific difficulty level
 */
export interface TextAreaDifficultyConfig {
  /** Minimum characters before showing suggestions */
  suggestionThreshold: number;
  /** How quickly to show suggestions */
  suggestionTiming: SuggestionTiming;
  /** Delay in ms before showing suggestions (if timing allows) */
  suggestionDelayMs: number;
  /** Whether to show character-level feedback */
  characterLevelFeedback: boolean;
  /** Whether to show word-level feedback */
  wordLevelFeedback: boolean;
  /** Feedback granularity */
  feedbackGranularity: FeedbackGranularity;
  /** Visual indicator intensity (0-1) */
  visualIntensity: number;
  /** Whether to show autocomplete suggestions */
  showAutocomplete: boolean;
  /** Whether to show contextual hints */
  showContextualHints: boolean;
  /** Message tone for this difficulty */
  messageTone: "helpful" | "balanced" | "challenging";
  /** Whether to provide error corrections */
  provideCorrections: boolean;
  /** Whether psychological games are enabled */
  psychologicalGamesEnabled: boolean;
}

/**
 * Text area configuration mapping difficulty to behavior
 */
export const TEXT_AREA_CONFIG: Record<
  DifficultyLevel,
  TextAreaDifficultyConfig
> = {
  /**
   * Hard (5-6): Baseline challenging puzzles
   * Provide moderate assistance to help users learn
   */
  hard: {
    suggestionThreshold: 4,
    suggestionTiming: "moderate",
    suggestionDelayMs: 1000,
    characterLevelFeedback: true,
    wordLevelFeedback: true,
    feedbackGranularity: "word",
    visualIntensity: 0.7,
    showAutocomplete: true,
    showContextualHints: true,
    messageTone: "helpful",
    provideCorrections: true,
    psychologicalGamesEnabled: true,
  },

  /**
   * Difficult (7-8): More challenging puzzles
   * Balance between help and challenge
   */
  difficult: {
    suggestionThreshold: 5,
    suggestionTiming: "moderate",
    suggestionDelayMs: 1500,
    characterLevelFeedback: false,
    wordLevelFeedback: true,
    feedbackGranularity: "word",
    visualIntensity: 0.5,
    showAutocomplete: true,
    showContextualHints: true,
    messageTone: "balanced",
    provideCorrections: false,
    psychologicalGamesEnabled: true,
  },

  /**
   * Evil (8-9): Very challenging puzzles
   * Minimal assistance, focus on challenge
   */
  evil: {
    suggestionThreshold: 6,
    suggestionTiming: "on-request",
    suggestionDelayMs: 2000,
    characterLevelFeedback: false,
    wordLevelFeedback: true,
    feedbackGranularity: "minimal",
    visualIntensity: 0.3,
    showAutocomplete: false,
    showContextualHints: true,
    messageTone: "challenging",
    provideCorrections: false,
    psychologicalGamesEnabled: true,
  },

  /**
   * Impossible (9-10): Extremely challenging puzzles
   * Minimal feedback, maximum challenge
   */
  impossible: {
    suggestionThreshold: 8,
    suggestionTiming: "on-request",
    suggestionDelayMs: 3000,
    characterLevelFeedback: false,
    wordLevelFeedback: true,
    feedbackGranularity: "minimal",
    visualIntensity: 0.2,
    showAutocomplete: false,
    showContextualHints: false,
    messageTone: "challenging",
    provideCorrections: false,
    psychologicalGamesEnabled: true,
  },
};

/**
 * Get difficulty level from numeric difficulty (1-10)
 */
export function getDifficultyLevel(difficulty: number): DifficultyLevel {
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges ?? {
    hard: { min: 5, max: 6 },
    difficult: { min: 7, max: 8 },
    evil: { min: 8, max: 9 },
    impossible: { min: 9, max: 10 },
  };

  if (difficulty >= ranges.impossible.min) {
    return "impossible";
  }
  if (difficulty >= ranges.evil.min) {
    return "evil";
  }
  if (difficulty >= ranges.difficult.min) {
    return "difficult";
  }
  return "hard";
}

/**
 * Get text area configuration for a given difficulty
 */
export function getTextAreaConfig(
  difficulty: number
): TextAreaDifficultyConfig {
  const level = getDifficultyLevel(difficulty);
  return TEXT_AREA_CONFIG[level];
}

/**
 * Feedback message templates based on difficulty and context
 */
export const FEEDBACK_MESSAGES = {
  hard: {
    correctWord: "Great! Keep going...",
    incorrectWord: "Not quite. Try again...",
    partialMatch: "You're on the right track...",
    suggestionAvailable: "Need a hint? Keep typing...",
    almostThere: "Almost there! You're close...",
  },
  difficult: {
    correctWord: "Good progress.",
    incorrectWord: "Not quite right.",
    partialMatch: "Getting closer...",
    suggestionAvailable: "Keep thinking...",
    almostThere: "You're getting there.",
  },
  evil: {
    correctWord: "Correct.",
    incorrectWord: "Incorrect.",
    partialMatch: "Consider your approach.",
    suggestionAvailable: "Think carefully.",
    almostThere: "Keep going.",
  },
  impossible: {
    correctWord: "",
    incorrectWord: "",
    partialMatch: "",
    suggestionAvailable: "",
    almostThere: "",
  },
};

/**
 * Get feedback message for current context
 */
export function getFeedbackMessage(
  difficulty: number,
  context: keyof typeof FEEDBACK_MESSAGES.hard
): string {
  const level = getDifficultyLevel(difficulty);
  return FEEDBACK_MESSAGES[level][context] || "";
}

/**
 * Character-level feedback configuration
 */
export interface CharacterFeedbackConfig {
  /** Show feedback for correct characters */
  showCorrect: boolean;
  /** Show feedback for close/partial matches */
  showPartial: boolean;
  /** Show feedback for incorrect characters */
  showIncorrect: boolean;
  /** Color intensity (0-1) */
  colorIntensity: number;
  /** Animation duration in ms */
  animationDuration: number;
}

/**
 * Get character feedback configuration based on difficulty
 */
export function getCharacterFeedbackConfig(
  difficulty: number
): CharacterFeedbackConfig {
  const config = getTextAreaConfig(difficulty);

  return {
    showCorrect: config.characterLevelFeedback,
    showPartial: config.characterLevelFeedback && config.visualIntensity > 0.5,
    showIncorrect:
      config.characterLevelFeedback && config.visualIntensity > 0.6,
    colorIntensity: config.visualIntensity,
    animationDuration: config.visualIntensity > 0.7 ? 200 : 300,
  };
}

/**
 * Suggestion generation configuration
 */
export interface SuggestionConfig {
  /** Maximum number of suggestions to show */
  maxSuggestions: number;
  /** Whether to show character-level suggestions */
  characterLevel: boolean;
  /** Whether to show word-level suggestions */
  wordLevel: boolean;
  /** Confidence threshold for showing suggestions (0-1) */
  confidenceThreshold: number;
}

/**
 * Get suggestion configuration based on difficulty
 */
export function getSuggestionConfig(difficulty: number): SuggestionConfig {
  const config = getTextAreaConfig(difficulty);

  return {
    maxSuggestions: config.showAutocomplete ? (difficulty <= 6 ? 5 : 3) : 0,
    characterLevel: config.showAutocomplete && difficulty <= 6,
    wordLevel: config.showAutocomplete,
    confidenceThreshold: difficulty <= 6 ? 0.6 : 0.8,
  };
}
