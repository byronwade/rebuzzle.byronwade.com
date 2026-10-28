jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: {
      findByUserAndPuzzle: jest.fn(),
      findExpiredExtendedDailyRuns: jest.fn().mockResolvedValue([]),
      findExpiredExtendedDailyRun: jest.fn().mockResolvedValue(null),
      createAtomicDailyAttempt: jest.fn(),
    },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    dailyProgressBackfillOps: { requestReconciliation: jest.fn() },
    userOps: { findById: jest.fn() },
  },
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/db/analytics-ops", () => ({ nativeGrowthEventOps: { recordOnce: jest.fn() } }));
jest.mock("next/server", () => ({ ...jest.requireActual("next/server"), after: jest.fn() }));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

const puzzle = {
  id: "today",
  answer: "secret",
  explanation: "solution",
  publishedAt: new Date("2026-10-25"),
  hints: ["one"],
};
const row = {
  userId: "self",
  puzzleId: "today",
  puzzleDate: "2026-10-25",
  attemptedAnswer: "try",
  isCorrect: false,
  attemptNumber: 1,
  hintsUsed: 1,
  attemptedAt: new Date("2026-10-25"),
};
async function get(id = "today", dailyOnly = false) {
  const path = "../route";
  const route = await import(path);
  return route.GET(
    new Request(`https://example.com/api/puzzle/session?puzzleId=${id}`, {
      headers: dailyOnly ? { "X-Rebuzzle-Daily-Only": "true" } : {},
    })
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self" } as never);
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "self" } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([row] as never);
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
afterEach(() => jest.useRealTimers());
it("restores guesses without revealing an active solution", async () => {
  const response = await get();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  const body = await response.json();
  expect(body.attempts).toEqual([{ guess: "try", correct: false, attemptNumber: 1 }]);
  expect(body.hintsUsed).toBe(1);
  expect(body.gameOver).toBe(false);
  expect(body.answer).toBeUndefined();
  expect(db.puzzleAttemptOps.findByUserAndPuzzle).toHaveBeenCalledWith("self", "today");
});
it("records a server-owned start when restoring the current official daily", async () => {
  const response = await get();

  expect(response.status).toBe(200);
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "self",
    eventType: "daily_session_restored",
    dayKey: "2026-10-25",
    occurredAt: new Date("2026-10-25T12:00:00.000Z"),
  });
});
it("keeps a daily session available when recording its start fails", async () => {
  jest
    .mocked(nativeGrowthEventOps.recordOnce)
    .mockRejectedValueOnce(new Error("analytics offline"));

  const response = await get();

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, puzzleId: "today" });
});
it("restores an extended score-locked run without treating it as terminal", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue(
    [1, 2, 3].map((attemptNumber) => ({
      ...row,
      attemptedAnswer: `idea ${attemptNumber}`,
      attemptNumber,
      playMode: "extended",
      isScoredAttempt: true,
      maxAttempts: 3,
      isFinal: false,
    })) as never
  );

  const body = await (await get()).json();

  expect(body).toMatchObject({
    phase: "score_locked",
    scoreLocked: true,
    gameOver: false,
    attemptsLeft: 0,
  });
  expect(body.answer).toBeUndefined();
  expect(body.explanation).toBeUndefined();
  expect(body.attempts).toHaveLength(3);
});
it("restores continuation attempts as open and keeps finalization rows out of visible history", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue(
    [1, 2, 3, 4, 5]
      .map((attemptNumber) => ({
        ...row,
        attemptedAnswer: `idea ${attemptNumber}`,
        attemptNumber,
        playMode: "extended",
        isScoredAttempt: attemptNumber <= 3,
        maxAttempts: 3,
        isFinal: false,
      }))
      .concat({
        ...row,
        attemptType: "finalization",
        finalizationReason: "revealed",
        attemptedAnswer: "",
        attemptNumber: 6,
        playMode: "extended",
        isFinal: true,
        abandoned: true,
      }) as never
  );

  const body = await (await get()).json();

  expect(body).toMatchObject({ phase: "revealed", scoreLocked: true, gameOver: true });
  expect(body.attempts).toHaveLength(5);
});
it("expires a prior score-locked daily once and offers its answer without blocking today", async () => {
  const priorAttempts = [1, 2, 3].map((attemptNumber) => ({
    ...row,
    puzzleId: "yesterday",
    puzzleDate: "2026-10-24",
    attemptedAt: new Date(`2026-10-24T12:0${attemptNumber}:00.000Z`),
    attemptNumber,
    playMode: "extended",
    isScoredAttempt: true,
    maxAttempts: 3,
    isFinal: false,
  }));
  const finalization = {
    ...row,
    puzzleId: "yesterday",
    puzzleDate: "2026-10-24",
    attemptedAnswer: "",
    attemptNumber: 4,
    playMode: "extended",
    attemptType: "finalization",
    finalizationReason: "expired",
    isFinal: true,
    abandoned: true,
  };
  const oldPuzzle = {
    ...puzzle,
    id: "yesterday",
    answer: "old secret",
    explanation: "Yesterday's explanation.",
    publishedAt: new Date("2026-10-24T00:00:00.000Z"),
  };
  jest
    .mocked(db.puzzleOps.findById)
    .mockImplementation(async (id: string) => (id === "yesterday" ? oldPuzzle : puzzle) as never);
  jest
    .mocked(db.puzzleAttemptOps.findExpiredExtendedDailyRuns)
    .mockResolvedValue([
      { puzzleId: "yesterday", puzzleDate: "2026-10-24", attempts: priorAttempts },
    ] as never);
  jest.mocked(db.puzzleAttemptOps.createAtomicDailyAttempt).mockResolvedValue({
    success: true,
    attempt: finalization,
  } as never);
  jest
    .mocked(db.puzzleAttemptOps.findExpiredExtendedDailyRun)
    .mockResolvedValue(finalization as never);

  const response = await get("today", true);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ puzzleId: "today", gameOver: false });
  expect(body.expiredReview).toMatchObject({
    puzzleId: "yesterday",
    puzzleDate: "2026-10-24",
    answer: "old secret",
    explanation: "Yesterday's explanation.",
  });
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).toHaveBeenCalledWith(
    "self",
    new Date("2026-10-24T00:00:00.000Z"),
    expect.objectContaining({
      attemptType: "finalization",
      finalizationReason: "expired",
      isFinal: true,
    })
  );
  expect(updateUserStats).toHaveBeenCalledWith(
    "self",
    expect.objectContaining({ won: false, affectsStreak: true }),
    new Date("2026-10-24T12:03:00.000Z"),
    "extended-daily-finalization:yesterday:2026-10-24"
  );
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: "daily_finished", outcome: "ran_out" })
  );
});
it("retries stats for a persisted expired finalization through its idempotent event key", async () => {
  const priorAttempts = [1, 2, 3].map((attemptNumber) => ({
    ...row,
    puzzleId: "yesterday",
    puzzleDate: "2026-10-24",
    attemptedAt: new Date(`2026-10-24T12:0${attemptNumber}:00.000Z`),
    attemptNumber,
    playMode: "extended",
    isScoredAttempt: true,
    maxAttempts: 3,
    isFinal: false,
  }));
  const expiredFinal = {
    ...row,
    puzzleId: "yesterday",
    puzzleDate: "2026-10-24",
    attemptedAnswer: "",
    attemptNumber: 4,
    playMode: "extended",
    attemptType: "finalization",
    finalizationReason: "expired",
    isFinal: true,
    abandoned: true,
  };
  jest
    .mocked(db.puzzleOps.findById)
    .mockImplementation(
      async (id: string) => (id === "yesterday" ? { ...puzzle, id: "yesterday" } : puzzle) as never
    );
  jest.mocked(db.puzzleAttemptOps.findExpiredExtendedDailyRuns).mockResolvedValue([
    {
      puzzleId: "yesterday",
      puzzleDate: "2026-10-24",
      attempts: [...priorAttempts, expiredFinal],
    },
  ] as never);

  const response = await get("today", true);

  expect(response.status).toBe(200);
  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).not.toHaveBeenCalled();
  expect(updateUserStats).toHaveBeenCalledWith(
    "self",
    expect.objectContaining({ won: false, affectsStreak: true }),
    priorAttempts[2]!.attemptedAt,
    "extended-daily-finalization:yesterday:2026-10-24"
  );
});
it("reveals the solution after a persisted final", async () => {
  const terminal = { ...row, isFinal: true, isCorrect: true };
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([terminal] as never);
  expect(await (await get()).json()).toMatchObject({
    answer: "secret",
    gameOver: true,
    wasSuccessful: true,
    attemptsLeft: 0,
  });
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledWith(terminal);
});
it("requests reconciliation when restoring a final attempt cannot repair progress", async () => {
  const terminal = { ...row, isFinal: true, isCorrect: true };
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([terminal] as never);
  jest.mocked(db.dailyProgressOps.materializeFromAttempt).mockRejectedValue(new Error("offline"));

  const response = await get();

  expect(response.status).toBe(200);
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});
it("does not use another owner, puzzle, or lock to disclose the answer", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([
    { ...row, userId: "other", isFinal: true },
    { ...row, puzzleId: "other", isFinal: true },
    { ...row, puzzleDate: "archive:today", isFinal: true },
  ] as never);
  expect(await (await get()).json()).toMatchObject({ attempts: [], gameOver: false });
});
it("denies future puzzles", async () => {
  jest
    .mocked(db.puzzleOps.findById)
    .mockResolvedValue({ ...puzzle, publishedAt: new Date("2026-10-26") } as never);
  expect((await get()).status).toBe(403);
});
it("rejects unauthenticated requests", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);
  expect((await get()).status).toBe(401);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalledWith(
    expect.objectContaining({ eventType: "daily_session_restored" })
  );
});
it("rejects missing IDs", async () => {
  expect((await get("")).status).toBe(400);
});
it("keeps archive replays separate from their original daily result", async () => {
  jest
    .mocked(db.puzzleOps.findById)
    .mockResolvedValue({ ...puzzle, publishedAt: new Date("2026-10-24") } as never);
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue({ id: "new" } as never);
  jest
    .mocked(db.puzzleAttemptOps.findByUserAndPuzzle)
    .mockResolvedValue([{ ...row, puzzleDate: "2026-10-24", isFinal: true }] as never);
  expect(await (await get()).json()).toMatchObject({
    gameOver: false,
    attempts: [],
    puzzleDate: "2026-10-24",
  });
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalledWith(
    expect.objectContaining({ eventType: "daily_session_restored" })
  );
  expect(db.dailyProgressOps.materializeFromAttempt).not.toHaveBeenCalled();
});

it.each(["2026-10-24", "2026-10-26"])(
  "daily-only restore rejects %s rather than switching scope",
  async (date) => {
    jest
      .mocked(db.puzzleOps.findById)
      .mockResolvedValue({ ...puzzle, publishedAt: new Date(date) } as never);
    const { GET } = await import("../route");
    const response = await GET(
      new Request("https://example.com/api/puzzle/session?puzzleId=today", {
        headers: { "X-Rebuzzle-Daily-Only": "true" },
      })
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reloadDaily: true });
    expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "daily_session_restored" })
    );
  }
);

it("restores persisted feedback without exposing unguessed words", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([
    {
      ...row,
      similarity: 75,
      reaction: { tier: "close", line: "You're circling it. One word off, maybe less." },
      wordResults: [{ word: "TRY", correct: false, similarity: 25 }],
    },
  ] as never);
  const body = await (await get()).json();
  expect(body.attempts[0]).toMatchObject({
    similarity: 75,
    reaction: { tier: "close", line: "You're circling it. One word off, maybe less." },
    wordResults: [{ word: "TRY", correct: false, similarity: 25 }],
  });
  expect(body.answer).toBeUndefined();
});
it("omits malformed legacy feedback and unsubmitted answer tokens", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([
    {
      ...row,
      similarity: 150,
      reaction: { tier: "close", line: "secret" },
      wordResults: [{ word: "SECRET", correct: true, similarity: 100 }],
    },
  ] as never);
  const body = await (await get()).json();
  expect(body.attempts).toEqual([{ guess: "try", correct: false, attemptNumber: 1 }]);
  expect(JSON.stringify(body)).not.toContain("secret");
});

it("does not restore arbitrary reaction text even with a valid score", async () => {
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([
    {
      ...row,
      similarity: 75,
      reaction: { tier: "close", line: "secret" },
      wordResults: [{ word: "TRY", correct: false, similarity: 25, answer: "secret" }],
    },
  ] as never);
  const body = await (await get()).json();
  expect(body.attempts[0].similarity).toBe(75);
  expect(body.attempts[0].reaction).toBeUndefined();
  expect(body.attempts[0].wordResults).toEqual([{ word: "TRY", correct: false, similarity: 25 }]);
  expect(JSON.stringify(body)).not.toContain("secret");
});
