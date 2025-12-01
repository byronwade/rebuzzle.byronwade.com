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

// Vector Operations (for similarity calculations)
export {
  cosineSimilarity,
  dotProduct,
  euclideanDistance,
  findTopKSimilar,
  normalizeVector,
} from "@/db/utils/vector-operations";
// Advanced Features (Ultra-sophisticated puzzle generation)
export * from "./advanced";
// Agent Orchestration
export {
  orchestratePersonalizedGeneration,
  orchestratePuzzleGeneration,
  orchestrateQualityReview,
} from "./agents/orchestrator";
// Caching
export {
  cachedHints,
  cachedPuzzleGeneration,
  cachedValidation,
  clearAICache,
  destroyCache,
  getCacheStats,
  withCache,
} from "./cache";
// Client
export {
  generateAIObject,
  generateAIText,
  getAIProvider,
  streamAIText,
  withRetry,
} from "./client";
// Configuration
export { AI_CONFIG, AI_FEATURES, validateApiKeys } from "./config";
export {
  type AIFeatureFlags,
  getFeatureFlags,
  isFeatureEnabled,
  logFeatureFlags,
} from "./config/feature-flags";
// DevTools
export {
  getDevToolsConfig,
  isDevToolsEnabled,
  logAgentActivity,
  logPerformance,
  logToolUsage,
} from "./devtools";
// Error Handling & Quota Management
export {
  AIError,
  AIProviderError,
  createErrorResponse,
  parseAIError,
  QuotaExceededError,
  RateLimitError,
} from "./errors";
// Monitoring
export {
  getAIMetrics,
  getAIReport,
  getMonitor,
  trackAIOperation,
} from "./monitor";
export {
  enforceQuota,
  getQuotaManager,
  getQuotaStats,
} from "./quota-manager";
export {
  batchValidate,
  generateFeedback,
  quickValidateAnswer,
  smartValidateAnswer,
  validateAnswer,
} from "./services/answer-validation";
// Embeddings & Semantic Search
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  generatePuzzleEmbedding,
  isEmbeddingAvailable,
} from "./services/embeddings";
export {
  generateAdaptiveHint,
  generateContextualHint,
  generateCorrectionHint,
  generateExplanation,
  generateHints,
} from "./services/hint-generator";
// Services
export {
  type GeneratedPuzzle,
  generatePuzzleBatch,
  generatePuzzleForAnswer,
  generateRebusPuzzle,
  generateThemedSet,
  improvePuzzle,
  validatePuzzleQuality,
} from "./services/puzzle-generator";
// Learning & Analytics
export {
  analyzePuzzlePerformance,
  calculateActualDifficulty,
  generateImprovementSuggestions,
  identifyProblematicPuzzles,
} from "./services/puzzle-learning";
// Recommendations
export {
  getAdaptiveDifficulty,
  getPersonalizedPuzzles,
  type PuzzleRecommendation,
  recommendNextPuzzle,
} from "./services/recommendations";
export {
  findSimilarPuzzles,
  recommendPuzzlesByUserHistory,
  searchPuzzlesByConcept,
} from "./services/semantic-search";
// User Profiling
export {
  buildUserPuzzleProfile,
  calculateUserDifficultyPreference,
  estimateUserSkillLevel,
  identifyUserCategories,
  identifyUserPuzzleTypes,
  type UserPuzzleProfile,
} from "./services/user-profiler";
// Tools
export * from "./tools";
