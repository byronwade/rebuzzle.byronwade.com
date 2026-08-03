import { NextResponse } from "next/server";
import {
  getCachedLeaderboardData,
  type LeaderboardSortBy,
  type LeaderboardTimeframe,
} from "@/lib/cache/leaderboard";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const timeframe = (searchParams.get("timeframe") || "allTime") as LeaderboardTimeframe;
    const sortBy = (searchParams.get("sortBy") || "points") as LeaderboardSortBy;

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
