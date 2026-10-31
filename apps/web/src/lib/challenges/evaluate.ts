import { addCalendarDays } from "@/lib/game/daily-lock";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_LINES,
  CHALLENGE_TIER_XP,
  type ChallengeCategoryId,
  type ChallengeMeasure,
  SECRET_LINES,
  SECRET_XP,
} from "./definitions";

/** The de-duplicated daily-progress entry shape built by /api/user/progress. */
export type ChallengeEntry = {
  puzzleDate: string;
  outcome: "solved" | "failed";
  attempts: number;
  hintCount: number | null;
  completedAt: Date;
  timeZone: string | null;
  playMode?: "extended";
};

export type ChallengeLineProgress = {
  id: string;
  category: ChallengeCategoryId;
  title: string | null;
  description: string | null;
  secret: boolean;
  value: number | null;
  thresholds: number[];
  tier: number;
  unlockedAt: (string | null)[];
};

export type ChallengeProgress = {
  tiersUnlocked: number;
  tiersTotal: number;
  challengeXP: number;
  categories: { id: ChallengeCategoryId; title: string; mastered: boolean }[];
  lines: ChallengeLineProgress[];
};

function mondayOf(puzzleDate: string): string {
  const [year, month, day] = puzzleDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return addCalendarDays(puzzleDate, -((weekday + 6) % 7));
}

function localHour(at: Date, timeZone: string): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(at);
    const parsed = Number(hour);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Derive challenge progress by replaying finished daily puzzles in date order.
 * Pure and idempotent: the same history always yields the same tiers and XP.
 */
export function evaluateChallenges(entries: ChallengeEntry[]): ChallengeProgress {
  const ordered = [...entries].sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate));
  const counts = Object.fromEntries(CHALLENGE_LINES.map((line) => [line.id, 0])) as Record<
    ChallengeMeasure,
    number
  >;
  const unlockedAt = Object.fromEntries(
    CHALLENGE_LINES.map((line) => [line.id, line.thresholds.map(() => null)])
  ) as Record<ChallengeMeasure, (string | null)[]>;
  const secretsFound = new Map<string, string>();
  const datesByWeek = new Map<string, number>();
  let currentRun = 0;
  let previousDate: string | null = null;

  for (const entry of ordered) {
    const solved = entry.outcome === "solved";
    const extended = entry.playMode === "extended";
    counts.dailies += 1;

    currentRun =
      previousDate && addCalendarDays(previousDate, 1) === entry.puzzleDate ? currentRun + 1 : 1;
    previousDate = entry.puzzleDate;
    counts.streak = Math.max(counts.streak, currentRun);

    const week = mondayOf(entry.puzzleDate);
    const weekDays = (datesByWeek.get(week) ?? 0) + 1;
    datesByWeek.set(week, weekDays);
    if (weekDays === 3) counts.trails += 1;
    if (weekDays === 7) counts["perfect-weeks"] += 1;

    if (solved) {
      counts.solves += 1;
      if (entry.attempts === 1) counts["first-guess"] += 1;
      if (entry.hintCount === 0) counts.unassisted += 1;
      if (!extended && entry.attempts === 3) counts.clutch += 1;
      if (extended) counts.extended += 1;
    }

    const hour = entry.timeZone ? localHour(entry.completedAt, entry.timeZone) : null;
    if (hour !== null && hour < 8) counts["early-bird"] += 1;
    if (hour !== null && hour >= 22) counts["night-owl"] += 1;

    for (const secret of SECRET_LINES) {
      if (entry.puzzleDate.slice(5) === secret.monthDay && !secretsFound.has(secret.id)) {
        secretsFound.set(secret.id, entry.puzzleDate);
      }
    }

    for (const line of CHALLENGE_LINES) {
      line.thresholds.forEach((threshold, index) => {
        if (counts[line.id] >= threshold && unlockedAt[line.id][index] === null) {
          unlockedAt[line.id][index] = entry.puzzleDate;
        }
      });
    }
  }

  const visible: ChallengeLineProgress[] = CHALLENGE_LINES.map((line) => ({
    id: line.id,
    category: line.category,
    title: line.title,
    description: line.description,
    secret: false,
    value: counts[line.id],
    thresholds: [...line.thresholds],
    tier: line.thresholds.filter((threshold) => counts[line.id] >= threshold).length,
    unlockedAt: unlockedAt[line.id],
  }));
  const secrets: ChallengeLineProgress[] = SECRET_LINES.map((secret) => {
    const foundOn = secretsFound.get(secret.id) ?? null;
    return {
      id: secret.id,
      category: "secrets",
      title: foundOn ? secret.title : null,
      description: foundOn ? secret.description : null,
      secret: true,
      value: foundOn ? 1 : null,
      thresholds: [1],
      tier: foundOn ? 1 : 0,
      unlockedAt: [foundOn],
    };
  });
  const lines = [...visible, ...secrets];

  const challengeXP =
    visible.reduce(
      (total, line) =>
        total + CHALLENGE_TIER_XP.slice(0, line.tier).reduce((sum, xp) => sum + xp, 0),
      0
    ) +
    secretsFound.size * SECRET_XP;

  return {
    tiersUnlocked: lines.reduce((total, line) => total + line.tier, 0),
    tiersTotal: lines.reduce((total, line) => total + line.thresholds.length, 0),
    challengeXP,
    categories: CHALLENGE_CATEGORIES.map((category) => ({
      ...category,
      mastered: lines
        .filter((line) => line.category === category.id)
        .every((line) => line.tier === line.thresholds.length),
    })),
    lines,
  };
}
