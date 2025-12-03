/**
 * POST /api/auth/guest/lazy
 *
 * Lazy guest creation - only called when user starts viewing a puzzle.
 * Uses multi-layer identification: Device ID > cookie > IP > localStorage
 *
 * This reduces guest account spam by:
 * 1. Not creating accounts for casual visitors
 * 2. Reusing accounts based on IP (1 per IP)
 * 3. Silent auto-merge for returning users
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { userOps, userStatsOps } from "@/db/operations";
import { signToken } from "@/lib/jwt";
import {
  extractClientIp,
  extractDeviceId,
  hashIpAddress,
  identifyGuest,
} from "@/lib/services/guest-identification";

const GUEST_TOKEN_COOKIE = "rebuzzle_guest_token";
const AUTH_COOKIE = "rebuzzle_auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const existingAuthToken = cookieStore.get(AUTH_COOKIE)?.value;

    // If user has an auth token, verify and return existing user
    if (existingAuthToken) {
      return NextResponse.json({
        success: false,
        message: "User is already authenticated",
        isAuthenticated: true,
      });
    }

    // Get identification inputs
    const body = await request.json().catch(() => ({}));
    const cookieGuestToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
    const ipAddress = extractClientIp(request);
    const deviceId = extractDeviceId(request);
    const localStorageGuestId = body.localStorageGuestId;

    // Try to identify existing guest
    const identification = await identifyGuest({
      cookieGuestToken,
      ipAddress,
      localStorageGuestId,
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

      guestUser = await userOps.createGuestUserWithIp(
        newGuestToken,
        ipHash,
        deviceId || undefined
      );

      // Initialize user stats for the guest
      await initializeGuestStats(guestUser.id);
    }

    // Issue JWT
    const jwt = await signToken({
      userId: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
    });

    // Build response
    const response = NextResponse.json({
      success: true,
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        isGuest: true,
      },
      isNewGuest: !identification.found,
      identifiedBy: identification.identifiedBy,
    });

    // Set cookies (only for web - desktop/mobile use Bearer tokens)
    if (!deviceId) {
      response.cookies.set(GUEST_TOKEN_COOKIE, guestUser.guestToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });

      response.cookies.set(AUTH_COOKIE, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year for guests
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Lazy guest creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create guest session" },
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
