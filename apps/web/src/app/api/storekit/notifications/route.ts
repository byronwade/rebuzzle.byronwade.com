import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  decodeAppleNotification,
  decodeAppleTransaction,
  IOS_BUNDLE_ID,
  PLUS_PRODUCT_ID,
} from "@/lib/storekit/plus-entitlement";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY_BYTES = 64 * 1024;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** App Store Server Notifications V2: persist verified Plus refunds and revocations. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return json({ success: false, error: "Notification is too large" }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ success: false, error: "Invalid notification body" }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ success: false, error: "Invalid notification body" }, 400);
  }
  const signedPayload = (body as Record<string, unknown>).signedPayload;
  const notification = await decodeAppleNotification(signedPayload);
  if (!notification) return json({ success: false, error: "Invalid Apple signature" }, 400);

  const data = notification.data;
  if (!data?.signedTransactionInfo) return json({ success: true });
  if (data.bundleId !== IOS_BUNDLE_ID)
    return json({ success: false, error: "Unexpected application" }, 400);

  const transaction = await decodeAppleTransaction(data.signedTransactionInfo);
  if (
    !transaction ||
    transaction.bundleId !== IOS_BUNDLE_ID ||
    transaction.productId !== PLUS_PRODUCT_ID ||
    typeof transaction.transactionId !== "string"
  ) {
    // Valid notifications for other Rebuzzle products are acknowledged without changing Plus access.
    if (
      transaction &&
      transaction.bundleId === IOS_BUNDLE_ID &&
      transaction.productId !== PLUS_PRODUCT_ID
    ) {
      return json({ success: true });
    }
    return json({ success: false, error: "Invalid App Store transaction" }, 400);
  }

  const notificationType = notification.notificationType ?? "UNKNOWN";
  const signedDate = notification.signedDate;
  if (typeof signedDate !== "number" || !Number.isFinite(signedDate)) {
    return json({ success: false, error: "Invalid signed notification date" }, 400);
  }
  try {
    const isRefundReversed = notificationType === "REFUND_REVERSED";
    const isRevocation =
      transaction.revocationDate != null ||
      notificationType === "REFUND" ||
      notificationType === "REVOKE";
    if (isRefundReversed || isRevocation) {
      await db.storeKitOps.applyNotification({
        transactionId: transaction.transactionId,
        productId: transaction.productId,
        environment: String(transaction.environment ?? data.environment ?? "unknown"),
        notificationType,
        signedDate,
        revoked: !isRefundReversed,
      });
    }
  } catch (error) {
    console.error("Unable to persist App Store revocation notification:", error);
    return json({ success: false, error: "Unable to process notification" }, 500);
  }

  return json({ success: true });
}
