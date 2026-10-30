jest.mock("@/db", () => ({
  db: { puzzleOps: { findOldestPublishedBefore: jest.fn() } },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "user-1" }),
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("America/Los_Angeles"),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: jest.fn(() => async () => ({ success: true, limit: 20, remaining: 19 })),
  getUserKey: (key: string) => key,
}));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { GET } from "../route";

const samplePuzzle = {
  id: "oldest-sample",
  active: true,
  publishedAt: new Date("2025-02-03T12:00:00.000Z"),
  puzzle: "MIND over MATTER",
  answer: "mind over matter",
  explanation: "MIND is positioned over MATTER.",
  reasoningEvidence: { answer: "mind over matter" },
  puzzleType: "rebus",
  difficulty: 7,
  hints: ["Look at the words' positions."],
  visual: {
    mode: "composed",
    layout: "row",
    layers: [{ kind: "text", text: "MIND", answer: "private" }],
  },
};

function sampleRequest() {
  return new Request("https://rebuzzle.test/api/puzzles/practice/sample");
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T06:30:00.000Z"));
  jest.mocked(db.puzzleOps.findOldestPublishedBefore).mockResolvedValue(samplePuzzle as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

it("returns only the stable answer-free sample without requiring Plus proof", async () => {
  const response = await GET(sampleRequest());

  expect(response.status).toBe(200);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("user-1", "UTC");
  expect(db.puzzleOps.findOldestPublishedBefore).toHaveBeenCalledWith(
    new Date("2026-10-26T00:00:00.000Z")
  );
  const body = await response.json();
  expect(body).toMatchObject({
    id: "oldest-sample",
    puzzle: "MIND over MATTER",
    puzzleType: "rebus",
    difficulty: 7,
    date: "2025-02-03",
    hints: ["Look at the words' positions."],
  });
  expect(JSON.stringify(body)).not.toContain("mind over matter");
  expect(JSON.stringify(body)).not.toContain("MIND is positioned");
  expect(JSON.stringify(body)).not.toContain("private");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("returns no sample when no past archive puzzle exists", async () => {
  jest.mocked(db.puzzleOps.findOldestPublishedBefore).mockResolvedValue(null);

  const response = await GET(sampleRequest());

  expect(response.status).toBe(404);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("requires an authenticated Rebuzzle player", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);

  const response = await GET(sampleRequest());

  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findOldestPublishedBefore).not.toHaveBeenCalled();
});

it("rate-limits sample requests before querying the puzzle", async () => {
  jest.mocked(rateLimit).mockImplementationOnce(() => async () => ({
    success: false,
    limit: 20,
    remaining: 0,
    retryAfter: 45,
  }));

  const response = await GET(sampleRequest());

  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findOldestPublishedBefore).not.toHaveBeenCalled();
});
