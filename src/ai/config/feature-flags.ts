/**
 * Feature Flags Configuration
 *
 * Controls gradual rollout of new AI features
 * Can be toggled via environment variables
 */

export interface AIFeatureFlags {
  embeddings: boolean;
  learning: boolean;
  recommendations: boolean;
  agentOrchestration: boolean;
  semanticCache: boolean;
}

/**
 * Get current feature flag configuration
 */
export function getFeatureFlags(): AIFeatureFlags {
  const flags: AIFeatureFlags = {
    // Embeddings: Enable vector embeddings for semantic search
    embeddings:
      process.env.AI_ENABLE_EMBEDDINGS !== "false" &&
      process.env.AI_ENABLE_EMBEDDINGS !== "0",

    // Learning: Enable learning from user feedback and performance analysis
    learning:
      process.env.AI_ENABLE_LEARNING !== "false" &&
      process.env.AI_ENABLE_LEARNING !== "0",

    // Recommendations: Enable personalized puzzle recommendations
    recommendations:
      process.env.AI_ENABLE_RECOMMENDATIONS !== "false" &&
      process.env.AI_ENABLE_RECOMMENDATIONS !== "0",

    // Agent Orchestration: Use multi-agent system for puzzle generation (experimental)
    agentOrchestration:
      process.env.AI_ENABLE_AGENT_ORCHESTRATION === "true" ||
      process.env.AI_ENABLE_AGENT_ORCHESTRATION === "1",

    // Semantic Cache: Enable semantic similarity-based caching
    semanticCache:
      process.env.AI_ENABLE_SEMANTIC_CACHE !== "false" &&
      process.env.AI_ENABLE_SEMANTIC_CACHE !== "0",
  };

  // In development, enable all features by default (including agent orchestration)
  const isDevelopment =
    process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  if (isDevelopment) {
    flags.embeddings = flags.embeddings !== false;
    flags.learning = flags.learning !== false;
    flags.recommendations = flags.recommendations !== false;
    flags.semanticCache = flags.semanticCache !== false;
    // Enable agent orchestration by default in development (unless explicitly disabled)
    if (
      process.env.AI_ENABLE_AGENT_ORCHESTRATION !== "false" &&
      process.env.AI_ENABLE_AGENT_ORCHESTRATION !== "0"
    ) {
      flags.agentOrchestration = true;
    }
  }

  return flags;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof AIFeatureFlags): boolean {
  return getFeatureFlags()[feature];
}

/**
 * Log current feature flag status (useful for debugging)
 */
export function logFeatureFlags(): void {
  const flags = getFeatureFlags();
  console.log("[AI Feature Flags]", JSON.stringify(flags, null, 2));
}
