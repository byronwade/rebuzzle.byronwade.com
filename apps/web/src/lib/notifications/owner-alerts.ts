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

type OwnerAlertRecord = OwnerAlert & { key: string; createdAt: Date };

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Email the owner at most once per alert type and date key. Never throws. */
export async function sendOwnerAlert(
  alert: OwnerAlert
): Promise<"sent" | "duplicate" | "not_configured" | "failed"> {
  const key = `${alert.type}:${alert.dateKey}`;
  try {
    await getCollection<OwnerAlertRecord>("ownerAlerts").insertOne({
      ...alert,
      key,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return "duplicate";
    }
    logger.error("Owner alert could not be recorded", toError(error), { key });
  }

  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!to) {
    logger.error("ADMIN_ALERT_EMAIL is not set; owner alert not emailed", undefined, {
      ...alert,
      key,
    });
    return "not_configured";
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
    return "sent";
  } catch (error) {
    logger.error("Owner alert email threw", toError(error), { key });
    return "failed";
  }
}
