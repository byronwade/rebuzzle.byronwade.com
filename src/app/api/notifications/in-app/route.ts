import { NextResponse } from "next/server";
import type { NewInAppNotification } from "@/db/models";
import { getCollection } from "@/db/mongodb";

/**
 * Get unread notifications for a user
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

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
 * Mark notification as read
 */
export async function PATCH(req: Request) {
  try {
    const { notificationId, userId } = await req.json();

    if (!(notificationId && userId)) {
      return NextResponse.json(
        { success: false, error: "Notification ID and user ID are required" },
        { status: 400 }
      );
    }

    const notificationsCollection = getCollection("inAppNotifications");

    const result = await notificationsCollection.updateOne(
      {
        id: notificationId,
        userId,
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
 * Create a new in-app notification
 */
export async function POST(req: Request) {
  try {
    const { userId, type, title, message, link } = await req.json();

    if (!(userId && type && title && message)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notificationsCollection =
      getCollection<NewInAppNotification>("inAppNotifications");

    const notification: NewInAppNotification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      link,
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

