import { db } from "@/db";
import { findFreeArchiveSample } from "../archive-sample";

jest.mock("@/db", () => ({
  db: {
    puzzleOps: {
      findOldestPublishedBefore: jest.fn(),
    },
  },
}));

const findOldestPublishedBefore = jest.mocked(db.puzzleOps.findOldestPublishedBefore);

beforeEach(() => jest.clearAllMocks());

it("returns the oldest published past daily selected before the server date", async () => {
  const puzzle = {
    id: "oldest",
    active: true,
    publishedAt: new Date("2025-01-02T00:00:00.000Z"),
  };
  findOldestPublishedBefore.mockResolvedValue(puzzle as never);

  await expect(findFreeArchiveSample("2026-10-28")).resolves.toEqual(puzzle);

  expect(findOldestPublishedBefore).toHaveBeenCalledWith(new Date("2026-10-28T00:00:00.000Z"));
});

it("rejects malformed local puzzle dates without querying the archive", async () => {
  await expect(findFreeArchiveSample("2026-02-30")).resolves.toBeNull();
  expect(findOldestPublishedBefore).not.toHaveBeenCalled();
});

it("rejects a database candidate that is not earlier than the server date", async () => {
  findOldestPublishedBefore.mockResolvedValue({
    id: "today",
    active: true,
    publishedAt: new Date("2026-10-28T00:00:00.000Z"),
  } as never);

  await expect(findFreeArchiveSample("2026-10-28")).resolves.toBeNull();
});
