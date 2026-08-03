/**
 * Advanced AI Puzzle System — Eve tool agent + AI Gateway
 */

export { runPuzzleAgentGeneration } from "./puzzle-agent/run-generation";
export type { PuzzleAgentResult } from "./puzzle-agent/schemas";
export { generateWithChainOfThought } from "./services/advanced-puzzle-generator";
export {
  aiSelfTest,
  analyzePlayerPerformance,
  calculateAdaptiveDifficulty,
  calculateDifficultyProfile,
  calibrateDifficulty,
  type DifficultyProfile,
} from "./services/difficulty-calibrator";
export {
  type GeneratedPuzzleResult,
  generateMasterBatch,
  generateMasterPuzzle,
  type MasterGenerationParams,
  selectOptimalPuzzle,
} from "./services/master-puzzle-orchestrator";
export {
  adversarialTest,
  analyzeQuality,
  batchQualityCheck,
  type QualityMetrics,
  runQualityPipeline,
} from "./services/quality-assurance";
export {
  calculateSimilarity,
  calculateUniquenessScore,
  checkPatternDiversity,
  createPuzzleFingerprint,
  extractComponents,
  identifyPattern,
  isComponentCombinationUnique,
  validateUniqueness,
} from "./services/uniqueness-tracker";
