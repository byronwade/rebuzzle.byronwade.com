import { NextResponse } from "next/server"
import webpush from "web-push"
import { PushSubscriptionsRepo } from "@/db"

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(req: Request) {
  try {
    const { subscriptionId, email, userId } = await req.json()

    console.log("[Notifications] Sending test notification:", {
      subscriptionId,
      email,
      userId,
    })

    // Check if VAPID is configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error("[Notifications] VAPID keys not configured")
      return NextResponse.json(
        {
          success: false,
          error: "Push notification service not configured",
        },
        { status: 503 }
      )
    }

    if (!subscriptionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscription ID required",
        },
        { status: 400 }
      )
    }

    // Get the subscription from database using repository
    const result = await PushSubscriptionsRepo.findPushSubscriptionById(subscriptionId)

    if (!result.success) {
      console.error("[Notifications] Database error:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error.code === "NOT_FOUND"
            ? "Subscription not found"
            : "Failed to retrieve subscription",
          details: result.error.message,
        },
        { status: result.error.code === "NOT_FOUND" ? 404 : 500 }
      )
    }

    const subscription = result.data

    // Prepare the test notification payload
    const notificationPayload = {
      title: "🧩 Test Notification - Rebuzzle",
      body: "Great! You'll now receive daily puzzle reminders at 8 AM. Happy puzzling! 🎉",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: {
        url: "/",
        type: "test",
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "play",
          title: "🎮 Play Now",
          icon: "/icon-192x192.png",
        },
      ],
      requireInteraction: false,
      silent: false,
      tag: "test-notification",
      vibrate: [100, 50, 100],
      timestamp: Date.now(),
    }

    // Create push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.auth,
        p256dh: subscription.p256dh,
      },
    }

    try {
      // Send the test notification
      await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload), {
        TTL: 60 * 60, // 1 hour
        urgency: "normal",
      })

      console.log("[Notifications] Test notification sent successfully to:", subscriptionId)

      return NextResponse.json({
        success: true,
        message: "Test notification sent successfully",
      })
    } catch (pushError) {
      console.error("[Notifications] Push error:", pushError)

      // Handle specific push service errors
      if (pushError && typeof pushError === "object" && "statusCode" in pushError) {
        const error = pushError as { statusCode: number }
        if (error.statusCode === 410 || error.statusCode === 404) {
          return NextResponse.json(
            {
              success: false,
              error: "Subscription expired or invalid",
              details: "Please re-enable notifications",
            },
            { status: 410 }
          )
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send push notification",
          details: pushError instanceof Error ? pushError.message : "Unknown error",
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("[Notifications] Error sending test notification:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
