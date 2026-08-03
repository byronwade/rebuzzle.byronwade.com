import { NextResponse } from "next/server";
import type { NewInAppNotification } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { authorizeCron } from "@/lib/cron/auth";
import { getAppUrl } from "@/lib/env";
import { sendDailyPuzzleEmail } from "@/lib/notifications/email-service";
import {
  getActiveEmailRecipients,
  getInAppPuzzleRecipientIds,
} from "@/lib/notifications/subscribers";

/**
 * Afternoon puzzle-ready emails for the notification list.
 * Vercel cron uses GET — export both methods.
 */
async function handleSendPuzzleEmails() {
  console.log("[Notifications] Starting afternoon puzzle notification send...");

  const puzzlesCollection = getCollection("puzzles");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todaysPuzzle = await puzzlesCollection.findOne({
    publishedAt: { $gte: today },
  });

  if (!todaysPuzzle) {
    console.error("[Notifications] No puzzle found for today");
    return NextResponse.json(
      { success: false, error: "No puzzle found for today" },
      { status: 500 }
    );
  }

  const baseUrl = getAppUrl();
  const puzzleUrl = `${baseUrl}/`;
  const puzzleType = todaysPuzzle.puzzleType || "puzzle";
  const difficulty =
    typeof todaysPuzzle.difficulty === "string"
      ? todaysPuzzle.difficulty
      : `Level ${todaysPuzzle.difficulty}`;

  const recipients = await getActiveEmailRecipients();
  const emailSubscriptionsCollection = getCollection("emailSubscriptions");

  console.log(`[Notifications] Sending puzzle emails to ${recipients.length} subscribers`);

  const emailResults = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (recipient) => {
      const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
      const result = await sendDailyPuzzleEmail(recipient.email, puzzleUrl, {
        username: recipient.username,
        puzzleType,
        difficulty,
        unsubscribeUrl,
      });

      if (result.success) {
        await emailSubscriptionsCollection.updateOne(
          { email: recipient.email },
          { $set: { lastSentAt: new Date() } }
        );
        return { success: true as const, email: recipient.email };
      }
      return {
        success: false as const,
        email: recipient.email,
        error: result.error,
      };
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          emailResults.sent++;
        } else {
          emailResults.failed++;
          emailResults.errors.push(`${result.value.email}: ${result.value.error}`);
        }
      } else {
        emailResults.failed++;
        const errorMessage =
          result.reason instanceof Error ? result.reason.message : "Unknown error";
        emailResults.errors.push(`Batch item failed: ${errorMessage}`);
      }
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const notificationsCollection = getCollection<NewInAppNotification>("inAppNotifications");
  const inAppResults = { created: 0, failed: 0 };
  // Inbox is for signed-in players — not gated on email opt-in.
  const userIds = new Set(await getInAppPuzzleRecipientIds());

  for (const userId of userIds) {
    try {
      await notificationsCollection.insertOne({
        id: crypto.randomUUID(),
        userId,
        type: "puzzle_ready",
        title: "Today's puzzle",
        message: "Ready when you are.",
        link: puzzleUrl,
        read: false,
        createdAt: new Date(),
      });
      inAppResults.created++;
    } catch (error) {
      inAppResults.failed++;
      console.error(`[Notifications] Failed in-app notification for ${userId}:`, error);
    }
  }

  console.log("[Notifications] Afternoon puzzle emails completed:", {
    emails: emailResults,
    inApp: inAppResults,
  });

  return NextResponse.json({
    success: true,
    message: "Puzzle notifications sent",
    results: { emails: emailResults, inApp: inAppResults },
  });
}

export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) return auth.response;
  try {
    return await handleSendPuzzleEmails();
  } catch (error) {
    console.error("[Notifications] Error in notification cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
