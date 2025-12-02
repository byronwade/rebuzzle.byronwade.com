/**
 * Puzzle Recommendations API
 *
 * Provides personalized puzzle recommendations for users
 */

import { NextResponse } from "next/server";
import { getPersonalizedPuzzles, recommendNextPuzzle } from "@/ai/services/recommendations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const currentPuzzleId = searchParams.get("currentPuzzleId");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // If currentPuzzleId is provided, recommend next puzzle
    if (currentPuzzleId) {
      const recommendation = await recommendNextPuzzle(userId, currentPuzzleId);

      if (!recommendation) {
        return NextResponse.json({ error: "No recommendation found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        recommendation,
      });
    }

    // Otherwise, get personalized recommendations
    const recommendations = await getPersonalizedPuzzles(userId, limit);

    return NextResponse.json({
      success: true,
      recommendations,
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
