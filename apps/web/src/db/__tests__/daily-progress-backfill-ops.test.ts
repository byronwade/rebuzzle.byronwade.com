import { getCollection } from "@/db/mongodb";
import {
  dailyProgressBackfillOps,
  dailyProgressOps,
  puzzleAttemptOps,
  userOps,
} from "../operations";

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

it("repairs only the invalid zone value it observed", async () => {
  const findOneAndUpdate = jest.fn().mockResolvedValue({ journeyTimeZone: "UTC" });
  const findOne = jest.fn();
  mockGetCollection.mockReturnValue({ findOneAndUpdate, findOne } as never);

  await expect(userOps.initializeJourneyTimeZone("user-1", "UTC", "Mars/Phobos")).resolves.toBe(
    "UTC"
  );
  expect(findOneAndUpdate.mock.calls[0]![0]).toEqual({
    id: "user-1",
    $or: [
      { journeyTimeZone: { $exists: false } },
      { journeyTimeZone: null },
      { journeyTimeZone: "" },
      { journeyTimeZone: "Mars/Phobos" },
    ],
  });
});

it("repairs a malformed non-string account zone using an exact compare-and-set", async () => {
  const findOneAndUpdate = jest.fn().mockResolvedValue({ journeyTimeZone: "UTC" });
  const findOne = jest.fn();
  mockGetCollection.mockReturnValue({ findOneAndUpdate, findOne } as never);

  await expect(userOps.initializeJourneyTimeZone("user-1", "UTC", 0)).resolves.toBe("UTC");
  expect(findOneAndUpdate.mock.calls[0]![0]).toEqual({
    id: "user-1",
    $or: [
      { journeyTimeZone: { $exists: false } },
      { journeyTimeZone: null },
      { journeyTimeZone: "" },
      { journeyTimeZone: 0 },
    ],
  });
});

it("returns the concurrent valid zone when an invalid legacy value changed first", async () => {
  const findOneAndUpdate = jest.fn().mockResolvedValue(null);
  const findOne = jest.fn().mockResolvedValue({ journeyTimeZone: "Europe/Paris" });
  mockGetCollection.mockReturnValue({ findOneAndUpdate, findOne } as never);

  await expect(
    userOps.initializeJourneyTimeZone("user-1", "Asia/Tokyo", "Mars/Phobos")
  ).resolves.toBe("Europe/Paris");
  expect(findOne).toHaveBeenCalledWith({ id: "user-1" }, { projection: { journeyTimeZone: 1 } });
});

it("persists a reconciliation request without replacing the current backfill state", async () => {
  const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
  mockGetCollection.mockReturnValue({ updateOne } as never);
  const requestedAt = new Date("2026-10-28T12:00:00.000Z");

  await dailyProgressBackfillOps.requestReconciliation("user-1", requestedAt);

  expect(updateOne).toHaveBeenCalledWith(
    { _id: "user-1" },
    {
      $setOnInsert: {
        _id: "user-1",
        userId: "user-1",
        status: "scanning",
        cutoffAt: requestedAt,
      },
      $max: { reconciliationRequestedAt: requestedAt, updatedAt: requestedAt },
      $inc: { reconciliationGeneration: 1 },
    },
    { upsert: true }
  );
});

it("lists pending reconciliation accounts by stable account cursor", async () => {
  const rows = [
    {
      _id: "user-1",
      userId: "user-1",
      reconciliationGeneration: 2,
      reconciliationProcessedGeneration: 1,
    },
    {
      _id: "user-2",
      userId: "user-2",
      reconciliationGeneration: 2,
      reconciliationProcessedGeneration: 2,
    },
    {
      _id: "user-3",
      userId: "user-3",
      reconciliationRequestedAt: new Date("2026-10-28T12:00:00Z"),
      reconciliationProcessedAt: new Date("2026-10-28T11:00:00Z"),
    },
  ];
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(
    dailyProgressBackfillOps.listPendingReconciliationUsersAfter("user-0", 20)
  ).resolves.toEqual([{ id: "user-1" }, { id: "user-3" }]);
  expect(find).toHaveBeenCalledWith(
    {
      _id: { $gt: "user-0" },
      reconciliationRequestedAt: { $type: "date" },
    },
    {
      projection: {
        _id: 1,
        userId: 1,
        reconciliationGeneration: 1,
        reconciliationProcessedGeneration: 1,
        reconciliationProcessedAt: 1,
      },
    }
  );
  expect(cursor.sort).toHaveBeenCalledWith({ _id: 1 });
  expect(cursor.limit).toHaveBeenCalledWith(20);
});

it("scans past completed reconciliation markers before returning pending users", async () => {
  const rows = [
    ...["user-1", "user-2", "user-3", "user-4"].map((userId) => ({
      _id: userId,
      userId,
      reconciliationGeneration: 1,
      reconciliationProcessedGeneration: 1,
      reconciliationRequestedAt: new Date("2026-10-28T12:00:00Z"),
    })),
    {
      _id: "user-5",
      userId: "user-5",
      reconciliationGeneration: 2,
      reconciliationProcessedGeneration: 1,
      reconciliationRequestedAt: new Date("2026-10-28T12:00:00Z"),
    },
  ];
  const find = jest.fn((filter: { _id?: { $gt: string } }) => {
    let pageSize = 0;
    const cursor = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn((value: number) => {
        pageSize = value;
        return cursor;
      }),
      toArray: jest.fn(async () =>
        rows.filter((row) => !filter._id || row._id > filter._id.$gt).slice(0, pageSize)
      ),
    };
    return cursor;
  });
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(
    dailyProgressBackfillOps.listPendingReconciliationUsersAfter(null, 2)
  ).resolves.toEqual([{ id: "user-5" }]);
  expect(find).toHaveBeenCalledTimes(3);
});

it("reads only final official daily attempts for progress recovery", async () => {
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);

  await puzzleAttemptOps.findRecentFinalDailyAttempts("user-1", 42);

  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    isFinal: true,
    puzzleDate: /^\d{4}-\d{2}-\d{2}$/,
  });
  expect(cursor.sort).toHaveBeenCalledWith({ attemptedAt: -1 });
  expect(cursor.limit).toHaveBeenCalledWith(42);
});

it("counts only materializable official attempts and counts progress rows separately", async () => {
  const attempts = [
    {
      userId: "user-1",
      puzzleId: "valid",
      puzzleDate: "2026-10-25",
      isFinal: true,
      isCorrect: true,
      attemptNumber: 2,
      attemptedAt: new Date("2026-10-25T20:00:00Z"),
    },
    {
      userId: "user-1",
      puzzleId: "impossible-date",
      puzzleDate: "2026-02-30",
      isFinal: true,
      isCorrect: true,
      attemptNumber: 1,
      attemptedAt: new Date("2026-02-30T20:00:00Z"),
    },
    {
      userId: "user-1",
      puzzleId: "invalid-terminal-shape",
      puzzleDate: "2026-10-24",
      isFinal: true,
      isCorrect: false,
      attemptNumber: 2,
      attemptedAt: new Date("2026-10-24T20:00:00Z"),
    },
  ];
  const cursor = { toArray: jest.fn().mockResolvedValue(attempts) };
  const find = jest.fn().mockReturnValue(cursor);
  const countDocuments = jest.fn().mockResolvedValue(6);
  mockGetCollection
    .mockReturnValueOnce({ find } as never)
    .mockReturnValueOnce({ countDocuments } as never);

  await expect(
    puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts("user-1")
  ).resolves.toBe(1);
  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    isFinal: true,
    puzzleDate: /^\d{4}-\d{2}-\d{2}$/,
  });

  await expect(dailyProgressOps.countForUser("user-1")).resolves.toBe(6);
  expect(countDocuments).toHaveBeenLastCalledWith({ userId: "user-1" });
});

it("reads account Journey rows newest date first", async () => {
  const rows = [{ puzzleDate: "2026-10-26" }, { puzzleDate: "2026-10-25" }];
  const cursor = { sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(rows) };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(dailyProgressOps.listForUser("user-1")).resolves.toEqual(rows);
  expect(find).toHaveBeenCalledWith({ userId: "user-1" });
  expect(cursor.sort).toHaveBeenCalledWith({ puzzleDate: -1 });
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
