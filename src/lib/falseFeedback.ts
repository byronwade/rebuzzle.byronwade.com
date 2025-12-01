/**
 * False Feedback System
 *
 * Logic for generating false feedback patterns that make correct answers
 * seem wrong and wrong answers seem promising, creating psychological doubt.
 */

import type { CharacterValidation } from "./textAreaUtils";

/**
 * False feedback pattern type
 */
export type FalseFeedbackPattern =
  | "invert-correct" // Make correct seem wrong
  | "boost-incorrect" // Make wrong seem promising
  | "randomize" // Random false feedback
  | "delay-correct" // Delay showing correct feedback
  | "false-close" // Make wrong answers seem very close
  | "confidence-drain"; // Gradually reduce confidence in correct answers

/**
 * False feedback configuration
 */
export interface FalseFeedbackConfig {
  /** Whether false feedback is enabled */
  enabled: boolean;
  /** Intensity (0-1) */
  intensity: number;
  /** Pattern to use */
  pattern: FalseFeedbackPattern;
  /** Probability of applying false feedback (0-1) */
  probability: number;
  /** Minimum progress before applying (0-1) */
  minProgress: number;
  /** Maximum progress before stopping (0-1) */
  maxProgress: number;
}

/**
 * Apply false feedback to character validations
 */
export function applyFalseFeedback(
  validations: CharacterValidation[],
  config: FalseFeedbackConfig,
  progress: number
): CharacterValidation[] {
  if (!config.enabled) return validations;

  // Check progress bounds
  if (progress < config.minProgress || progress > config.maxProgress) {
    return validations;
  }

  // Check probability
  if (Math.random() > config.probability * config.intensity) {
    return validations;
  }

  const modified = [...validations];

  switch (config.pattern) {
    case "invert-correct":
      // Make correct characters seem wrong
      for (let i = 0; i < modified.length; i++) {
        if (
          modified[i]!.status === "correct" &&
          Math.random() < config.intensity
        ) {
          modified[i] = {
            ...modified[i]!,
            status: "incorrect",
          };
        }
      }
      break;

    case "boost-incorrect":
      // Make wrong characters seem promising
      for (let i = 0; i < modified.length; i++) {
        if (
          modified[i]!.status === "incorrect" &&
          Math.random() < config.intensity * 0.7
        ) {
          modified[i] = {
            ...modified[i]!,
            status: "partial",
          };
        }
      }
      break;

    case "randomize":
      // Random false feedback
      for (let i = 0; i < modified.length; i++) {
        if (Math.random() < config.intensity * 0.3) {
          const statuses: CharacterValidation["status"][] = [
            "correct",
            "partial",
            "incorrect",
            "unknown",
          ];
          const randomStatus =
            statuses[Math.floor(Math.random() * statuses.length)]!;
          modified[i] = {
            ...modified[i]!,
            status: randomStatus,
          };
        }
      }
      break;

    case "delay-correct":
      // Don't show correct feedback immediately
      for (let i = 0; i < modified.length; i++) {
        if (
          modified[i]!.status === "correct" &&
          Math.random() < config.intensity * 0.5
        ) {
          modified[i] = {
            ...modified[i]!,
            status: "unknown",
          };
        }
      }
      break;

    case "false-close":
      // Make wrong answers seem very close
      for (let i = 0; i < modified.length; i++) {
        if (
          modified[i]!.status === "incorrect" &&
          Math.random() < config.intensity * 0.6
        ) {
          modified[i] = {
            ...modified[i]!,
            status: "partial",
          };
        }
      }
      break;

    case "confidence-drain":
      // Gradually make correct answers seem less certain
      for (let i = 0; i < modified.length; i++) {
        if (
          modified[i]!.status === "correct" &&
          Math.random() < config.intensity * 0.4
        ) {
          modified[i] = {
            ...modified[i]!,
            status: progress > 0.7 ? "partial" : "unknown",
          };
        }
      }
      break;
  }

  return modified;
}

/**
 * Apply false feedback to word validation
 */
export function applyFalseWordFeedback(
  wordValidations: boolean[],
  config: FalseFeedbackConfig,
  progress: number
): boolean[] {
  if (!config.enabled) return wordValidations;

  // Check progress bounds
  if (progress < config.minProgress || progress > config.maxProgress) {
    return wordValidations;
  }

  // Check probability
  if (Math.random() > config.probability * config.intensity) {
    return wordValidations;
  }

  const modified = [...wordValidations];

  switch (config.pattern) {
    case "invert-correct":
      // Make correct words seem wrong
      for (let i = 0; i < modified.length; i++) {
        if (modified[i] && Math.random() < config.intensity) {
          modified[i] = false;
        }
      }
      break;

    case "boost-incorrect":
      // Make wrong words seem promising
      for (let i = 0; i < modified.length; i++) {
        if (!modified[i] && Math.random() < config.intensity * 0.6) {
          modified[i] = true;
        }
      }
      break;

    case "randomize":
      // Random false feedback
      for (let i = 0; i < modified.length; i++) {
        if (Math.random() < config.intensity * 0.4) {
          modified[i] = Math.random() > 0.5;
        }
      }
      break;

    case "delay-correct":
      // Don't show correct feedback immediately
      for (let i = 0; i < modified.length; i++) {
        if (modified[i] && Math.random() < config.intensity * 0.5) {
          modified[i] = false;
        }
      }
      break;

    case "false-close":
      // Make wrong words seem very close
      for (let i = 0; i < modified.length; i++) {
        if (!modified[i] && Math.random() < config.intensity * 0.7) {
          modified[i] = true;
        }
      }
      break;

    case "confidence-drain":
      // Gradually make correct words seem less certain
      for (let i = 0; i < modified.length; i++) {
        if (modified[i] && Math.random() < config.intensity * 0.3) {
          modified[i] = false;
        }
      }
      break;
  }

  return modified;
}

/**
 * Generate false feedback configuration based on intensity
 */
export function generateFalseFeedbackConfig(
  intensity: number, // 0-1
  pattern?: FalseFeedbackPattern
): FalseFeedbackConfig {
  // Select pattern if not provided
  const patterns: FalseFeedbackPattern[] = [
    "invert-correct",
    "boost-incorrect",
    "false-close",
    "confidence-drain",
  ];

  const selectedPattern =
    pattern || patterns[Math.floor(Math.random() * patterns.length)]!;

  return {
    enabled: intensity > 0.1,
    intensity,
    pattern: selectedPattern,
    probability: Math.min(0.8, intensity * 1.2),
    minProgress: 0.2,
    maxProgress: 0.95,
  };
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(input: string, answer: string): number {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedAnswer = answer.toLowerCase().trim();

  if (normalizedInput.length === 0) return 0;
  if (normalizedInput.length >= normalizedAnswer.length) return 1;

  // Calculate character-level similarity
  let matches = 0;
  const minLength = Math.min(normalizedInput.length, normalizedAnswer.length);

  for (let i = 0; i < minLength; i++) {
    if (normalizedInput[i] === normalizedAnswer[i]) {
      matches++;
    }
  }

  return matches / normalizedAnswer.length;
}

