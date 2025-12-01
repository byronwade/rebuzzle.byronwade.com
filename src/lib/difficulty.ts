/**
 * Difficulty utility functions
 * Maps numeric difficulty levels to text names and provides daily difficulty information
 */

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
 * Based on the difficulty calibration ranges:
 * - Hard: 4-6 (treating 4 as lower end of Hard range)
 * - Difficult: 7-8
 * - Evil: 8-9
 * - Impossible: 9-10
 */
export function getDifficultyName(
  difficulty: number | string | undefined
): DifficultyName {
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

  // Map numeric difficulty to name
  if (difficulty >= 4 && difficulty <= 6) {
    return "Hard";
  }
  if (difficulty >= 7 && difficulty <= 8) {
    return "Difficult";
  }
  if (difficulty >= 8 && difficulty <= 9) {
    return "Evil";
  }
  if (difficulty >= 9 && difficulty <= 10) {
    return "Impossible";
  }

  // Fallback for values outside expected range
  if (difficulty < 4) return "Hard";
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
