/**
 * User Profile API
 *
 * Provides user profile information including skill level and preferences
 */

import { NextResponse } from "next/server";
import { getAdaptiveDifficulty } from "@/ai/services/recommendations";
import { buildUserPuzzleProfile } from "@/ai/services/user-profiler";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeDifficulty = searchParams.get("includeDifficulty") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        {
          status: 400,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    // Security: Verify the authenticated user matches the requested userId
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    const profile = await buildUserPuzzleProfile(userId);

    const response: Record<string, unknown> = {
      success: true,
      profile,
    };

    // Include adaptive difficulty if requested
    if (includeDifficulty) {
      const difficulty = await getAdaptiveDifficulty(userId);
      response.adaptiveDifficulty = difficulty;
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": buildCacheControl({ private: true }) },
    });
  } catch (error) {
    console.error("[User Profile API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user profile",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
