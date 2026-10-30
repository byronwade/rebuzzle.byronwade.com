import { getCollection } from "@/db/mongodb";
import { puzzleOps } from "../operations";

jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

const mockGetCollection = jest.mocked(getCollection);

beforeEach(() => jest.clearAllMocks());

it("pages only active puzzles published before the UTC start of the viewer's daily date", async () => {
  const rows = [{ id: "older" }];
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(rows),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);
  const beforeUtc = new Date("2026-10-26T00:00:00.000Z");

  await expect(puzzleOps.findPublishedBefore({ beforeUtc, limit: 31 })).resolves.toEqual(rows);

  expect(find).toHaveBeenCalledWith({ active: true, publishedAt: { $lt: beforeUtc } });
  expect(cursor.sort).toHaveBeenCalledWith({ publishedAt: -1, id: -1 });
  expect(cursor.limit).toHaveBeenCalledWith(31);
});

it("uses a stable descending publication-date and ID cursor", async () => {
  const cursor = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const find = jest.fn().mockReturnValue(cursor);
  mockGetCollection.mockReturnValue({ find } as never);
  const beforeUtc = new Date("2026-10-26T00:00:00.000Z");
  const after = { publishedAt: new Date("2026-10-24T12:00:00.000Z"), id: "puzzle-7" };

  await puzzleOps.findPublishedBefore({ beforeUtc, limit: 21, after });

  expect(find).toHaveBeenCalledWith({
    active: true,
    publishedAt: { $lt: beforeUtc },
    $or: [
      { publishedAt: { $lt: after.publishedAt } },
      { publishedAt: after.publishedAt, id: { $lt: after.id } },
    ],
  });
  expect(cursor.sort).toHaveBeenCalledWith({ publishedAt: -1, id: -1 });
  expect(cursor.limit).toHaveBeenCalledWith(21);
});

it("selects the oldest active published puzzle before the server date in stable order", async () => {
  const row = { id: "oldest", publishedAt: new Date("2025-01-02T00:00:00.000Z") };
  const findOne = jest.fn().mockResolvedValue(row);
  mockGetCollection.mockReturnValue({ findOne } as never);
  const beforeUtc = new Date("2026-10-28T00:00:00.000Z");

  await expect(puzzleOps.findOldestPublishedBefore(beforeUtc)).resolves.toEqual(row);

  expect(findOne).toHaveBeenCalledWith(
    { active: true, publishedAt: { $lt: beforeUtc } },
    { sort: { publishedAt: 1, id: 1 } }
  );
});
