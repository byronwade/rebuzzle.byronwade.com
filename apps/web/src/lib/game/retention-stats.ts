/**
 * Pure retention stats helpers — streak freezes, engagement multipliers,
 * Wordle-style guess distribution, and recent play calendar.
 */

import { engagementConfig } from "@rebuzzle/config";
import { getDailyBonusMultiplier, shouldResetStreakFreeze } from "@/lib/gameSettings";

export const GUESS_DISTRIBUTION_SLOTS = 3 as const;
export const RECENT_PLAY_DATES_CAP = 42;

export type GuessDistribution = [number, number, number];

export type StreakProtectionInput = {
  won: boolean;
  affectsStreak: boolean;
  currentStreak: number;
  currentDailyStreak: number;
  streakFreezes: number;
  streakShields: number;
  streakFreezeWeekStart?: Date;
  /**
   * Calendar days the player skipped since their last daily play
   * (0 when they last played yesterday or earlier today).
   */
  missedDays?: number;
  /** False when the player already played a daily puzzle on this calendar day. */
  isNewDay?: boolean;
  now?: Date;
};

export type StreakProtectionResult = {
  streak: number;
  dailyChallengeStreak: number;
  streakFreezes: number;
  streakShields: number;
  streakFreezeWeekStart?: Date;
  lastFreezeUsed?: Date;
  streakFrozen: boolean;
  freezeSource: "freeze" | "shield" | null;
};

export type EngagementRoll = {
  isLucky: boolean;
  luckyMultiplier: number;
  hasDailyBonus: boolean;
  dailyBonusMultiplier: number;
  /** Combined engagement multiplier (lucky × daily). */
  engagementMultiplier: number;
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function emptyGuessDistribution(): GuessDistribution {
  return [0, 0, 0];
}

export function normalizeGuessDistribution(raw?: number[] | null): GuessDistribution {
  const base = emptyGuessDistribution();
  if (!raw?.length) return base;
  for (let i = 0; i < GUESS_DISTRIBUTION_SLOTS; i++) {
    const value = raw[i];
    base[i] =
      typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return base;
}

/** Bump Wordle-style histogram on a win (attempts 1..max). Losses leave it unchanged. */
export function bumpGuessDistribution(
  current: number[] | null | undefined,
  attempts: number,
  won: boolean,
  maxAttempts: number = GUESS_DISTRIBUTION_SLOTS
): GuessDistribution {
  const next = normalizeGuessDistribution(current);
  if (!won) return next;
  const slot = Math.min(Math.max(1, Math.floor(attempts)), maxAttempts) - 1;
  if (slot >= 0 && slot < GUESS_DISTRIBUTION_SLOTS) {
    next[slot] = (next[slot] ?? 0) + 1;
  }
  return next;
}

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Record today's UTC play date for the profile calendar (capped). */
export function recordRecentPlayDate(
  current: string[] | null | undefined,
  date: Date = new Date(),
  affectsStreak = true
): string[] {
  if (!affectsStreak) return Array.isArray(current) ? [...current] : [];
  const key = utcDateKey(date);
  const prior = Array.isArray(current) ? current.filter((entry) => entry !== key) : [];
  return [key, ...prior].slice(0, RECENT_PLAY_DATES_CAP);
}

/** Whole calendar days from `fromKey` to `toKey` (YYYY-MM-DD). */
export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00.000Z`);
  const to = Date.parse(`${toKey}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/**
 * Days missed between the last daily play and today, plus whether today is a
 * new play day. Keys are the player's local calendar dates (YYYY-MM-DD).
 */
export function getStreakGap(
  lastPlayKey: string | null,
  todayKey: string
): { missedDays: number; isNewDay: boolean } {
  if (!lastPlayKey) return { missedDays: 0, isNewDay: true };
  const gap = calendarDaysBetween(lastPlayKey, todayKey);
  // gap <= 0: same day, or the clock moved backwards (time-zone travel).
  if (gap <= 0) return { missedDays: 0, isNewDay: false };
  return { missedDays: gap - 1, isNewDay: true };
}

/**
 * Streak rules:
 * - A missed calendar day breaks the streak unless a freeze (then a shield)
 *   covers it. One freeze or shield covers one missed day.
 * - A win on a new day adds a day.
 * - A loss keeps the streak but adds no day, and never spends protection.
 * - Archive plays (affectsStreak=false) leave the streak alone.
 * Weekly freezes are granted when the Monday UTC boundary rolls.
 */
export function applyStreakProtection(input: StreakProtectionInput): StreakProtectionResult {
  const now = input.now ?? new Date();
  let streakFreezes = Math.max(0, input.streakFreezes);
  let streakShields = Math.max(0, input.streakShields);
  let streakFreezeWeekStart = input.streakFreezeWeekStart;

  if (shouldResetStreakFreeze(streakFreezeWeekStart, now)) {
    streakFreezes = Math.max(streakFreezes, engagementConfig.streakFreezesPerWeek);
    streakFreezeWeekStart = getWeekStart(now);
  }

  if (!input.affectsStreak) {
    return {
      streak: input.currentStreak,
      dailyChallengeStreak: input.currentDailyStreak,
      streakFreezes,
      streakShields,
      streakFreezeWeekStart,
      streakFrozen: false,
      freezeSource: null,
    };
  }

  let streak = Math.max(0, input.currentStreak);
  let dailyChallengeStreak = Math.max(0, input.currentDailyStreak);
  let streakFrozen = false;
  let freezeSource: "freeze" | "shield" | null = null;
  let lastFreezeUsed: Date | undefined;

  const missedDays = Math.max(0, Math.floor(input.missedDays ?? 0));
  if (missedDays > 0 && streak > 0) {
    const usableShields = engagementConfig.streakShieldFromAchievements ? streakShields : 0;
    if (streakFreezes + usableShields >= missedDays) {
      const freezesSpent = Math.min(streakFreezes, missedDays);
      const shieldsSpent = missedDays - freezesSpent;
      streakFreezes -= freezesSpent;
      streakShields -= shieldsSpent;
      streakFrozen = true;
      freezeSource = shieldsSpent > 0 ? "shield" : "freeze";
      lastFreezeUsed = now;
    } else {
      // Not enough protection: the chain broke. Keep the inventory for later.
      streak = 0;
      dailyChallengeStreak = 0;
    }
  } else if (missedDays > 0) {
    dailyChallengeStreak = 0;
  }

  if (input.won && input.isNewDay !== false) {
    streak += 1;
    dailyChallengeStreak += 1;
  }

  return {
    streak,
    dailyChallengeStreak,
    streakFreezes,
    streakShields,
    streakFreezeWeekStart,
    ...(lastFreezeUsed ? { lastFreezeUsed } : {}),
    streakFrozen,
    freezeSource,
  };
}

/**
 * The streak a player has right now, for read paths (profile, leaderboards).
 * Stored streaks only change when the player plays, so a lapsed player would
 * otherwise keep showing their old streak.
 */
export function resolveCurrentStreak(
  stats: {
    streak?: number;
    lastPlayDate?: Date | string | null;
    streakFreezes?: number;
    streakShields?: number;
    streakFreezeWeekStart?: Date | string | null;
  },
  todayKey: string,
  toDayKey: (date: Date) => string,
  now: Date = new Date()
): number {
  const streak = Math.max(0, stats.streak ?? 0);
  if (streak === 0 || !stats.lastPlayDate) return streak;
  const last = new Date(stats.lastPlayDate);
  if (Number.isNaN(last.getTime())) return streak;
  const { missedDays } = getStreakGap(toDayKey(last), todayKey);
  if (missedDays === 0) return streak;
  // Mirror applyStreakProtection: the weekly grant lands before misses are covered.
  const weekStart = stats.streakFreezeWeekStart ? new Date(stats.streakFreezeWeekStart) : undefined;
  const freezes = shouldResetStreakFreeze(weekStart, now)
    ? Math.max(stats.streakFreezes ?? 0, engagementConfig.streakFreezesPerWeek)
    : Math.max(0, stats.streakFreezes ?? 0);
  const shields = engagementConfig.streakShieldFromAchievements
    ? Math.max(0, stats.streakShields ?? 0)
    : 0;
  return missedDays <= freezes + shields ? streak : 0;
}

/** Server-authoritative lucky + daily bonus roll. */
export function rollEngagementMultipliers(
  date: Date = new Date(),
  random: () => number = Math.random
): EngagementRoll {
  const isLucky = random() < engagementConfig.luckySolveChance;
  const luckyMultiplier = isLucky ? engagementConfig.luckySolveMultiplier : 1;
  const daily = getDailyBonusMultiplier(date);
  const dailyBonusMultiplier = daily.hasBonus ? daily.multiplier : 1;
  return {
    isLucky,
    luckyMultiplier,
    hasDailyBonus: daily.hasBonus,
    dailyBonusMultiplier,
    engagementMultiplier: luckyMultiplier * dailyBonusMultiplier,
  };
}

export function composePointsMultiplier(
  base: number,
  engagement: EngagementRoll,
  won: boolean
): number {
  if (!won) return Math.max(0, base);
  return Math.max(0, base) * engagement.engagementMultiplier;
}
