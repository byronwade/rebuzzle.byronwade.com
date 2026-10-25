import type { UserStats } from "@/db/models";
import { calculateNewStats } from "@/lib/auth";

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    id: "s1",
    userId: "u1",
    points: 100,
    streak: 5,
    maxStreak: 8,
    totalGames: 10,
    wins: 8,
    level: 1,
    dailyChallengeStreak: 5,
    lastPlayDate: new Date("2026-08-02T12:00:00.000Z"),
    perfectSolves: 1,
    clutchSolves: 1,
    speedSolves: 0,
    totalTimePlayed: 100,
    noHintStreak: 1,
    maxNoHintStreak: 1,
    consecutivePerfect: 0,
    maxConsecutivePerfect: 0,
    weekendSolves: 0,
    easyPuzzlesSolved: 0,
    mediumPuzzlesSolved: 0,
    hardPuzzlesSolved: 0,
    sharedResults: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    streakFreezes: 1,
    streakShields: 0,
    luckySolveCount: 0,
    guessDistribution: [2, 3, 1],
    recentPlayDates: ["2026-08-02"],
    ...overrides,
  };
}

describe("calculateNewStats retention contracts", () => {
  it("keeps the streak on a loss without spending a freeze", () => {
    const { stats, streakFrozen, freezeSource, pointsEarned } = calculateNewStats(
      baseStats(),
      { won: false, attempts: 3, affectsStreak: true },
      new Date("2026-08-03T15:00:00.000Z")
    );
    expect(streakFrozen).toBe(false);
    expect(freezeSource).toBeNull();
    expect(stats.streak).toBe(5);
    expect(stats.streakFreezes).toBe(1);
    expect(pointsEarned).toBe(0);
    expect(stats.guessDistribution).toEqual([2, 3, 1]);
  });

  it("breaks the streak after missed days with no protection", () => {
    const { stats } = calculateNewStats(
      baseStats({ streakFreezes: 0, streakFreezeWeekStart: new Date("2026-08-03T00:00:00.000Z") }),
      { won: true, attempts: 1, affectsStreak: true },
      new Date("2026-08-06T15:00:00.000Z")
    );
    expect(stats.streak).toBe(1);
    expect(stats.maxStreak).toBe(8);
  });

  it("spends a freeze when one day was missed", () => {
    const { stats, streakFrozen } = calculateNewStats(
      baseStats({ streakFreezes: 1, streakFreezeWeekStart: new Date("2026-07-27T00:00:00.000Z") }),
      { won: true, attempts: 1, affectsStreak: true },
      new Date("2026-08-04T15:00:00.000Z")
    );
    expect(streakFrozen).toBe(true);
    expect(stats.streak).toBe(6);
  });

  it("follows the player's calendar day, not UTC", () => {
    // Last play: Aug 2, 8pm in Los Angeles (Aug 3, 03:00 UTC).
    // Next play: Aug 3, 7pm in Los Angeles. Consecutive local days.
    const { stats, streakFrozen } = calculateNewStats(
      baseStats({ lastPlayDate: new Date("2026-08-03T03:00:00.000Z"), streakFreezes: 0 }),
      { won: true, attempts: 1, affectsStreak: true, timeZone: "America/Los_Angeles" },
      new Date("2026-08-04T02:00:00.000Z")
    );
    expect(streakFrozen).toBe(false);
    expect(stats.streak).toBe(6);
  });

  it("does not let an archive play block today's streak day", () => {
    const archive = calculateNewStats(
      null,
      { won: true, attempts: 1, affectsStreak: false },
      new Date("2026-08-03T10:00:00.000Z")
    );
    expect(archive.stats.lastPlayDate).toBeUndefined();
    const daily = calculateNewStats(
      { ...baseStats(), ...archive.stats, lastPlayDate: undefined },
      { won: true, attempts: 1, affectsStreak: true },
      new Date("2026-08-03T11:00:00.000Z")
    );
    expect(daily.stats.streak).toBe(1);
  });

  it("increments streak, distribution, lucky count, and play calendar on win", () => {
    const { stats, streakFrozen, pointsEarned } = calculateNewStats(
      baseStats(),
      {
        won: true,
        attempts: 2,
        timeSpent: 40,
        difficulty: 5,
        maxAttempts: 3,
        affectsStreak: true,
        pointsMultiplier: 2,
        isLucky: true,
        hasDailyBonus: true,
        dailyBonusMultiplier: 1.5,
      },
      new Date("2026-08-03T15:00:00.000Z")
    );
    expect(streakFrozen).toBe(false);
    expect(stats.streak).toBe(6);
    expect(stats.maxStreak).toBe(8);
    expect(stats.guessDistribution).toEqual([2, 4, 1]);
    expect(stats.luckySolveCount).toBe(1);
    expect(stats.lastBonusMultiplier).toBe(1.5);
    expect(stats.recentPlayDates?.[0]).toBe("2026-08-03");
    expect(pointsEarned).toBeGreaterThan(0);
  });

  it("does not break streak on archive losses", () => {
    const { stats, streakFrozen } = calculateNewStats(
      baseStats({ streakFreezes: 0 }),
      { won: false, attempts: 3, affectsStreak: false },
      new Date("2026-08-03T15:00:00.000Z")
    );
    expect(streakFrozen).toBe(false);
    expect(stats.streak).toBe(5);
  });
});
