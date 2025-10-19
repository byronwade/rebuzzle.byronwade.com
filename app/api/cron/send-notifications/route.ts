import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import webpush from "web-push"
import { PushSubscriptionsRepo, PuzzlesRepo } from "@/db"

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Notifications] Starting daily notification send...")

    // Check if VAPID is configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error("[Notifications] VAPID keys not configured")
      return NextResponse.json(
        {
          success: false,
          error: "VAPID keys not configured",
        },
        { status: 500 }
      )
    }

    // Get today's puzzle using repository
    const puzzleResult = await PuzzlesRepo.findTodaysPuzzle()

    if (!puzzleResult.success) {
      console.error("[Notifications] Error fetching puzzle:", puzzleResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch today's puzzle",
          details: puzzleResult.error.message,
        },
        { status: 500 }
      )
    }

    const todaysPuzzle = puzzleResult.data

    if (!todaysPuzzle) {
      console.log("[Notifications] No puzzle found for today")
      return NextResponse.json({
        success: false,
        error: "No puzzle available for today",
      })
    }

    // Get all active push subscriptions (updated in last 30 days)
    const subscriptionsResult = await PushSubscriptionsRepo.findActivePushSubscriptions(30)

    if (!subscriptionsResult.success) {
      console.error("[Notifications] Error fetching subscriptions:", subscriptionsResult.error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch subscriptions",
          details: subscriptionsResult.error.message,
        },
        { status: 500 }
      )
    }

    const subscriptions = subscriptionsResult.data

    console.log(`[Notifications] Found ${subscriptions.length} active subscriptions`)

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          pushNotificationsSent: 0,
          errors: 0,
          message: "No active subscriptions found",
        },
      })
    }

    // Prepare the notification payload optimized for mobile
    const notificationPayload = {
      title: "🧩 New Rebuzzle Puzzle Available!",
      body: "A fresh rebus puzzle is waiting for you. Can you solve today's challenge?",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      image: "/puzzle-preview.png",
      data: {
        url: "/",
        puzzleId: todaysPuzzle.id,
        timestamp: Date.now(),
        difficulty: todaysPuzzle.difficulty,
        type: "daily-puzzle",
      },
      actions: [
        {
          action: "play",
          title: "🎮 Play Now",
          icon: "/icon-192x192.png",
        },
        {
          action: "later",
          title: "⏰ Later",
          icon: "/icon-192x192.png",
        },
      ],
      requireInteraction: false,
      silent: false,
      tag: "daily-puzzle",
      renotify: true,
      vibrate: [100, 50, 100],
      timestamp: Date.now(),
      color: "#8b5cf6",
      sticky: false,
      sound: "default",
      dir: "auto",
      lang: "en-US",
    }

    const results = {
      pushNotificationsSent: 0,
      errors: 0,
      expiredSubscriptions: 0,
    }

    // Send notifications in batches to avoid overwhelming the system
    const batchSize = 100
    const batches = []
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      batches.push(subscriptions.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      const promises = batch.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          }

          await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload), {
            TTL: 24 * 60 * 60, // 24 hours
            urgency: "normal",
          })

          results.pushNotificationsSent++
          console.log(`[Notifications] Sent to subscription ${subscription.id}`)
        } catch (error: unknown) {
          const pushError = error as { statusCode?: number; message?: string }
          console.error(`[Notifications] Failed to send to ${subscription.id}:`, pushError.message)

          // Handle expired subscriptions
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(`[Notifications] Removing expired subscription ${subscription.id}`)
            const deleteResult = await PushSubscriptionsRepo.deletePushSubscriptionById(
              subscription.id
            )

            if (deleteResult.success) {
              results.expiredSubscriptions++
            } else {
              console.error(
                `[Notifications] Failed to delete expired subscription:`,
                deleteResult.error
              )
            }
          } else {
            results.errors++
          }
        }
      })

      // Wait for batch to complete before processing next batch
      await Promise.allSettled(promises)

      // Small delay between batches to be respectful to push services
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log("[Notifications] Daily notification send completed:", results)

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        puzzleTitle: `Puzzle for ${new Date().toDateString()}`,
        totalSubscriptions: subscriptions.length,
      },
    })
  } catch (error) {
    console.error("[Notifications] Error in notification cron:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for testing
  return POST(request)
}
