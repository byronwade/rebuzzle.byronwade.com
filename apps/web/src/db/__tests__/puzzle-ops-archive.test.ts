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
