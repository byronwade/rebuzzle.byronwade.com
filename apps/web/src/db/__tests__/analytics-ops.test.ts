jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

import { nativeGrowthEventOps } from "../analytics-ops";
import { getCollection } from "../mongodb";

const mockGetCollection = jest.mocked(getCollection);

function setupQualityCollections(
  attempts: Array<Record<string, unknown>> = [],
  ratings: Array<Record<string, unknown>> = [],
  solveTimes: Array<Record<string, unknown>> = []
) {
  const attemptsAggregate = jest.fn().mockReturnValue({ toArray: async () => attempts });
  const ratingsAggregate = jest.fn().mockReturnValue({ toArray: async () => ratings });
  const solveTimesAggregate = jest.fn().mockReturnValue({ toArray: async () => solveTimes });
  const nativeEventsAggregate = jest.fn((pipeline: Array<Record<string, unknown>>) => {
    const match = pipeline[0]?.$match as { eventType?: string } | undefined;
    return match?.eventType === "daily_session_restored"
      ? solveTimesAggregate(pipeline)
      : ratingsAggregate(pipeline);
  });
  mockGetCollection.mockImplementation(
    (name: string) =>
      ({
        aggregate: name === "puzzleAttempts" ? attemptsAggregate : nativeEventsAggregate,
      }) as never
  );
  return { attemptsAggregate, ratingsAggregate, solveTimesAggregate, nativeEventsAggregate };
}

describe("nativeGrowthEventOps.getDailyPuzzleQuality", () => {
  beforeEach(() => jest.clearAllMocks());

  it("aggregates exact guess buckets and terminal outcomes without player or answer fields", async () => {
    const { attemptsAggregate } = setupQualityCollections([
      {
        puzzleDate: "2026-10-27",
        players: 4,
        guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 1 },
        outcomes: { solved: 1, revealed: 1, expired: 0, ranOut: 1, inProgress: 1 },
      },
    ]);

    const result = await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    expect(result).toEqual([
      {
        puzzleDate: "2026-10-27",
        players: 4,
        guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 1 },
        outcomes: { solved: 1, revealed: 1, expired: 0, ranOut: 1, inProgress: 1 },
        medianWallClockHoursToSolve: null,
        nativeRatings: { total: 0, too_easy: 0, just_right: 0, tough_but_fair: 0, unclear: 0 },
      },
    ]);
    const pipeline = attemptsAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(pipeline.at(-1)).toEqual({
      $project: {
        _id: 0,
        puzzleDate: "$_id",
        players: 1,
        guessBuckets: {
          one: "$oneGuess",
          two: "$twoGuesses",
          three: "$threeGuesses",
          fourPlus: "$fourPlusGuesses",
        },
        outcomes: {
          solved: "$solved",
          revealed: "$revealed",
          expired: "$expired",
          ranOut: "$ranOut",
          inProgress: "$inProgress",
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("userId");
    expect(JSON.stringify(result)).not.toContain("attemptedAnswer");
  });

  it("joins solved daily finishes to first session restores and publishes only a date median at n>=5", async () => {
    const { solveTimesAggregate } = setupQualityCollections(
      [
        {
          puzzleDate: "2026-10-27",
          players: 6,
          guessBuckets: { one: 0, two: 1, three: 1, fourPlus: 4 },
          outcomes: { solved: 5, revealed: 0, expired: 0, ranOut: 0, inProgress: 1 },
        },
        {
          puzzleDate: "2026-10-26",
          players: 4,
          guessBuckets: { one: 0, two: 2, three: 1, fourPlus: 1 },
          outcomes: { solved: 4, revealed: 0, expired: 0, ranOut: 0, inProgress: 0 },
        },
      ],
      [],
      [
        { puzzleDate: "2026-10-27", medianWallClockHoursToSolve: 4.5 },
        { puzzleDate: "2026-10-26", medianWallClockHoursToSolve: null },
      ]
    );

    const result = await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    expect(
      result.map(({ puzzleDate, medianWallClockHoursToSolve }) => ({
        puzzleDate,
        medianWallClockHoursToSolve,
      }))
    ).toEqual([
      { puzzleDate: "2026-10-27", medianWallClockHoursToSolve: 4.5 },
      { puzzleDate: "2026-10-26", medianWallClockHoursToSolve: null },
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /userId|eventId|deviceId|occurredAt|attemptedAnswer/
    );

    const pipeline = solveTimesAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(pipeline).toContainEqual({ $sort: { dayKey: 1, elapsedHours: 1 } });
    expect(JSON.stringify(pipeline)).not.toContain("$sortArray");
    expect(pipeline[0]).toEqual({
      $match: {
        eventType: "daily_session_restored",
        dayKey: { $gte: "2026-09-26", $lte: "2026-10-28" },
        occurredAt: {
          $gte: new Date("2026-09-25T00:00:00.000Z"),
          $lt: new Date("2026-10-30T00:00:00.000Z"),
        },
      },
    });
    expect(pipeline).toContainEqual(
      expect.objectContaining({
        $lookup: expect.objectContaining({
          from: "nativeGrowthEvents",
          let: expect.objectContaining({ userId: "$userId", dayKey: "$dayKey" }),
          pipeline: expect.arrayContaining([
            expect.objectContaining({
              $match: expect.objectContaining({
                $expr: expect.objectContaining({
                  $and: expect.arrayContaining([
                    { $eq: ["$eventType", "daily_finished"] },
                    { $eq: ["$outcome", "solved"] },
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$dayKey", "$$dayKey"] },
                    { $gte: ["$occurredAt", "$$restoredAt"] },
                  ]),
                }),
              }),
            }),
          ]),
        }),
      })
    );
    expect(pipeline).toContainEqual({ $match: { sampleCount: { $gte: 5 } } });
  });

  it("buffers local puzzle-date edges and keeps only the 30 newest active dates", async () => {
    const { attemptsAggregate } = setupQualityCollections();

    await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    const pipeline = attemptsAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        puzzleDate: {
          $gte: "2026-09-26",
          $lte: "2026-10-28",
          $regex: /^\d{4}-\d{2}-\d{2}$/,
        },
      },
    });
    expect(pipeline.at(-3)).toEqual({ $sort: { _id: -1 } });
    expect(pipeline.at(-2)).toEqual({ $limit: 30 });
  });

  it("counts guess rows but classifies synthetic finalization rows as outcomes", async () => {
    const { attemptsAggregate } = setupQualityCollections();

    await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    const pipeline = attemptsAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    const playerGroup = (pipeline[1] as { $group: Record<string, unknown> }).$group;
    expect(playerGroup._id).toEqual({ userId: "$userId", puzzleDate: "$puzzleDate" });
    expect(playerGroup.guessCount).toEqual({
      $sum: { $cond: [{ $ne: ["$attemptType", "finalization"] }, 1, 0] },
    });
    expect(playerGroup.revealed).toEqual({
      $max: { $cond: [{ $eq: ["$finalizationReason", "revealed"] }, 1, 0] },
    });
    expect(playerGroup.expired).toEqual({
      $max: { $cond: [{ $eq: ["$finalizationReason", "expired"] }, 1, 0] },
    });
    expect(pipeline).toContainEqual({ $match: { guessCount: { $gt: 0 } } });
    const puzzleDayGroup = (pipeline[3] as { $group: Record<string, unknown> }).$group;
    expect(puzzleDayGroup.oneGuess).toEqual({
      $sum: { $cond: [{ $eq: ["$guessCount", 1] }, 1, 0] },
    });
    expect(puzzleDayGroup.fourPlusGuesses).toEqual({
      $sum: { $cond: [{ $gte: ["$guessCount", 4] }, 1, 0] },
    });
    expect(puzzleDayGroup.inProgress).toEqual({
      $sum: {
        $cond: [{ $eq: [{ $add: ["$solved", "$revealed", "$expired", "$ranOut"] }, 0] }, 1, 0],
      },
    });
  });

  it("joins all four optional rating counts by date and zero-fills active dates", async () => {
    const { attemptsAggregate, ratingsAggregate } = setupQualityCollections(
      [
        {
          puzzleDate: "2026-10-27",
          players: 3,
          guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 0 },
          outcomes: { solved: 1, revealed: 1, expired: 0, ranOut: 1, inProgress: 0 },
        },
        {
          puzzleDate: "2026-10-26",
          players: 2,
          guessBuckets: { one: 0, two: 1, three: 1, fourPlus: 0 },
          outcomes: { solved: 1, revealed: 0, expired: 0, ranOut: 0, inProgress: 1 },
        },
      ],
      [
        {
          puzzleDate: "2026-10-27",
          total: 4,
          too_easy: 1,
          just_right: 1,
          tough_but_fair: 1,
          unclear: 1,
        },
        {
          puzzleDate: "2026-10-25",
          total: 2,
          too_easy: 1,
          just_right: 0,
          tough_but_fair: 1,
          unclear: 0,
        },
      ]
    );

    const result = await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    expect(result.map(({ puzzleDate, nativeRatings }) => ({ puzzleDate, nativeRatings }))).toEqual([
      {
        puzzleDate: "2026-10-27",
        nativeRatings: {
          total: 4,
          too_easy: 1,
          just_right: 1,
          tough_but_fair: 1,
          unclear: 1,
        },
      },
      {
        puzzleDate: "2026-10-26",
        nativeRatings: { total: 0, too_easy: 0, just_right: 0, tough_but_fair: 0, unclear: 0 },
      },
    ]);
    expect(result.map((row) => row.puzzleDate)).not.toContain("2026-10-25");
    expect(attemptsAggregate).toHaveBeenCalledTimes(1);
    expect(ratingsAggregate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/userId|eventId|deviceId|occurredAt|rawEvents/);
  });

  it("bounds rating aggregation to buffered dates with timezone-safe UTC timestamps", async () => {
    const { ratingsAggregate } = setupQualityCollections();

    await nativeGrowthEventOps.getDailyPuzzleQuality(
      new Date("2026-09-27T12:00:00.000Z"),
      new Date("2026-10-27T12:00:00.000Z")
    );

    const pipeline = ratingsAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({
      $match: {
        eventType: "daily_quality_feedback",
        dayKey: { $gte: "2026-09-26", $lte: "2026-10-28" },
        occurredAt: {
          $gte: new Date("2026-09-25T00:00:00.000Z"),
          $lt: new Date("2026-10-30T00:00:00.000Z"),
        },
      },
    });
    const group = (pipeline[1] as { $group: Record<string, unknown> }).$group;
    expect(group._id).toBe("$dayKey");
    expect(group.total).toEqual({ $sum: 1 });
    expect(group.too_easy).toEqual({ $sum: { $cond: [{ $eq: ["$rating", "too_easy"] }, 1, 0] } });
    expect(group.just_right).toEqual({
      $sum: { $cond: [{ $eq: ["$rating", "just_right"] }, 1, 0] },
    });
    expect(group.tough_but_fair).toEqual({
      $sum: { $cond: [{ $eq: ["$rating", "tough_but_fair"] }, 1, 0] },
    });
    expect(group.unclear).toEqual({ $sum: { $cond: [{ $eq: ["$rating", "unclear"] }, 1, 0] } });
    expect(pipeline.at(-1)).toEqual({
      $project: {
        _id: 0,
        puzzleDate: "$_id",
        total: 1,
        too_easy: 1,
        just_right: 1,
        tough_but_fair: 1,
        unclear: 1,
      },
    });
  });
});
