jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

import { getCollection } from "@/db/mongodb";
import { storeKitOps } from "@/db/operations";

const collection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCollection).mockReturnValue(collection as never);
  collection.findOne.mockResolvedValue(null);
  collection.updateOne.mockResolvedValue({ acknowledged: true } as never);
});

it("marks a transaction revoked only if the signed Apple event is newer", async () => {
  await storeKitOps.applyNotification({
    transactionId: "tx-1",
    productId: "com.byronwade.rebuzzle.plus",
    environment: "Production",
    notificationType: "REFUND",
    signedDate: 200,
    revoked: true,
  });

  expect(getCollection).toHaveBeenCalledWith("storeKitRevocations");
  expect(collection.updateOne).toHaveBeenCalledWith(
    {
      _id: "tx-1",
      $or: [{ signedDate: { $lt: 200 } }, { signedDate: { $exists: false } }],
    },
    {
      $set: {
        transactionId: "tx-1",
        productId: "com.byronwade.rebuzzle.plus",
        environment: "Production",
        notificationType: "REFUND",
        signedDate: 200,
        revoked: true,
        updatedAt: expect.any(Date),
      },
    },
    { upsert: true }
  );
});

it("ignores a duplicate-key upsert from an older out-of-order event", async () => {
  const duplicateKey = Object.assign(new Error("duplicate key"), { code: 11000 });
  collection.updateOne.mockRejectedValueOnce(duplicateKey);

  await storeKitOps.applyNotification({
    transactionId: "tx-1",
    productId: "com.byronwade.rebuzzle.plus",
    environment: "Production",
    notificationType: "REFUND",
    signedDate: 100,
    revoked: true,
  });

  expect(collection.updateOne).toHaveBeenCalledTimes(2);
  expect(collection.updateOne.mock.calls[1]?.[0]).toEqual({
    _id: "tx-1",
    $or: [{ signedDate: { $lt: 100 } }, { signedDate: { $exists: false } }],
  });
  expect(collection.updateOne.mock.calls[1]?.[2]).toBeUndefined();
});

it("checks only the latest revocation state", async () => {
  collection.findOne.mockResolvedValueOnce(null);
  collection.findOne.mockResolvedValueOnce({ _id: "tx-1" });

  await expect(storeKitOps.isTransactionRevoked("tx-1")).resolves.toBe(false);
  await expect(storeKitOps.isTransactionRevoked("tx-1")).resolves.toBe(true);
  expect(collection.findOne).toHaveBeenNthCalledWith(
    1,
    { _id: "tx-1", $or: [{ revoked: true }, { revoked: { $exists: false } }] },
    { projection: { _id: 1 } }
  );
});
