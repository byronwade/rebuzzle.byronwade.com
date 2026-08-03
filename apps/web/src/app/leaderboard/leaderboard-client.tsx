"use client";

import { LeaderboardShell } from "./leaderboard-shell";
import { useLeaderboard } from "./use-leaderboard";

export default function LeaderboardClient(props: any) {
  const state = useLeaderboard(props);
  return <LeaderboardShell {...state} />;
}
