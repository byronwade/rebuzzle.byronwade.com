import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!(userId || email)) {
      return NextResponse.json(
        { success: false, error: "User ID or email is required" },
        { status: 400 }
      );
    }

    const subscriptionsCollection = getCollection("emailSubscriptions");

    const query: { userId?: string; email?: string } = {};
    if (userId) {
      query.userId = userId;
    }
    if (email) {
      query.email = email.toLowerCase().trim();
    }

    const subscription = await subscriptionsCollection.findOne(query);

    return NextResponse.json({
      success: true,
      enabled: subscription?.enabled,
      subscriptionId: subscription?.id,
    });
  } catch (error) {
    console.error("[Notifications] Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check subscription status",
      },
      { status: 500 }
    );
  }
}

