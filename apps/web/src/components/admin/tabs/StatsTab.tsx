"use client";

import { StatsTabShell } from "./stats-tab-shell";
import { useStatsTab } from "./use-stats-tab";

export function StatsTab(props: any) {
  const state = useStatsTab(props);
  return <StatsTabShell {...state} />;
}
