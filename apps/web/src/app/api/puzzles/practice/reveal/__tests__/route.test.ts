const mockActivePracticeRoundTokens = new Set<string>();

jest.mock("@/db", () => ({
  db: {
    puzzleOps: { findById: jest.fn(), findOldestPublishedBefore: jest.fn() },
    practiceRoundOps: {
      activateToken: jest.fn(async ({ token }: { token: string }) => {
        mockActivePracticeRoundTokens.add(token);
      }),
      isTokenActive: jest.fn(async ({ token }: { token: string }) =>
        mockActivePracticeRoundTokens.has(token)
      ),
      advanceToken: jest.fn(async ({ token }: { token: string }) => {
        if (!mockActivePracticeRoundTokens.has(token)) return false;
        mockActivePracticeRoundTokens.delete(token);
        return true;
      }),
    },
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
  const token = await createPracticeRoundToken({ userId: "tester", puzzleId, wrongGuessCount: 3 });
  mockActivePracticeRoundTokens.add(token);
  return token;
}

beforeEach(() => {
  mockActivePracticeRoundTokens.clear();
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
  jest.mocked(db.puzzleOps.findOldestPublishedBefore).mockResolvedValue({
    id: "free-sample",
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
  expect(db.puzzleOps.findOldestPublishedBefore).not.toHaveBeenCalled();
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("tester", "UTC");
});

it("allows one explicit reveal of the free sample after its third wrong guess", async () => {
  const roundToken = await completedRoundToken("free-sample");
  const body = { puzzleId: "free-sample", roundToken };

  const response = await request(body, false);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    puzzleId: "free-sample",
    answer: "moonlight",
    explanation: "The moon is shining at night.",
  });
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
  expect(db.practiceRoundOps.advanceToken).toHaveBeenCalledTimes(1);

  const replay = await request(body, false);
  expect(replay.status).toBe(409);
  expect(await replay.json()).not.toHaveProperty("answer");
});

it("keeps explicit reveal for every non-sample puzzle behind Plus", async () => {
  const response = await request(
    { puzzleId: "past-puzzle", roundToken: await completedRoundToken("past-puzzle") },
    false
  );

  expect(response.status).toBe(403);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("does not reveal the free sample without an accepted three-guess token", async () => {
  const response = await request({ puzzleId: "free-sample" }, false);

  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it("does not reveal the free sample with an expired completed-round token", async () => {
  const roundToken = await completedRoundToken("free-sample");
  jest.advanceTimersByTime(25 * 60 * 60 * 1000);

  const response = await request({ puzzleId: "free-sample", roundToken }, false);

  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
});

it.each([
  ["another player", "other-player", "free-sample"],
  ["another puzzle", "tester", "past-puzzle"],
])("does not reveal the free sample with a token bound to %s", async (_label, userId, puzzleId) => {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
  const roundToken = await createPracticeRoundToken({ userId, puzzleId, wrongGuessCount: 3 });
  mockActivePracticeRoundTokens.add(roundToken);

  const response = await request({ puzzleId: "free-sample", roundToken }, false);

  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("answer");
  expect(db.puzzleOps.findById).not.toHaveBeenCalled();
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

it("does not reveal with a signed but superseded round token", async () => {
  process.env.AUTH_SECRET = "test-only-practice-round-secret-with-sufficient-entropy";
  const staleToken = await createPracticeRoundToken({
    userId: "tester",
    puzzleId: "past-puzzle",
    wrongGuessCount: 3,
  });

  const response = await request({ puzzleId: "past-puzzle", roundToken: staleToken });

  expect(response.status).toBe(409);
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
  expect(db).toEqual({
    puzzleOps: {
      findById: expect.any(Function),
      findOldestPublishedBefore: expect.any(Function),
    },
    practiceRoundOps: {
      activateToken: expect.any(Function),
      isTokenActive: expect.any(Function),
      advanceToken: expect.any(Function),
    },
  });
});
