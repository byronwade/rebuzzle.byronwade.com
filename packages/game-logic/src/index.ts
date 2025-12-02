/**
 * @rebuzzle/game-logic
 *
 * Pure game logic that can be shared across all platforms.
 * No platform-specific dependencies (no React, no Node, no browser APIs).
 */

// Fuzzy string matching for answer validation
export {
  calculateSimilarity,
  containsFuzzyMatch,
  fuzzyMatch,
  normalizeString,
  validateWords,
} from "./fuzzy-match";

// Scoring calculations
export {
  calculateAccuracyPenalty,
  calculateDifficultyBonus,
  calculateLevel,
  calculateScore,
  calculateSpeedBonus,
  calculateStreakBonus,
  pointsToNextLevel,
  type ScoreBreakdown,
  type ScoreInput,
} from "./scoring";

// Achievement definitions (service stays in web app)
export {
  ALL_ACHIEVEMENTS,
  CATEGORY_INFO,
  getAchievementById,
  getAchievementsByCategory,
  getAchievementsByRarity,
  getTotalPossiblePoints,
  RARITY_INFO,
  type AchievementCategory,
  type AchievementCriteria,
  type AchievementDefinition,
  type AchievementIcon,
  type AchievementRarity,
} from "./achievements";
