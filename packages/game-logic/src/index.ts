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
  calculateHintPenalty,
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

// Puzzle display utilities for consistent formatting across platforms
export {
  CATEGORY_CSS_CLASSES,
  EMOJI_FONT_STACK,
  FONT_SIZE_VALUES,
  FONT_WEIGHT_VALUES,
  getFontFamilyValue,
  getPuzzleCssClass,
  getPuzzleDisplayCategory,
  getPuzzleDisplayConfig,
  getPuzzleQuestion,
  MONO_FONT_STACK,
  type FontFamily,
  type FontSize,
  type FontWeight,
  type PuzzleDisplayCategory,
  type PuzzleDisplayConfig,
  type TextAlign,
} from "./puzzle-display";
