import { Suspense } from "react";
import { LeaderboardPageSkeleton } from "@/components/page-skeletons";
import { getCachedLeaderboardData } from "@/lib/cache/leaderboard";
import LeaderboardClient from "./leaderboard-client";

async function LeaderboardContent() {
  const leaderboard = await getCachedLeaderboardData(25, "allTime", "points");

  return (
    <LeaderboardClient
      initialLeaderboard={leaderboard.map((entry) => ({
        rank: entry.rank,
        user: {
          id: entry.user.id,
          username: entry.user.username,
          email: entry.user.email,
        },
        stats: {
          points: entry.stats.points,
          streak: entry.stats.streak,
          totalGames: entry.stats.totalGames,
          wins: entry.stats.wins,
          level: entry.stats.level,
          dailyChallengeStreak: entry.stats.dailyChallengeStreak,
          completionRate: (entry.stats as { completionRate?: number }).completionRate,
        },
      }))}
    />
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardPageSkeleton />}>
      <LeaderboardContent />
    </Suspense>
  );
}
