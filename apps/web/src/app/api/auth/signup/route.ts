import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyticsEventOps } from "@/db/analytics-ops";
import type { NewEmailSubscription } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { createOrUpdateUser } from "@/lib/auth";
import { SESSION_DURATION_DAYS } from "@/lib/cookies";
import { signToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { sendSignupWelcomeEmail } from "@/lib/notifications/email-service";
import { hashPassword } from "@/lib/password";

const GUEST_TOKEN_COOKIE = "rebuzzle_guest_token";
const AUTH_COOKIE = "rebuzzle_auth";

export async function POST(request: Request) {
  // Rate limit signup attempts to prevent spam
  const rateLimitResult = await rateLimiters.auth(request);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

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
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if user already exists (excluding guest accounts)
    const existingUser = await db.userOps.findByEmail(email);
    if (existingUser && !existingUser.isGuest) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Check if we have a guest token to convert
    const cookieStore = await cookies();
    const guestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;

    let userId: string;
    let convertedFromGuest = false;

    if (guestToken) {
      // Try to find and convert guest account
      const guestUser = await db.userOps.findByGuestToken(guestToken);

      if (guestUser) {
        // Convert guest to full user (keeps all stats!)
        const convertedUser = await db.userOps.convertGuestToUser(guestUser.id, {
          username,
          email,
          passwordHash,
        });

        if (convertedUser) {
          userId = convertedUser.id;
          convertedFromGuest = true;
          console.log(`[Auth] Converted guest ${guestUser.id} to user ${email}`);
        } else {
          // Conversion failed, create new user
          userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
      } else {
        // No guest found, create new user
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }
    } else {
      // No guest token, create new user
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    // If we didn't convert a guest, create new user in database
    if (!convertedFromGuest) {
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

      // Initialize stats for new user
      try {
        const existingStats = await db.userStatsOps.findByUserId(userId);
        if (!existingStats) {
          await db.userStatsOps.create({
            id: `stats_${userId}`,
            userId: userId,
            points: 0,
            streak: 0,
            maxStreak: 0,
            totalGames: 0,
            wins: 0,
            level: 1,
            dailyChallengeStreak: 0,
            perfectSolves: 0,
            clutchSolves: 0,
            speedSolves: 0,
            totalTimePlayed: 0,
            noHintStreak: 0,
            maxNoHintStreak: 0,
            consecutivePerfect: 0,
            maxConsecutivePerfect: 0,
            weekendSolves: 0,
            easyPuzzlesSolved: 0,
            mediumPuzzlesSolved: 0,
            hardPuzzlesSolved: 0,
            sharedResults: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Psychological engagement fields
            streakFreezes: 1, // Start with 1 free freeze
            streakShields: 0,
            luckySolveCount: 0,
          });
        }
      } catch (statsError) {
        // Log with context for debugging - stats will be created on first game play
        console.error(`[Signup] Failed to create user stats for ${userId}:`, statsError);
      }
    }

    // Track signup event (non-blocking)
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
          // Don't log email in analytics for privacy
        },
      });
    } catch (error) {
      // Non-blocking: analytics failure shouldn't affect user experience
      console.error(`[Signup] Analytics tracking failed for ${userId}:`, error);
    }

    // Auto-subscribe to email notifications (opt-in by default)
    try {
      const subscriptionsCollection = getCollection<NewEmailSubscription>("emailSubscriptions");
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
      // Non-blocking: subscription failure shouldn't affect signup
      console.error(`[Signup] Email subscription creation failed for ${userId}:`, error);
    }

    // Send welcome email (non-blocking)
    try {
      await sendSignupWelcomeEmail(email, username);
    } catch (error) {
      // Non-blocking: welcome email failure shouldn't affect signup
      console.error(`[Signup] Welcome email failed for ${userId}:`, error);
    }

    // Create JWT for the new user
    const jwt = await signToken({
      userId,
      username,
      email,
    });

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
      },
      message: convertedFromGuest
        ? "Account created! Your game progress has been saved."
        : "Account created successfully!",
      convertedFromGuest,
    });

    // Set auth cookie
    response.cookies.set(AUTH_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // Use shared session duration
      path: "/",
    });

    // Clear guest token cookie (no longer needed)
    response.cookies.delete(GUEST_TOKEN_COOKIE);

    return response;
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
