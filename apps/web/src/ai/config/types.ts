/**
 * Shared Types for Config-Driven Puzzle Generation
 */

import type { z } from "zod";

/**
 * Global AI Context - applies to all puzzle types
 */
export type GlobalContext = {
  brandVoice: {
    tone: string;
    style: string;
    personality: string[];
    guidelines: string[];
  };
  qualityStandards: {
    minimumQualityThreshold: number;
    publishThreshold: number;
    revisionThreshold: number;
    scoringGuidelines: {
      exceptional: { min: number; max: number; description: string };
      highQuality: { min: number; max: number; description: string };
      acceptable: { min: number; max: number; description: string };
      needsWork: { min: number; max: number; description: string };
      poor: { min: number; max: number; description: string };
    };
  };
  difficultyCalibration: {
    scale: { min: number; max: number };
    calibrationMethod: "weighted" | "average" | "custom";
    ranges?: {
      hard: { min: number; max: number };
      difficult: { min: number; max: number };
      evil: { min: number; max: number };
      impossible: { min: number; max: number };
    };
    factors: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
    minimumDifficulty?: number;
  };
  aiModelPreferences: {
    generation: {
      primary: string;
      fallbacks: string[];
    };
    validation: {
      primary: string;
      fallbacks: string[];
    };
    quality: {
      primary: string;
      fallbacks: string[];
    };
  };
  constraints: {
    familyFriendly: boolean;
    educational: boolean;
    avoidContent: string[];
    requireContent: string[];
  };
};

/**
 * Puzzle Type Configuration
 * Each puzzle type (rebus, word-puzzle, etc.) has its own config
 */
export type PuzzleTypeConfig = {
  /** Unique identifier for this puzzle type */
  id: string;

  /** Display name */
  name: string;

  /** Description of this puzzle type */
  description: string;

  /** Zod schema defining the puzzle data structure */
  schema: z.ZodTypeAny;

  /** Generation configuration */
  generation: {
    /** System prompt for AI generation */
    systemPrompt: string | ((params: Record<string, unknown>) => string);
    /** User prompt template (can use variables) */
    userPromptTemplate: string | ((params: Record<string, unknown>) => string);
    /** Temperature for generation */
    temperature: number;
    /** Model type to use */
    modelType: "fast" | "smart" | "creative";
  };

  /** Validation rules */
  validation: {
    /** Custom validation function */
    validate?: (puzzle: unknown) => { valid: boolean; errors: string[] };
    /** Required fields */
    requiredFields: string[];
    /** Field constraints */
    constraints: Record<
      string,
      {
        min?: number;
        max?: number;
        pattern?: RegExp;
        custom?: (value: unknown) => boolean;
      }
    >;
  };

  /** Difficulty configuration */
  difficulty: {
    /** How difficulty is calculated for this type */
    calculate: (puzzle: unknown) => number;
    /** Difficulty ranges - all puzzles must be challenging */
    ranges: {
      hard: { min: number; max: number };
      difficult: { min: number; max: number };
      evil: { min: number; max: number };
      impossible: { min: number; max: number };
    };
    /** Difficulty factors specific to this type */
    factors: Array<{
      name: string;
      weight: number;
      extract: (puzzle: unknown) => number;
    }>;
  };

  /** Hints generation strategy */
  hints: {
    /** System prompt for hint generation */
    systemPrompt: string;
    /** User prompt template */
    userPromptTemplate: string;
    /** Number of hints to generate */
    count: number;
    /** Hint progression strategy */
    progression: "linear" | "exponential" | "custom";
  };

  /** Quality metrics specific to this puzzle type */
  qualityMetrics: {
    /** Dimensions to score */
    dimensions: Array<{
      name: string;
      weight: number;
      description: string;
      score: (puzzle: unknown) => number;
    }>;
    /** Overall quality calculation */
    calculateOverall: (scores: Record<string, number>) => number;
  };

  /** How to play instructions for this puzzle type */
  howToPlay: {
    /** Brief description of the puzzle type */
    description: string;
    /** Array of rule strings explaining how to play */
    rules: string[];
    /** Optional examples showing how the puzzle works */
    examples?: string[];
  };
};

/**
 * Parameters for puzzle generation
 */
export type PuzzleGenerationParams = {
  puzzleType: string;
  targetDifficulty?: number;
  category?: string;
  theme?: string;
  requireNovelty?: boolean;
  qualityThreshold?: number;
  maxAttempts?: number;
  [key: string]: unknown; // Allow additional type-specific params
};

/**
 * Result of puzzle generation
 */
export type GeneratedPuzzleResult<T = unknown> = {
  puzzle: T;
  metadata: {
    puzzleType: string;
    qualityScore: number;
    difficulty: number;
    generationAttempts: number;
    generationTimeMs: number;
    [key: string]: unknown;
  };
  status: "success" | "retry" | "failed";
  recommendations?: string[];
};
