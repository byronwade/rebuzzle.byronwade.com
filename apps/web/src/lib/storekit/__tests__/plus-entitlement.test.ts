const mockVerifyTransaction = jest.fn();
const mockVerifyNotification = jest.fn();
const mockVerifierConstructor = jest.fn();
const mockIsTransactionRevoked = jest.fn();

jest.mock("@apple/app-store-server-library", () => ({
  Environment: { SANDBOX: "Sandbox", PRODUCTION: "Production" },
  Type: { NON_CONSUMABLE: "Non-Consumable" },
  SignedDataVerifier: mockVerifierConstructor,
}));
jest.mock("@/db", () => ({
  db: { storeKitOps: { isTransactionRevoked: mockIsTransactionRevoked } },
}));

import { Environment, Type } from "@apple/app-store-server-library";
import { db } from "@/db";
import {
  decodeAppleNotification,
  decodeAppleTransaction,
  hasPlusEntitlement,
  IOS_APPLE_APP_ID,
  IOS_BUNDLE_ID,
  PLUS_PRODUCT_ID,
  STOREKIT_TRANSACTION_HEADER,
  verifyPlusTransaction,
} from "../plus-entitlement";

const validJws = "eyJhbGciOiJFUzI1NiJ9.e30.c2ln";
const transaction = {
  productId: PLUS_PRODUCT_ID,
  bundleId: IOS_BUNDLE_ID,
  transactionId: "transaction-1",
  originalTransactionId: "original-1",
  type: Type.NON_CONSUMABLE,
  environment: Environment.SANDBOX,
  purchaseDate: Date.now() - 60_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.VERCEL_ENV;
  process.env.STOREKIT_ALLOW_SANDBOX_TRANSACTIONS = "true";
  mockIsTransactionRevoked.mockResolvedValue(false);
  mockVerifyTransaction.mockImplementation(async () => transaction);
  mockVerifyNotification.mockResolvedValue({ notificationType: "TEST" });
  mockVerifierConstructor.mockImplementation(
    (_roots, onlineChecks, environment, bundleId, appAppleId) => {
      if (environment === Environment.PRODUCTION) {
        expect(onlineChecks).toBe(true);
        expect(bundleId).toBe(IOS_BUNDLE_ID);
        expect(appAppleId).toBe(IOS_APPLE_APP_ID);
      }
      return {
        verifyAndDecodeTransaction: async (jws: string) => {
          const decoded = await mockVerifyTransaction(jws);
          return { ...decoded, environment: decoded.environment ?? environment };
        },
        verifyAndDecodeNotification: mockVerifyNotification,
      };
    }
  );
});

it("verifies the signed transaction for the configured Plus non-consumable", async () => {
  await expect(verifyPlusTransaction(validJws)).resolves.toMatchObject(transaction);
  expect(mockVerifyTransaction).toHaveBeenCalledWith(validJws);
  expect(db.storeKitOps.isTransactionRevoked).toHaveBeenCalledWith("transaction-1");
});

it("rejects sandbox entitlements in production even when sandbox is enabled elsewhere", async () => {
  process.env.VERCEL_ENV = "production";

  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
  expect(db.storeKitOps.isTransactionRevoked).not.toHaveBeenCalled();
});

it("requires an explicit setting before accepting sandbox entitlements outside production", async () => {
  delete process.env.STOREKIT_ALLOW_SANDBOX_TRANSACTIONS;

  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
  expect(db.storeKitOps.isTransactionRevoked).not.toHaveBeenCalled();
});

it("falls back to Apple’s production verifier with the App Store app ID", async () => {
  mockVerifyTransaction.mockRejectedValueOnce(new Error("Not a sandbox transaction"));
  mockVerifyTransaction.mockResolvedValueOnce({
    ...transaction,
    environment: Environment.PRODUCTION,
  });

  await expect(decodeAppleTransaction(validJws)).resolves.toMatchObject({
    environment: Environment.PRODUCTION,
  });
  expect(mockVerifierConstructor).toHaveBeenCalledWith(
    expect.any(Array),
    true,
    Environment.PRODUCTION,
    IOS_BUNDLE_ID,
    IOS_APPLE_APP_ID
  );
});

it("rejects StoreKit local testing and any other non-sandbox environment", async () => {
  mockVerifyTransaction.mockResolvedValueOnce({ ...transaction, environment: "Xcode" });
  mockVerifyTransaction.mockResolvedValueOnce({ ...transaction, environment: "Xcode" });

  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
});

it("rejects missing, malformed, unrelated, upgraded, and revoked transaction proofs", async () => {
  await expect(verifyPlusTransaction(null)).resolves.toBeNull();
  await expect(verifyPlusTransaction("not-a-jws")).resolves.toBeNull();

  mockVerifyTransaction.mockResolvedValueOnce({ ...transaction, productId: "other.product" });
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();

  mockVerifyTransaction.mockResolvedValueOnce({
    ...transaction,
    bundleId: "com.attacker.other-app",
  });
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();

  mockVerifyTransaction.mockResolvedValueOnce({ ...transaction, isUpgraded: true });
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();

  mockVerifyTransaction.mockResolvedValueOnce({ ...transaction, revocationDate: Date.now() });
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();

  mockIsTransactionRevoked.mockResolvedValueOnce(true);
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
});

it("fails closed when neither Apple environment verifies the signature or revocation lookup", async () => {
  mockVerifyTransaction.mockRejectedValue(new Error("Invalid Apple signature"));
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
  expect(mockVerifyTransaction).toHaveBeenCalledTimes(2);

  mockVerifyTransaction.mockImplementation(async () => transaction);
  mockIsTransactionRevoked.mockRejectedValueOnce(new Error("Database unavailable"));
  jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(verifyPlusTransaction(validJws)).resolves.toBeNull();
});

it("requires a verified Apple transaction in the request header", async () => {
  await expect(
    hasPlusEntitlement(new Request("https://rebuzzle.test/api/puzzles/archive"))
  ).resolves.toBe(false);
  const request = new Request("https://rebuzzle.test/api/puzzles/archive", {
    headers: { [STOREKIT_TRANSACTION_HEADER]: validJws },
  });
  await expect(hasPlusEntitlement(request)).resolves.toBe(true);
});

it("verifies App Store notification signatures and rejects malformed payloads", async () => {
  const notification = await decodeAppleNotification(validJws);
  expect(notification).toEqual({ notificationType: "TEST" });
  expect(mockVerifyNotification).toHaveBeenCalledWith(validJws);
  await expect(decodeAppleNotification("bad")).resolves.toBeNull();
  await expect(decodeAppleTransaction("bad")).resolves.toBeNull();
});
