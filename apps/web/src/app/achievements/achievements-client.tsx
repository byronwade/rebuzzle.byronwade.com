"use client";

import { AchievementsPageShell } from "./achievements-page-shell";
import { useAchievementsPage } from "./use-achievements-page";

export default function AchievementsPage(props: any) {
  const state = useAchievementsPage(props);
  return <AchievementsPageShell {...state} />;
}
