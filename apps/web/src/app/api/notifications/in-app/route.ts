import { NextResponse } from "next/server";
import type { NewInAppNotification } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { sanitizeId } from "@/lib/api-validation";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { rateLimiters } from "@/lib/middleware/rate-limit";

/**
 * Get unread notifications for the authenticated user
 */
export async function GET(req: Request) {
  // Rate limit
  const rateLimitResult = await rateLimiters.api(req);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // Require authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Use authenticated user's ID, ignore any userId param to prevent unauthorized access
    const userId = authUser.userId;

    const notificationsCollection = getCollection("inAppNotifications");

    const notifications = await notificationsCollection
      .find({
        userId,
        read: false,
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
      })),
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("[Notifications] Get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * Mark notification as read (requires authentication)
 */
export async function PATCH(req: Request) {
  // Rate limit
  const rateLimitResult = await rateLimiters.api(req);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // Require authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Sanitize notification ID
    const sanitizedNotificationId = sanitizeId(notificationId);
    if (!sanitizedNotificationId) {
      return NextResponse.json(
        { success: false, error: "Invalid notification ID" },
        { status: 400 }
      );
    }

    const notificationsCollection = getCollection("inAppNotifications");

    // Use authenticated user's ID to ensure they can only mark their own notifications
    const result = await notificationsCollection.updateOne(
      {
        id: sanitizedNotificationId,
        userId: authUser.userId,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("[Notifications] Mark read error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark notification as read",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new in-app notification (internal use only - requires admin or system auth)
 * This endpoint is used by cron jobs and admin actions, not by regular users
 */
export async function POST(req: Request) {
  // Rate limit
  const rateLimitResult = await rateLimiters.api(req);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // Check for internal/cron authentication or admin auth
    const cronSecret = req.headers.get("x-cron-secret");
    const isInternalCall = cronSecret === process.env.CRON_SECRET && process.env.CRON_SECRET;

    if (!isInternalCall) {
      // If not internal, require admin authentication
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      // Check if user is admin (would need to look up user record)
      // For now, block non-internal requests to this endpoint
      return NextResponse.json(
        { success: false, error: "This endpoint is for internal use only" },
        { status: 403 }
      );
    }

    const { userId, type, title, message, link } = await req.json();

    if (!(userId && type && title && message)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedUserId = sanitizeId(userId);
    if (!sanitizedUserId) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const notificationsCollection = getCollection<NewInAppNotification>("inAppNotifications");

    const notification: NewInAppNotification = {
      id: crypto.randomUUID(),
      userId: sanitizedUserId,
      type: type.slice(0, 50), // Limit type length
      title: title.slice(0, 200), // Limit title length
      message: message.slice(0, 1000), // Limit message length
      link: link?.slice(0, 500), // Limit link length
      read: false,
      createdAt: new Date(),
    };

    await notificationsCollection.insertOne(notification);

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
    });
  } catch (error) {
    console.error("[Notifications] Create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create notification",
      },
      { status: 500 }
    );
  }
}
