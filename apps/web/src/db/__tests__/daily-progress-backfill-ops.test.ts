import { getCollection } from "@/db/mongodb";
import { dailyProgressBackfillOps, puzzleAttemptOps, userOps } from "../operations";

jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

const mockGetCollection = jest.mocked(getCollection);

beforeEach(() => jest.clearAllMocks());

it("initializes an account zone with a compare-and-set and returns the race winner", async () => {
  const findOneAndUpdate = jest.fn().mockResolvedValue(null);
  const findOne = jest.fn().mockResolvedValue({ journeyTimeZone: "Europe/Paris" });
  mockGetCollection.mockReturnValue({ findOneAndUpdate, findOne } as never);

  await expect(userOps.initializeJourneyTimeZone("user-1", "America/Los_Angeles")).resolves.toBe(
    "Europe/Paris"
  );
  expect(findOneAndUpdate).toHaveBeenCalledWith(
    {
      id: "user-1",
      $or: [
        { journeyTimeZone: { $exists: false } },
        { journeyTimeZone: null },
        { journeyTimeZone: "" },
      ],
    },
    { $set: { journeyTimeZone: "America/Los_Angeles" } },
    { returnDocument: "after", projection: { journeyTimeZone: 1 } }
  );
});

it("finds the newest valid zone among final official daily attempts", async () => {
  const cursor = {
    project: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    async *[Symbol.asyncIterator]() {
      yield { puzzleDate: "2026-10-26", puzzleTimeZone: "Mars/Phobos" };
      yield { puzzleDate: "2026-02-30", puzzleTimeZone: "Pacific/Honolulu" };
      yield { puzzleDate: "2026-10-25", puzzleTimeZone: "Asia/Tokyo" };
      yield { puzzleDate: "2026-10-24", puzzleTimeZone: "UTC" };
    },
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(puzzleAttemptOps.findNewestDailyTimeZone("user-1")).resolves.toBe("Asia/Tokyo");
  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    isFinal: true,
    puzzleDate: /^\d{4}-\d{2}-\d{2}$/,
    puzzleTimeZone: { $type: "string", $ne: "" },
  });
  expect(cursor.sort).toHaveBeenCalledWith({ attemptedAt: -1 });
});

it("keyset pages only valid final daily rows before the backfill cutoff", async () => {
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);
  const cutoffAt = new Date("2026-10-26T00:00:00Z");

  await dailyProgressBackfillOps.findInitialBatch("user-1", cutoffAt, "2026-10-20", 25);

  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    isFinal: true,
    attemptedAt: { $lte: cutoffAt },
    puzzleDate: { $regex: /^\d{4}-\d{2}-\d{2}$/, $gt: "2026-10-20" },
  });
  expect(cursor.sort).toHaveBeenCalledWith({ puzzleDate: 1 });
  expect(cursor.limit).toHaveBeenCalledWith(25);
});

it("delta pages use a bounded timestamp and deterministic cursor", async () => {
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);
  const cutoffAt = new Date("2026-10-26T00:00:00Z");
  const deltaCutoffAt = new Date("2026-10-27T00:00:00Z");
  const cursorAt = new Date("2026-10-26T12:00:00Z");

  await dailyProgressBackfillOps.findDeltaBatch(
    "user-1",
    cutoffAt,
    deltaCutoffAt,
    cursorAt,
    "attempt-1",
    10
  );

  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    isFinal: true,
    puzzleDate: { $regex: /^\d{4}-\d{2}-\d{2}$/ },
    attemptedAt: { $gt: cutoffAt, $lte: deltaCutoffAt },
    $or: [
      { attemptedAt: { $gt: cursorAt, $lte: deltaCutoffAt } },
      { attemptedAt: cursorAt, id: { $gt: "attempt-1" } },
    ],
  });
  expect(cursor.sort).toHaveBeenCalledWith({ attemptedAt: 1, id: 1 });
});
