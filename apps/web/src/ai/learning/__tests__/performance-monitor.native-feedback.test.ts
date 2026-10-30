jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(),
}));

import { getCollection } from "@/db/mongodb";
import { measureWindowPerformance } from "../performance-monitor";

type Rating = "too_easy" | "just_right" | "tough_but_fair" | "unclear";

function cursorFor<T>(rows: T[], fail = false) {
  const cursor = {
    project: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: fail
      ? jest.fn().mockRejectedValue(new Error("database unavailable"))
      : jest.fn().mockResolvedValue(rows),
  };
  return { find: jest.fn().mockReturnValue(cursor), cursor };
}

function healthyBehaviorFinals() {
  return Array.from({ length: 8 }, (_, index) => ({
    puzzleId: `puzzle-${index}`,
    isCorrect: index < 4,
    isFinal: true,
    timeSpentSeconds: index < 4 ? 120 : undefined,
    attemptNumber: index < 4 ? 2 : undefined,
    hintsUsed: 1,
  }));
}

function nativeRating(userId: string, rating: Rating, daysAgo = 0) {
  return {
    userId,
    eventType: "daily_quality_feedback",
    rating,
    occurredAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

function aggregateNativeRatings(ratings: Array<ReturnType<typeof nativeRating>>) {
  const newestByAccount = new Map<string, ReturnType<typeof nativeRating>>();
  for (const entry of [...ratings].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
  )) {
    if (!newestByAccount.has(entry.userId)) newestByAccount.set(entry.userId, entry);
  }

  const counts = new Map<Rating, number>();
  for (const entry of newestByAccount.values()) {
    counts.set(entry.rating, (counts.get(entry.rating) ?? 0) + 1);
  }
  return [...counts].map(([_id, players]) => ({ _id, players }));
}

function webEasyVotes(count: number) {
  return Array.from({ length: count }, () => ({ metrics: { tooEasy: true } }));
}

function configureCollections(input: {
  nativeRatings?: Array<ReturnType<typeof nativeRating>>;
  nativeQueryFails?: boolean;
  webVotes?: Array<{ metrics?: { tooEasy?: boolean; tooHard?: boolean } }>;
}) {
  const attempts = cursorFor(healthyBehaviorFinals());
  const web = cursorFor(input.webVotes ?? []);
  const native = {
    aggregate: jest.fn().mockReturnValue({
      toArray: input.nativeQueryFails
        ? jest.fn().mockRejectedValue(new Error("database unavailable"))
        : jest.fn().mockResolvedValue(aggregateNativeRatings(input.nativeRatings ?? [])),
    }),
  };
  const collections: Record<string, unknown> = {
    puzzleAttempts: attempts,
    aiFeedback: web,
    nativeGrowthEvents: native,
  };

  jest.mocked(getCollection).mockImplementation((name: string) => collections[name] as never);
  return { nativeAggregate: native.aggregate };
}

describe("native daily difficulty calibration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires ten distinct native accounts", async () => {
    configureCollections({
      nativeRatings: Array.from({ length: 9 }, (_, index) =>
        nativeRating(`player-${index}`, "too_easy")
      ),
    });
    const belowThreshold = await measureWindowPerformance({ minFinals: 8 });

    configureCollections({
      nativeRatings: Array.from({ length: 10 }, (_, index) =>
        nativeRating(`player-${index}`, "too_easy")
      ),
    });
    const atThreshold = await measureWindowPerformance({ minFinals: 8 });

    expect(belowThreshold.difficultyDelta).toBe(0);
    expect(atThreshold.difficultyDelta).toBeGreaterThan(0);
  });

  it("uses each account's newest native rating", async () => {
    const { nativeAggregate } = configureCollections({
      nativeRatings: [
        nativeRating("player-1", "too_easy"),
        nativeRating("player-2", "too_easy"),
        nativeRating("player-3", "too_easy"),
        nativeRating("player-4", "too_easy"),
        nativeRating("player-5", "just_right"),
        nativeRating("player-6", "just_right"),
        nativeRating("player-7", "just_right"),
        nativeRating("player-8", "tough_but_fair"),
        nativeRating("player-9", "tough_but_fair"),
        nativeRating("player-10", "tough_but_fair"),
        nativeRating("player-10", "too_easy", 1),
      ],
    });

    const result = await measureWindowPerformance({ minFinals: 8 });

    expect(result.difficultyDelta).toBe(0);
    expect(result.notes.join(" ")).toMatch(/tough but fair/i);
    expect(result.notes.join(" ")).not.toMatch(/player-/);

    const pipeline = nativeAggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline[1]).toEqual({ $sort: { occurredAt: -1 } });
    expect(pipeline[2]).toEqual({
      $group: { _id: "$userId", rating: { $first: "$rating" } },
    });
    expect(pipeline[3]).toEqual({ $group: { _id: "$rating", players: { $sum: 1 } } });
  });

  it("keeps web votes when native feedback is unavailable", async () => {
    configureCollections({ nativeQueryFails: true, webVotes: webEasyVotes(5) });

    const result = await measureWindowPerformance({ minFinals: 8 });

    expect(result.difficultyDelta).toBeGreaterThan(0);
  });
});
