jest.mock("@/db", () => ({
  db: {
    userStatsOps: {
      findByUserId: jest.fn(),
      updateStats: jest.fn(),
      updateStatsOnce: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { db } from "@/db";
import { updateUserStats } from "@/lib/auth";

const stats = {
  id: "stats-1",
  userId: "user-1",
  points: 10,
  streak: 4,
  maxStreak: 6,
  totalGames: 3,
  wins: 2,
  level: 1,
  dailyChallengeStreak: 4,
  lastPlayDate: new Date("2026-10-23T12:00:00.000Z"),
  perfectSolves: 0,
  clutchSolves: 0,
  speedSolves: 0,
  totalTimePlayed: 100,
  noHintStreak: 0,
  maxNoHintStreak: 0,
  consecutivePerfect: 0,
  maxConsecutivePerfect: 0,
  weekendSolves: 0,
  easyPuzzlesSolved: 0,
  mediumPuzzlesSolved: 0,
  hardPuzzlesSolved: 0,
  sharedResults: 0,
  createdAt: new Date("2026-10-20T00:00:00.000Z"),
  updatedAt: new Date("2026-10-23T12:00:00.000Z"),
  streakFreezes: 0,
  streakShields: 0,
  luckySolveCount: 0,
};

beforeEach(() => jest.clearAllMocks());

it("retries a finalized loss only once when the atomic event marker already exists", async () => {
  jest
    .mocked(db.userStatsOps.findByUserId)
    .mockResolvedValueOnce(stats as never)
    .mockResolvedValueOnce({
      ...stats,
      appliedStatsEventIds: ["extended-daily-finalization:puzzle-1:2026-10-24"],
      totalGames: 4,
    } as never);
  jest.mocked(db.userStatsOps.updateStatsOnce).mockResolvedValue(false);

  const result = await updateUserStats(
    "user-1",
    { won: false, attempts: 3, affectsStreak: true, timeZone: "UTC" },
    new Date("2026-10-24T12:03:00.000Z"),
    "extended-daily-finalization:puzzle-1:2026-10-24"
  );

  expect(result).toMatchObject({ ok: true, streak: 4, maxStreak: 6 });
  expect(db.userStatsOps.updateStatsOnce).toHaveBeenCalledTimes(1);
  expect(db.userStatsOps.updateStats).not.toHaveBeenCalled();
});

it("applies a retried older loss without moving lastPlayDate backward or touching the streak", async () => {
  // The player already finished a newer daily on Oct 26 before the Oct 24 loss retry.
  const newer = { ...stats, lastPlayDate: new Date("2026-10-26T12:00:00.000Z") };
  jest.mocked(db.userStatsOps.findByUserId).mockResolvedValueOnce(newer as never);
  jest.mocked(db.userStatsOps.updateStatsOnce).mockResolvedValue(true);

  const result = await updateUserStats(
    "user-1",
    { won: false, attempts: 3, affectsStreak: true, timeZone: "UTC" },
    new Date("2026-10-24T12:03:00.000Z"),
    "extended-daily-finalization:puzzle-1:2026-10-24"
  );

  const patch = jest.mocked(db.userStatsOps.updateStatsOnce).mock.calls[0]?.[2] as Record<
    string,
    unknown
  >;
  expect(patch.lastPlayDate).toEqual(newer.lastPlayDate);
  expect(patch.streak).toBe(4);
  expect(patch.totalGames).toBe(4);
  expect(result).toMatchObject({ ok: true, streak: 4, streakFrozen: false });
});
