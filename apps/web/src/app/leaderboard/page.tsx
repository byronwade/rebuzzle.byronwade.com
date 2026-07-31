import { Suspense } from "react";
import Layout from "@/components/Layout";
import { getCachedLeaderboardData } from "@/lib/cache/leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import LeaderboardClient from "./leaderboard-client";

function LeaderboardFallback() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-3 md:px-6">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </Layout>
  );
}

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
    <Suspense fallback={<LeaderboardFallback />}>
      <LeaderboardContent />
    </Suspense>
  );
}
