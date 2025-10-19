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
  generateWithEnsemble,
  generateWithIterativeRefinement,
  generateWithConstitution,
  generateUltraChallengingPuzzle,
} from "./services/advanced-puzzle-generator"

// Uniqueness Tracking
export {
  createPuzzleFingerprint,
  calculateSimilarity,
  extractComponents,
  isComponentCombinationUnique,
  identifyPattern,
  checkPatternDiversity,
  validateUniqueness,
  calculateUniquenessScore,
} from "./services/uniqueness-tracker"

// Difficulty Calibration
export {
  calculateDifficultyProfile,
  aiSelfTest,
  calibrateDifficulty,
  analyzePlayerPerformance,
  calculateAdaptiveDifficulty,
  type DifficultyProfile,
} from "./services/difficulty-calibrator"

// Quality Assurance
export {
  analyzeQuality,
  adversarialTest,
  runQualityPipeline,
  batchQualityCheck,
  type QualityMetrics,
} from "./services/quality-assurance"

// Master Orchestrator
export {
  generateMasterPuzzle,
  generateMasterBatch,
  selectOptimalPuzzle,
  type MasterGenerationParams,
  type GeneratedPuzzleResult,
} from "./services/master-puzzle-orchestrator"
