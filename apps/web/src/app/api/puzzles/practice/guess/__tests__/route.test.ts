jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn() },
    puzzleAttemptOps: { createAtomicDailyAttempt: jest.fn() },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "tester" }),
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/lib/achievements/service", () => ({
  checkAndAwardAchievements: jest.fn(),
}));
jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: { recordFinalAttemptSignal: jest.fn() },
}));
jest.mock("@/ai/services/answer-validation", () => ({ validateAnswer: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: jest.fn(() => async () => ({ success: true })),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  hasPlusEntitlement: jest.fn(
    async (request: Request) =>
      request.headers.get("X-Rebuzzle-StoreKit-Transaction") === "valid-test-proof"
  ),
}));

import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { checkAndAwardAchievements } from "@/lib/achievements/service";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import {
  createPracticeRoundToken,
  verifyPracticeRoundToken,
} from "@/lib/game/practice-round-token";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { POST } from "../route";

const puzzle = {
  id: "past-puzzle",
  active: true,
  answer: "moonlight",
  explanation: "The moon is shining at night.",
  publishedAt: new Date("2026-10-24T12:00:00.000Z"),
  difficulty: 5,
  hints: ["Look up", "It arrives after sunset"],
};

function request(body: unknown, withProof = true) {
  return new Request("https://example.com/api/puzzles/practice/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(withProof ? { "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function submit(body: unknown, withProof = true) {
  return POST(request(body, withProof));
}

async function roundToken(wrongGuessCount: number) {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
  return createPracticeRoundToken({ userId: "tester", puzzleId: "past-puzzle", wrongGuessCount });
}

beforeEach(() => {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "tester" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("UTC");
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(puzzle as never);
  jest.mocked(validateAnswer).mockResolvedValue({
    isCorrect: false,
    confidence: 0.15,
    method: "test",
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("returns answer-blind feedback for an incorrect guess", async () => {
  const response = await submit({ puzzleId: "past-puzzle", guess: "sunshine", attemptNumber: 1 });

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const body = await response.json();
  expect(body).toMatchObject({
    success: true,
    correct: false,
    attemptNumber: 1,
    attemptsLeft: 2,
    maxAttempts: 3,
    gameOver: false,
  });
  expect(body.answer).toBeUndefined();
  expect(body.explanation).toBeUndefined();
  expect(body.attemptId).toBeUndefined();
  expect(typeof body.roundToken).toBe("string");
  await expect(verifyPracticeRoundToken(body.roundToken, "tester", "past-puzzle")).resolves.toBe(1);
  expect(validateAnswer).toHaveBeenCalledWith({ guess: "sunshine", correctAnswer: "moonlight" });
});

it("returns the solution only when the guess is correct", async () => {
  jest.mocked(validateAnswer).mockResolvedValue({
    isCorrect: true,
    confidence: 1,
    method: "normalized",
  } as never);

  const response = await submit({ puzzleId: "past-puzzle", guess: "moonlight", attemptNumber: 1 });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    correct: true,
    gameOver: true,
    attemptsLeft: 0,
    answer: "moonlight",
    explanation: "The moon is shining at night.",
  });
});

it("keeps close-match feedback answer-blind", async () => {
  jest.mocked(validateAnswer).mockResolvedValue({
    isCorrect: false,
    confidence: 0.72,
    method: "test",
  } as never);

  const body = await (
    await submit({
      puzzleId: "past-puzzle",
      guess: "moon lights",
      attemptNumber: 2,
      roundToken: await roundToken(1),
    })
  ).json();

  expect(body.reaction.tier).toBe("close");
  expect(body.similarity).toBe(72);
  expect(body.answer).toBeUndefined();
  expect(body.explanation).toBeUndefined();
});

it("ends an incorrect third attempt without leaking the solution", async () => {
  const body = await (
    await submit({
      puzzleId: "past-puzzle",
      guess: "nothing close",
      attemptNumber: 3,
      roundToken: await roundToken(2),
      localDate: "2099-01-01",
    })
  ).json();

  expect(body).toMatchObject({ correct: false, attemptNumber: 3, attemptsLeft: 0, gameOver: true });
  expect(body.answer).toBeUndefined();
  expect(body.explanation).toBeUndefined();
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("tester", "UTC");
});

it.each([
  ["missing puzzle ID", { guess: "moonlight", attemptNumber: 1 }],
  ["bad puzzle ID", { puzzleId: "../today", guess: "moonlight", attemptNumber: 1 }],
  ["blank guess", { puzzleId: "past-puzzle", guess: "  ", attemptNumber: 1 }],
  ["overlong guess", { puzzleId: "past-puzzle", guess: "a".repeat(201), attemptNumber: 1 }],
  ["invalid attempt count", { puzzleId: "past-puzzle", guess: "moonlight", attemptNumber: 4 }],
])("rejects %s", async (_label, body) => {
  const response = await submit(body);

  expect(response.status).toBe(400);
  expect(await response.json()).toHaveProperty("success", false);
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  expect(validateAnswer).not.toHaveBeenCalled();
});

it("rejects the current daily, future, inactive, and unpublished puzzles", async () => {
  const ineligible = [
    { ...puzzle, publishedAt: new Date("2026-10-25T00:00:00.000Z") },
    { ...puzzle, publishedAt: new Date("2026-10-26T00:00:00.000Z") },
    { ...puzzle, active: false },
    { ...puzzle, publishedAt: undefined },
  ];

  for (const candidate of ineligible) {
    jest.mocked(db.puzzleOps.findById).mockResolvedValueOnce(candidate as never);
    const response = await submit({
      puzzleId: "past-puzzle",
      guess: "moonlight",
      attemptNumber: 1,
      localDate: "2026-10-01",
    });
    expect(response.status).toBe(404);
  }

  expect(validateAnswer).not.toHaveBeenCalled();
});

it("rejects unauthenticated requests and unknown puzzles", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  expect((await submit({ puzzleId: "past-puzzle", guess: "x", attemptNumber: 1 })).status).toBe(
    401
  );

  jest.mocked(db.puzzleOps.findById).mockResolvedValueOnce(null as never);
  expect((await submit({ puzzleId: "missing", guess: "x", attemptNumber: 1 })).status).toBe(404);
});

it("requires server-verifiable StoreKit proof before checking a practice guess", async () => {
  const response = await submit(
    { puzzleId: "past-puzzle", guess: "moonlight", attemptNumber: 1 },
    false
  );

  expect(response.status).toBe(403);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  expect(validateAnswer).not.toHaveBeenCalled();
});

it("rejects a caller that skips ahead without the previous signed guess", async () => {
  const response = await submit({ puzzleId: "past-puzzle", guess: "sunshine", attemptNumber: 3 });

  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  expect(validateAnswer).not.toHaveBeenCalled();
});

it("does not call daily scoring, progress, or learning writes", async () => {
  await submit({
    puzzleId: "past-puzzle",
    guess: "moonlight",
    attemptNumber: 3,
    roundToken: await roundToken(2),
  });

  expect(db.puzzleAttemptOps.createAtomicDailyAttempt).not.toHaveBeenCalled();
  expect(db.dailyProgressOps.materializeFromAttempt).not.toHaveBeenCalled();
  expect(updateUserStats).not.toHaveBeenCalled();
  expect(checkAndAwardAchievements).not.toHaveBeenCalled();
  expect(nativeGrowthEventOps.recordFinalAttemptSignal).not.toHaveBeenCalled();
});
