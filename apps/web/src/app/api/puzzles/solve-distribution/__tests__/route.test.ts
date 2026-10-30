jest.mock("@/db/mongodb", () => ({ ensureConnection: jest.fn(), getCollection: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { public: jest.fn().mockResolvedValue({ success: true }) },
}));

import { getCollection } from "@/db/mongodb";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { GET } from "../route";

const officialPuzzle = {
  id: "2026-10-27",
  active: true,
  publishedAt: new Date("2026-10-27T00:00:00.000Z"),
  metadata: { source: "apex" },
};

let puzzleFindOne: jest.Mock;
let attemptsAggregate: jest.Mock;
let aggregateToArray: jest.Mock;

function makeRequest(puzzleId = "2026-10-27") {
  return new Request(
    `https://rebuzzle.test/api/puzzles/solve-distribution?puzzleId=${encodeURIComponent(puzzleId)}`
  );
}

function setAggregateCounts(counts: Record<string, number>) {
  aggregateToArray.mockResolvedValue([counts]);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-28T12:00:00.000Z"));
  jest.mocked(rateLimiters.public).mockResolvedValue({ success: true } as never);
  puzzleFindOne = jest.fn().mockResolvedValue(officialPuzzle);
  aggregateToArray = jest.fn().mockResolvedValue([]);
  attemptsAggregate = jest.fn().mockReturnValue({ toArray: aggregateToArray });
  const puzzles = { findOne: puzzleFindOne };
  const attempts = { aggregate: attemptsAggregate };
  jest
    .mocked(getCollection)
    .mockImplementation(((name: string) => (name === "puzzles" ? puzzles : attempts)) as never);
});

afterEach(() => jest.useRealTimers());

it("rejects malformed puzzle IDs before querying the database", async () => {
  const response = await GET(makeRequest("../../users"));

  expect(response.status).toBe(400);
  expect(puzzleFindOne).not.toHaveBeenCalled();
  expect(attemptsAggregate).not.toHaveBeenCalled();
});

it.each([
  ["unknown", null],
  ["unpublished", { ...officialPuzzle, publishedAt: new Date("2026-10-30T00:00:00.000Z") }],
  ["community", { ...officialPuzzle, metadata: { source: "user", communityPlayable: true } }],
])("fails closed for %s puzzles", async (_name, puzzle) => {
  puzzleFindOne.mockResolvedValue(puzzle);

  const response = await GET(makeRequest());

  expect(response.status).toBe(404);
  expect(attemptsAggregate).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("serves a Studio-lottery puzzle promoted to the daily", async () => {
  puzzleFindOne.mockResolvedValue({
    ...officialPuzzle,
    metadata: {
      source: "user",
      communityPlayable: true,
      dailyPublicationKey: "2026-10-27",
      generationMethod: "studio-ugc-lottery",
    },
  });

  const response = await GET(makeRequest());

  expect(response.status).toBe(200);
  expect(attemptsAggregate).toHaveBeenCalled();
});

it("serves a daily that is already live east of UTC before its UTC publication key", async () => {
  // 12:00 UTC Oct 28 is already Oct 29 in Auckland, where that daily is playable.
  puzzleFindOne.mockResolvedValue({
    ...officialPuzzle,
    id: "2026-10-29",
    publishedAt: new Date("2026-10-29T00:00:00.000Z"),
  });

  const response = await GET(makeRequest("2026-10-29"));

  expect(response.status).toBe(200);
  expect(attemptsAggregate).toHaveBeenCalled();
});

it("withholds the distribution when fewer than 20 unique players solved it", async () => {
  setAggregateCounts({ oneGuess: 19, twoGuesses: 0, threeGuesses: 0, fourPlus: 0 });

  const response = await GET(makeRequest());

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    available: false,
    minimumSolves: 20,
    oneGuessPercent: 0,
    twoGuessesPercent: 0,
    threeGuessesPercent: 0,
    fourPlusPercent: 0,
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("deduplicates by server-owned player ID and groups continuations into four plus", async () => {
  setAggregateCounts({ oneGuess: 6, twoGuesses: 6, threeGuesses: 4, fourPlus: 4 });

  const response = await GET(makeRequest());
  const result = await response.json();
  const pipeline = attemptsAggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;

  expect(response.status).toBe(200);
  expect(result).toEqual({
    available: true,
    minimumSolves: 20,
    oneGuessPercent: 30,
    twoGuessesPercent: 30,
    threeGuessesPercent: 20,
    fourPlusPercent: 20,
  });
  expect(pipeline[0]).toMatchObject({
    $match: {
      puzzleId: "2026-10-27",
      isCorrect: true,
      isFinal: true,
      attemptType: { $ne: "finalization" },
    },
  });
  expect(pipeline[1]).toMatchObject({
    $match: { $expr: { $eq: ["$attemptNumber", { $floor: "$attemptNumber" }] } },
  });
  expect(pipeline[2]).toMatchObject({
    $group: { _id: "$userId", attemptNumber: { $min: "$attemptNumber" } },
  });
  expect(pipeline.some((stage) => JSON.stringify(stage).includes("fourPlus"))).toBe(true);
  expect(Object.keys(result).sort()).toEqual([
    "available",
    "fourPlusPercent",
    "minimumSolves",
    "oneGuessPercent",
    "threeGuessesPercent",
    "twoGuessesPercent",
  ]);
});

it("excludes archive replays from the daily mix and the availability threshold", async () => {
  setAggregateCounts({ oneGuess: 20, twoGuesses: 0, threeGuesses: 0, fourPlus: 0 });

  await GET(makeRequest());
  const pipeline = attemptsAggregate.mock.calls[0]?.[0] as Array<{
    $match?: { puzzleDate?: unknown };
  }>;
  const firstMatch = pipeline[0]?.$match;
  const groupIndex = pipeline.findIndex((stage) => "$group" in stage);

  // The filter must apply before per-player grouping so a one-guess replay cannot
  // replace the original daily result or count an archive-only solver.
  expect(groupIndex).toBeGreaterThan(0);
  expect(firstMatch?.puzzleDate).toEqual({ $not: /^archive:/ });
});

it("returns rate limit failures without touching puzzle data", async () => {
  jest.mocked(rateLimiters.public).mockResolvedValue({ success: false } as never);

  const response = await GET(makeRequest());

  expect(response.status).toBe(429);
  expect(puzzleFindOne).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
