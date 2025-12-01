import { NextResponse } from "next/server";
import { getCollection } from "@/db/mongodb";

/**
 * POST /api/notifications/email/unsubscribe
 * Unsubscribe from email notifications
 */
export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json();

    if (!(email || userId)) {
      return NextResponse.json(
        { success: false, error: "Email or user ID is required" },
        { status: 400 }
      );
    }

    const subscriptionsCollection = getCollection("emailSubscriptions");

    const query: { email?: string; userId?: string } = {};
    if (email) {
      query.email = email.toLowerCase().trim();
    }
    if (userId) {
      query.userId = userId;
    }

    const result = await subscriptionsCollection.updateMany(query, {
      $set: {
        enabled: false,
        updatedAt: new Date(),
      },
    });

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
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");

    if (!(email || userId)) {
      return NextResponse.redirect(
        new URL("/unsubscribe?error=missing-params", req.url)
      );
    }

    const subscriptionsCollection = getCollection("emailSubscriptions");

    const query: { email?: string; userId?: string } = {};
    if (email) {
      query.email = email.toLowerCase().trim();
    }
    if (userId) {
      query.userId = userId;
    }

    const result = await subscriptionsCollection.updateMany(query, {
      $set: {
        enabled: false,
        updatedAt: new Date(),
      },
    });

    if (result.modifiedCount > 0) {
      // Redirect to success page
      return NextResponse.redirect(
        new URL(
          `/unsubscribe?email=${encodeURIComponent(email || "")}`,
          req.url
        )
      );
    }
    // No subscription found
    return NextResponse.redirect(
      new URL("/unsubscribe?error=not-found", req.url)
    );
  } catch (error) {
    console.error("[Notifications] Unsubscribe error:", error);
    return NextResponse.redirect(
      new URL("/unsubscribe?error=server-error", req.url)
    );
  }
}
