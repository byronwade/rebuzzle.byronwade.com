import { getCollection, getDatabase } from "@/db/mongodb";
import { setupDatabaseIndexes } from "../indexes";
import type { PuzzleAttempt } from "../models";
import { dailyProgressOps } from "../operations";

jest.mock("@/db/mongodb", () => ({
  getCollection: jest.fn(),
  getDatabase: jest.fn(),
}));

const mockGetCollection = jest.mocked(getCollection);
const mockGetDatabase = jest.mocked(getDatabase);

const terminalAttempt = (overrides: Partial<PuzzleAttempt> = {}): PuzzleAttempt => ({
  id: "attempt-1",
  userId: "user-1",
  puzzleId: "puzzle-2026-10-26",
  attemptedAnswer: "answer",
  isCorrect: true,
  isFinal: true,
  attemptNumber: 2,
  puzzleDate: "2026-10-26",
  puzzleTimeZone: "America/Los_Angeles",
  attemptedAt: new Date("2026-10-27T06:59:10.000Z"),
  completedAt: new Date("2026-10-27T06:58:00.000Z"),
  hintsUsed: 1,
  ...overrides,
});

const duplicateKeyError = () => Object.assign(new Error("duplicate key"), { code: 11000 });

describe("dailyProgressOps.materializeFromAttempt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts one minimal Journey row per user and accepted local puzzle date", async () => {
    const documents = new Map<string, Record<string, unknown>>();
    const updateOne = jest.fn(
      async (
        filter: { userId: string; puzzleDate: string },
        update: { $setOnInsert: Record<string, unknown> }
      ) => {
        const key = `${filter.userId}:${filter.puzzleDate}`;
        if (!documents.has(key)) documents.set(key, update.$setOnInsert);
        return { acknowledged: true, upsertedCount: documents.has(key) ? 1 : 0 };
      }
    );
    const findOne = jest.fn(
      async (filter: { userId: string; puzzleDate: string }) =>
        documents.get(`${filter.userId}:${filter.puzzleDate}`) ?? null
    );
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    const first = await dailyProgressOps.materializeFromAttempt(terminalAttempt());
    const retry = await dailyProgressOps.materializeFromAttempt(terminalAttempt());

    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledWith(
      { userId: "user-1", puzzleDate: "2026-10-26" },
      {
        $setOnInsert: {
          userId: "user-1",
          puzzleDate: "2026-10-26",
          puzzleId: "puzzle-2026-10-26",
          outcome: "solved",
          attempts: 2,
          hintCount: 1,
          completedAt: new Date("2026-10-27T06:59:10.000Z"),
          timeZone: "America/Los_Angeles",
        },
      },
      { upsert: true }
    );
    expect(documents.size).toBe(1);
    expect(retry).toEqual(first);
  });

  it("resolves a duplicate-key retry by reading the already persisted winner", async () => {
    const winner = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "solved",
      attempts: 2,
      hintCount: 1,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: "America/Los_Angeles",
    };
    const updateOne = jest.fn().mockRejectedValue(duplicateKeyError());
    const findOne = jest.fn().mockResolvedValue(winner);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    await expect(dailyProgressOps.materializeFromAttempt(terminalAttempt())).resolves.toEqual(
      winner
    );
    expect(findOne).toHaveBeenCalledWith({ userId: "user-1", puzzleDate: "2026-10-26" });
  });

  it("reports insert status separately so the backfill can log accurate counts", async () => {
    const winner = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "solved",
      attempts: 2,
      hintCount: 1,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: "America/Los_Angeles",
    };
    const updateOne = jest
      .fn()
      .mockResolvedValueOnce({ acknowledged: true, upsertedCount: 1 })
      .mockResolvedValueOnce({ acknowledged: true, upsertedCount: 0 });
    const findOne = jest.fn().mockResolvedValue(winner);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    const inserted = await dailyProgressOps.materializeFromAttemptWithStatus(terminalAttempt());
    const existing = await dailyProgressOps.materializeFromAttemptWithStatus(terminalAttempt());

    expect(inserted).toEqual({ progress: winner, inserted: true });
    expect(existing).toEqual({ progress: winner, inserted: false });
  });

  it("repairs a malformed stored row from the authoritative final attempt", async () => {
    const malformed = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "unknown",
      attempts: 2,
      completedAt: "not-a-date",
    };
    const repaired = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "solved",
      attempts: 2,
      hintCount: 1,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: "America/Los_Angeles",
    };
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true, upsertedCount: 0 });
    const findOne = jest.fn().mockResolvedValueOnce(malformed).mockResolvedValueOnce(repaired);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    await expect(
      dailyProgressOps.materializeFromAttemptWithStatus(terminalAttempt())
    ).resolves.toEqual({ progress: repaired, inserted: false });
    expect(updateOne).toHaveBeenCalledWith(
      { userId: "user-1", puzzleDate: "2026-10-26" },
      { $set: repaired }
    );
  });

  it("returns the same winner when competing final attempts race on the unique key", async () => {
    const documents = new Map<string, Record<string, unknown>>();
    let entered = 0;
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    const updateOne = jest.fn(
      async (
        filter: { userId: string; puzzleDate: string },
        update: { $setOnInsert: Record<string, unknown> }
      ) => {
        entered += 1;
        if (entered === 2) releaseBarrier();
        await barrier;

        const key = `${filter.userId}:${filter.puzzleDate}`;
        if (documents.has(key)) throw duplicateKeyError();
        documents.set(key, update.$setOnInsert);
        return { acknowledged: true, upsertedCount: 1 };
      }
    );
    const findOne = jest.fn(
      async (filter: { userId: string; puzzleDate: string }) =>
        documents.get(`${filter.userId}:${filter.puzzleDate}`) ?? null
    );
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    const [first, second] = await Promise.all([
      dailyProgressOps.materializeFromAttempt(terminalAttempt()),
      dailyProgressOps.materializeFromAttempt(
        terminalAttempt({ id: "attempt-2", puzzleId: "competing-puzzle" })
      ),
    ]);

    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(first).toEqual(second);
    expect(first?.puzzleId).toMatch(/^(puzzle-2026-10-26|competing-puzzle)$/);
  });

  it.each([
    ["archive", terminalAttempt({ puzzleDate: "archive:puzzle-123" })],
    ["non-final", terminalAttempt({ isFinal: false })],
    ["invalid puzzle date", terminalAttempt({ puzzleDate: "2026-02-30" })],
    ["missing attempt count", terminalAttempt({ attemptNumber: undefined })],
    ["solve above three attempts", terminalAttempt({ attemptNumber: 4 })],
    ["loss before all three attempts", terminalAttempt({ isCorrect: false, attemptNumber: 2 })],
  ])("does not materialize an %s attempt", async (_label, attempt) => {
    const updateOne = jest.fn();
    mockGetCollection.mockReturnValue({ updateOne } as never);

    await expect(dailyProgressOps.materializeFromAttempt(attempt)).resolves.toBeNull();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("maps failed three-guess attempts and uses terminal attemptedAt instead of completedAt", async () => {
    const expected = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "failed",
      attempts: 3,
      hintCount: 2,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: "America/Los_Angeles",
    };
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const findOne = jest.fn().mockResolvedValue(expected);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    await expect(
      dailyProgressOps.materializeFromAttempt(
        terminalAttempt({
          isCorrect: false,
          attemptNumber: 3,
          hintsUsed: 2,
          completedAt: new Date("2026-10-27T06:58:00.000Z"),
        })
      )
    ).resolves.toEqual(expected);
    expect(updateOne.mock.calls[0][1]).toMatchObject({
      $setOnInsert: { outcome: "failed", attempts: 3, completedAt: expected.completedAt },
    });
  });

  it("keeps absent historical hint and time-zone metadata explicitly unknown", async () => {
    const expected = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "solved",
      attempts: 1,
      hintCount: null,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: null,
    };
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const findOne = jest.fn().mockResolvedValue(expected);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    await dailyProgressOps.materializeFromAttempt(
      terminalAttempt({ attemptNumber: 1, hintsUsed: undefined, puzzleTimeZone: undefined })
    );

    expect(updateOne.mock.calls[0][1]).toEqual({ $setOnInsert: expected });
  });

  it("keeps malformed optional metadata unknown and allows first-guess solves", async () => {
    const expected = {
      userId: "user-1",
      puzzleDate: "2026-10-26",
      puzzleId: "puzzle-2026-10-26",
      outcome: "solved",
      attempts: 1,
      hintCount: null,
      completedAt: new Date("2026-10-27T06:59:10.000Z"),
      timeZone: null,
    };
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const findOne = jest.fn().mockResolvedValue(expected);
    mockGetCollection.mockReturnValue({ updateOne, findOne } as never);

    await dailyProgressOps.materializeFromAttempt(
      terminalAttempt({ attemptNumber: 1, hintsUsed: -1, puzzleTimeZone: "Mars/Phobos" })
    );

    expect(updateOne.mock.calls[0][1]).toEqual({ $setOnInsert: expected });
  });
});

describe("dailyProgress index", () => {
  it("creates the unique user and local puzzle-date index", async () => {
    const createdIndexes: Array<{ collection: string; spec: unknown; options: unknown }> = [];
    const db = {
      collection: (collection: string) => ({
        indexes: async () => [],
        createIndex: async (spec: unknown, options: unknown) => {
          createdIndexes.push({ collection, spec, options });
          return "index";
        },
      }),
    };
    mockGetDatabase.mockReturnValue(db as never);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await setupDatabaseIndexes();

      expect(result.success).toBe(true);
      expect(createdIndexes).toContainEqual({
        collection: "dailyProgress",
        spec: { userId: 1, puzzleDate: 1 },
        options: { unique: true, name: "userId_1_puzzleDate_1" },
      });
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
