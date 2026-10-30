/**
 * POST /api/auth/guest/lazy
 *
 * Lazy guest creation - only called when user starts viewing a puzzle.
 * Returning guests are recognized by device ID (apps) or the guest cookie.
 * Accounts are only created when a puzzle is viewed, and the guest rate
 * limiter caps creation per IP.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { userOps, userStatsOps } from "@/db/operations";
import { isSessionRevoked } from "@/lib/auth/session-revocation";
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME, setAuthCookie } from "@/lib/cookies";
import { signToken, verifyToken } from "@/lib/jwt";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import {
  extractClientIp,
  extractDeviceId,
  hashIpAddress,
  identifyGuest,
} from "@/lib/services/guest-identification";

const GUEST_TOKEN_COOKIE = "rebuzzle_guest_token";
const GUEST_EMAIL_SUFFIX = "@guest.rebuzzle.local";

export async function POST(request: Request) {
  try {
    const limit = await rateLimiters.guest(request);
    if (limit && !limit.success) {
      return NextResponse.json(
        { success: false, error: "Too many guest sessions. Try again later." },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const bearer = request.headers.get("Authorization");
    const existingAuthToken =
      (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined) ||
      cookieStore.get(AUTH_COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;

    // Valid existing session → return the user (don't fail the client)
    if (existingAuthToken) {
      const payload = await verifyToken(existingAuthToken);
      if (payload?.userId && !(await isSessionRevoked(payload.userId, payload.iat))) {
        const existingUser = await userOps.findById(payload.userId);
        if (existingUser) {
          const legacyGuestToken =
            payload.isGuest === undefined &&
            typeof payload.email === "string" &&
            payload.email.endsWith(GUEST_EMAIL_SUFFIX);
          const isGuestToken = payload.isGuest === true || legacyGuestToken;
          if (isGuestToken && !existingUser.isGuest) {
            return NextResponse.json(
              {
                success: false,
                error: "This guest account was upgraded. Sign in to continue.",
              },
              { status: 409 }
            );
          }

          const isGuest = Boolean(
            existingUser.isGuest ||
              payload.isGuest === true ||
              (payload.isGuest === undefined && existingUser.email?.endsWith(GUEST_EMAIL_SUFFIX))
          );
          return NextResponse.json({
            success: true,
            alreadyAuthenticated: true,
            token: existingAuthToken,
            user: {
              id: existingUser.id,
              username: existingUser.username,
              email: existingUser.email,
              isGuest,
            },
          });
        }
      }
      // Expired / invalid / signed-out token — fall through and issue a fresh guest session
    }

    const cookieGuestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
    const ipAddress = extractClientIp(request);
    const deviceId = extractDeviceId(request);

    // Try to identify existing guest
    const identification = await identifyGuest({
      cookieGuestToken,
      deviceId: deviceId || undefined,
    });

    let guestUser = identification.user;
    const ipHash = hashIpAddress(ipAddress);

    if (identification.found && guestUser) {
      // Update last seen and IP hash (for guests found by cookie/localStorage)
      await userOps.update(guestUser.id, {
        lastSeenIp: ipHash,
        lastSeenAt: new Date(),
        // Backfill IP hash if missing (for existing guests)
        ...(guestUser.ipHash ? {} : { ipHash }),
        // Backfill device ID if provided and missing
        ...(deviceId && !guestUser.deviceId ? { deviceId } : {}),
      });

      // Refresh the user data after update
      guestUser = (await userOps.findById(guestUser.id)) || guestUser;
    } else {
      // Create new guest user with IP binding
      const newGuestToken = crypto.randomUUID();

      guestUser = await userOps.createGuestUserWithIp(newGuestToken, ipHash, deviceId || undefined);

      // Initialize user stats for the guest
      await initializeGuestStats(guestUser.id);
    }

    // Issue JWT
    const jwt = await signToken({
      userId: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
      isGuest: true,
    });

    // Build response
    const response = NextResponse.json({
      success: true,
      token: jwt,
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: true,
      },
      isNewGuest: !identification.found,
      identifiedBy: identification.identifiedBy,
    });

    // Always set cookies for browser clients. Native apps can still use Bearer tokens.
    response.cookies.set(GUEST_TOKEN_COOKIE, guestUser.guestToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    // Canonical auth cookie (also clears legacy auth_token)
    setAuthCookie(response, jwt);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Lazy guest creation error:", message, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create guest session",
        // Surface a short hint in non-production / when clearly a config miss
        detail:
          process.env.NODE_ENV !== "production" ||
          message.includes("IP_HASH_SALT") ||
          message.includes("AUTH_SECRET") ||
          message.includes("Mongo")
            ? message.slice(0, 180)
            : undefined,
      },
      { status: 500 }
    );
  }
}

async function initializeGuestStats(userId: string) {
  const existingStats = await userStatsOps.findByUserId(userId);
  if (!existingStats) {
    await userStatsOps.create({
      id: `stats_${userId}`,
      userId,
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
      streakFreezes: 1, // Start with 1 free freeze
      streakShields: 0,
      luckySolveCount: 0,
    });
  }
}
