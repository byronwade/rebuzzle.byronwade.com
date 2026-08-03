import { NextResponse } from "next/server";
import type { User, UserStats } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { authorizeCron } from "@/lib/cron/auth";
import { getAppUrl } from "@/lib/env";
import { sendStreakAtRiskEmail } from "@/lib/notifications/email-service";

/**
 * Evening streak-at-risk emails (loss aversion).
 * Vercel cron uses GET — export both methods.
 */
const MIN_STREAK_FOR_NOTIFICATION = 3;

async function handleStreakReminder() {
  console.log("[Streak Reminder] Starting streak at risk notification check...");

  const baseUrl = getAppUrl();
  const puzzleUrl = baseUrl;

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const userStatsCollection = getCollection<UserStats>("userStats");
  const usersCollection = getCollection<User>("users");
  const emailSubscriptionsCollection = getCollection("emailSubscriptions");

  const usersAtRisk = await userStatsCollection
    .find({
      streak: { $gte: MIN_STREAK_FOR_NOTIFICATION },
      $or: [{ lastPlayDate: { $lt: todayStart } }, { lastPlayDate: { $exists: false } }],
    })
    .toArray();

  console.log(`[Streak Reminder] Found ${usersAtRisk.length} users with streaks at risk`);

  if (usersAtRisk.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No users with at-risk streaks",
      results: { sent: 0, skipped: 0, failed: 0 },
    });
  }

  const userIds = usersAtRisk.map((s) => s.userId);
  const users = await usersCollection.find({ id: { $in: userIds } }).toArray();
  const userMap = new Map(users.map((u) => [u.id, u]));

  const subscriptions = await emailSubscriptionsCollection
    .find({
      userId: { $in: userIds },
      enabled: true,
      $or: [
        { lastStreakReminderAt: { $lt: todayStart } },
        { lastStreakReminderAt: { $exists: false } },
      ],
    })
    .toArray();

  const subscriptionMap = new Map(subscriptions.map((s) => [s.userId, s]));

  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    failures: [] as string[],
  };

  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < usersAtRisk.length; i += BATCH_SIZE) {
    const batch = usersAtRisk.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (stats) => {
      const user = userMap.get(stats.userId);
      const subscription = subscriptionMap.get(stats.userId);

      if (!user || !subscription) {
        results.skipped++;
        return;
      }

      if (user.isGuest) {
        results.skipped++;
        return;
      }

      try {
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(user.email)}`;
        const result = await sendStreakAtRiskEmail(user.email, {
          username: user.username,
          currentStreak: stats.streak,
          puzzleUrl,
          unsubscribeUrl,
        });

        if (result.success) {
          results.sent++;
          await emailSubscriptionsCollection.updateOne(
            { id: subscription.id },
            { $set: { lastStreakReminderAt: new Date() } }
          );
        } else {
          results.failed++;
          results.failures.push(`${user.email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        const failureText = error instanceof Error ? error.message : "Unknown error";
        results.failures.push(`${user.email}: ${failureText}`);
      }
    });

    await Promise.all(batchPromises);

    if (i + BATCH_SIZE < usersAtRisk.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log("[Streak Reminder] Notification send completed:", results);

  return NextResponse.json({
    success: true,
    message: "Streak reminder notifications sent",
    results: {
      sent: results.sent,
      skipped: results.skipped,
      failed: results.failed,
      usersAtRisk: usersAtRisk.length,
    },
  });
}

export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) return auth.response;
  try {
    return await handleStreakReminder();
  } catch (error) {
    console.error("[Streak Reminder] Error in streak reminder cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send streak reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
