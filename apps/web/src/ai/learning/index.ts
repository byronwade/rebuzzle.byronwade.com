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
export { backfillAnswerKeys } from "./backfill-answer-keys";
export {
  getGenerationSystemHealth,
  listRecentGenerationAudits,
  recordGenerationAudit,
  type GenerationAuditRecord,
} from "./generation-audit";
export {
  recordFinalAttemptSignal,
  resolveAdaptiveDifficultyForDate,
  runLearningCalibration,
  type LearningPolicySnapshot,
} from "./learning-loop";
export {
  buildDailyPostmortem,
  loadLatestPostmortem,
  persistDailyPostmortem,
  runDailyPostmortemPipeline,
  type DailyPostmortem,
} from "./daily-postmortem";
export {
  loadOutcomeWeights,
  type OutcomeWeights,
  type TechniqueOutcome,
} from "./outcome-weights";
export {
  measurePuzzlePerformance,
  measureWindowPerformance,
  type WindowPerformance,
} from "./performance-monitor";
export {
  aggregatePerceptionDelta,
  isDifficultyPerceptionChoice,
  mapDifficultyPerception,
  type DifficultyPerceptionChoice,
  type PerceptionMapping,
} from "./difficulty-perception";
export {
  applySimCalibration,
  computeSimCalibrationFromPairs,
  loadSimCalibration,
  type SimCalibration,
} from "./sim-calibration";
export {
  isPuzzleQualityVote,
  loadQualityVoteAggregate,
  mapPuzzleQualityVote,
  qualityVotesToGuidance,
  type PuzzleQualityVote,
  type QualityVoteAggregate,
  type QualityVoteMapping,
} from "./puzzle-quality-vote";
