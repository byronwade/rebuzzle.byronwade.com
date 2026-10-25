import { NextResponse } from "next/server";
import type { NewEmailSubscription } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { sendNotificationWelcomeEmail } from "@/lib/notifications/email-service";

// Each new subscription sends a welcome email, so cap it per IP.
const subscribeLimit = rateLimit({
  name: "email-subscribe",
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
});

export async function POST(req: Request) {
  const limit = await subscribeLimit(req);
  if (limit && !limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } }
    );
  }

  try {
    const { email } = (await req.json()) as { email?: unknown };
    // The owner comes from the session; a userId in the body is ignored.
    const authUser = await getAuthenticatedUser(req);
    const userId = authUser?.userId;

    // Validate email format with proper regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const subscriptionsCollection = getCollection<NewEmailSubscription>("emailSubscriptions");

    // Check if subscription already exists
    const existing = await subscriptionsCollection.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      const ownsSubscription =
        Boolean(userId && existing.userId === userId) ||
        Boolean(authUser && authUser.email.toLowerCase() === normalizedEmail);
      // Someone who unsubscribed stays unsubscribed unless they turn it back
      // on themselves. Same response either way, so addresses can't be probed.
      if (existing.enabled || ownsSubscription) {
        await subscriptionsCollection.updateOne(
          { email: normalizedEmail },
          {
            $set: {
              enabled: true,
              // Never move a subscription to a different account.
              userId: existing.userId || userId,
              updatedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Email notifications enabled",
        subscriptionId: existing.id,
      });
    }

    // Create new subscription
    const newSubscription: NewEmailSubscription = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      userId: userId || undefined,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await subscriptionsCollection.insertOne(newSubscription);

    // Send welcome email using React Email template
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
      const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(normalizedEmail)}`;
      await sendNotificationWelcomeEmail(normalizedEmail, unsubscribeUrl);
    } catch (emailError) {
      // Don't fail subscription if welcome email fails
      console.warn("[Notifications] Welcome email failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Email notifications enabled",
      subscriptionId: newSubscription.id,
    });
  } catch (error) {
    console.error("[Notifications] Subscribe error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to enable email notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
