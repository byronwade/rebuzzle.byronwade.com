/**
 * Self-learning system — performance → difficulty → better generation.
 */

export {
  type AdaptiveDifficultyResult,
  baselineDifficultyForDate,
  clampGenerationDifficulty,
  computeAdaptiveDifficulty,
  WEEKLY_DIFFICULTY_SPINE,
} from "./adaptive-difficulty";
export {
  isAnswerRegistered,
  loadAllAnswerKeys,
  normalizeAnswerKey,
} from "./answer-registry";
export { backfillAnswerKeys } from "./backfill-answer-keys";
export {
  aggregatePerceptionDelta,
  type DifficultyPerceptionChoice,
  isDifficultyPerceptionChoice,
  mapDifficultyPerception,
  type PerceptionMapping,
} from "./difficulty-perception";
export {
  type GenerationAuditRecord,
  getGenerationSystemHealth,
  listRecentGenerationAudits,
  recordGenerationAudit,
} from "./generation-audit";
export {
  type LearningPolicySnapshot,
  recordFinalAttemptSignal,
  resolveAdaptiveDifficultyForDate,
  runLearningCalibration,
} from "./learning-loop";
export {
  measurePuzzlePerformance,
  measureWindowPerformance,
  type WindowPerformance,
} from "./performance-monitor";
export {
  isPuzzleQualityReason,
  isPuzzleQualityVote,
  loadQualityVoteAggregate,
  mapPuzzleQualityVote,
  type PuzzleQualityReason,
  type PuzzleQualityVote,
  type QualityVoteAggregate,
  type QualityVoteMapping,
  qualityVotesToGuidance,
} from "./puzzle-quality-vote";
export {
  assessQualityDrift,
  type BinomialInterval,
  QUALITY_DRIFT_CONTRACT_VERSION,
  type QualityDriftMetric,
  type QualityDriftMetricStatus,
  type QualityDriftReport,
  type QualityDriftWindow,
  wilsonInterval,
} from "./quality-drift";
export { loadQualityDriftReport } from "./quality-drift-store";
export {
  applySimCalibration,
  computeSimCalibrationFromPairs,
  loadSimCalibration,
  type SimCalibration,
} from "./sim-calibration";
