import AchievementsPageClient from "./achievements-client";

/**
 * Achievements UI is interactive (rarity filters, tabs, auth-gated progress).
 * Unlock status depends on the session cookie, so the client loads after mount
 * rather than blocking the shell on a server round-trip.
 */
export default function AchievementsPage() {
  return <AchievementsPageClient />;
}
