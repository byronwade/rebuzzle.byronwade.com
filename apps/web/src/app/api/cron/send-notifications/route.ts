import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { NewInAppNotification, User } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getAppUrl } from "@/lib/env";
import { sendDailyPuzzleEmail } from "@/lib/notifications/email-service";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // Vercel automatically adds this header for cron jobs
    const authHeader = request.headers.get("authorization");
    const vercelCronSecret = request.headers.get("x-vercel-cron-secret");

    // In production, require authentication
    const isProduction = process.env.NODE_ENV === "production";
    const cronSecret = process.env.CRON_SECRET;
    const vercelCronSecretEnv = process.env.VERCEL_CRON_SECRET;

    // Check Vercel cron secret first (automatically set by Vercel)
    if (vercelCronSecretEnv && vercelCronSecret !== vercelCronSecretEnv) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback to custom CRON_SECRET if Vercel secret not available
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (isProduction) {
      // In production, require at least one authentication method
      if (!vercelCronSecretEnv) {
        return NextResponse.json({ error: "Cron authentication not configured" }, { status: 500 });
      }
    }

    console.log("[Notifications] Starting daily notification send...");

    // Get today's puzzle
    const puzzlesCollection = getCollection("puzzles");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);  // Use UTC for consistent behavior

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
    const puzzleUrl = `${baseUrl}/?puzzle=${todaysPuzzle.id}`;

    // Get puzzle metadata for email
    const puzzleType = todaysPuzzle.puzzleType || "puzzle";
    const difficulty =
      typeof todaysPuzzle.difficulty === "string"
        ? todaysPuzzle.difficulty
        : `Level ${todaysPuzzle.difficulty}`;

    // Get all registered users (for sending to all users)
    const usersCollection = getCollection<User>("users");
    const allUsers = await usersCollection.find({}).toArray();

    // Get all active email subscriptions
    const emailSubscriptionsCollection = getCollection("emailSubscriptions");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);  // Use UTC for consistent behavior

    const emailSubscriptions = await emailSubscriptionsCollection
      .find({
        enabled: true,
        updatedAt: { $gte: thirtyDaysAgo },
      })
      .toArray();

    console.log(
      `[Notifications] Found ${emailSubscriptions.length} active email subscriptions and ${allUsers.length} registered users`
    );

    // Create a map of email to user for personalization
    const emailToUser = new Map<string, User>();
    for (const user of allUsers) {
      emailToUser.set(user.email.toLowerCase(), user);
    }

    // Send email notifications to all registered users (or just subscribers based on preference)
    // For now, send to all users who have email subscriptions enabled
    const emailResults = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Batch processing with delay to avoid rate limits
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1000; // 1 second between batches

    for (let i = 0; i < emailSubscriptions.length; i += BATCH_SIZE) {
      const batch = emailSubscriptions.slice(i, i + BATCH_SIZE);

      // Process batch in parallel using allSettled for better error handling
      const batchPromises = batch.map(async (subscription) => {
        const user = emailToUser.get(subscription.email.toLowerCase());
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(subscription.email)}`;

        const result = await sendDailyPuzzleEmail(subscription.email, puzzleUrl, {
          username: user?.username,
          puzzleType,
          difficulty,
          unsubscribeUrl,
        });

        if (result.success) {
          // Update last sent timestamp
          await emailSubscriptionsCollection.updateOne(
            { id: subscription.id },
            { $set: { lastSentAt: new Date() } }
          );
          return { success: true, email: subscription.email };
        }
        return {
          success: false,
          email: subscription.email,
          error: result.error,
        };
      });

      // Use allSettled to handle all results, even if some reject
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results from allSettled
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            emailResults.sent++;
          } else {
            emailResults.failed++;
            emailResults.errors.push(`${result.value.email}: ${result.value.error}`);
          }
        } else {
          // Promise was rejected (unexpected error)
          emailResults.failed++;
          const errorMessage = result.reason instanceof Error ? result.reason.message : "Unknown error";
          emailResults.errors.push(`Batch item failed: ${errorMessage}`);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < emailSubscriptions.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Create in-app notifications for authenticated users
    const notificationsCollection = getCollection<NewInAppNotification>("inAppNotifications");
    const inAppResults = {
      created: 0,
      failed: 0,
    };

    // Get unique user IDs from email subscriptions
    const userIds = new Set(
      emailSubscriptions.map((s) => s.userId).filter((id): id is string => Boolean(id))
    );

    for (const userId of userIds) {
      try {
        const notification: NewInAppNotification = {
          id: crypto.randomUUID(),
          userId,
          type: "puzzle_ready",
          title: "🧩 New Puzzle Available!",
          message: "Today's Rebuzzle is ready to solve. Can you crack it?",
          link: puzzleUrl,
          read: false,
          createdAt: new Date(),
        };

        await notificationsCollection.insertOne(notification);
        inAppResults.created++;
      } catch (error) {
        inAppResults.failed++;
        console.error(
          `[Notifications] Failed to create in-app notification for user ${userId}:`,
          error
        );
      }
    }

    console.log("[Notifications] Daily notification send completed:", {
      emails: emailResults,
      inApp: inAppResults,
    });

    return NextResponse.json({
      success: true,
      message: "Notifications sent",
      results: {
        emails: emailResults,
        inApp: inAppResults,
      },
    });
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
