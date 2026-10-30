jest.mock("@/db", () => ({
  db: { storeKitOps: { applyNotification: jest.fn() } },
}));
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  IOS_BUNDLE_ID: "com.byronwade.rebuzzle",
  PLUS_PRODUCT_ID: "com.byronwade.rebuzzle.plus",
  decodeAppleNotification: jest.fn(),
  decodeAppleTransaction: jest.fn(),
}));

import { db } from "@/db";
import { decodeAppleNotification, decodeAppleTransaction } from "@/lib/storekit/plus-entitlement";
import { POST } from "../route";

const notification = {
  notificationType: "REFUND",
  signedDate: 200,
  data: {
    bundleId: "com.byronwade.rebuzzle",
    environment: "Production",
    signedTransactionInfo: "signed-transaction",
  },
};
const transaction = {
  bundleId: "com.byronwade.rebuzzle",
  productId: "com.byronwade.rebuzzle.plus",
  transactionId: "transaction-8",
  environment: "Production",
  revocationDate: Date.now(),
};

function request(body: unknown) {
  return POST(
    new Request("https://rebuzzle.test/api/storekit/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(decodeAppleNotification).mockResolvedValue(notification as never);
  jest.mocked(decodeAppleTransaction).mockResolvedValue(transaction as never);
  jest.mocked(db.storeKitOps.applyNotification).mockResolvedValue(undefined);
});

it("records a verified Plus refund idempotently and does not expose cacheable data", async () => {
  const response = await request({ signedPayload: "signed-notification" });

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(decodeAppleNotification).toHaveBeenCalledWith("signed-notification");
  expect(decodeAppleTransaction).toHaveBeenCalledWith("signed-transaction");
  expect(db.storeKitOps.applyNotification).toHaveBeenCalledWith({
    transactionId: "transaction-8",
    productId: "com.byronwade.rebuzzle.plus",
    environment: "Production",
    notificationType: "REFUND",
    signedDate: 200,
    revoked: true,
  });
});

it("applies a refund reversal as the newer active state", async () => {
  jest.mocked(decodeAppleNotification).mockResolvedValueOnce({
    ...notification,
    notificationType: "REFUND_REVERSED",
  } as never);
  const response = await request({ signedPayload: "signed-notification" });

  expect(response.status).toBe(200);
  expect(db.storeKitOps.applyNotification).toHaveBeenCalledWith({
    transactionId: "transaction-8",
    productId: "com.byronwade.rebuzzle.plus",
    environment: "Production",
    notificationType: "REFUND_REVERSED",
    signedDate: 200,
    revoked: false,
  });
});

it("rejects invalid Apple signatures and oversized requests", async () => {
  jest.mocked(decodeAppleNotification).mockResolvedValueOnce(null);
  expect((await request({ signedPayload: "forged" })).status).toBe(400);
  expect(db.storeKitOps.applyNotification).not.toHaveBeenCalled();

  expect((await request("x".repeat(65_537))).status).toBe(413);
});

it("acknowledges signed non-Plus product notifications without changing Plus access", async () => {
  jest.mocked(decodeAppleTransaction).mockResolvedValueOnce({
    ...transaction,
    productId: "com.byronwade.other",
  } as never);

  const response = await request({ signedPayload: "signed-notification" });

  expect(response.status).toBe(200);
  expect(db.storeKitOps.applyNotification).not.toHaveBeenCalled();
});

it("rejects signed notifications without a signed ordering date", async () => {
  jest.mocked(decodeAppleNotification).mockResolvedValueOnce({
    ...notification,
    signedDate: undefined,
  } as never);

  const response = await request({ signedPayload: "signed-notification" });

  expect(response.status).toBe(400);
  expect(db.storeKitOps.applyNotification).not.toHaveBeenCalled();
});
