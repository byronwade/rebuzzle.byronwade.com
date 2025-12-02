import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { analyticsQueries } from "@/db/analytics-ops";
import { getLeaderboard, getStreakLeaderboard } from "@/lib/auth";

// Cache TTL constants
const LEADERBOARD_CACHE_TTL = 30; // 30 seconds

/**
 * Fetch leaderboard data with caching
 */
const getCachedLeaderboard = unstable_cache(
  async (limit: number, timeframe: string, sortBy: string) => {
    // If sorting by streaks, use streak leaderboard
    if (sortBy === "streak") {
      return getStreakLeaderboard(limit);
    }

    // Use userStats collection for all timeframes - it has the authoritative data
    const leaderboard = await getLeaderboard(
      limit,
      timeframe as "today" | "week" | "month" | "allTime"
    );

    // Optionally enrich with completion rates from analytics for timeframe views
    if (timeframe !== "allTime" && leaderboard.length > 0) {
      try {
        const completionData = await analyticsQueries.getLeaderboardByTimeframe(
          timeframe as "today" | "week" | "month",
          limit
        );
        const completionMap = new Map(
          completionData.map((entry) => [entry.userId, entry.completionRate])
        );

        // Add completion rates to leaderboard entries
        leaderboard.forEach((entry) => {
          const completionRate = completionMap.get(entry.user.id);
          if (completionRate !== undefined) {
            entry.stats = {
              ...entry.stats,
              completionRate,
            } as typeof entry.stats & { completionRate: number };
          }
        });
      } catch (error) {
        // If analytics query fails, just continue without completion rates
        console.error("Error fetching completion rates:", error);
      }
    }

    return leaderboard;
  },
  ["leaderboard"],
  {
    revalidate: LEADERBOARD_CACHE_TTL,
    tags: ["leaderboard"],
  }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const timeframe = (searchParams.get("timeframe") || "allTime") as
      | "today"
      | "week"
      | "month"
      | "allTime";
    const sortBy = searchParams.get("sortBy") || "points";

    // Use cached leaderboard data
    const leaderboard = await getCachedLeaderboard(limit, timeframe, sortBy);

    return NextResponse.json({
      success: true,
      leaderboard,
      sortBy,
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leaderboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
