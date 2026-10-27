jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: { findByUserAndPuzzle: jest.fn() },
    dailyProgressOps: { materializeFromAttempt: jest.fn() },
    userOps: { findById: jest.fn() },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { db } from "@/db";
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
async function get(id = "today") {
  const path = "../route";
  const route = await import(path);
  return route.GET(new Request(`https://example.com/api/puzzle/session?puzzleId=${id}`));
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self" } as never);
  jest.mocked(db.userOps.findById).mockResolvedValue({ id: "self" } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue(puzzle as never);
  jest.mocked(db.puzzleAttemptOps.findByUserAndPuzzle).mockResolvedValue([row] as never);
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
