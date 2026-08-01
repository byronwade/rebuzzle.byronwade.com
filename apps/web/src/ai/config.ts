/**
 * AI Configuration — Vercel AI Gateway
 *
 * All traffic goes through the gateway. Provider API keys live in the
 * Vercel AI Gateway dashboard; locally use `AI_GATEWAY_API_KEY`.
 */

export const AI_CONFIG = {
  defaultProvider: "gateway" as const,

  gateway: {
    /**
     * API key only (`vck_…`). Do NOT put VERCEL_OIDC_TOKEN here —
     * the gateway SDK must authenticate OIDC with authMethod "oidc",
     * and stuffing a JWT into AI_GATEWAY_API_KEY breaks production auth.
     */
    apiKey: process.env.AI_GATEWAY_API_KEY,
  },

  models: {
    gateway: {
      // Prefer capable gateway models for puzzle assembly; flash for cheap ops
      fast: "google/gemini-2.5-flash-lite",
      smart: "google/gemini-2.5-flash",
      creative: "openai/gpt-5.6-luna",
    },
    fallbacks: {
      gateway: {
        fast: [
          "google/gemini-2.5-flash-lite",
          "google/gemini-2.5-flash",
          "openai/gpt-5.6-luna",
          "xai/grok-4.1-fast-non-reasoning",
        ],
        smart: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-pro",
          "openai/gpt-5.6-luna",
          "anthropic/claude-sonnet-4.6",
        ],
        creative: [
          "openai/gpt-5.6-luna",
          "google/gemini-2.5-flash",
          "xai/grok-4.1-fast-reasoning",
          "anthropic/claude-sonnet-4.6",
        ],
      },
    },
  },

  embeddings: {
    gateway: "google/gemini-embedding-001",
    fallbackChain: ["google/gemini-embedding-001"],
  },

  /** Eve / ToolLoopAgent puzzle generation */
  puzzleAgent: {
    // Prefer creative-tier models for wordplay; override with EVE_PUZZLE_MODEL
    model: process.env.EVE_PUZZLE_MODEL || "openai/gpt-5.6-luna",
    maxSteps: 24,
    /**
     * Default daily target on the 1–10 scale ≈ Difficult band.
     * Weekly spine + learning override this for cron; override with EVE_DEFAULT_DIFFICULTY.
     */
    defaultTargetDifficulty: Math.max(
      1,
      Math.min(10, Number(process.env.EVE_DEFAULT_DIFFICULTY || 6) || 6)
    ),
    qualityThreshold: 74,
    minFunScore: 68,
    maxAttempts: 4,
    /**
     * Apex engine — multi-candidate tournament with critique + player sim.
     * Disable with EVE_APEX_ENGINE=0
     */
    apex: {
      enabled: process.env.EVE_APEX_ENGINE !== "0" && process.env.EVE_APEX_ENGINE !== "false",
      candidateCount: Math.max(
        2,
        Math.min(5, Number(process.env.EVE_APEX_CANDIDATES || 3) || 3)
      ),
      minRubricOverall: Math.max(
        70,
        Math.min(95, Number(process.env.EVE_APEX_MIN_RUBRIC || 78) || 78)
      ),
      critiqueEnabled: process.env.EVE_APEX_CRITIQUE !== "0",
      playerSimEnabled: process.env.EVE_APEX_PLAYER_SIM !== "0",
    },
  },

  generation: {
    temperature: {
      factual: 0.3,
      balanced: 0.7,
      // Slightly lower than 0.9 — more coherent wordplay, less random emoji salad
      creative: 0.82,
    },
    maxTokens: {
      short: 256,
      medium: 1024,
      long: 2048,
      blog: 4000,
    },
  },

  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10_000,
  },

  cache: {
    enabled: true,
    ttl: {
      puzzleGeneration: 24 * 60 * 60,
      validation: 60 * 60,
      hints: 12 * 60 * 60,
    },
  },

  timeouts: {
    default: 45_000,
    streaming: 90_000,
    agent: 120_000,
  },

  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10_000,
    backoffMultiplier: 2,
  },
} as const;

export function validateApiKeys(): {
  valid: boolean;
  missing: string[];
  provider: string;
} {
  // Gateway is lenient: OIDC on Vercel, AI_GATEWAY_API_KEY locally.
  // Missing keys surface as runtime gateway errors rather than boot failures.
  return {
    valid: true,
    missing: [],
    provider: "gateway",
  };
}

export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";

export const AI_FEATURES = {
  dynamicPuzzleGeneration: process.env.AI_PUZZLE_GENERATION === "true",
  smartValidation: process.env.AI_SMART_VALIDATION === "true",
  dynamicHints: process.env.AI_DYNAMIC_HINTS === "true",
  difficultyAdjustment: process.env.AI_DIFFICULTY_ADJUSTMENT === "true",
  contentModeration: process.env.AI_CONTENT_MODERATION === "true",
} as const;
