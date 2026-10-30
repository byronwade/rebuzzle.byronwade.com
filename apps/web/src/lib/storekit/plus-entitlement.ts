import {
  Environment,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  Type,
} from "@apple/app-store-server-library";
import { db } from "@/db";
import { APPLE_ROOT_CERTIFICATES } from "./apple-root-certificates";

export const STOREKIT_TRANSACTION_HEADER = "X-Rebuzzle-StoreKit-Transaction";
export const PLUS_PRODUCT_ID = "com.byronwade.rebuzzle.plus";
export const IOS_BUNDLE_ID = "com.byronwade.rebuzzle";
export const IOS_APPLE_APP_ID = 6827099582;

const MAX_JWS_LENGTH = 16_384;
const JWS_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const environments = [Environment.SANDBOX, Environment.PRODUCTION] as const;
const verifiers = new Map<Environment, SignedDataVerifier>();

function verifier(environment: Environment): SignedDataVerifier {
  const cached = verifiers.get(environment);
  if (cached) return cached;

  const instance = new SignedDataVerifier(
    APPLE_ROOT_CERTIFICATES,
    true,
    environment,
    IOS_BUNDLE_ID,
    environment === Environment.PRODUCTION ? IOS_APPLE_APP_ID : undefined
  );
  verifiers.set(environment, instance);
  return instance;
}

function isValidJWS(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_JWS_LENGTH && JWS_PATTERN.test(value);
}

function isAllowedEntitlementEnvironment(environment: string | undefined): boolean {
  if (environment === Environment.PRODUCTION) return true;
  return (
    environment === Environment.SANDBOX &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.STOREKIT_ALLOW_SANDBOX_TRANSACTIONS === "true"
  );
}

export async function decodeAppleTransaction(
  signedTransaction: unknown
): Promise<JWSTransactionDecodedPayload | null> {
  if (!isValidJWS(signedTransaction)) return null;

  for (const environment of environments) {
    try {
      const transaction = await verifier(environment).verifyAndDecodeTransaction(signedTransaction);
      if (transaction.environment !== environment) continue;
      return transaction;
    } catch {
      // A transaction is signed for exactly one App Store environment.
    }
  }
  return null;
}

export async function decodeAppleNotification(
  signedPayload: unknown
): Promise<ResponseBodyV2DecodedPayload | null> {
  if (!isValidJWS(signedPayload)) return null;

  for (const environment of environments) {
    try {
      const notification = await verifier(environment).verifyAndDecodeNotification(signedPayload);
      if (notification.data?.environment && notification.data.environment !== environment) continue;
      return notification;
    } catch {
      // Try the other environment before rejecting the notification.
    }
  }
  return null;
}

export async function verifyPlusTransaction(
  signedTransaction: unknown
): Promise<JWSTransactionDecodedPayload | null> {
  const transaction = await decodeAppleTransaction(signedTransaction);
  if (
    !transaction ||
    transaction.productId !== PLUS_PRODUCT_ID ||
    transaction.bundleId !== IOS_BUNDLE_ID ||
    transaction.type !== Type.NON_CONSUMABLE ||
    !isAllowedEntitlementEnvironment(transaction.environment) ||
    typeof transaction.transactionId !== "string" ||
    typeof transaction.originalTransactionId !== "string" ||
    transaction.revocationDate != null ||
    transaction.isUpgraded === true ||
    (typeof transaction.purchaseDate === "number" &&
      transaction.purchaseDate > Date.now() + 5 * 60_000)
  ) {
    return null;
  }

  try {
    if (await db.storeKitOps.isTransactionRevoked(transaction.transactionId)) return null;
  } catch (error) {
    console.error("Unable to confirm App Store transaction status:", error);
    return null;
  }
  return transaction;
}

export async function hasPlusEntitlement(request: Request): Promise<boolean> {
  const transaction = await verifyPlusTransaction(request.headers.get(STOREKIT_TRANSACTION_HEADER));
  return transaction !== null;
}
