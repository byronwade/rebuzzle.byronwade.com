/**
 * Achievements Module
 *
 * Re-exports achievement definitions from shared package
 * and web-specific service functionality
 */

// Definitions from shared package
export {
  type AchievementCategory,
  type AchievementCriteria,
  type AchievementDefinition,
  type AchievementIcon,
  type AchievementRarity,
  ALL_ACHIEVEMENTS,
  CATEGORY_INFO,
  getAchievementById,
  getAchievementsByCategory,
  getAchievementsByRarity,
  getTotalPossiblePoints,
  RARITY_INFO,
} from "@rebuzzle/game-logic";

// Web-specific service (requires database)
export * from "./service";
