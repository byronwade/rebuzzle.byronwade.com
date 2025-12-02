/**
 * Difficulty Utility Functions
 *
 * Maps numeric difficulty levels (1-10 scale) to human-readable names
 * and provides daily difficulty information for the game UI.
 *
 * Difficulty Philosophy:
 * - This game challenges users with mid-level puzzles (4-8 range)
 * - All puzzles require genuine thinking and creativity
 * - "Easy" puzzles don't exist in our system by design
 */

import { GLOBAL_CONTEXT } from "@/ai/config/global";

/** Human-readable difficulty tier names */
export type DifficultyName = "Hard" | "Difficult" | "Evil" | "Impossible";

/** Difficulty range definition */
interface DifficultyRange {
  min: number;
  max: number;
}

export interface DifficultyInfo {
  level: number;
  name: DifficultyName;
  description: string;
}

export interface GroupedDifficultyInfo {
  name: DifficultyName;
  levels: number[];
  description: string;
}

/** Default difficulty ranges (used if global config unavailable) */
const DEFAULT_RANGES: Record<Lowercase<DifficultyName>, DifficultyRange> = {
  hard: { min: 4, max: 5 },
  difficult: { min: 5, max: 6 },
  evil: { min: 6, max: 7 },
  impossible: { min: 7, max: 8 },
} as const;

/**
 * Maps a numeric difficulty level to its text name
 *
 * @param difficulty - Numeric level (1-10), legacy string, or undefined
 * @returns The human-readable difficulty tier name
 *
 * @example
 * getDifficultyName(4) // "Hard"
 * getDifficultyName(7) // "Impossible"
 * getDifficultyName("medium") // "Hard" (legacy fallback)
 */
export function getDifficultyName(difficulty: number | string | undefined): DifficultyName {
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges ?? DEFAULT_RANGES;

  // Handle string or undefined values
  if (typeof difficulty === "string") {
    // Legacy string values - map to numeric equivalents
    if (difficulty === "easy") return "Hard";
    if (difficulty === "medium") return "Hard";
    if (difficulty === "hard") return "Hard";
    // Try to parse as number
    const num = Number.parseInt(difficulty, 10);
    if (Number.isNaN(num)) {
      return "Hard"; // Default fallback
    }
    difficulty = num;
  }

  if (typeof difficulty !== "number" || difficulty < 1) {
    return "Hard"; // Default fallback
  }

  // Map numeric difficulty to name using global config ranges
  if (difficulty >= ranges.impossible.min && difficulty <= ranges.impossible.max) {
    return "Impossible";
  }
  if (difficulty >= ranges.evil.min && difficulty <= ranges.evil.max) {
    return "Evil";
  }
  if (difficulty >= ranges.difficult.min && difficulty <= ranges.difficult.max) {
    return "Difficult";
  }
  if (difficulty >= ranges.hard.min && difficulty <= ranges.hard.max) {
    return "Hard";
  }

  // Fallback for values outside expected range
  if (difficulty < ranges.hard.min) return "Hard";
  return "Impossible";
}

/**
 * Get description for a difficulty name
 */
export function getDifficultyDescription(name: DifficultyName): string {
  const descriptions: Record<DifficultyName, string> = {
    Hard: "Baseline challenging puzzles that require genuine thinking",
    Difficult: "More challenging puzzles that push creative boundaries",
    Evil: "Very challenging puzzles that require out-of-the-box thinking",
    Impossible: "Extremely challenging but still achievable puzzles",
  };
  return descriptions[name];
}

/**
 * Get all possible daily difficulties
 * Based on calculateDailyDifficulty: [5, 4, 5, 7, 6, 5, 4] (Sun-Sat)
 * Unique values: 4, 5, 6, 7
 */
export function getDailyDifficulties(): DifficultyInfo[] {
  const dailyLevels = [4, 5, 6, 7];

  return dailyLevels.map((level) => {
    const name = getDifficultyName(level);
    return {
      level,
      name,
      description: getDifficultyDescription(name),
    };
  });
}

/**
 * Get daily difficulties grouped by name with level ranges
 * Groups levels that share the same difficulty name together
 */
export function getGroupedDailyDifficulties(): GroupedDifficultyInfo[] {
  const dailyLevels = [4, 5, 6, 7];

  // Group levels by difficulty name
  const grouped = new Map<DifficultyName, number[]>();

  dailyLevels.forEach((level) => {
    const name = getDifficultyName(level);
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name)?.push(level);
  });

  // Convert to array and sort by lowest level
  return Array.from(grouped.entries())
    .map(([name, levels]) => ({
      name,
      levels: levels.sort((a, b) => a - b),
      description: getDifficultyDescription(name),
    }))
    .sort((a, b) => a.levels[0]! - b.levels[0]!);
}

/**
 * Maps numeric difficulty level to achievement category
 * Used consistently across achievements and stats tracking
 *
 * @param difficultyLevel - Numeric level (1-10)
 * @returns "easy" | "medium" | "hard"
 */
export function getAchievementDifficultyCategory(
  difficultyLevel: number
): "easy" | "medium" | "hard" {
  if (difficultyLevel <= 3) return "easy";
  if (difficultyLevel <= 6) return "medium";
  return "hard";
}
