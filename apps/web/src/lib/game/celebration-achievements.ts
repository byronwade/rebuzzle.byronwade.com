export type CelebrationAchievement = {
  id: string;
  name: string;
  description: string;
  icon: "star" | "zap" | "trophy" | "flame";
};

/** Lightweight cosmetic achievements for the win overlay (no heavy UI imports). */
export function determineAchievements(
  attempts: number,
  maxAttempts: number,
  timeTaken?: number,
  streak?: number,
  usedHints?: boolean
): CelebrationAchievement[] {
  const achievements: CelebrationAchievement[] = [];

  if (attempts === 1) {
    achievements.push({
      id: "perfect",
      name: "Perfect!",
      description: "Solved on the first attempt",
      icon: "star",
    });
  }

  if (timeTaken !== undefined && timeTaken < 30) {
    achievements.push({
      id: "speed-demon",
      name: "Speed Demon",
      description: "Solved in under 30 seconds",
      icon: "zap",
    });
  }

  if (attempts === maxAttempts) {
    achievements.push({
      id: "clutch",
      name: "Clutch!",
      description: "Solved on the last attempt",
      icon: "trophy",
    });
  }

  if (usedHints === false) {
    achievements.push({
      id: "no-hints",
      name: "Pure Skill",
      description: "Solved without using hints",
      icon: "star",
    });
  }

  if (streak && streak >= 7) {
    achievements.push({
      id: "week-streak",
      name: "Perfect Week",
      description: "7-day solving streak!",
      icon: "flame",
    });
  }

  return achievements;
}
