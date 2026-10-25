import { NextResponse } from "next/server";
import {
  getCachedLeaderboardData,
  type LeaderboardSortBy,
  type LeaderboardTimeframe,
} from "@/lib/cache/leaderboard";
import { buildCacheControl } from "@/lib/http/cache-headers";

const TIMEFRAMES: readonly LeaderboardTimeframe[] = ["today", "week", "month", "allTime"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Clamp inputs: each distinct value is its own cache entry and DB query.
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 10;
    const rawTimeframe = searchParams.get("timeframe");
    const timeframe: LeaderboardTimeframe = TIMEFRAMES.includes(
      rawTimeframe as LeaderboardTimeframe
    )
      ? (rawTimeframe as LeaderboardTimeframe)
      : "allTime";
    const sortBy: LeaderboardSortBy = searchParams.get("sortBy") === "streak" ? "streak" : "points";

    const leaderboard = await getCachedLeaderboardData(limit, timeframe, sortBy);

    return NextResponse.json(
      {
        success: true,
        leaderboard,
        sortBy,
      },
      {
        headers: {
          "Cache-Control": buildCacheControl({
            public: true,
            maxAge: 30,
            sMaxAge: 60,
            staleWhileRevalidate: 120,
          }),
        },
      }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leaderboard",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
