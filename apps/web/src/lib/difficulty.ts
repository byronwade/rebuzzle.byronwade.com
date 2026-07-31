/**
 * Difficulty Utility Functions
 *
 * Maps numeric difficulty (1–10) to canonical tiers shared with the Eve agent.
 * Tiers are non-overlapping: Hard 4–5 · Difficult 6 · Evil 7 · Impossible 8–9
 */

import { GLOBAL_CONTEXT } from "@/ai/config/global";

/** Human-readable difficulty tier names */
export type DifficultyName = "Hard" | "Difficult" | "Evil" | "Impossible";

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
  accentClass: string;
}

const DEFAULT_RANGES: Record<Lowercase<DifficultyName>, DifficultyRange> = {
  hard: { min: 4, max: 5 },
  difficult: { min: 6, max: 6 },
  evil: { min: 7, max: 7 },
  impossible: { min: 8, max: 9 },
} as const;

const DESCRIPTIONS: Record<DifficultyName, string> = {
  Hard: "Clever but fair — one clear idea with a light twist",
  Difficult: "Second-look composition — parts lock together",
  Evil: "Lateral thinking — the obvious reading is a trap",
  Impossible: "Dense expert mode — still fair with the hint ladder",
};

/**
 * Tailwind-friendly accent classes per tier (play UI).
 *
 * The four tiers walk the brand's own gradient stops in order — develop blue,
 * ship amber, preview pink, then the polarity-flipped ink band for the top
 * tier. No tier introduces a colour that isn't already in the system.
 */
export const DIFFICULTY_ACCENTS: Record<
  DifficultyName,
  { badge: string; glow: string; dot: string }
> = {
  Hard: {
    badge: "border-link/25 bg-link/10 text-link",
    glow: "shadow-[0_0_24px_-10px_rgba(0,112,243,0.5)]",
    dot: "bg-link",
  },
  Difficult: {
    badge: "border-warning/30 bg-warning/10 text-[#ab570a] dark:text-warning",
    glow: "shadow-[0_0_24px_-10px_rgba(245,166,35,0.5)]",
    dot: "bg-warning",
  },
  Evil: {
    badge: "border-[#ff0080]/25 bg-[#ff0080]/10 text-[#c0005f] dark:text-[#ff4da6]",
    glow: "shadow-[0_0_24px_-10px_rgba(255,0,128,0.5)]",
    dot: "bg-[#ff0080]",
  },
  Impossible: {
    badge: "border-transparent bg-foreground text-background",
    glow: "shadow-[0_0_28px_-8px_rgba(121,40,202,0.55)]",
    dot: "bg-[#00dfd8]",
  },
};

export function getDifficultyName(difficulty: number | string | undefined): DifficultyName {
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges ?? DEFAULT_RANGES;

  if (typeof difficulty === "string") {
    if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
      return "Hard";
    }
    const num = Number.parseInt(difficulty, 10);
    if (Number.isNaN(num)) return "Hard";
    difficulty = num;
  }

  if (typeof difficulty !== "number" || difficulty < 1) return "Hard";

  if (difficulty >= ranges.impossible.min) return "Impossible";
  if (difficulty >= ranges.evil.min && difficulty <= ranges.evil.max) return "Evil";
  if (difficulty >= ranges.difficult.min && difficulty <= ranges.difficult.max) {
    return "Difficult";
  }
  if (difficulty >= ranges.hard.min && difficulty <= ranges.hard.max) return "Hard";
  if (difficulty < ranges.hard.min) return "Hard";
  return "Impossible";
}

export function getDifficultyDescription(name: DifficultyName): string {
  return DESCRIPTIONS[name];
}

export function getDailyDifficulties(): DifficultyInfo[] {
  const dailyLevels = [4, 5, 6, 7, 8];
  return dailyLevels.map((level) => {
    const name = getDifficultyName(level);
    return { level, name, description: getDifficultyDescription(name) };
  });
}

export function getGroupedDailyDifficulties(): GroupedDifficultyInfo[] {
  const order: DifficultyName[] = ["Hard", "Difficult", "Evil", "Impossible"];
  const ranges = GLOBAL_CONTEXT.difficultyCalibration.ranges ?? DEFAULT_RANGES;

  return order.map((name) => {
    const key = name.toLowerCase() as Lowercase<DifficultyName>;
    const range = ranges[key];
    const levels: number[] = [];
    for (let i = range.min; i <= range.max; i++) levels.push(i);
    return {
      name,
      levels,
      description: getDifficultyDescription(name),
      accentClass: DIFFICULTY_ACCENTS[name].badge,
    };
  });
}

export function getAchievementDifficultyCategory(
  difficultyLevel: number
): "easy" | "medium" | "hard" {
  if (difficultyLevel <= 5) return "easy";
  if (difficultyLevel <= 7) return "medium";
  return "hard";
}
