import { cacheLife, cacheTag } from "next/cache";
import { analyticsQueries } from "@/db/analytics-ops";
import { getLeaderboard, getStreakLeaderboard } from "@/lib/auth";

export type LeaderboardTimeframe = "today" | "week" | "month" | "allTime";
export type LeaderboardSortBy = "points" | "streak";

/**
 * Cached leaderboard data shared by the page and API route.
 */
export async function getCachedLeaderboardData(
  limit: number,
  timeframe: LeaderboardTimeframe,
  sortBy: LeaderboardSortBy
) {
  "use cache";
  cacheLife({
    stale: 30,
    revalidate: 30,
    expire: 300,
  });
  cacheTag("leaderboard", `leaderboard-${timeframe}-${sortBy}`);

  if (sortBy === "streak") {
    return getStreakLeaderboard(limit);
  }

  const leaderboard = await getLeaderboard(limit, timeframe);

  if (timeframe !== "allTime" && leaderboard.length > 0) {
    try {
      const completionData = await analyticsQueries.getLeaderboardByTimeframe(
        timeframe as "today" | "week" | "month",
        limit
      );
      const completionMap = new Map(
        completionData.map((entry) => [entry.userId, entry.completionRate])
      );

      for (const entry of leaderboard) {
        const completionRate = completionMap.get(entry.user.id);
        if (completionRate !== undefined) {
          entry.stats = {
            ...entry.stats,
            completionRate,
          } as typeof entry.stats & { completionRate: number };
        }
      }
    } catch (error) {
      console.error("Error fetching completion rates:", error);
    }
  }

  return leaderboard;
}
