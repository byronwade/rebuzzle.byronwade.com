import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

/**
 * POST /api/notifications/email/unsubscribe
 * Unsubscribe from email notifications
 * Requires authentication - users can only unsubscribe their own email
 */
export async function POST(req: Request) {
  try {
    // Require authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { email, userId } = await req.json();

    if (!(email || userId)) {
      return NextResponse.json(
        { success: false, error: "Email or user ID is required" },
        { status: 400 }
      );
    }

    // Security: Verify user can only unsubscribe their own email/userId
    if (userId && userId !== authUser.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (email && email.toLowerCase().trim() !== authUser.email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionsCollection = getCollection("emailSubscriptions");

    // Use updateOne instead of updateMany to only affect the specific user's subscription
    const result = await subscriptionsCollection.updateOne(
      { userId: authUser.userId },
      {
        $set: {
          enabled: false,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Email notifications disabled",
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("[Notifications] Unsubscribe error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to disable email notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/email/unsubscribe
 * One-click unsubscribe via email link
 * Security: Uses updateOne to prevent bulk operations, returns consistent response to prevent enumeration
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");

    if (!(email || userId)) {
      return NextResponse.redirect(new URL("/unsubscribe?error=missing-params", req.url));
    }

    const subscriptionsCollection = getCollection("emailSubscriptions");

    // Build query - only one identifier at a time to prevent bulk operations
    const query: { email?: string; userId?: string } = {};
    if (userId) {
      // Prefer userId as it's more specific
      query.userId = userId;
    } else if (email) {
      query.email = email.toLowerCase().trim();
    }

    // Use updateOne to only affect a single subscription (security fix)
    const result = await subscriptionsCollection.updateOne(query, {
      $set: {
        enabled: false,
        updatedAt: new Date(),
      },
    });

    // Always redirect to success page to prevent email enumeration
    // Don't reveal whether email exists or not
    if (result.modifiedCount > 0) {
      // Actually unsubscribed
      return NextResponse.redirect(new URL("/unsubscribe?success=true", req.url));
    }
    // No subscription found or already unsubscribed - still show success to prevent enumeration
    return NextResponse.redirect(new URL("/unsubscribe?success=true", req.url));
  } catch (error) {
    console.error("[Notifications] Unsubscribe error:", error);
    return NextResponse.redirect(new URL("/unsubscribe?error=server-error", req.url));
  }
}
