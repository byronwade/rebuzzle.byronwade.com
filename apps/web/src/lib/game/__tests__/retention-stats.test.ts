import { engagementConfig } from "@rebuzzle/config";
import {
  applyStreakProtection,
  bumpGuessDistribution,
  composePointsMultiplier,
  getStreakGap,
  recordRecentPlayDate,
  resolveCurrentStreak,
  rollEngagementMultipliers,
  utcDateKey,
} from "../retention-stats";

describe("retention-stats", () => {
  describe("applyStreakProtection", () => {
    const thisWeek = new Date("2026-08-03T00:00:00.000Z"); // Monday
    const now = new Date("2026-08-05T12:00:00.000Z");

    it("keeps the streak on a loss without spending protection", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 7,
        currentDailyStreak: 7,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 0,
        isNewDay: true,
        now,
      });
      expect(result.streakFrozen).toBe(false);
      expect(result.streak).toBe(7);
      expect(result.streakFreezes).toBe(1);
    });

    it("adds a day on a win the day after the last play", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 3,
        currentDailyStreak: 3,
        streakFreezes: 1,
        streakShields: 1,
        streakFreezeWeekStart: thisWeek,
        missedDays: 0,
        isNewDay: true,
        now,
      });
      expect(result.streakFrozen).toBe(false);
      expect(result.streakFreezes).toBe(1);
      expect(result.streak).toBe(4);
    });

    it("does not add a second day for a same-day win", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 3,
        currentDailyStreak: 3,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 0,
        isNewDay: false,
        now,
      });
      expect(result.streak).toBe(3);
    });

    it("spends a freeze to cover one missed day", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 7,
        currentDailyStreak: 7,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 1,
        isNewDay: true,
        now,
      });
      expect(result.streakFrozen).toBe(true);
      expect(result.freezeSource).toBe("freeze");
      expect(result.streakFreezes).toBe(0);
      expect(result.streak).toBe(8);
      expect(result.lastFreezeUsed).toEqual(now);
    });

    it("falls back to shields when freezes run out", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 4,
        currentDailyStreak: 4,
        streakFreezes: 1,
        streakShields: 2,
        streakFreezeWeekStart: thisWeek,
        missedDays: 2,
        isNewDay: true,
        now,
      });
      expect(result.streakFrozen).toBe(true);
      expect(result.freezeSource).toBe("shield");
      expect(result.streakFreezes).toBe(0);
      expect(result.streakShields).toBe(1);
      expect(result.streak).toBe(4);
    });

    it("breaks the streak when missed days outnumber protection", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 5,
        currentDailyStreak: 5,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 2,
        isNewDay: true,
        now,
      });
      expect(result.streakFrozen).toBe(false);
      expect(result.streak).toBe(1);
      expect(result.dailyChallengeStreak).toBe(1);
      // Protection that couldn't save the streak is kept for later.
      expect(result.streakFreezes).toBe(1);
    });

    it("drops to zero when a loss follows a broken streak", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 5,
        currentDailyStreak: 5,
        streakFreezes: 0,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 3,
        isNewDay: true,
        now,
      });
      expect(result.streak).toBe(0);
    });

    it("leaves streak untouched for archive plays", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: false,
        currentStreak: 9,
        currentDailyStreak: 9,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: thisWeek,
        missedDays: 4,
        now,
      });
      expect(result.streak).toBe(9);
      expect(result.streakFrozen).toBe(false);
      expect(result.streakFreezes).toBe(1);
    });

    it("grants weekly freezes across Monday UTC boundary", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 1,
        currentDailyStreak: 1,
        streakFreezes: 0,
        streakShields: 0,
        streakFreezeWeekStart: new Date("2026-07-20T00:00:00.000Z"), // prior Monday
        now: new Date("2026-08-03T12:00:00.000Z"),
      });
      expect(result.streakFreezes).toBe(engagementConfig.streakFreezesPerWeek);
    });

    it("uses the weekly grant to cover a miss in a new week", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 6,
        currentDailyStreak: 6,
        streakFreezes: 0,
        streakShields: 0,
        streakFreezeWeekStart: new Date("2026-07-27T00:00:00.000Z"),
        missedDays: 1,
        isNewDay: true,
        now: new Date("2026-08-04T12:00:00.000Z"),
      });
      expect(result.streak).toBe(7);
      expect(result.streakFreezes).toBe(engagementConfig.streakFreezesPerWeek - 1);
    });
  });

  describe("getStreakGap", () => {
    it("treats a first play as a new day", () => {
      expect(getStreakGap(null, "2026-08-05")).toEqual({ missedDays: 0, isNewDay: true });
    });

    it("counts skipped calendar days", () => {
      expect(getStreakGap("2026-08-04", "2026-08-05")).toEqual({ missedDays: 0, isNewDay: true });
      expect(getStreakGap("2026-08-02", "2026-08-05")).toEqual({ missedDays: 2, isNewDay: true });
      expect(getStreakGap("2026-07-31", "2026-08-01")).toEqual({ missedDays: 0, isNewDay: true });
    });

    it("treats same day and backwards clocks as not new", () => {
      expect(getStreakGap("2026-08-05", "2026-08-05")).toEqual({ missedDays: 0, isNewDay: false });
      expect(getStreakGap("2026-08-06", "2026-08-05")).toEqual({ missedDays: 0, isNewDay: false });
    });
  });

  describe("resolveCurrentStreak", () => {
    const now = new Date("2026-08-05T12:00:00.000Z"); // Wednesday
    const thisWeek = new Date("2026-08-03T00:00:00.000Z");

    it("keeps a streak played yesterday or today", () => {
      const stats = {
        streak: 5,
        lastPlayDate: new Date("2026-08-04T20:00:00.000Z"),
        streakFreezes: 0,
        streakFreezeWeekStart: thisWeek,
      };
      expect(resolveCurrentStreak(stats, "2026-08-05", utcDateKey, now)).toBe(5);
    });

    it("keeps a streak a freeze can still cover", () => {
      const stats = {
        streak: 5,
        lastPlayDate: new Date("2026-08-03T20:00:00.000Z"),
        streakFreezes: 1,
        streakFreezeWeekStart: thisWeek,
      };
      expect(resolveCurrentStreak(stats, "2026-08-05", utcDateKey, now)).toBe(5);
    });

    it("shows a lapsed streak as zero", () => {
      const stats = {
        streak: 12,
        lastPlayDate: new Date("2026-07-20T20:00:00.000Z"),
        streakFreezes: 1,
        streakFreezeWeekStart: thisWeek,
      };
      expect(resolveCurrentStreak(stats, "2026-08-05", utcDateKey, now)).toBe(0);
    });
  });

  describe("guess distribution + play calendar", () => {
    it("bumps the correct attempt slot on win only", () => {
      expect(bumpGuessDistribution([1, 2, 3], 2, true)).toEqual([1, 3, 3]);
      expect(bumpGuessDistribution([1, 2, 3], 2, false)).toEqual([1, 2, 3]);
      expect(bumpGuessDistribution(undefined, 1, true)).toEqual([1, 0, 0]);
    });

    it("records unique recent UTC play dates newest-first", () => {
      const day = new Date("2026-08-03T15:00:00.000Z");
      const dates = recordRecentPlayDate(["2026-08-02", "2026-08-01"], day);
      expect(dates[0]).toBe(utcDateKey(day));
      expect(dates).toContain("2026-08-02");
      expect(recordRecentPlayDate(["2026-08-02"], day, false)).toEqual(["2026-08-02"]);
    });
  });

  describe("engagement multipliers", () => {
    it("composes lucky × daily on wins", () => {
      const roll = {
        isLucky: true,
        luckyMultiplier: 2,
        hasDailyBonus: true,
        dailyBonusMultiplier: 1.5,
        engagementMultiplier: 3,
      };
      expect(composePointsMultiplier(1, roll, true)).toBe(3);
      expect(composePointsMultiplier(0.5, roll, true)).toBe(1.5);
      expect(composePointsMultiplier(1, roll, false)).toBe(1);
    });

    it("rolls deterministically for daily bonus with fixed random", () => {
      const neverLucky = rollEngagementMultipliers(
        new Date("2026-08-03T00:00:00.000Z"),
        () => 0.99
      );
      expect(neverLucky.isLucky).toBe(false);
      const alwaysLucky = rollEngagementMultipliers(new Date("2026-08-03T00:00:00.000Z"), () => 0);
      expect(alwaysLucky.isLucky).toBe(true);
      expect(alwaysLucky.luckyMultiplier).toBe(engagementConfig.luckySolveMultiplier);
    });
  });
});
