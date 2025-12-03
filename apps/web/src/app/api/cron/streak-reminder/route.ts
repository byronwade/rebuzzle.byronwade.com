import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { User, UserStats } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getAppUrl } from "@/lib/env";
import { sendStreakAtRiskEmail } from "@/lib/notifications/email-service";

/**
 * Streak At Risk Notification Cron
 *
 * Psychology: Loss aversion - people feel losses 2x more than gains.
 * This cron job runs in the evening (around 8pm) to remind users
 * who haven't played today but have an active streak.
 *
 * Subtle approach:
 * - Only sends to users with streak >= 3 (meaningful streaks)
 * - Only sends once per day
 * - Encouraging message, no guilt-tripping
 * - Easy to unsubscribe
 */

// Minimum streak to send notifications for
const MIN_STREAK_FOR_NOTIFICATION = 3;

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

    const isProduction = process.env.NODE_ENV === "production";
    const cronSecret = process.env.CRON_SECRET;
    const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

    // Check Vercel cron secret first
    if (vercelCronSecretEnv && vercelCronSecret !== vercelCronSecretEnv) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback to custom CRON_SECRET
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (isProduction && !vercelCronSecretEnv) {
      return NextResponse.json({ error: "Cron authentication not configured" }, { status: 500 });
    }

    console.log("[Streak Reminder] Starting streak at risk notification check...");

    const baseUrl = getAppUrl();
    const puzzleUrl = baseUrl;

    // Get today's date bounds (use UTC for consistency across server locations)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    // Get users with active streaks who haven't played today
    const userStatsCollection = getCollection<UserStats>("userStats");
    const usersCollection = getCollection<User>("users");
    const emailSubscriptionsCollection = getCollection("emailSubscriptions");

    // Find users with streak >= MIN_STREAK who haven't played today
    const usersAtRisk = await userStatsCollection
      .find({
        streak: { $gte: MIN_STREAK_FOR_NOTIFICATION },
        $or: [
          { lastPlayDate: { $lt: todayStart } }, // Played before today
          { lastPlayDate: { $exists: false } }, // Never recorded play date
        ],
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

    // Get user details and email subscriptions
    const userIds = usersAtRisk.map((s) => s.userId);
    const users = await usersCollection.find({ id: { $in: userIds } }).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get active email subscriptions that haven't received a reminder today
    const subscriptions = await emailSubscriptionsCollection
      .find({
        userId: { $in: userIds },
        enabled: true,
        $or: [
          { lastStreakReminderAt: { $lt: todayStart } }, // Last reminder was before today
          { lastStreakReminderAt: { $exists: false } }, // Never sent a reminder
        ],
      })
      .toArray();

    // Create map of userId to subscription
    const subscriptionMap = new Map(subscriptions.map((s) => [s.userId, s]));

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process users with rate limiting
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1000;

    for (let i = 0; i < usersAtRisk.length; i += BATCH_SIZE) {
      const batch = usersAtRisk.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (stats) => {
        const user = userMap.get(stats.userId);
        const subscription = subscriptionMap.get(stats.userId);

        // Skip if no user found or no active subscription
        if (!user || !subscription) {
          results.skipped++;
          return { success: false, reason: "no_subscription" };
        }

        // Skip guest users
        if (user.isGuest) {
          results.skipped++;
          return { success: false, reason: "guest_user" };
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
            // Update last notification timestamp to prevent duplicate sends
            await emailSubscriptionsCollection.updateOne(
              { id: subscription.id },
              { $set: { lastStreakReminderAt: new Date() } }
            );
            return { success: true, email: user.email };
          }

          results.failed++;
          results.errors.push(`${user.email}: ${result.error}`);
          return { success: false, email: user.email, error: result.error };
        } catch (error) {
          results.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`${user.email}: ${errorMessage}`);
          return { success: false, email: user.email, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches
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
