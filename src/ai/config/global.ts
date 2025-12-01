/**
 * Global AI Context Configuration
 *
 * This configuration applies to ALL puzzle types and ensures consistency
 * across the entire puzzle generation system.
 */

import type { GlobalContext } from "./types";

export const GLOBAL_CONTEXT: GlobalContext = {
  brandVoice: {
    tone: "Friendly, engaging, and intellectually stimulating",
    style:
      "Professional yet approachable, with a focus on quality and user experience",
    personality: [
      "Encouraging and supportive",
      "Intellectually curious",
      "Creative and innovative",
      "Clear and precise",
      "Respectful of all audiences",
    ],
    guidelines: [
      "Always prioritize clarity and solvability",
      "Create puzzles that provide satisfying 'aha!' moments",
      "Maintain family-friendly content at all times",
      "Focus on educational value without being preachy",
      "Ensure puzzles are accessible to diverse audiences",
      "Balance challenge with fairness - difficult but solvable",
    ],
  },

  qualityStandards: {
    minimumQualityThreshold: 55, // Absolute minimum to accept
    publishThreshold: 70, // Quality needed to publish directly
    revisionThreshold: 60, // Quality needed to revise instead of reject
    scoringGuidelines: {
      exceptional: {
        min: 80,
        max: 100,
        description:
          "Rare, truly outstanding puzzles that are memorable and exceptional",
      },
      highQuality: {
        min: 70,
        max: 79,
        description: "High quality puzzles that are good and publishable",
      },
      acceptable: {
        min: 60,
        max: 69,
        description:
          "Acceptable puzzles that are decent but may need minor improvements",
      },
      needsWork: {
        min: 50,
        max: 59,
        description: "Puzzles with significant issues that need work",
      },
      poor: {
        min: 0,
        max: 49,
        description: "Poor quality puzzles with major problems",
      },
    },
  },

  difficultyCalibration: {
    scale: { min: 1, max: 10 },
    calibrationMethod: "weighted",
    /**
     * DIFFICULTY PHILOSOPHY:
     * This website is designed to challenge our AI to develop mid-level puzzles that take
     * users 1-5 hours to figure out. We NEVER use "easy" or low difficulty levels.
     * All puzzles must be challenging mid-level difficulties that push creative boundaries
     * while remaining solvable within a reasonable timeframe.
     *
     * Difficulty Levels (Scale: 1-10, Target Range: 4-8):
     * - hard: 4-5 - Baseline challenging puzzles that require genuine thinking
     * - difficult: 5-6 - More challenging puzzles that push creative boundaries
     * - evil: 6-7 - Very challenging puzzles that require out-of-the-box thinking
     * - impossible: 7-8 - Extremely challenging but still achievable puzzles
     */
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
        description:
          "How clear are the visual elements? (1 = crystal clear, 10 = highly ambiguous)",
      },
      {
        name: "cognitiveSteps",
        weight: 0.3,
        description:
          "How many mental leaps needed? (1 = single step, 10 = many complex steps)",
      },
      {
        name: "culturalKnowledge",
        weight: 0.2,
        description:
          "How much cultural context required? (1 = universal, 10 = requires deep cultural knowledge)",
      },
      {
        name: "vocabularyLevel",
        weight: 0.15,
        description:
          "How advanced is the vocabulary? (1 = basic words, 10 = advanced vocabulary)",
      },
      {
        name: "patternNovelty",
        weight: 0.15,
        description:
          "How unexpected is the pattern? (1 = common pattern, 10 = highly novel/unexpected)",
      },
    ],
    /**
     * Minimum difficulty for all puzzles - ensures we never generate easy puzzles.
     * All puzzles must be in the 4-8 range (mid-level difficulties).
     */
    minimumDifficulty: 4,
  },

  aiModelPreferences: {
    generation: {
      primary: "smart",
      fallbacks: ["fast", "creative"],
    },
    validation: {
      primary: "smart",
      fallbacks: ["fast"],
    },
    quality: {
      primary: "smart",
      fallbacks: ["fast"],
    },
  },

  constraints: {
    familyFriendly: true,
    educational: true,
    avoidContent: [
      "Violence",
      "Adult themes",
      "Offensive language",
      "Discriminatory content",
      "Controversial political topics",
      "Religious proselytizing",
    ],
    requireContent: [
      "Clear explanations",
      "Progressive hints",
      "Appropriate difficulty level",
      "Solvable within reasonable time",
    ],
  },
};

// Export difficulty constants for use across all puzzle types
export const DIFFICULTY_MIN = GLOBAL_CONTEXT.difficultyCalibration.minimumDifficulty;
export const DIFFICULTY_MAX = GLOBAL_CONTEXT.difficultyCalibration.ranges.impossible.max;
