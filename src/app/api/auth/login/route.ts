import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyticsEventOps, userSessionOps } from "@/db/analytics-ops";
import { verifyUserCredentials } from "@/lib/auth";
import { setAuthCookie } from "@/lib/cookies";
import { signToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.auth(request);
  if (!rateLimitResult || !rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: rateLimitResult?.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult?.retryAfter || 60),
          "X-RateLimit-Limit": String(rateLimitResult?.limit || 10),
          "X-RateLimit-Remaining": String(rateLimitResult?.remaining || 0),
          "X-RateLimit-Reset": String(rateLimitResult?.reset || Date.now()),
        },
      }
    );
  }
  try {
    const { email, password } = await request.json();

    if (!(email && password)) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Verify user credentials
    const { user, valid } = await verifyUserCredentials(email, password);

    if (!(valid && user)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await db.userOps.updateLastLogin(user.id);

    // Track login and check if returning user
    try {
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Check if user has logged in before (returning user)
      const previousSessions = await userSessionOps.findByUserId(user.id, 1);
      const isReturning = previousSessions.length > 0;

      // Track login event
      await analyticsEventOps.create({
        id: eventId,
        userId: user.id,
        sessionId: `session_${Date.now()}`,
        eventType: "USER_LOGIN",
        timestamp: new Date(),
        metadata: {
          isReturningUser: isReturning,
        },
      });

      // Track return event if returning user
      if (isReturning) {
        const returnEventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await analyticsEventOps.create({
          id: returnEventId,
          userId: user.id,
          sessionId: `session_${Date.now()}`,
          eventType: "USER_RETURN",
          timestamp: new Date(),
          metadata: {},
        });
      }
    } catch (error) {
      // Don't fail login if analytics fails
      console.error("Error tracking login:", error);
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      success: true,
    });

    // Set secure HTTP-only cookie with JWT token
    return setAuthCookie(response, token);
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
