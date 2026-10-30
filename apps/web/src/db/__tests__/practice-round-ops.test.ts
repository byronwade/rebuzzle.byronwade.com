jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

import { getCollection } from "@/db/mongodb";
import { practiceRoundOps } from "@/db/operations";

const collection = {
  insertOne: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};

const current = {
  userId: "player-1",
  puzzleId: "puzzle-1",
  roundId: "round-1",
  token: "signed-current-token",
  expiresAt: new Date("2026-10-28T12:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCollection).mockReturnValue(collection as never);
  collection.insertOne.mockResolvedValue({ acknowledged: true } as never);
  collection.findOne.mockResolvedValue(null);
  collection.updateOne.mockResolvedValue({ modifiedCount: 1 } as never);
  collection.deleteOne.mockResolvedValue({ deletedCount: 1 } as never);
});

it("stores only a digest of the current signed round token", async () => {
  await practiceRoundOps.activateToken(current);

  expect(getCollection).toHaveBeenCalledWith("practiceRoundTokens");
  expect(collection.insertOne).toHaveBeenCalledWith({
    _id: "round-1",
    userId: "player-1",
    puzzleId: "puzzle-1",
    tokenDigest: expect.any(String),
    expiresAt: current.expiresAt,
  });
  expect(collection.insertOne.mock.calls[0]?.[0]).not.toHaveProperty("token");
});

it("checks that a signed token is the current unexpired token for its round", async () => {
  collection.findOne.mockResolvedValueOnce({ _id: "round-1" } as never);

  await expect(practiceRoundOps.isTokenActive(current)).resolves.toBe(true);
  expect(collection.findOne).toHaveBeenCalledWith(
    expect.objectContaining({
      _id: "round-1",
      userId: "player-1",
      puzzleId: "puzzle-1",
      tokenDigest: expect.any(String),
      expiresAt: { $gt: expect.any(Date) },
    }),
    { projection: { _id: 1 } }
  );
  expect(collection.findOne.mock.calls[0]?.[0]).not.toHaveProperty("token");
});

it("rotates a token only when the submitted digest is still current", async () => {
  const next = {
    ...current,
    token: "signed-next-token",
    expiresAt: new Date("2026-10-29T12:00:00.000Z"),
  };

  await expect(practiceRoundOps.advanceToken(current, next)).resolves.toBe(true);
  expect(collection.updateOne).toHaveBeenCalledWith(
    expect.objectContaining({
      _id: "round-1",
      userId: "player-1",
      puzzleId: "puzzle-1",
      tokenDigest: expect.any(String),
      expiresAt: { $gt: expect.any(Date) },
    }),
    {
      $set: {
        tokenDigest: expect.any(String),
        expiresAt: next.expiresAt,
      },
    }
  );
  expect(collection.updateOne.mock.calls[0]?.[0]).not.toHaveProperty("token");
});

it("deletes a token after a correct answer using the same compare-and-set filter", async () => {
  await expect(practiceRoundOps.advanceToken(current, null)).resolves.toBe(true);

  expect(collection.deleteOne).toHaveBeenCalledWith(
    expect.objectContaining({
      _id: "round-1",
      userId: "player-1",
      puzzleId: "puzzle-1",
      tokenDigest: expect.any(String),
      expiresAt: { $gt: expect.any(Date) },
    })
  );
});

it("rejects a stale token when another request already advanced the round", async () => {
  collection.updateOne.mockResolvedValueOnce({ modifiedCount: 0 } as never);

  await expect(
    practiceRoundOps.advanceToken(current, { ...current, token: "other-token" })
  ).resolves.toBe(false);
});
