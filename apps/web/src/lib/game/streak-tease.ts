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
    if (options?.streakFrozen && streak > 0) {
      const left = options.freezesLeft ?? 0;
      return left > 0
        ? `Streak freeze saved your ${streak}-day chain. ${left} freeze left.`
        : `Streak freeze saved your ${streak}-day chain. Come back tomorrow.`;
    }
    return streak > 0
      ? "Streak reset. Tomorrow is a clean start — one puzzle."
      : "Start a streak tomorrow. One puzzle a day.";
  }

  if ((MILESTONES as readonly number[]).includes(streak)) {
    return `${streak}-day streak locked in. Don't break it tomorrow.`;
  }

  const next = MILESTONES.find((milestone) => milestone > streak);
  if (next) {
    const left = next - streak;
    return left === 1
      ? `One more day for a ${next}-day streak.`
      : `${left} days to a ${next}-day streak. Protect it tomorrow.`;
  }

  return `${streak}-day streak. Keep the chain going tomorrow.`;
}
