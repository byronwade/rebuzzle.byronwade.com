import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { signToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";

const GUEST_TOKEN_COOKIE = "rebuzzle_guest_token";
const AUTH_COOKIE = "rebuzzle_auth";

/**
 * GET /api/auth/guest
 * Get or create a guest session
 * - If guest token exists in cookie, return existing guest user
 * - If no guest token, create new guest account and set cookie
 */
export async function GET(request: NextRequest) {
  // Rate limit guest creation to prevent abuse
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

  try {
    const cookieStore = await cookies();
    const existingGuestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
    const existingAuthToken = cookieStore.get(AUTH_COOKIE)?.value;

    // If user has an auth token, they're logged in - don't create guest
    if (existingAuthToken) {
      return NextResponse.json({
        success: false,
        message: "User is already authenticated",
        isAuthenticated: true,
      });
    }

    let guestUser;

    if (existingGuestToken) {
      // Try to find existing guest user
      guestUser = await db.userOps.findByGuestToken(existingGuestToken);
    }

    if (!guestUser) {
      // Generate new guest token
      const newGuestToken = crypto.randomUUID();

      // Create new guest user
      guestUser = await db.userOps.createGuestUser(newGuestToken);

      // Initialize user stats for the guest
      try {
        const existingStats = await db.userStatsOps.findByUserId(guestUser.id);
        if (!existingStats) {
          await db.userStatsOps.create({
            id: `stats_${guestUser.id}`,
            userId: guestUser.id,
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
        console.error("Error creating guest stats:", statsError);
      }

      // Create JWT for the guest user
      const jwt = await signToken({
        userId: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
      });

      // Set cookies
      const response = NextResponse.json({
        success: true,
        user: {
          id: guestUser.id,
          username: guestUser.username,
          email: guestUser.email,
          isGuest: true,
        },
        isNewGuest: true,
      });

      // Set guest token cookie (long-lived, 1 year)
      response.cookies.set(GUEST_TOKEN_COOKIE, newGuestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });

      // Set auth cookie for the guest session
      response.cookies.set(AUTH_COOKIE, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year for guests
        path: "/",
      });

      return response;
    }

    // Existing guest user found - refresh their auth token
    const jwt = await signToken({
      userId: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: true,
      },
      isNewGuest: false,
    });

    // Refresh auth cookie
    response.cookies.set(AUTH_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year for guests
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Guest session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create guest session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
