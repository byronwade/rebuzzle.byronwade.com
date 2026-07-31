import type { PuzzleAttempt, User, UserStats } from "@/db/models";
import { checkAchievementCriteria, type GameContext } from "@/lib/achievements/service";

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    username: "solver",
    email: "solver@example.com",
    passwordHash: "",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    id: "stats-1",
    userId: "user-1",
    points: 100,
    streak: 1,
    maxStreak: 1,
    totalGames: 1,
    wins: 1,
    level: 1,
    dailyChallengeStreak: 1,
    perfectSolves: 0,
    clutchSolves: 0,
    speedSolves: 0,
    totalTimePlayed: 0,
    noHintStreak: 0,
    maxNoHintStreak: 0,
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
    ...overrides,
  };
}

function baseContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    puzzleId: "puzzle-1",
    attempts: 1,
    maxAttempts: 3,
    timeTaken: 20,
    hintsUsed: 0,
    difficulty: "medium",
    isCorrect: true,
    score: 120,
    ...overrides,
  };
}

describe("achievement criteria", () => {
  it("does not double-count perfect solves already in stats", async () => {
    const ok = await checkAchievementCriteria(
      { type: "perfect_solves", count: 1 },
      baseUser(),
      baseStats({ perfectSolves: 1 }),
      [],
      baseContext({ attempts: 1 }),
      0
    );
    expect(ok).toBe(true);

    const early = await checkAchievementCriteria(
      { type: "perfect_solves", count: 2 },
      baseUser(),
      baseStats({ perfectSolves: 1 }),
      [],
      baseContext({ attempts: 1 }),
      0
    );
    expect(early).toBe(false);
  });

  it("awards clutch solves only from stats (maxAttempts aligned)", async () => {
    const ok = await checkAchievementCriteria(
      { type: "clutch_solves", count: 1 },
      baseUser(),
      baseStats({ clutchSolves: 1 }),
      [],
      baseContext({ attempts: 3, maxAttempts: 3 }),
      0
    );
    expect(ok).toBe(true);
  });

  it("uses wins for daily_challenges (not totalGames losses)", async () => {
    const unlocked = await checkAchievementCriteria(
      { type: "daily_challenges", count: 10 },
      baseUser(),
      baseStats({ wins: 10, totalGames: 50 }),
      [],
      baseContext(),
      0
    );
    expect(unlocked).toBe(true);

    const blocked = await checkAchievementCriteria(
      { type: "daily_challenges", count: 10 },
      baseUser(),
      baseStats({ wins: 3, totalGames: 50 }),
      [],
      baseContext(),
      0
    );
    expect(blocked).toBe(false);
  });

  it("unlocks share_result when sharedResults >= 1", async () => {
    const ok = await checkAchievementCriteria(
      { type: "share_result" },
      baseUser(),
      baseStats({ sharedResults: 1 }),
      [],
      baseContext(),
      0
    );
    expect(ok).toBe(true);
  });

  it("allows meta collector badges as the Nth unlock", async () => {
    const at74 = await checkAchievementCriteria(
      { type: "custom", check: "achievements_unlocked_75" },
      baseUser(),
      baseStats(),
      [],
      baseContext(),
      74
    );
    expect(at74).toBe(true);

    const at99 = await checkAchievementCriteria(
      { type: "custom", check: "achievements_unlocked_100" },
      baseUser(),
      baseStats(),
      [],
      baseContext(),
      99
    );
    expect(at99).toBe(true);

    const at98 = await checkAchievementCriteria(
      { type: "custom", check: "achievements_unlocked_100" },
      baseUser(),
      baseStats(),
      [],
      baseContext(),
      98
    );
    expect(at98).toBe(false);
  });

  it("counts difficulty tiers for categories_completed", async () => {
    const ok = await checkAchievementCriteria(
      { type: "categories_completed", count: 2 },
      baseUser(),
      baseStats({ easyPuzzlesSolved: 1, hardPuzzlesSolved: 2 }),
      [] as PuzzleAttempt[],
      baseContext(),
      0
    );
    expect(ok).toBe(true);
  });
});
