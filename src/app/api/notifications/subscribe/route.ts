import { NextResponse } from "next/server"
import { getCollection } from "@/db/mongodb-client"

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
    const pushSubscriptionsCollection = getCollection('pushSubscriptions')
    const result = await pushSubscriptionsCollection.replaceOne(
      { endpoint: subscription.endpoint },
      {
        userId: userId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers.get('user-agent') || null,
        email: email || null,
        sendWelcomeEmail,
        createdAt: new Date(),
      },
      { upsert: true }
    )

    if (!result.acknowledged) {
      console.error("[Notifications] Database error: Failed to save subscription")
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save subscription to database",
        },
        { status: 500 }
      )
    }

    console.log("[Notifications] Subscription saved successfully")

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
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
