/**
 * Game Components
 *
 * Shared game UI components for Rebuzzle across all platforms.
 * These components use the platform abstraction layer for haptics, navigation, etc.
 */

export { Timer } from "./Timer";
export { AttemptsIndicator } from "./AttemptsIndicator";
export {
  PuzzleDisplay,
  PuzzleContainer,
  PuzzleQuestion,
  type PuzzleType,
} from "./PuzzleDisplay";
export { ProgressBar } from "./ProgressBar";
export { BonusIndicator, BonusIndicatorCompact } from "./BonusIndicator";
export { GuessHistory, type GuessAttempt, type WordResult } from "./GuessHistory";
export {
  CelebrationOverlay,
  determineAchievements,
  type Achievement,
} from "./CelebrationOverlay";
