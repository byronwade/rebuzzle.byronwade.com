import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyticsEventOps } from "@/db/analytics-ops";
import type { NewEmailSubscription } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { createOrUpdateUser } from "@/lib/auth";
import { sendSignupWelcomeEmail } from "@/lib/notifications/email-service";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!(username && email && password)) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.userOps.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Generate a unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create user in database with hashed password
    const success = await createOrUpdateUser({
      id: userId,
      username,
      email,
      passwordHash,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Track signup event
    try {
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await analyticsEventOps.create({
        id: eventId,
        userId,
        sessionId: `session_${Date.now()}`,
        eventType: "USER_SIGNUP",
        timestamp: new Date(),
        metadata: {
          username,
          email,
        },
      });
    } catch (error) {
      // Don't fail signup if analytics fails
      console.error("Error tracking signup:", error);
    }

    // Auto-subscribe to email notifications (opt-in by default)
    try {
      const subscriptionsCollection =
        getCollection<NewEmailSubscription>("emailSubscriptions");
      const normalizedEmail = email.toLowerCase().trim();

      // Check if subscription already exists
      const existing = await subscriptionsCollection.findOne({
        email: normalizedEmail,
      });

      if (existing) {
        // Update existing subscription to link to user
        await subscriptionsCollection.updateOne(
          { email: normalizedEmail },
          {
            $set: {
              userId,
              enabled: true,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Create new subscription
        const newSubscription: NewEmailSubscription = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          userId,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await subscriptionsCollection.insertOne(newSubscription);
      }
    } catch (error) {
      // Don't fail signup if subscription creation fails
      console.error("Error creating email subscription:", error);
    }

    // Send welcome email (non-blocking)
    try {
      await sendSignupWelcomeEmail(email, username);
    } catch (error) {
      // Don't fail signup if email send fails
      console.error("Error sending welcome email:", error);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
      },
      message: "Account created successfully!",
    });
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
