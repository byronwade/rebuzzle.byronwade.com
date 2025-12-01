/**
 * Difficulty utility functions
 * Maps numeric difficulty levels to text names and provides daily difficulty information
 */

import { GLOBAL_CONTEXT } from "@/ai/config/global";

export type DifficultyName = "Hard" | "Difficult" | "Evil" | "Impossible";

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

/**
 * Maps a numeric difficulty level to its text name
 * Based on the difficulty calibration ranges from global config:
 * - Hard: 4-5
 * - Difficult: 5-6
 * - Evil: 6-7
 * - Impossible: 7-8
 */
export function getDifficultyName(
  difficulty: number | string | undefined
): DifficultyName {
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges;

  // Handle string or undefined values
  if (typeof difficulty === "string") {
    // Legacy string values - map to numeric equivalents
    if (difficulty === "easy") return "Hard";
    if (difficulty === "medium") return "Hard";
    if (difficulty === "hard") return "Hard";
    // Try to parse as number
    const num = Number.parseInt(difficulty, 10);
    if (isNaN(num)) {
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
    grouped.get(name)!.push(level);
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
