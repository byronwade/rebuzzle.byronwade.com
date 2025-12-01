/**
 * Psychological Games Configuration
 *
 * Configuration for AI-powered psychological manipulation tactics
 * that create doubt, frustration, and false confidence in users.
 * Each session generates unique tactics to make puzzles seem harder.
 */

import { GLOBAL_CONTEXT } from "./global";
import type { DifficultyLevel } from "./text-area";

/**
 * Psychological game types
 */
export type GameType =
  | "false-feedback"
  | "misleading-hints"
  | "time-pressure"
  | "social-pressure"
  | "confidence-manipulation"
  | "red-herrings";

/**
 * Intensity level for psychological games
 */
export type GameIntensity = "subtle" | "moderate" | "aggressive" | "maximum";

/**
 * Configuration for a specific game type
 */
export interface GameTypeConfig {
  /** Whether this game type is enabled */
  enabled: boolean;
  /** Base intensity for this game type */
  baseIntensity: GameIntensity;
  /** Probability of triggering (0-1) */
  triggerProbability: number;
  /** Minimum progress before triggering (0-1) */
  minProgress: number;
  /** Maximum progress before stopping (0-1) */
  maxProgress: number;
  /** Minimum time in seconds before triggering */
  minTimeSeconds: number;
  /** Cooldown period in seconds between triggers */
  cooldownSeconds: number;
}

/**
 * Psychological games configuration per difficulty level
 */
export interface PsychologicalGamesConfig {
  /** Overall intensity multiplier (0-1) */
  intensityMultiplier: number;
  /** Game type configurations */
  gameTypes: Record<GameType, GameTypeConfig>;
  /** AI generation settings */
  aiGeneration: {
    /** System prompt template for AI */
    systemPrompt: string;
    /** Temperature for AI generation */
    temperature: number;
    /** Whether to generate unique tactics each session */
    uniquePerSession: boolean;
  };
}

/**
 * Psychological games configuration by difficulty level
 */
export const PSYCHOLOGICAL_GAMES_CONFIG: Record<
  DifficultyLevel,
  PsychologicalGamesConfig
> = {
  /**
   * Hard (5-6): Moderate psychological games
   */
  hard: {
    intensityMultiplier: 0.4,
    gameTypes: {
      "false-feedback": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.2, // Increased from 0.15
        minProgress: 0.2, // Lowered from 0.3 to trigger earlier
        maxProgress: 0.9,
        minTimeSeconds: 20, // Reduced from 30
        cooldownSeconds: 15, // Reduced from 20
      },
      "misleading-hints": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.15, // Increased from 0.1
        minProgress: 0.15, // Lowered from 0.2
        maxProgress: 0.85, // Increased from 0.8
        minTimeSeconds: 30, // Reduced from 45
        cooldownSeconds: 20, // Reduced from 30
      },
      "time-pressure": {
        enabled: true, // Enabled for hard difficulty
        baseIntensity: "subtle",
        triggerProbability: 0.1,
        minProgress: 0.3,
        maxProgress: 0.9,
        minTimeSeconds: 45,
        cooldownSeconds: 30,
      },
      "social-pressure": {
        enabled: true, // Enabled for hard difficulty
        baseIntensity: "subtle",
        triggerProbability: 0.08,
        minProgress: 0.25,
        maxProgress: 0.85,
        minTimeSeconds: 40,
        cooldownSeconds: 25,
      },
      "confidence-manipulation": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.18, // Increased from 0.12
        minProgress: 0.3, // Lowered from 0.4
        maxProgress: 0.85,
        minTimeSeconds: 45, // Reduced from 60
        cooldownSeconds: 20, // Reduced from 25
      },
      "red-herrings": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.12, // Increased from 0.08
        minProgress: 0.2, // Lowered from 0.3
        maxProgress: 0.85, // Increased from 0.8
        minTimeSeconds: 30, // Reduced from 40
        cooldownSeconds: 25, // Reduced from 35
      },
    },
    aiGeneration: {
      systemPrompt: `You are a subtle psychological manipulator helping create puzzle-solving challenges.
Your goal is to make puzzles seem slightly more challenging without being obvious.
Be gentle and encouraging while creating mild doubt.`,
      temperature: 0.7,
      uniquePerSession: true,
    },
  },

  /**
   * Difficult (7-8): Moderate to aggressive games
   */
  difficult: {
    intensityMultiplier: 0.6,
    gameTypes: {
      "false-feedback": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.25,
        minProgress: 0.25,
        maxProgress: 0.95,
        minTimeSeconds: 20,
        cooldownSeconds: 15,
      },
      "misleading-hints": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.2,
        minProgress: 0.15,
        maxProgress: 0.85,
        minTimeSeconds: 30,
        cooldownSeconds: 25,
      },
      "time-pressure": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.15,
        minProgress: 0.4,
        maxProgress: 0.9,
        minTimeSeconds: 60,
        cooldownSeconds: 40,
      },
      "social-pressure": {
        enabled: true,
        baseIntensity: "subtle",
        triggerProbability: 0.12,
        minProgress: 0.3,
        maxProgress: 0.85,
        minTimeSeconds: 45,
        cooldownSeconds: 30,
      },
      "confidence-manipulation": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.2,
        minProgress: 0.35,
        maxProgress: 0.9,
        minTimeSeconds: 45,
        cooldownSeconds: 20,
      },
      "red-herrings": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.18,
        minProgress: 0.25,
        maxProgress: 0.85,
        minTimeSeconds: 30,
        cooldownSeconds: 30,
      },
    },
    aiGeneration: {
      systemPrompt: `You are a skilled psychological manipulator creating challenging puzzle experiences.
Your goal is to make puzzles feel more difficult through subtle mind games.
Create doubt and uncertainty while maintaining plausibility. Be clever but not obvious.`,
      temperature: 0.8,
      uniquePerSession: true,
    },
  },

  /**
   * Evil (8-9): Aggressive psychological games
   */
  evil: {
    intensityMultiplier: 0.8,
    gameTypes: {
      "false-feedback": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.35,
        minProgress: 0.2,
        maxProgress: 0.98,
        minTimeSeconds: 15,
        cooldownSeconds: 10,
      },
      "misleading-hints": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.3,
        minProgress: 0.1,
        maxProgress: 0.9,
        minTimeSeconds: 20,
        cooldownSeconds: 18,
      },
      "time-pressure": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.25,
        minProgress: 0.3,
        maxProgress: 0.95,
        minTimeSeconds: 45,
        cooldownSeconds: 30,
      },
      "social-pressure": {
        enabled: true,
        baseIntensity: "moderate",
        triggerProbability: 0.2,
        minProgress: 0.25,
        maxProgress: 0.9,
        minTimeSeconds: 30,
        cooldownSeconds: 25,
      },
      "confidence-manipulation": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.3,
        minProgress: 0.3,
        maxProgress: 0.95,
        minTimeSeconds: 30,
        cooldownSeconds: 15,
      },
      "red-herrings": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.28,
        minProgress: 0.2,
        maxProgress: 0.9,
        minTimeSeconds: 20,
        cooldownSeconds: 25,
      },
    },
    aiGeneration: {
      systemPrompt: `You are a master of psychological manipulation creating intense puzzle challenges.
Your goal is to make puzzles seem extremely difficult through clever mind games.
Create significant doubt, false confidence, and frustration. Be creative and effective while staying subtle enough to not be obvious.`,
      temperature: 0.9,
      uniquePerSession: true,
    },
  },

  /**
   * Impossible (9-10): Maximum psychological warfare
   */
  impossible: {
    intensityMultiplier: 1.0,
    gameTypes: {
      "false-feedback": {
        enabled: true,
        baseIntensity: "maximum",
        triggerProbability: 0.5,
        minProgress: 0.15,
        maxProgress: 1.0,
        minTimeSeconds: 10,
        cooldownSeconds: 8,
      },
      "misleading-hints": {
        enabled: true,
        baseIntensity: "maximum",
        triggerProbability: 0.45,
        minProgress: 0.05,
        maxProgress: 0.95,
        minTimeSeconds: 15,
        cooldownSeconds: 12,
      },
      "time-pressure": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.4,
        minProgress: 0.25,
        maxProgress: 1.0,
        minTimeSeconds: 30,
        cooldownSeconds: 20,
      },
      "social-pressure": {
        enabled: true,
        baseIntensity: "aggressive",
        triggerProbability: 0.35,
        minProgress: 0.2,
        maxProgress: 0.95,
        minTimeSeconds: 20,
        cooldownSeconds: 18,
      },
      "confidence-manipulation": {
        enabled: true,
        baseIntensity: "maximum",
        triggerProbability: 0.45,
        minProgress: 0.25,
        maxProgress: 1.0,
        minTimeSeconds: 20,
        cooldownSeconds: 10,
      },
      "red-herrings": {
        enabled: true,
        baseIntensity: "maximum",
        triggerProbability: 0.4,
        minProgress: 0.15,
        maxProgress: 0.95,
        minTimeSeconds: 15,
        cooldownSeconds: 20,
      },
    },
    aiGeneration: {
      systemPrompt: `You are an expert psychological manipulator creating the ultimate puzzle challenge experience.
Your goal is to make puzzles seem impossibly difficult through masterful mind games.
Create intense doubt, false confidence patterns, time pressure illusions, and maximum frustration.
Be creative, unique, and devastatingly effective. Make users question their intelligence.
Generate unique tactics each time that are subtle enough to not be obvious but effective enough to create real psychological pressure.`,
      temperature: 1.0,
      uniquePerSession: true,
    },
  },
};

/**
 * Get psychological games configuration for a difficulty level
 */
export function getPsychologicalGamesConfig(
  difficulty: number
): PsychologicalGamesConfig {
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges ?? {
    hard: { min: 5, max: 6 },
    difficult: { min: 7, max: 8 },
    evil: { min: 8, max: 9 },
    impossible: { min: 9, max: 10 },
  };

  let level: DifficultyLevel;
  if (difficulty >= ranges.impossible.min) {
    level = "impossible";
  } else if (difficulty >= ranges.evil.min) {
    level = "evil";
  } else if (difficulty >= ranges.difficult.min) {
    level = "difficult";
  } else {
    level = "hard";
  }

  return PSYCHOLOGICAL_GAMES_CONFIG[level];
}

/**
 * Calculate adaptive intensity based on progress
 */
export function calculateAdaptiveIntensity(
  baseIntensity: GameIntensity,
  progress: number, // 0-1
  timeSpent: number, // seconds
  intensityMultiplier: number
): number {
  // Base intensity value
  const intensityMap: Record<GameIntensity, number> = {
    subtle: 0.3,
    moderate: 0.6,
    aggressive: 0.85,
    maximum: 1.0,
  };

  let intensity = intensityMap[baseIntensity];

  // Scale with progress (more intense when closer to solution)
  // Peak intensity at 70-90% progress
  if (progress >= 0.7 && progress <= 0.9) {
    intensity *= 1.3; // 30% boost when close
  } else if (progress >= 0.5 && progress < 0.7) {
    intensity *= 1.1; // 10% boost when making progress
  }

  // Scale with time (more pressure over time)
  const timeMultiplier = Math.min(1.0, 1.0 + timeSpent / 300); // Caps at 2x after 5 minutes
  intensity *= timeMultiplier;

  // Apply difficulty multiplier
  intensity *= intensityMultiplier;

  // Clamp to 0-1
  return Math.min(1.0, Math.max(0.0, intensity));
}

/**
 * Check if a game type should trigger
 */
export function shouldTriggerGame(
  config: GameTypeConfig,
  progress: number,
  timeSpent: number,
  lastTriggerTime: number | null
): boolean {
  if (!config.enabled) return false;

  // Check progress bounds
  if (progress < config.minProgress || progress > config.maxProgress) {
    return false;
  }

  // Check minimum time
  if (timeSpent < config.minTimeSeconds) {
    return false;
  }

  // Check cooldown
  if (lastTriggerTime !== null) {
    const timeSinceLastTrigger = Date.now() / 1000 - lastTriggerTime;
    if (timeSinceLastTrigger < config.cooldownSeconds) {
      return false;
    }
  }

  // Check probability
  return Math.random() < config.triggerProbability;
}
