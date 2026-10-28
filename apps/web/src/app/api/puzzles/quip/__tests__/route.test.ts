jest.mock("@/ai/client", () => ({ streamAIText: jest.fn() }));
jest.mock("@/db", () => ({
  db: {
    puzzleAttemptOps: { hasTodayAttempt: jest.fn() },
    puzzleOps: { findById: jest.fn(), findOldestPublishedBefore: jest.fn() },
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
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  hasPlusEntitlement: jest.fn(
    async (request: Request) =>
      request.headers.get("X-Rebuzzle-StoreKit-Transaction") === "valid-test-proof"
  ),
}));

import { streamAIText } from "@/ai/client";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { POST } from "../route";

const pastPuzzle = {
  id: "past-puzzle",
  active: true,
  puzzleType: "rebus",
  answer: "moonlight",
  explanation: "The moon is shining at night.",
  publishedAt: new Date("2026-10-24T12:00:00.000Z"),
};
const freeSamplePuzzle = { ...pastPuzzle, id: "free-sample" };

function request(body: unknown, withProof = true) {
  return POST(
    new Request("https://example.com/api/puzzles/quip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(withProof ? { "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" } : {}),
      },
      body: JSON.stringify(body),
    })
  );
}

const baseBody = { puzzleId: "past-puzzle", guess: "sunshine", tier: "warm" };

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "tester" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("UTC");
  jest
    .mocked(db.puzzleAttemptOps.hasTodayAttempt)
    .mockResolvedValue({ hasAttempt: false } as never);
  jest.mocked(db.puzzleOps.findById).mockResolvedValue(pastPuzzle as never);
  jest.mocked(db.puzzleOps.findOldestPublishedBefore).mockResolvedValue(freeSamplePuzzle as never);
  jest.mocked(streamAIText).mockResolvedValue({
    toTextStreamResponse: () => new Response("Eve is thinking."),
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("keeps the completed-daily guard when mode is omitted", async () => {
  jest
    .mocked(db.puzzleAttemptOps.hasTodayAttempt)
    .mockResolvedValueOnce({ hasAttempt: true } as never);

  const response = await request(baseBody);

  expect(response.status).toBe(409);
  expect(streamAIText).not.toHaveBeenCalled();
});

it("still allows the final daily reaction after completion", async () => {
  jest
    .mocked(db.puzzleAttemptOps.hasTodayAttempt)
    .mockResolvedValueOnce({ hasAttempt: true } as never);

  expect((await request({ ...baseBody, tier: "correct" })).status).toBe(200);
  expect(streamAIText).toHaveBeenCalledTimes(1);
});

it("allows practice Eve feedback after today's daily is complete", async () => {
  jest
    .mocked(db.puzzleAttemptOps.hasTodayAttempt)
    .mockResolvedValueOnce({ hasAttempt: true } as never);

  const response = await request({ ...baseBody, mode: "practice", deviceDate: "2099-01-01" });

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleAttemptOps.hasTodayAttempt).not.toHaveBeenCalled();
  expect(db.puzzleOps.findOldestPublishedBefore).not.toHaveBeenCalled();
  expect(streamAIText).toHaveBeenCalledTimes(1);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("tester", "UTC");
});

it("allows answer-blind Eve feedback for the exact free sample without Plus proof", async () => {
  const response = await request({ ...baseBody, puzzleId: "free-sample", mode: "practice" }, false);

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamAIText).toHaveBeenCalledTimes(1);
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  const payload = jest.mocked(streamAIText).mock.calls[0]![0];
  expect(`${payload.system}\n${payload.prompt}`).not.toContain("moonlight");
});

it("keeps practice Eve feedback for every non-sample puzzle behind Plus", async () => {
  const response = await request({ ...baseBody, mode: "practice" }, false);

  expect(response.status).toBe(403);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamAIText).not.toHaveBeenCalled();
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("requires server-verifiable StoreKit proof for practice Eve feedback", async () => {
  const response = await request({ ...baseBody, mode: "practice" }, false);

  expect(response.status).toBe(403);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamAIText).not.toHaveBeenCalled();
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("rejects current, future, inactive, and unpublished puzzles in practice mode", async () => {
  const ineligible = [
    { ...pastPuzzle, publishedAt: new Date("2026-10-25T00:00:00.000Z") },
    { ...pastPuzzle, publishedAt: new Date("2026-10-26T00:00:00.000Z") },
    { ...pastPuzzle, active: false },
    { ...pastPuzzle, publishedAt: undefined },
  ];

  for (const puzzle of ineligible) {
    jest.mocked(db.puzzleOps.findById).mockResolvedValueOnce(puzzle as never);
    expect((await request({ ...baseBody, mode: "practice" })).status).toBe(404);
  }

  expect(streamAIText).not.toHaveBeenCalled();
});

it("keeps the model prompt answer-blind for practice", async () => {
  await request({ ...baseBody, mode: "practice" });

  const payload = jest.mocked(streamAIText).mock.calls[0]![0];
  const prompt = `${payload.system}\n${payload.prompt}`;
  expect(prompt).toContain('Their guess: "sunshine".');
  expect(prompt).not.toContain("moonlight");
  expect(prompt).not.toContain("shining at night");
});

it("requires authentication and rejects invalid mode or tier", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  const unauthenticated = await request({ ...baseBody, mode: "practice" });
  expect(unauthenticated.status).toBe(401);
  expect(unauthenticated.headers.get("Cache-Control")).toBe("private, no-store");

  const invalidMode = await request({ ...baseBody, mode: "future" });
  expect(invalidMode.status).toBe(400);
  expect(invalidMode.headers.get("Cache-Control")).toBe("private, no-store");
  const invalidTier = await request({ ...baseBody, tier: "invented" });
  expect(invalidTier.status).toBe(400);
  expect(invalidTier.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamAIText).not.toHaveBeenCalled();
});

it("keeps rate limits in practice mode", async () => {
  jest.mocked(rateLimit).mockReturnValueOnce((async () => ({ success: false })) as never);

  const response = await request({ ...baseBody, mode: "practice" });
  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamAIText).not.toHaveBeenCalled();
});
