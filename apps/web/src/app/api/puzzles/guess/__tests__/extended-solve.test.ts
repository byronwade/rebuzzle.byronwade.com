jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: { getTodayGuessContext: jest.fn(), createAtomicDailyAttempt: jest.fn() },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    dailyProgressBackfillOps: { requestReconciliation: jest.fn() },
  },
}));
jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: { recordOnce: jest.fn() },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "self" }),
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/lib/achievements/service", () => ({
  checkAndAwardAchievements: jest.fn().mockResolvedValue({ newlyUnlocked: [] }),
}));
jest.mock("next/server", () => ({ ...jest.requireActual("next/server"), after: jest.fn() }));
jest.mock("@/ai/services/answer-validation", () => ({ validateAnswer: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: () => async () => ({ success: true }),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: async () => "UTC" }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { after } from "next/server";
import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { updateUserStats } from "@/lib/auth";
import { POST } from "../route";

const todayPuzzle = {
  id: "today",
  answer: "secret",
  explanation: "The answer follows from the picture.",
  publishedAt: new Date("2026-10-27T00:00:00.000Z"),
  hints: ["A first hint"],
  difficulty: 5,
};

async function guess(input: Record<string, unknown>) {
  return POST(
    new Request("https://example.com/api/puzzles/guess", {
      method: "POST",
      headers: { "X-Rebuzzle-Daily-Only": "true" },
      body: JSON.stringify({ puzzleId: "today", guess: "another idea", ...input }),
    })
  );
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T12:00:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue(todayPuzzle as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(todayPuzzle as never);
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue({
    success: true,
    attempt: {
      userId: "self",
      puzzleId: "today",
      puzzleDate: "2026-10-27",
      isCorrect: false,
      isFinal: false,
      attemptNumber: 3,
      attemptedAt: new Date("2026-10-27T12:00:00.000Z"),
    },
  } as never);
  jest.mocked(updateUserStats).mockResolvedValue({
    pointsEarned: 100,
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

it("records a daily start from the first successfully accepted guess", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 0,
    maxHintsUsed: 0,
    firstGuessAt: null,
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.2, method: "test" } as never);

  const response = await guess({});
  const scheduled = jest.mocked(after).mock.calls[0]?.[0];

  expect(response.status).toBe(200);
  expect(scheduled).toEqual(expect.any(Function));
  await scheduled?.();
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "self",
    eventType: "daily_started",
    dayKey: "2026-10-27",
    occurredAt: expect.any(Date),
  });
});

it("does not record another daily start after the first accepted guess", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 1,
    maxHintsUsed: 0,
    firstGuessAt: new Date("2026-10-27T11:00:00.000Z"),
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.2, method: "test" } as never);

  const response = await guess({});

  expect(response.status).toBe(200);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});

it("locks the score after three misses without finalizing or revealing the answer", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 2,
    maxHintsUsed: 0,
    firstGuessAt: new Date("2026-10-27T11:00:00.000Z"),
    playMode: "extended",
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.2, method: "test" } as never);

  const response = await guess({ playMode: "extended" });
  const body = await response.json();
  const saved = jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mock.calls[0]?.[2];

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ success: true, phase: "score_locked", scoreLocked: true });
  expect(body).toMatchObject({ gameOver: false, attemptsLeft: 0, correct: false });
  expect(body.answer).toBeUndefined();
  expect(body.explanation).toBeUndefined();
  expect(saved).toMatchObject({
    attemptNumber: 3,
    playMode: "extended",
    isScoredAttempt: true,
    isFinal: false,
    abandoned: false,
  });
  expect(updateUserStats).not.toHaveBeenCalled();
  expect(db.dailyProgressOps.materializeFromAttempt).not.toHaveBeenCalled();
});

it("accepts an unscored fourth guess for an extended run", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 3,
    maxHintsUsed: 1,
    firstGuessAt: new Date("2026-10-27T11:00:00.000Z"),
    playMode: "extended",
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.3, method: "test" } as never);

  const response = await guess({ playMode: "extended" });
  const body = await response.json();
  const saved = jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mock.calls[0]?.[2];

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ success: true, phase: "continuing", scoreLocked: true });
  expect(body).toMatchObject({ gameOver: false, attemptsLeft: 0, attemptNumber: 4 });
  expect(body.answer).toBeUndefined();
  expect(saved).toMatchObject({
    attemptNumber: 4,
    playMode: "extended",
    isScoredAttempt: false,
    isFinal: false,
    abandoned: false,
  });
  expect(updateUserStats).not.toHaveBeenCalled();
  expect(db.dailyProgressOps.materializeFromAttempt).not.toHaveBeenCalled();
});

it("records a continued solve as a daily win with performance points locked", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 3,
    maxHintsUsed: 1,
    firstGuessAt: new Date("2026-10-27T11:00:00.000Z"),
    playMode: "extended",
  } as never);
  jest.mocked(validateAnswer).mockResolvedValue({
    isCorrect: true,
    confidence: 1,
    method: "test",
  } as never);
  jest
    .mocked(db.puzzleAttemptOps.createAtomicDailyAttempt)
    .mockImplementation(
      async (_userId, _todayStart, attempt) => ({ success: true, attempt }) as never
    );
  jest.mocked(updateUserStats).mockResolvedValue({
    pointsEarned: 0,
    streakFrozen: false,
    streak: 1,
    maxStreak: 1,
    streakFreezes: 0,
    guessDistribution: [],
    recentPlayDates: [],
  } as never);

  const response = await guess({ playMode: "extended" });
  const body = await response.json();
  const saved = jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mock.calls[0]?.[2];

  expect(response.status).toBe(200);
  expect(body).toMatchObject({
    success: true,
    phase: "solved",
    scoreLocked: true,
    gameOver: true,
    correct: true,
    pointsEarned: 0,
    answer: "secret",
  });
  expect(saved).toMatchObject({
    attemptNumber: 4,
    isCorrect: true,
    isFinal: true,
    playMode: "extended",
    isScoredAttempt: false,
  });
  expect(updateUserStats).toHaveBeenCalledWith(
    "self",
    expect.objectContaining({
      won: true,
      attempts: 4,
      pointsMultiplier: 0,
      affectsStreak: true,
    })
  );
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledWith(saved);
});

it("keeps the legacy three-miss run terminal when play mode is omitted", async () => {
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 2,
    maxHintsUsed: 0,
    firstGuessAt: new Date("2026-10-27T11:00:00.000Z"),
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.2, method: "test" } as never);

  const response = await guess({});
  const body = await response.json();
  const saved = jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mock.calls[0]?.[2];

  expect(body).toMatchObject({ success: true, gameOver: true, correct: false, answer: "secret" });
  expect(saved).toMatchObject({ attemptNumber: 3, isFinal: true, abandoned: true });
  expect(saved?.playMode).toBeUndefined();
  expect(updateUserStats).toHaveBeenCalledWith(
    "self",
    expect.objectContaining({ won: false, attempts: 3 })
  );
});
