/**
 * Self-learning system — performance → difficulty → better generation.
 */

export {
  baselineDifficultyForDate,
  clampGenerationDifficulty,
  computeAdaptiveDifficulty,
  WEEKLY_DIFFICULTY_SPINE,
  type AdaptiveDifficultyResult,
} from "./adaptive-difficulty";
export {
  isAnswerRegistered,
  loadAllAnswerKeys,
  normalizeAnswerKey,
} from "./answer-registry";
export {
  recordFinalAttemptSignal,
  resolveAdaptiveDifficultyForDate,
  runLearningCalibration,
  type LearningPolicySnapshot,
} from "./learning-loop";
export {
  measurePuzzlePerformance,
  measureWindowPerformance,
  type WindowPerformance,
} from "./performance-monitor";
