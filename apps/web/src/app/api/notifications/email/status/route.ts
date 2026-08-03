import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!(userId || email)) {
      return NextResponse.json(
        { success: false, error: "User ID or email is required" },
        { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    // Security: Verify authentication - user can only check their own subscription
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    // Verify the requested userId/email matches the authenticated user
    if (userId && authUser.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }
    if (email && authUser.email.toLowerCase() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
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

    return NextResponse.json(
      {
        success: true,
        enabled: subscription?.enabled,
        subscriptionId: subscription?.id,
      },
      { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("[Notifications] Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check subscription status",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
