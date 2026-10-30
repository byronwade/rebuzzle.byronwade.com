const mockAfterCallbacks: Array<() => Promise<unknown>> = [];

jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: { getTodayGuessContext: jest.fn(), createAtomicDailyAttempt: jest.fn() },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    dailyProgressBackfillOps: { requestReconciliation: jest.fn() },
    userOps: { findById: jest.fn() },
  },
}));
jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: { recordOnce: jest.fn() },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "self" }),
}));
jest.mock("@/lib/auth", () => ({
  updateUserStats: jest.fn().mockResolvedValue({
    pointsEarned: 10,
    streakFrozen: false,
    streak: 1,
    maxStreak: 1,
    streakFreezes: 0,
    guessDistribution: [1],
    recentPlayDates: ["2026-10-25"],
  }),
}));
jest.mock("@/lib/achievements/service", () => ({
  checkAndAwardAchievements: jest.fn().mockResolvedValue({ newlyUnlocked: [] }),
}));
jest.mock("@/ai/learning", () => ({ recordFinalAttemptSignal: jest.fn() }));
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn((callback: () => Promise<unknown>) => mockAfterCallbacks.push(callback)),
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

import { gameSettings } from "@rebuzzle/config";
import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { POST } from "../route";

const acceptedAttempt = {
  userId: "self",
  puzzleDate: "2026-10-25",
  isFinal: true,
  isCorrect: true,
  attemptNumber: 1,
  hintsUsed: 0,
};

async function guess(
  options: {
    publishedAt?: Date;
    guessCount?: number;
    isCorrect?: boolean;
    writeSuccess?: boolean;
    writeReason?: string;
    dailyOnly?: boolean;
  } = {}
) {
  const puzzle = {
    id: options.publishedAt && options.publishedAt.getUTCDate() !== 25 ? "archive" : "today",
    answer: "secret answer",
    explanation: "the explanation",
    publishedAt: options.publishedAt ?? new Date("2026-10-25T00:00:00.000Z"),
    hints: [],
    difficulty: 5,
  };
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue({ id: "today" } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleAttemptOps.getTodayGuessContext).mockResolvedValue({
    hasFinal: false,
    guessCount: options.guessCount ?? 0,
    maxHintsUsed: 0,
  } as never);
  jest.mocked(validateAnswer).mockResolvedValue({
    isCorrect: options.isCorrect ?? true,
    confidence: options.isCorrect === false ? 0.2 : 1,
    method: "test",
  } as never);
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue(
    options.writeSuccess === false
      ? ({
          success: false,
          reason: options.writeReason ?? "already-final",
          attempt: acceptedAttempt,
        } as never)
      : ({
          success: true,
          attempt: { ...acceptedAttempt, isCorrect: options.isCorrect ?? true },
        } as never)
  );

  return POST(
    new Request("https://example.com/api/puzzles/guess", {
      method: "POST",
      headers: options.dailyOnly === false ? {} : { "X-Rebuzzle-Daily-Only": "true" },
      body: JSON.stringify({ puzzleId: puzzle.id, guess: "secret answer" }),
    })
  );
}

beforeEach(() => {
  mockAfterCallbacks.length = 0;
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  jest.mocked(db.dailyProgressOps.materializeFromAttempt).mockResolvedValue(null as never);
  jest.mocked(db.dailyProgressBackfillOps.requestReconciliation).mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

it.each([
  [true, "solved"],
  [false, "ran_out"],
] as const)("recordsDailyFinishAfterAcceptedTerminalAttempt (%s)", async (isCorrect, outcome) => {
  const response = await guess({
    isCorrect,
    guessCount: isCorrect ? 0 : gameSettings.maxAttempts - 1,
  });

  expect(response.status).toBe(200);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
  expect(mockAfterCallbacks).toHaveLength(isCorrect ? 2 : 1);
  await Promise.all(mockAfterCallbacks.map((callback) => callback()));

  if (isCorrect) {
    expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
      userId: "self",
      eventType: "daily_started",
      dayKey: "2026-10-25",
      occurredAt: expect.any(Date),
    });
  } else {
    expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "daily_started" })
    );
  }
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "self",
    eventType: "daily_finished",
    dayKey: "2026-10-25",
    occurredAt: new Date("2026-10-25T12:00:00.000Z"),
    outcome,
  });
  expect(JSON.stringify(jest.mocked(nativeGrowthEventOps.recordOnce).mock.calls)).not.toContain(
    "secret answer"
  );
  expect(JSON.stringify(jest.mocked(nativeGrowthEventOps.recordOnce).mock.calls)).not.toContain(
    "puzzleId"
  );
});

it("doesNotRecordArchiveEventsOrFinishNonterminalAttempts", async () => {
  await guess({ publishedAt: new Date("2026-10-24T00:00:00.000Z"), dailyOnly: false });
  await mockAfterCallbacks[0]!();
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();

  mockAfterCallbacks.length = 0;
  await guess({ isCorrect: false, guessCount: 0 });
  expect(mockAfterCallbacks).toHaveLength(1);
  await mockAfterCallbacks[0]!();
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledTimes(1);
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "self",
    eventType: "daily_started",
    dayKey: "2026-10-25",
    occurredAt: expect.any(Date),
  });
});

it("doesNotRecordWhenAttemptWriteFailsOrDuplicates", async () => {
  const duplicate = await guess({ writeSuccess: false, writeReason: "duplicate-attempt" });
  expect(duplicate.status).toBe(429);
  expect(mockAfterCallbacks).toHaveLength(0);

  const locked = await guess({ writeSuccess: false });
  expect(locked.status).toBe(409);
  expect(mockAfterCallbacks).toHaveLength(0);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});
