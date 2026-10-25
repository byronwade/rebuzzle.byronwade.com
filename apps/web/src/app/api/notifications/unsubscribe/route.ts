import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { subscriptionId, endpoint } = (await req.json().catch(() => ({}))) as {
      subscriptionId?: unknown;
      endpoint?: unknown;
    };

    // Only the signed-in user's own subscriptions can be removed.
    const pushSubscriptionsCollection = getCollection("pushSubscriptions");
    const owned = { userId: authUser.userId };
    const result =
      typeof subscriptionId === "string" && subscriptionId
        ? await pushSubscriptionsCollection.deleteOne({ ...owned, _id: subscriptionId as never })
        : typeof endpoint === "string" && endpoint
          ? await pushSubscriptionsCollection.deleteOne({ ...owned, endpoint })
          : await pushSubscriptionsCollection.deleteMany(owned);

    if (!result.acknowledged) {
      console.error("[Notifications] Database error: Failed to delete subscription");
      return NextResponse.json(
        {
          success: false,
          error: "Failed to unsubscribe",
        },
        { status: 500 }
      );
    }

    const deletedCount = result.deletedCount;

    if (deletedCount > 0) {
      console.log("[Notifications] Successfully unsubscribed:", deletedCount, "subscriptions");
      return NextResponse.json({
        success: true,
        message: "Successfully unsubscribed from notifications",
        deletedCount,
      });
    }
    console.log("[Notifications] No subscriptions found to delete");
    return NextResponse.json({
      success: true,
      message: "No active subscriptions found",
      deletedCount: 0,
    });
  } catch (error) {
    console.error("[Notifications] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to unsubscribe",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
