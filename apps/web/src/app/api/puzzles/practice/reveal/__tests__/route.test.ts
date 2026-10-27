jest.mock("@/db", () => ({ db: { puzzleOps: { findById: jest.fn() } } }));
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

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { createPracticeRoundToken } from "@/lib/game/practice-round-token";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { POST } from "../route";

function request(body: unknown, withProof = true) {
  return POST(
    new Request("https://example.com/api/puzzles/practice/reveal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(withProof ? { "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" } : {}),
      },
      body: JSON.stringify(body),
    })
  );
}

async function completedRoundToken(puzzleId = "past-puzzle") {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
  return createPracticeRoundToken({ userId: "tester", puzzleId, wrongGuessCount: 3 });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
  jest.clearAllMocks();
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "tester" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("UTC");
  jest.mocked(db.puzzleOps.findById).mockResolvedValue({
    id: "past-puzzle",
    active: true,
    answer: "moonlight",
    explanation: "The moon is shining at night.",
    publishedAt: new Date("2026-10-24T12:00:00.000Z"),
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("returns the solution for an explicit reveal of an eligible published puzzle", async () => {
  const response = await request({
    puzzleId: "past-puzzle",
    roundToken: await completedRoundToken(),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    success: true,
    puzzleId: "past-puzzle",
    answer: "moonlight",
    explanation: "The moon is shining at night.",
  });
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("tester", "UTC");
});

it.each([
  ["today", { id: "today", active: true, answer: "today", publishedAt: new Date("2026-10-25") }],
  ["future", { id: "future", active: true, answer: "future", publishedAt: new Date("2026-10-26") }],
  ["inactive", { id: "old", active: false, answer: "old", publishedAt: new Date("2026-10-24") }],
  ["unpublished", { id: "old", active: true, answer: "old" }],
])("does not reveal %s puzzles", async (_label, candidate) => {
  jest.mocked(db.puzzleOps.findById).mockResolvedValueOnce(candidate as never);

  const response = await request({
    puzzleId: "old",
    roundToken: await completedRoundToken("old"),
    deviceDate: "2099-01-01",
  });

  expect(response.status).toBe(404);
  expect(await response.json()).not.toHaveProperty("answer");
});

it.each([
  ["missing ID", {}],
  ["malformed ID", { puzzleId: "a/b" }],
])("rejects a %s before lookup", async (_label, body) => {
  expect((await request(body)).status).toBe(400);
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it.each([0, 1, 2])(
  "does not reveal before the three-guess round ends (guess count %i)",
  async (wrongGuessCount) => {
    process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
    const incompleteToken = await createPracticeRoundToken({
      userId: "tester",
      puzzleId: "past-puzzle",
      wrongGuessCount,
    });
    const response = await request({ puzzleId: "past-puzzle", roundToken: incompleteToken });

    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).not.toHaveProperty("answer");
    expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  }
);

it("does not accept a caller-supplied attemptNumber of three as proof of a finished round", async () => {
  const response = await request({ puzzleId: "past-puzzle", attemptNumber: 3 });

  expect(response.status).toBe(409);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("requires server-verifiable StoreKit proof before looking up a solution", async () => {
  const response = await request(
    { puzzleId: "past-puzzle", roundToken: await completedRoundToken() },
    false
  );

  expect(response.status).toBe(403);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("requires authentication and never writes progress", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
  expect((await request({ puzzleId: "past-puzzle" })).status).toBe(401);
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();

  const response = await request({
    puzzleId: "past-puzzle",
    roundToken: await completedRoundToken(),
  });
  expect(response.status).toBe(200);
  expect(db).toEqual({ puzzleOps: { findById: expect.any(Function) } });
});
