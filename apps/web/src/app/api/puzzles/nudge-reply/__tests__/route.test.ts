jest.mock("@/ai/client", () => ({ generateAIText: jest.fn() }));
jest.mock("@/db", () => ({
  db: {
    puzzleAttemptOps: { hasTodayAttempt: jest.fn() },
    puzzleOps: { findByDate: jest.fn() },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "tester" }),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: jest.fn(() => async () => ({ success: true })),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("UTC"),
}));

import { generateAIText } from "@/ai/client";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { POST } from "../route";

const currentPuzzle = {
  id: "today-puzzle",
  active: true,
  puzzleType: "wordplay",
  answer: "lighthouse",
  explanation: "A light and a house combine.",
  hints: ["Read the words from left to right.", "Notice the spacing.", "Hidden future hint."],
  visual: { unicodeFallback: "LIGHT + HOUSE" },
};

function request(body: unknown) {
  return POST(
    new Request("https://example.com/api/puzzles/nudge-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const baseBody = { puzzleId: "today-puzzle", hintIndex: 1 };

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "tester" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("UTC");
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValue(currentPuzzle as never);
  jest.mocked(db.puzzleAttemptOps.hasTodayAttempt).mockResolvedValue({ hasAttempt: false } as never);
  jest.mocked(generateAIText).mockResolvedValue({ text: "Notice how the pieces are spaced." } as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("returns a private Eve reply grounded only in the selected hint and puzzle type", async () => {
  const response = await request(baseBody);

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ success: true, reply: "Notice how the pieces are spaced." });
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("tester", "UTC");
  expect(db.puzzleOps.findByDate).toHaveBeenCalledWith("2026-10-25");

  const input = jest.mocked(generateAIText).mock.calls[0]![0];
  const modelInput = `${input.system}\n${input.prompt}`;
  expect(modelInput).toContain("wordplay");
  expect(modelInput).toContain("Notice the spacing.");
  expect(modelInput).not.toContain("lighthouse");
  expect(modelInput).not.toContain("A light and a house combine.");
  expect(modelInput).not.toContain("LIGHT + HOUSE");
  expect(modelInput).not.toContain("Hidden future hint.");
});

it("requires authentication", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);

  const response = await request(baseBody);

  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(generateAIText).not.toHaveBeenCalled();
});

it("rejects malformed puzzle IDs and hint indexes", async () => {
  expect((await request({ puzzleId: "", hintIndex: 0 })).status).toBe(400);
  expect((await request({ puzzleId: "today-puzzle", hintIndex: -1 })).status).toBe(400);
  expect((await request({ puzzleId: "today-puzzle", hintIndex: 3 })).status).toBe(400);
  expect(generateAIText).not.toHaveBeenCalled();
});

it("rejects a current puzzle with no authored hints", async () => {
  jest.mocked(db.puzzleOps.findByDate).mockResolvedValueOnce({ ...currentPuzzle, hints: undefined } as never);

  const response = await request(baseBody);

  expect(response.status).toBe(400);
  expect(generateAIText).not.toHaveBeenCalled();
});

it("rejects a puzzle that is not today's daily puzzle", async () => {
  const response = await request({ ...baseBody, puzzleId: "past-puzzle" });

  expect(response.status).toBe(404);
  expect(generateAIText).not.toHaveBeenCalled();
});

it("does not answer new questions after the daily round is finalized", async () => {
  jest
    .mocked(db.puzzleAttemptOps.hasTodayAttempt)
    .mockResolvedValueOnce({ hasAttempt: true, wasSuccessful: true } as never);

  const response = await request(baseBody);

  expect(response.status).toBe(409);
  expect(generateAIText).not.toHaveBeenCalled();
});

it("allows a score-locked continuation because the daily round is not finalized", async () => {
  const response = await request(baseBody);

  expect(response.status).toBe(200);
  expect(db.puzzleAttemptOps.hasTodayAttempt).toHaveBeenCalledWith("tester", "2026-10-25");
  expect(generateAIText).toHaveBeenCalledTimes(1);
});

it("respects the per-account rate limit", async () => {
  jest.mocked(rateLimit).mockReturnValueOnce((async () => ({ success: false })) as never);

  const response = await request(baseBody);

  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(generateAIText).not.toHaveBeenCalled();
});

it("uses the fixed safe reply when generation directly reveals the answer", async () => {
  jest.mocked(generateAIText).mockResolvedValueOnce({ text: "The light house is the focus." } as never);

  const response = await request(baseBody);

  expect(await response.json()).toEqual({
    success: true,
    reply: "Take another look at the nudge and notice which detail it points you toward.",
  });
});
