jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findByDate: jest.fn() },
    puzzleAttemptOps: { getTodayGuessContext: jest.fn() },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "self" }),
}));
jest.mock("@/lib/auth", () => ({ updateUserStats: jest.fn() }));
jest.mock("@/ai/services/answer-validation", () => ({ validateAnswer: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: () => async () => ({ success: true }),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: async () => "UTC" }));

import { db } from "@/db";
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
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());
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
