import { NextResponse } from "next/server"
import { PushSubscriptionsRepo } from "@/db"

export async function POST(req: Request) {
  try {
    const { subscription, email, userId, sendWelcomeEmail = false } = await req.json()

    console.log("[Notifications] Processing subscription request:", {
      hasSubscription: !!subscription,
      email,
      userId,
      sendWelcomeEmail,
    })

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "No subscription data provided" },
        { status: 400 }
      )
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription data" },
        { status: 400 }
      )
    }

    // Create user identifier - use userId if authenticated, otherwise use email
    const userIdentifier = userId || email
    if (!userIdentifier) {
      return NextResponse.json(
        { success: false, error: "User ID or email required" },
        { status: 400 }
      )
    }

    // Upsert the subscription using repository
    const result = await PushSubscriptionsRepo.upsertPushSubscription({
      userId: userIdentifier,
      endpoint: subscription.endpoint,
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
    })

    if (!result.success) {
      console.error("[Notifications] Database error:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save subscription to database",
          details: result.error.message,
        },
        { status: 500 }
      )
    }

    const savedSubscription = result.data

    console.log("[Notifications] Subscription saved:", savedSubscription.id)

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
      subscriptionId: savedSubscription.id,
      isUpdate: false, // Repository handles upsert internally
    })
  } catch (error) {
    console.error("[Notifications] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process subscription",
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
