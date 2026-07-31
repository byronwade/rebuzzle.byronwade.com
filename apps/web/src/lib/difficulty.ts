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

/** Tailwind-friendly accent classes per tier (play UI) */
export const DIFFICULTY_ACCENTS: Record<
  DifficultyName,
  { badge: string; glow: string; dot: string }
> = {
  Hard: {
    badge: "bg-teal-500/15 text-teal-800 border-teal-500/30 dark:text-teal-200",
    glow: "shadow-[0_0_24px_-8px_rgba(20,184,166,0.55)]",
    dot: "bg-teal-500",
  },
  Difficult: {
    badge: "bg-amber-500/15 text-amber-900 border-amber-500/35 dark:text-amber-100",
    glow: "shadow-[0_0_24px_-8px_rgba(245,158,11,0.5)]",
    dot: "bg-amber-500",
  },
  Evil: {
    badge: "bg-rose-500/15 text-rose-900 border-rose-500/35 dark:text-rose-100",
    glow: "shadow-[0_0_24px_-8px_rgba(244,63,94,0.5)]",
    dot: "bg-rose-500",
  },
  Impossible: {
    badge: "bg-slate-900/90 text-cyan-100 border-cyan-400/40 dark:bg-slate-950",
    glow: "shadow-[0_0_28px_-6px_rgba(34,211,238,0.55)]",
    dot: "bg-cyan-400",
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
