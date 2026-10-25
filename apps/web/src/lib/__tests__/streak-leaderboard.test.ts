import { describe, expect, it, jest } from "@jest/globals";

const getStreakLeaderboard = jest.fn<(limit: number, skip: number) => Promise<unknown[]>>();
jest.mock("@/db", () => ({ db: { userStatsOps: { getStreakLeaderboard } } }));

import { getStreakLeaderboard as getBoard } from "@/lib/auth";

function row(id: string, streak: number, lastPlayDate: Date) {
  return {
    userId: id,
    streak,
    maxStreak: streak,
    points: 0,
    totalGames: 1,
    wins: 1,
    level: 1,
    dailyChallengeStreak: streak,
    lastPlayDate,
    streakFreezes: 0,
    streakShields: 0,
    streakFreezeWeekStart: new Date(),
    user: { id, username: id, email: `${id}@x.com`, createdAt: new Date() },
  };
}

describe("getStreakLeaderboard", () => {
  it("pages past lapsed streaks to fill the board", async () => {
    const now = Date.now();
    const lapsed = Array.from({ length: 50 }, (_, i) =>
      row(`lapsed${i}`, 100 - i, new Date(now - 20 * 86_400_000))
    );
    const active = [row("active", 3, new Date(now))];
    getStreakLeaderboard.mockImplementation(async (_limit, skip) =>
      skip === 0 ? lapsed : skip === 50 ? active : []
    );

    const board = await getBoard(1);
    expect(board).toHaveLength(1);
    expect(board[0]?.user.username).toBe("active");
    expect(board[0]?.user).not.toHaveProperty("email");
  });
});
