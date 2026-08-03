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
    base[i] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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

/**
 * Grant weekly freezes when the Monday UTC boundary rolls, then apply consume-on-miss.
 * Wins never consume protection. Archive plays (affectsStreak=false) leave streak alone.
 */
export function applyStreakProtection(input: StreakProtectionInput): StreakProtectionResult {
  const now = input.now ?? new Date();
  let streakFreezes = Math.max(0, input.streakFreezes);
  let streakShields = Math.max(0, input.streakShields);
  let streakFreezeWeekStart = input.streakFreezeWeekStart;

  if (shouldResetStreakFreeze(streakFreezeWeekStart)) {
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

  if (input.won) {
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

  // Loss: try freeze, then shield, else reset.
  if (input.currentStreak > 0 && streakFreezes > 0) {
    return {
      streak: input.currentStreak,
      dailyChallengeStreak: input.currentDailyStreak,
      streakFreezes: streakFreezes - 1,
      streakShields,
      streakFreezeWeekStart,
      lastFreezeUsed: now,
      streakFrozen: true,
      freezeSource: "freeze",
    };
  }

  if (
    engagementConfig.streakShieldFromAchievements &&
    input.currentStreak > 0 &&
    streakShields > 0
  ) {
    return {
      streak: input.currentStreak,
      dailyChallengeStreak: input.currentDailyStreak,
      streakFreezes,
      streakShields: streakShields - 1,
      streakFreezeWeekStart,
      lastFreezeUsed: now,
      streakFrozen: true,
      freezeSource: "shield",
    };
  }

  return {
    streak: 0,
    dailyChallengeStreak: 0,
    streakFreezes,
    streakShields,
    streakFreezeWeekStart,
    streakFrozen: false,
    freezeSource: null,
  };
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
