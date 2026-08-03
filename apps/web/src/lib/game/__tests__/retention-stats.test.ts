import { engagementConfig } from "@rebuzzle/config";
import {
  applyStreakProtection,
  bumpGuessDistribution,
  composePointsMultiplier,
  recordRecentPlayDate,
  rollEngagementMultipliers,
  utcDateKey,
} from "../retention-stats";

describe("retention-stats", () => {
  describe("applyStreakProtection", () => {
    it("consumes a freeze on loss and keeps the streak", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 7,
        currentDailyStreak: 7,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: new Date(),
        now: new Date(),
      });
      expect(result.streakFrozen).toBe(true);
      expect(result.freezeSource).toBe("freeze");
      expect(result.streak).toBe(7);
      expect(result.streakFreezes).toBe(0);
      expect(result.dailyChallengeStreak).toBe(7);
    });

    it("falls back to a shield when freezes are empty", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 4,
        currentDailyStreak: 4,
        streakFreezes: 0,
        streakShields: 2,
        streakFreezeWeekStart: new Date(),
      });
      expect(result.streakFrozen).toBe(true);
      expect(result.freezeSource).toBe("shield");
      expect(result.streakShields).toBe(1);
      expect(result.streak).toBe(4);
    });

    it("resets streak when no protection remains", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: true,
        currentStreak: 5,
        currentDailyStreak: 5,
        streakFreezes: 0,
        streakShields: 0,
        streakFreezeWeekStart: new Date(),
      });
      expect(result.streakFrozen).toBe(false);
      expect(result.streak).toBe(0);
      expect(result.dailyChallengeStreak).toBe(0);
    });

    it("does not consume protection on wins", () => {
      const result = applyStreakProtection({
        won: true,
        affectsStreak: true,
        currentStreak: 3,
        currentDailyStreak: 3,
        streakFreezes: 1,
        streakShields: 1,
        streakFreezeWeekStart: new Date(),
      });
      expect(result.streakFrozen).toBe(false);
      expect(result.streakFreezes).toBe(1);
      expect(result.streak).toBe(3);
    });

    it("leaves streak untouched for archive plays", () => {
      const result = applyStreakProtection({
        won: false,
        affectsStreak: false,
        currentStreak: 9,
        currentDailyStreak: 9,
        streakFreezes: 1,
        streakShields: 0,
        streakFreezeWeekStart: new Date(),
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
