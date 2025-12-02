/**
 * Advanced AI Puzzle System - Central Exports
 *
 * Ultra-sophisticated puzzle generation with:
 * - Chain-of-thought reasoning
 * - Uniqueness guarantees
 * - Difficulty calibration
 * - Quality assurance
 * - Performance analytics
 */

// Advanced Generation
export {
  generateWithChainOfThought,
  // Deprecated functions removed - use generateMasterPuzzle instead
} from "./services/advanced-puzzle-generator";
// Difficulty Calibration
export {
  aiSelfTest,
  analyzePlayerPerformance,
  calculateAdaptiveDifficulty,
  calculateDifficultyProfile,
  calibrateDifficulty,
  type DifficultyProfile,
} from "./services/difficulty-calibrator";
// Master Orchestrator
export {
  type GeneratedPuzzleResult,
  generateMasterBatch,
  generateMasterPuzzle,
  type MasterGenerationParams,
  selectOptimalPuzzle,
} from "./services/master-puzzle-orchestrator";

// Quality Assurance
export {
  adversarialTest,
  analyzeQuality,
  batchQualityCheck,
  type QualityMetrics,
  runQualityPipeline,
} from "./services/quality-assurance";
// Uniqueness Tracking
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
