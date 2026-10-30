jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: { getTodayGuessContext: jest.fn(), createAtomicDailyAttempt: jest.fn() },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    dailyProgressBackfillOps: { requestReconciliation: jest.fn() },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "self" }),
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/lib/achievements/service", () => ({
  checkAndAwardAchievements: jest.fn().mockResolvedValue({ newlyUnlocked: [] }),
}));
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn(),
}));
jest.mock("@/ai/services/answer-validation", () => ({ validateAnswer: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: () => async () => ({ success: true }),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: async () => "UTC" }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { updateUserStats } from "@/lib/auth";
import { POST } from "../route";

async function guess(header = true) {
  return POST(
    new Request("https://example.com/api/puzzles/guess", {
      method: "POST",
      headers: header ? { "X-Rebuzzle-Daily-Only": "true" } : {},
      body: JSON.stringify({ puzzleId: "old", guess: "hello" }),
    })
  );
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00Z"));
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue({ id: "today" } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "old",
    answer: "secret",
    publishedAt: new Date("2026-10-24"),
  } as never);
  jest
    .mocked(db.puzzleAttemptOps.getTodayGuessContext)
    .mockResolvedValue({ hasFinal: true } as never);
  jest.mocked(updateUserStats).mockResolvedValue({
    pointsEarned: 0,
    streakFrozen: false,
    streak: 0,
    maxStreak: 0,
    streakFreezes: 0,
    guessDistribution: [],
    recentPlayDates: [],
  } as never);
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it.each(["2026-10-24", "2026-10-26"])(
  "rejects non-daily %s before entering archive or grading",
  async (date) => {
    jest
      .mocked(db.puzzleOps.findById)
      .mockResolvedValue({ id: "old", answer: "secret", publishedAt: new Date(date) } as never);
    const response = await guess();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reloadDaily: true });
    expect(db.puzzleAttemptOps.getTodayGuessContext).not.toHaveBeenCalled();
  }
);
it("keeps archive behavior without the opt-in header", async () => {
  const response = await guess(false);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ isArchive: true, locked: true });
  expect(db.puzzleAttemptOps.getTodayGuessContext).toHaveBeenCalledWith("self", "archive:old");
});
it("allows the current daily through to its normal lock", async () => {
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "today",
    answer: "secret",
    publishedAt: new Date("2026-10-25"),
  } as never);
  expect(await (await guess()).json()).toMatchObject({ isArchive: false, locked: true });
  expect(db.puzzleAttemptOps.getTodayGuessContext).toHaveBeenCalledWith("self", "2026-10-25");
});

it("atomically persists the same safe feedback returned for a nonfinal guess", async () => {
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "today",
    answer: "secret",
    publishedAt: new Date("2026-10-25"),
    hints: [],
    difficulty: 5,
  } as never);
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 0,
    maxHintsUsed: 0,
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.5, method: "test" } as never);
  jest
    .mocked(db.puzzleAttemptOps.createAtomicDailyAttempt)
    .mockResolvedValue({ success: true } as never);
  const response = await guess();
  expect(response.status).toBe(200);
  const body = await response.json();
  const persisted = jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mock.calls[0]![2];
  expect(persisted).toMatchObject({
    similarity: 50,
    reaction: body.reaction,
    wordResults: body.wordResults,
  });
  expect(body.reaction.tier).toBe("warm");
  expect(body.wordResults.map((word: { word: string }) => word.word)).toEqual(["HELLO"]);
  expect(body.answer).toBeUndefined();
});

it("projects a persisted final daily attempt with the stable puzzle zone", async () => {
  const persistedAttempt = {
    userId: "self",
    puzzleId: "today",
    puzzleDate: "2026-10-25",
    puzzleTimeZone: "UTC",
    isCorrect: true,
    isFinal: true,
    attemptNumber: 1,
    attemptedAt: new Date("2026-10-25T12:00:00.000Z"),
  };
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "today",
    answer: "secret",
    publishedAt: new Date("2026-10-25"),
    hints: [],
    difficulty: 5,
  } as never);
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 0,
    maxHintsUsed: 0,
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: true, confidence: 1, method: "test" } as never);
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue({
    success: true,
    attempt: persistedAttempt,
  } as never);

  const response = await guess();

  expect(response.status).toBe(200);
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt.mock.calls[0]![2]).toMatchObject({
    puzzleDate: "2026-10-25",
    puzzleTimeZone: "UTC",
  });
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledWith(persistedAttempt);

  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: true,
    wasSuccessful: true,
  } as never);
  expect((await guess()).status).toBe(409);
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledTimes(1);
});

it("keeps an accepted final answer successful when Journey projection fails", async () => {
  const persistedAttempt = {
    userId: "self",
    puzzleId: "today",
    puzzleDate: "2026-10-25",
    isCorrect: false,
    isFinal: true,
    abandoned: true,
    attemptNumber: 3,
    attemptedAt: new Date("2026-10-25T12:00:00.000Z"),
  };
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "today",
    answer: "secret",
    publishedAt: new Date("2026-10-25"),
    hints: [],
    difficulty: 5,
  } as never);
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: 2,
    maxHintsUsed: 0,
  } as never);
  jest
    .mocked(validateAnswer)
    .mockResolvedValue({ isCorrect: false, confidence: 0.2, method: "test" } as never);
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue({
    success: true,
    attempt: persistedAttempt,
  } as never);
  jest.mocked(db.dailyProgressOps.materializeFromAttempt).mockRejectedValue(new Error("offline"));

  const response = await guess();

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, gameOver: true, correct: false });
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledWith(persistedAttempt);
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});
