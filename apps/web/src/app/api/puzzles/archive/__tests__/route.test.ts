jest.mock("@/db", () => ({
  db: { puzzleOps: { findPublishedBefore: jest.fn() } },
}));
jest.mock("@/lib/auth-middleware", () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({ userId: "user-1" }),
}));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/journey-timezone", () => ({
  resolveStableJourneyTimeZone: jest.fn().mockResolvedValue("America/Los_Angeles"),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: jest.fn(() => async () => ({ success: true })),
  getUserKey: (key: string) => key,
}));
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  hasPlusEntitlement: jest.fn(
    async (request: Request) =>
      request.headers.get("X-Rebuzzle-StoreKit-Transaction") === "valid-test-proof"
  ),
}));

import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { GET } from "../route";

const publishedAt = new Date("2026-10-25T12:00:00.000Z");
const puzzle = (id: string) => ({
  id,
  active: true,
  publishedAt,
  puzzle: "MIND over MATTER",
  answer: "mind over matter",
  explanation: "The relationship clue explains the phrase.",
  puzzleType: "rebus",
  difficulty: 7,
  hints: ["Look at the words' positions."],
  visual: {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout: "row",
    layers: [{ kind: "pictogram", svg: "<svg/>", concept: "secret concept", role: "answer" }],
  },
});

function archiveRequest(url: string, withProof = true) {
  return new Request(url, {
    headers: withProof ? { "X-Rebuzzle-StoreKit-Transaction": "valid-test-proof" } : {},
  });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T06:30:00.000Z"));
  jest.mocked(db.puzzleOps.findPublishedBefore).mockResolvedValue([puzzle("older")] as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

it("uses the stable timezone and returns answer-free puzzle presentation data", async () => {
  const response = await GET(archiveRequest("https://rebuzzle.test/api/puzzles/archive?limit=10"));

  expect(response.status).toBe(200);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("user-1", "UTC");
  expect(db.puzzleOps.findPublishedBefore).toHaveBeenCalledWith({
    beforeUtc: new Date("2026-10-26T00:00:00.000Z"),
    limit: 11,
  });
  const body = await response.json();
  expect(body.items).toMatchObject([
    {
      id: "older",
      puzzle: "MIND over MATTER",
      puzzleType: "rebus",
      difficulty: 7,
      hints: ["Look at the words' positions."],
      date: "2026-10-25",
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        layers: [{ kind: "pictogram", svg: "<svg/>" }],
      },
    },
  ]);
  expect(body.nextCursor).toBeNull();
  expect(JSON.stringify(body)).not.toContain("mind over matter");
  expect(JSON.stringify(body)).not.toContain("The relationship clue");
  expect(JSON.stringify(body)).not.toContain("secret concept");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

it("clamps the requested page size and returns a next cursor when another row exists", async () => {
  jest
    .mocked(db.puzzleOps.findPublishedBefore)
    .mockResolvedValue(
      Array.from({ length: 31 }, (_, index) => puzzle(`puzzle-${index}`)) as never
    );

  const response = await GET(archiveRequest("https://rebuzzle.test/api/puzzles/archive?limit=900"));

  expect(db.puzzleOps.findPublishedBefore).toHaveBeenCalledWith({
    beforeUtc: new Date("2026-10-26T00:00:00.000Z"),
    limit: 31,
  });
  const body = await response.json();
  expect(body.items).toHaveLength(30);
  expect(typeof body.nextCursor).toBe("string");
});

it("rejects a malformed cursor", async () => {
  const response = await GET(
    archiveRequest("https://rebuzzle.test/api/puzzles/archive?cursor=not-a-cursor")
  );

  expect(response.status).toBe(400);
  expect(db.puzzleOps.findPublishedBefore).not.toHaveBeenCalled();
});

it("requires an authenticated player and marks the rejection no-store", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);

  const response = await GET(archiveRequest("https://rebuzzle.test/api/puzzles/archive", false));

  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findPublishedBefore).not.toHaveBeenCalled();
});

it("requires server-verifiable StoreKit proof before reading the archive", async () => {
  const response = await GET(archiveRequest("https://rebuzzle.test/api/puzzles/archive", false));

  expect(response.status).toBe(403);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.puzzleOps.findPublishedBefore).not.toHaveBeenCalled();
});
