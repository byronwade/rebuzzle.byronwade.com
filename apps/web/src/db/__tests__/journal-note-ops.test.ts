import { getCollection } from "@/db/mongodb";
import * as operations from "../operations";

jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

const mockGetCollection = jest.mocked(getCollection);

type JournalNote = {
  userId: string;
  puzzleId: string;
  note: string;
  revision: number;
  updatedAt: Date;
};

type CompareAndSetInput = Omit<JournalNote, "revision"> & {
  expectedRevision: number;
};

type JournalNoteOperations = {
  listForUserPage(userId: string, puzzleIds: string[]): Promise<JournalNote[]>;
  compareAndSet(input: CompareAndSetInput): Promise<JournalNote | null>;
};

function journalNoteOps(): JournalNoteOperations {
  const value = (operations as unknown as { journalNoteOps?: JournalNoteOperations })
    .journalNoteOps;
  expect(value).toEqual(expect.any(Object));
  return value!;
}

beforeEach(() => jest.clearAllMocks());

it("lists only notes for the authenticated owner and requested journal page", async () => {
  const rows = [
    {
      userId: "user-1",
      puzzleId: "puzzle-1",
      note: "The turn was in the spacing.",
      revision: 2,
      updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    },
  ];
  const toArray = jest.fn().mockResolvedValue(rows);
  const find = jest.fn().mockReturnValue({ toArray });
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(
    journalNoteOps().listForUserPage("user-1", ["puzzle-1", "puzzle-2"])
  ).resolves.toEqual(rows);

  expect(mockGetCollection).toHaveBeenCalledWith("journalNotes");
  expect(find).toHaveBeenCalledWith({
    userId: "user-1",
    puzzleId: { $in: ["puzzle-1", "puzzle-2"] },
  });
});

it("does not query the notes collection for an empty page", async () => {
  await expect(journalNoteOps().listForUserPage("user-1", [])).resolves.toEqual([]);
  expect(mockGetCollection).not.toHaveBeenCalled();
});

it("creates the first note at revision one with an expected revision of zero", async () => {
  const now = new Date("2026-10-28T12:00:00.000Z");
  const saved = {
    userId: "user-1",
    puzzleId: "puzzle-1",
    note: "The repeated word was the key.",
    revision: 1,
    updatedAt: now,
  };
  const findOneAndUpdate = jest.fn().mockResolvedValue(saved);
  mockGetCollection.mockReturnValue({ findOneAndUpdate } as never);

  await expect(
    journalNoteOps().compareAndSet({
      userId: "user-1",
      puzzleId: "puzzle-1",
      note: saved.note,
      expectedRevision: 0,
      updatedAt: now,
    })
  ).resolves.toEqual(saved);

  expect(findOneAndUpdate).toHaveBeenCalledWith(
    { userId: "user-1", puzzleId: "puzzle-1", revision: 0 },
    {
      $set: { note: saved.note, updatedAt: now },
      $setOnInsert: { userId: "user-1", puzzleId: "puzzle-1" },
      $inc: { revision: 1 },
    },
    { upsert: true, returnDocument: "after" }
  );
});

it("increments a matching revision and returns null when the compare-and-set is stale", async () => {
  const now = new Date("2026-10-28T12:00:00.000Z");
  const saved = {
    userId: "user-1",
    puzzleId: "puzzle-1",
    note: "A clearer memory.",
    revision: 4,
    updatedAt: now,
  };
  const findOneAndUpdate = jest.fn().mockResolvedValueOnce(saved).mockResolvedValueOnce(null);
  mockGetCollection.mockReturnValue({ findOneAndUpdate } as never);
  const ops = journalNoteOps();

  await expect(
    ops.compareAndSet({ ...saved, expectedRevision: 3, updatedAt: now })
  ).resolves.toEqual(saved);
  await expect(
    ops.compareAndSet({ ...saved, expectedRevision: 3, updatedAt: now })
  ).resolves.toBeNull();

  expect(findOneAndUpdate).toHaveBeenNthCalledWith(
    1,
    { userId: "user-1", puzzleId: "puzzle-1", revision: 3 },
    {
      $set: { note: saved.note, updatedAt: now },
      $setOnInsert: { userId: "user-1", puzzleId: "puzzle-1" },
      $inc: { revision: 1 },
    },
    { upsert: false, returnDocument: "after" }
  );
});

it("returns a stale result for a competing first write that loses the unique-key race", async () => {
  const duplicateKey = Object.assign(new Error("duplicate key"), { code: 11000 });
  const findOneAndUpdate = jest.fn().mockRejectedValue(duplicateKey);
  mockGetCollection.mockReturnValue({ findOneAndUpdate } as never);

  await expect(
    journalNoteOps().compareAndSet({
      userId: "user-1",
      puzzleId: "puzzle-1",
      note: "A device note",
      expectedRevision: 0,
      updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    })
  ).resolves.toBeNull();
});
