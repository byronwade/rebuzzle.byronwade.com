import { getCollection } from "@/db/mongodb";
import * as operations from "../operations";

jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

const mockGetCollection = jest.mocked(getCollection);

type ProgressOps = {
  listForUserPage(
    userId: string,
    input: { limit: number; beforePuzzleDate?: string }
  ): Promise<unknown[]>;
  countValidForUser(userId: string): Promise<number>;
  findForUserPuzzle(userId: string, puzzleId: string): Promise<unknown | null>;
};

type PuzzleOps = { findByIds(ids: string[]): Promise<unknown[]> };

function dailyProgressOps(): ProgressOps {
  const value = (operations as unknown as { dailyProgressOps?: ProgressOps }).dailyProgressOps;
  expect(value).toEqual(expect.any(Object));
  expect(value!.listForUserPage).toEqual(expect.any(Function));
  expect(value!.countValidForUser).toEqual(expect.any(Function));
  expect(value!.findForUserPuzzle).toEqual(expect.any(Function));
  return value!;
}

function puzzleOps(): PuzzleOps {
  const value = (operations as unknown as { puzzleOps?: PuzzleOps }).puzzleOps;
  expect(value).toEqual(expect.any(Object));
  expect(value!.findByIds).toEqual(expect.any(Function));
  return value!;
}

beforeEach(() => jest.clearAllMocks());

it("lists completed progress newest first with a bounded date cursor", async () => {
  const rows = [{ puzzleDate: "2026-10-24" }];
  const toArray = jest.fn().mockResolvedValue(rows);
  const limit = jest.fn().mockReturnValue({ toArray });
  const sort = jest.fn().mockReturnValue({ limit });
  const find = jest.fn().mockReturnValue({ sort });
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(
    dailyProgressOps().listForUserPage("user-1", {
      beforePuzzleDate: "2026-10-25",
      limit: 101,
    })
  ).resolves.toEqual(rows);

  expect(mockGetCollection).toHaveBeenCalledWith("dailyProgress");
  expect(find).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-1",
      puzzleDate: expect.objectContaining({ $lt: "2026-10-25" }),
      completedAt: { $type: "date" },
    })
  );
  expect(sort).toHaveBeenCalledWith({ puzzleDate: -1 });
  expect(limit).toHaveBeenCalledWith(101);
});

it("looks up only the authenticated account's terminal puzzle completion", async () => {
  const row = { userId: "user-1", puzzleId: "puzzle-1", outcome: "solved" };
  const findOne = jest.fn().mockResolvedValue(row);
  mockGetCollection.mockReturnValue({ findOne } as never);

  await expect(dailyProgressOps().findForUserPuzzle("user-1", "puzzle-1")).resolves.toEqual(row);

  expect(mockGetCollection).toHaveBeenCalledWith("dailyProgress");
  expect(findOne).toHaveBeenCalledWith({
    userId: "user-1",
    puzzleId: "puzzle-1",
    outcome: { $in: ["solved", "failed"] },
  });
});

it("counts only completed rows matching the progress API invariants", async () => {
  const countDocuments = jest.fn().mockResolvedValue(9);
  mockGetCollection.mockReturnValue({ countDocuments } as never);

  await expect(dailyProgressOps().countValidForUser("user-1")).resolves.toBe(9);

  expect(mockGetCollection).toHaveBeenCalledWith("dailyProgress");
  expect(countDocuments).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-1",
      puzzleDate: expect.objectContaining({ $regex: /^\d{4}-\d{2}-\d{2}$/ }),
      puzzleId: { $type: "string", $ne: "" },
      completedAt: { $type: "date" },
      $or: [
        { outcome: "solved", playMode: { $ne: "extended" }, attempts: { $gte: 1, $lte: 3 } },
        { outcome: "failed", playMode: { $ne: "extended" }, attempts: 3 },
        { outcome: "solved", playMode: "extended", attempts: { $gte: 1 } },
        { outcome: "failed", playMode: "extended", attempts: { $gte: 1 } },
      ],
    })
  );
});

it("batches puzzle lookups by ID and skips an empty journal page", async () => {
  const rows = [{ id: "puzzle-1" }];
  const toArray = jest.fn().mockResolvedValue(rows);
  const find = jest.fn().mockReturnValue({ toArray });
  mockGetCollection.mockReturnValue({ find } as never);

  await expect(puzzleOps().findByIds(["puzzle-1", "puzzle-2"])).resolves.toEqual(rows);
  expect(mockGetCollection).toHaveBeenCalledWith("puzzles");
  expect(find).toHaveBeenCalledWith({ id: { $in: ["puzzle-1", "puzzle-2"] } });

  mockGetCollection.mockClear();
  await expect(puzzleOps().findByIds([])).resolves.toEqual([]);
  expect(mockGetCollection).not.toHaveBeenCalled();
});
