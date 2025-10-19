/**
 * AI Module - Central Exports
 *
 * Comprehensive AI system for Rebuzzle with:
 * - Dynamic puzzle generation
 * - Intelligent answer validation
 * - Progressive hint generation
 * - Caching and optimization
 * - Monitoring and analytics
 *
 * ADVANCED FEATURES:
 * - Chain-of-thought generation
 * - Uniqueness tracking & fingerprinting
 * - Multi-dimensional difficulty calibration
 * - Quality assurance pipeline
 * - Adversarial testing
 * - Master orchestrator
 */

// Configuration
export { AI_CONFIG, AI_FEATURES, validateApiKeys } from "./config"

// Client
export {
  getAIProvider,
  generateAIText,
  generateAIObject,
  streamAIText,
  withRetry,
} from "./client"

// Services
export {
  generateRebusPuzzle,
  generatePuzzleBatch,
  generatePuzzleForAnswer,
  improvePuzzle,
  generateThemedSet,
  validatePuzzleQuality,
  type GeneratedPuzzle,
} from "./services/puzzle-generator"

export {
  quickValidateAnswer,
  smartValidateAnswer,
  validateAnswer,
  generateFeedback,
  batchValidate,
} from "./services/answer-validation"

export {
  generateHints,
  generateContextualHint,
  generateCorrectionHint,
  generateExplanation,
  generateAdaptiveHint,
} from "./services/hint-generator"

// Caching
export {
  withCache,
  cachedPuzzleGeneration,
  cachedValidation,
  cachedHints,
  clearAICache,
  getCacheStats,
  destroyCache,
} from "./cache"

// Monitoring
export {
  getMonitor,
  trackAIOperation,
  getAIMetrics,
  getAIReport,
} from "./monitor"

// Advanced Features (Ultra-sophisticated puzzle generation)
export * from "./advanced"

// Error Handling & Quota Management
export {
  AIError,
  QuotaExceededError,
  RateLimitError,
  AIProviderError,
  parseAIError,
  createErrorResponse,
} from "./errors"

export {
  getQuotaManager,
  enforceQuota,
  getQuotaStats,
} from "./quota-manager"
