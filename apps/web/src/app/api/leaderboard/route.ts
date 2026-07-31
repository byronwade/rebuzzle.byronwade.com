import { NextResponse } from "next/server";
import {
  getCachedLeaderboardData,
  type LeaderboardSortBy,
  type LeaderboardTimeframe,
} from "@/lib/cache/leaderboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const timeframe = (searchParams.get("timeframe") || "allTime") as LeaderboardTimeframe;
    const sortBy = (searchParams.get("sortBy") || "points") as LeaderboardSortBy;

    const leaderboard = await getCachedLeaderboardData(limit, timeframe, sortBy);

    return NextResponse.json({
      success: true,
      leaderboard,
      sortBy,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leaderboard",
      },
      { status: 500 }
    );
  }
}
