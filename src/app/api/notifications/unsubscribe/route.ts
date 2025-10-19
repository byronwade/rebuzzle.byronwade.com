import { NextResponse } from "next/server"
import { PushSubscriptionsRepo } from "@/db"

export async function POST(req: Request) {
  try {
    const { subscriptionId, userId, email } = await req.json()

    console.log("[Notifications] Unsubscribing:", {
      subscriptionId,
      userId,
      email,
    })

    if (!subscriptionId && !userId && !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscription ID, user ID, or email required",
        },
        { status: 400 }
      )
    }

    let result

    if (subscriptionId) {
      // Delete by subscription ID (most specific)
      result = await PushSubscriptionsRepo.deletePushSubscriptionById(subscriptionId)
    } else {
      // Delete by user identifier
      const userIdentifier = userId || email
      if (userIdentifier) {
        result = await PushSubscriptionsRepo.deletePushSubscriptionsByUser(userIdentifier)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "No valid identifier provided",
          },
          { status: 400 }
        )
      }
    }

    if (!result.success) {
      console.error("[Notifications] Database error:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to unsubscribe",
          details: result.error.message,
        },
        { status: 500 }
      )
    }

    const deletedCount = result.data.deletedCount

    if (deletedCount > 0) {
      console.log("[Notifications] Successfully unsubscribed:", deletedCount, "subscriptions")
      return NextResponse.json({
        success: true,
        message: "Successfully unsubscribed from notifications",
        deletedCount,
      })
    } else {
      console.log("[Notifications] No subscriptions found to delete")
      return NextResponse.json({
        success: true,
        message: "No active subscriptions found",
        deletedCount: 0,
      })
    }
  } catch (error) {
    console.error("[Notifications] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to unsubscribe",
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
