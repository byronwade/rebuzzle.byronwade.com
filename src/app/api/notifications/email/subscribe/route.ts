import { NextResponse } from "next/server";
import type { NewEmailSubscription } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { sendNotificationWelcomeEmail } from "@/lib/notifications/email-service";

export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const subscriptionsCollection =
      getCollection<NewEmailSubscription>("emailSubscriptions");

    // Check if subscription already exists
    const existing = await subscriptionsCollection.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      // Update existing subscription
      await subscriptionsCollection.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            enabled: true,
            userId: userId || existing.userId,
            updatedAt: new Date(),
          },
        }
      );

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
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
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
