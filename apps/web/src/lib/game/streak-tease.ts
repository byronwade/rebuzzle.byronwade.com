/**
 * Short retention copy for streak / tomorrow hooks.
 * Keeps the joke about the chain, never about the player.
 */

const MILESTONES = [3, 7, 14, 30, 100] as const;

export function getStreakTease(
  streak: number,
  success: boolean,
  options?: { streakFrozen?: boolean; freezesLeft?: number }
): string {
  if (!success) {
    // A loss keeps the streak; it just doesn't add a day.
    return streak > 0
      ? `Streak held at ${streak}. Solve tomorrow to grow it.`
      : "Start a streak tomorrow. One puzzle a day.";
  }

  if (options?.streakFrozen && streak > 1) {
    return `A streak freeze covered the day you missed. ${streak}-day streak.`;
  }

  if ((MILESTONES as readonly number[]).includes(streak)) {
    return `${streak}-day streak. See you tomorrow.`;
  }

  const next = MILESTONES.find((milestone) => milestone > streak);
  if (next) {
    const left = next - streak;
    return left === 1
      ? `One more day for a ${next}-day streak.`
      : `${left} days to a ${next}-day streak.`;
  }

  return `${streak}-day streak.`;
}
