/**
 * Puzzle Recommendations API — auth required; answers stripped.
 */

import { NextResponse } from "next/server";
import { getPersonalizedPuzzles, recommendNextPuzzle } from "@/ai/services/recommendations";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";

function sanitizeRecommendation(rec: unknown): unknown {
  if (!rec || typeof rec !== "object") return rec;
  const obj = rec as Record<string, unknown>;
  if (obj.puzzle && typeof obj.puzzle === "object") {
    return {
      ...obj,
      puzzle: toPublicPuzzle(obj.puzzle as Record<string, unknown>),
    };
  }
  return toPublicPuzzle(obj);
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentPuzzleId = searchParams.get("currentPuzzleId");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

    // Always use the authenticated user — never trust client userId
    const userId = authUser.userId;

    if (currentPuzzleId) {
      const recommendation = await recommendNextPuzzle(userId, currentPuzzleId);

      if (!recommendation) {
        return NextResponse.json({ error: "No recommendation found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        recommendation: sanitizeRecommendation(recommendation),
      });
    }

    const recommendations = await getPersonalizedPuzzles(userId, limit);

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map(sanitizeRecommendation),
      count: recommendations.length,
    });
  } catch (error) {
    console.error("[Recommendations API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get recommendations",
      },
      { status: 500 }
    );
  }
}
