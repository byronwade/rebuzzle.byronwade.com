import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import { sendEmail } from "./email-service";

export type OwnerAlertType =
  | "backup_used"
  | "daily_puzzle_unavailable"
  | "unapproved_live_row"
  | "scheduled_approval_stale";

export type OwnerAlert = {
  type: OwnerAlertType;
  level: "info" | "warning" | "urgent";
  dateKey: string;
  message: string;
};

type OwnerAlertRecord = OwnerAlert & {
  key: string;
  createdAt: Date;
  attemptedAt: Date;
  sentAt?: Date;
};

/** A failed send may be retried after this long; until then repeats are duplicates. */
export const OWNER_ALERT_RETRY_MS = 10 * 60 * 1000;

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const isDuplicateKey = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);

/**
 * Claim the right to email this alert. Callers sit on public routes, so this fails closed:
 * an unrecorded alert is never emailed, and each key gets one attempt per retry window
 * even if the unique index is missing.
 */
async function claimSendAttempt(
  alert: OwnerAlert,
  key: string,
  now: Date
): Promise<"claimed" | "duplicate"> {
  const alerts = getCollection<OwnerAlertRecord>("ownerAlerts");
  const existing = await alerts.findOne({ key });
  if (!existing) {
    try {
      await alerts.insertOne({ ...alert, key, createdAt: now, attemptedAt: now });
      return "claimed";
    } catch (error) {
      if (isDuplicateKey(error)) return "duplicate";
      throw error;
    }
  }
  const lastAttempt = existing.attemptedAt ?? existing.createdAt;
  if (existing.sentAt || now.getTime() - lastAttempt.getTime() < OWNER_ALERT_RETRY_MS) {
    return "duplicate";
  }
  const retry = await alerts.updateOne(
    { key, sentAt: { $exists: false }, attemptedAt: lastAttempt },
    { $set: { attemptedAt: now } }
  );
  return retry.modifiedCount === 1 ? "claimed" : "duplicate";
}

/** Email the owner at most once per alert type and date key. Never throws. */
export async function sendOwnerAlert(
  alert: OwnerAlert
): Promise<"sent" | "duplicate" | "not_configured" | "failed"> {
  const key = `${alert.type}:${alert.dateKey}`;
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) {
    // Checked before recording, so the alert still fires once email is configured.
    logger.error("ADMIN_ALERT_EMAIL is not set; owner alert not emailed", undefined, {
      ...alert,
      key,
    });
    return "not_configured";
  }

  try {
    if ((await claimSendAttempt(alert, key, new Date())) === "duplicate") return "duplicate";
  } catch (error) {
    logger.error("Owner alert could not be recorded; not emailed", toError(error), {
      ...alert,
      key,
    });
    return "failed";
  }

  try {
    const result = await sendEmail({
      to,
      subject: `[Rebuzzle ${alert.level.toUpperCase()}] ${alert.type} ${alert.dateKey}`,
      html: `<p>${escapeHtml(alert.message)}</p>`,
      text: alert.message,
    });
    if (!result.success) {
      logger.error("Owner alert email failed", new Error(result.error ?? "unknown"), { key });
      return "failed";
    }
  } catch (error) {
    logger.error("Owner alert email threw", toError(error), { key });
    return "failed";
  }

  try {
    await getCollection<OwnerAlertRecord>("ownerAlerts").updateOne(
      { key },
      { $set: { sentAt: new Date() } }
    );
  } catch (error) {
    // The email went out; a missing sentAt only allows one more send after the cooldown.
    logger.warn("Owner alert sent but not marked sent", { key, error: toError(error).message });
  }
  return "sent";
}
