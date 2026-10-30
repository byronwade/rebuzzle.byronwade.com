jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: {
      getTodayGuessContext: jest.fn(),
      findByUserAndPuzzle: jest.fn(),
      createAtomicDailyAttempt: jest.fn(),
    },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    dailyProgressBackfillOps: { requestReconciliation: jest.fn() },
  },
}));
jest.mock("@/db/analytics-ops", () => ({ nativeGrowthEventOps: { recordOnce: jest.fn() } }));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "self" }),
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: () => async () => ({ success: true }),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: async () => "UTC" }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { POST } from "../route";

const puzzle = {
  id: "today",
  answer: "secret",
  explanation: "The clues add up to the answer.",
  publishedAt: new Date("2026-10-27T00:00:00.000Z"),
  hints: ["First hint"],
  difficulty: 5,
};
const guesses = [1, 2, 3].map((attemptNumber) => ({
  userId: "self",
  puzzleId: "today",
  puzzleDate: "2026-10-27",
  attemptedAnswer: `idea ${attemptNumber}`,
  isCorrect: false,
  attemptedAt: new Date(`2026-10-27T12:0${attemptNumber}:00.000Z`),
  attemptNumber,
  maxAttempts: 3,
  playMode: "extended" as const,
  isScoredAttempt: true,
  hintsUsed: 1,
  timeSpentSeconds: 1800,
}));

async function reveal(puzzleId = "today") {
  return POST(
    new Request("https://example.com/api/puzzles/reveal", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
  );
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T12:30:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self" } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 3,
    maxHintsUsed: 1,
    firstGuessAt: guesses[0]!.attemptedAt,
    playMode: "extended",
  } as never);
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue(guesses as never);
  jest
    .mocked(db.puzzleAttemptOps.createAtomicDailyAttempt)
    .mockImplementation(
      async (_userId, _todayStart, attempt) => ({ success: true, attempt }) as never
    );
  jest.mocked(updateUserStats).mockResolvedValue({
    ok: true,
    pointsEarned: 0,
    streakFrozen: false,
    streak: 0,
    maxStreak: 0,
    streakFreezes: 0,
    guessDistribution: [],
    recentPlayDates: [],
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("reveals only after the scored round and finalizes the daily as a loss once", async () => {
  const response = await reveal();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(body).toMatchObject({
    success: true,
    phase: "revealed",
    scoreLocked: true,
    gameOver: true,
    correct: false,
    answer: "secret",
    explanation: "The clues add up to the answer.",
  });
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).toHaveBeenCalledWith(
    "self",
    new Date("2026-10-27T00:00:00.000Z"),
    expect.objectContaining({
      attemptType: "finalization",
      finalizationReason: "revealed",
      isFinal: true,
      isCorrect: false,
      playMode: "extended",
    })
  );
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledTimes(1);
  expect(updateUserStats).toHaveBeenCalledWith(
    "self",
    expect.objectContaining({ won: false, pointsMultiplier: 0, affectsStreak: true }),
    guesses[2]!.attemptedAt,
    "extended-daily-finalization:today:2026-10-27"
  );
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: "daily_finished", outcome: "ran_out" })
  );
});

it("does not reveal a puzzle before its three scored guesses are used", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 2,
    maxHintsUsed: 0,
    firstGuessAt: guesses[0]!.attemptedAt,
  } as never);

  const response = await reveal();

  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).not.toHaveBeenCalled();
});

it("returns an existing terminal result without applying loss stats a second time", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([
    ...guesses,
    {
      userId: "self",
      puzzleId: "today",
      puzzleDate: "2026-10-27",
      attemptedAnswer: "",
      isCorrect: false,
      isFinal: true,
      abandoned: true,
      attemptType: "finalization",
      finalizationReason: "revealed",
      attemptNumber: 4,
      attemptedAt: new Date("2026-10-27T12:30:00.000Z"),
    },
  ] as never);

  const body = await (await reveal()).json();

  expect(body).toMatchObject({ success: true, phase: "revealed", answer: "secret" });
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).not.toHaveBeenCalled();
  expect(updateUserStats).not.toHaveBeenCalled();
  expect(db.dailyProgressOps.materializeFromAttempt).not.toHaveBeenCalled();
});

it("returns a concurrent continuation win when it wins the final attempt slot", async () => {
  const solvedGuess = {
    ...guesses[2],
    attemptedAnswer: "secret",
    isCorrect: true,
    isFinal: true,
    abandoned: false,
    attemptType: "guess",
    attemptNumber: 4,
  };
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue({
    success: false,
    attempt: solvedGuess as never,
    reason: "locked",
  } as never);

  const response = await reveal();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({
    success: true,
    phase: "solved",
    scoreLocked: true,
    gameOver: true,
    correct: true,
    wasSuccessful: true,
    answer: "secret",
  });
  expect(body.attempts).toHaveLength(4);
  expect(body.attempts[3]).toMatchObject({ guess: "secret", correct: true, attemptNumber: 4 });
  expect(updateUserStats).not.toHaveBeenCalled();
});
