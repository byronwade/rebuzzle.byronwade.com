/**
 * AI Configuration
 *
 * Centralized configuration for AI providers and models
 *
 * FREE TIER FIRST STRATEGY:
 * - All model selections prioritize free tier models first
 * - Fallback chains are ordered by cost (cheapest free tier first)
 * - No paid models are used until free tier is exhausted
 * - Embeddings use free tier models exclusively
 * - Gateway routes through provider free tiers automatically
 */

export const AI_CONFIG = {
  // Provider selection (can be changed via env)
  // Options: "google" | "groq" | "xai" | "openai" | "gateway"
  // "gateway" uses Vercel AI Gateway with $5/month free credits + your own API keys
  // Gateway is the default as it works with Google and other providers automatically
  defaultProvider: (process.env.AI_PROVIDER || "gateway") as
    | "groq"
    | "xai"
    | "openai"
    | "google"
    | "gateway",

  // Vercel AI Gateway configuration
  gateway: {
    // Use your Vercel AI Gateway API key (get from Vercel dashboard)
    // If not set, will try to use VERCEL_OIDC_TOKEN (auto-provided on Vercel)
    apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
    // IMPORTANT: Only AI_GATEWAY_API_KEY is used - no provider-specific API keys needed!
    // - Provider API keys are configured in Vercel dashboard (AI Gateway > Integrations)
    // - Dashboard API keys are used automatically - no env vars needed
    // - Usage is tracked in Vercel dashboard and credits are consumed
    // - Provider free tier limits still apply (they're provider-side limits)
    // - Vercel credits are consumed after free tier limits are reached
  },

  // Google AI configuration (only used if provider is set to "google" directly)
  // NOTE: When using gateway, provider API keys are configured in Vercel dashboard
  google: {
    apiKey: undefined, // Not used - gateway uses dashboard keys
    quotaLimits: {
      // Conservative limits based on free tier - actual limits vary by model
      requestsPerMinute: 10, // Conservative limit (some models have 2-30 RPM)
      requestsPerDay: 200, // Conservative limit (some models have 50-1K RPD)
      warningThreshold: 0.8, // Warn at 80%
    },
    // Model-specific quota info (for reference, not enforced)
    modelQuotas: {
      "gemini-2.0-flash-lite": { rpm: 30, rpd: 200, tpm: 1_000_000 },
      "gemini-2.0-flash-exp": { rpm: 15, rpd: 50, tpm: 1_000_000 },
      "gemini-2.5-pro": { rpm: 2, rpd: 50, tpm: 125_000 },
      "gemini-2.5-flash": { rpm: 10, rpd: 250, tpm: 250_000 },
    },
  },

  // Model configurations with fallback chains
  models: {
    google: {
      // Primary models (ordered by preference)
      fast: "gemini-2.0-flash-lite", // 9/200 RPD - plenty of room, 2/30 RPM
      smart: "gemini-2.0-flash-exp", // 1/50 RPD - lots of room available
      creative: "gemini-2.0-flash-exp", // 1/50 RPD - experimental features
    },
    // Fallback model chains - tried in order if primary fails
    // PRIORITY: Free tier models first (cheapest/most cost-effective), then paid models
    // All models listed use provider free tiers or lowest cost options
    fallbacks: {
      gateway: {
        // Fast models - ordered by cost (cheapest free tier first)
        fast: [
          "google/gemini-2.0-flash-lite", // Primary - FREE TIER - $0.07/M input (cheapest, WORKING)
          "google/gemini-2.5-flash-lite", // Fallback 1 - FREE TIER - $0.10/M input
          "google/gemini-2.0-flash", // Fallback 2 - FREE TIER - $0.10/M input
          "groq/meta/llama-3.1-8b", // Fallback 3 - FREE TIER - $0.05/M input (cheapest overall) - NOTE: May not be available in gateway
          "groq/meta/llama-4-scout", // Fallback 4 - FREE TIER - $0.08/M input - NOTE: May not be available in gateway
          "groq/openai/gpt-oss-20b", // Fallback 5 - FREE TIER - $0.07/M input - NOTE: May not be available in gateway
          "xai/grok-beta", // Fallback 6 - FREE TIER (if key available)
        ],
        // Smart models - ordered by cost-effectiveness (free tier first)
        smart: [
          "google/gemini-2.0-flash", // Primary - FREE TIER - $0.10/M input (cost-effective, WORKING)
          "google/gemini-2.5-flash", // Fallback 1 - FREE TIER - $0.30/M input (higher quality)
          "groq/alibaba/qwen-3-32b", // Fallback 2 - FREE TIER - $0.10/M input (cheapest smart option) - NOTE: May not be available in gateway
          "groq/openai/gpt-oss-120b", // Fallback 3 - FREE TIER - $0.10/M input (high quality) - NOTE: May not be available in gateway
          "groq/meta/llama-4-scout", // Fallback 4 - FREE TIER - $0.08/M input - NOTE: May not be available in gateway
          "google/gemini-2.5-pro", // Fallback 5 - FREE TIER - $1.25/M input (best quality, more expensive but still free tier)
          "groq/meta/llama-3.3-70b", // Fallback 6 - FREE TIER - $0.72/M input (best quality) - NOTE: May not be available in gateway
        ],
        // Creative models - ordered by cost-effectiveness (free tier first)
        creative: [
          "google/gemini-2.0-flash", // Primary - FREE TIER - $0.10/M input (WORKING)
          "google/gemini-2.5-flash", // Fallback 1 - FREE TIER - $0.30/M input
          "groq/alibaba/qwen-3-32b", // Fallback 2 - FREE TIER - $0.10/M input - NOTE: May not be available in gateway
          "groq/meta/llama-4-scout", // Fallback 3 - FREE TIER - $0.08/M input - NOTE: May not be available in gateway
          "groq/openai/gpt-oss-20b", // Fallback 4 - FREE TIER - $0.07/M input - NOTE: May not be available in gateway
          "google/gemini-2.5-pro", // Fallback 5 - FREE TIER - $1.25/M input (best quality)
          "xai/grok-2-latest", // Fallback 6 - FREE TIER (if key available)
        ],
      },
      google: {
        fast: [
          "gemini-2.0-flash-lite", // Primary (30 RPM, 200 RPD)
          "gemini-2.0-flash-exp", // Fallback 1 (15 RPM, 50 RPD)
          "gemini-2.0-flash", // Fallback 2 (15 RPM, 200 RPD)
          "gemini-2.5-flash-lite", // Fallback 3 (15 RPM, 1K RPD)
          "gemini-2.5-flash", // Fallback 4 (10 RPM, 250 RPD)
        ],
        smart: [
          "gemini-2.0-flash-exp", // Primary (15 RPM, 50 RPD)
          "gemini-2.0-flash", // Fallback 1 (15 RPM, 200 RPD)
          "gemini-2.5-pro", // Fallback 2 (2 RPM, 50 RPD) - best reasoning
          "gemini-2.5-flash", // Fallback 3 (10 RPM, 250 RPD)
          "gemini-2.0-flash-lite", // Fallback 4 (30 RPM, 200 RPD)
        ],
        creative: [
          "gemini-2.0-flash-exp", // Primary (15 RPM, 50 RPD)
          "gemini-2.0-flash", // Fallback 1 (15 RPM, 200 RPD)
          "gemini-2.5-flash", // Fallback 2 (10 RPM, 250 RPD)
          "gemini-2.5-pro", // Fallback 3 (2 RPM, 50 RPD)
          "gemini-2.0-flash-lite", // Fallback 4 (30 RPM, 200 RPD)
        ],
      },
    },
    groq: {
      fast: "llama-3.3-70b-versatile",
      smart: "llama-3.3-70b-specdec",
      creative: "llama-3.1-70b-versatile",
    },
    xai: {
      fast: "grok-beta",
      smart: "grok-2-latest",
      creative: "grok-2-latest",
    },
    openai: {
      fast: "gpt-4o-mini",
      smart: "gpt-4o",
      creative: "gpt-4o",
    },
    // Vercel AI Gateway models (use provider/model format)
    // PRIORITY: FREE TIER MODELS FIRST
    // All models use provider free tiers - no paid models until free tier is exhausted
    // NOTE: Google models are prioritized as they're confirmed working in the gateway
    gateway: {
      fast: "google/gemini-2.0-flash-lite", // FREE TIER - $0.07/M input (cheapest free tier option, WORKING)
      smart: "google/gemini-2.0-flash", // FREE TIER - $0.10/M input (cost-effective free tier, WORKING)
      creative: "google/gemini-2.0-flash", // FREE TIER - $0.10/M input (free tier creative option, WORKING)
    },
  },

  // Embedding model configurations
  // PRIORITY: Free tier models first, then paid models
  embeddings: {
    // Gateway embedding models (use provider/model format)
    // FREE TIER FIRST: All embedding models use free tier
    gateway: "google/gemini-embedding-001", // Google free tier embedding model (FREE)
    // Embedding fallback chain - free tier models first
    fallbackChain: [
      "google/gemini-embedding-001", // Primary - Google free tier (FREE)
      // Note: Most embedding models are free tier, so fallbacks are minimal
      // If needed, could add: "openai/text-embedding-3-small" (paid)
    ],
    // Direct provider models (for reference, but gateway should be used)
    google: "gemini-embedding-001", // Google free tier
    openai: "text-embedding-3-small", // Paid model - only as last resort
  },

  // Generation parameters
  generation: {
    temperature: {
      factual: 0.3, // For validation, explanations
      balanced: 0.7, // For general puzzle generation
      creative: 0.9, // For creative puzzles, variations
    },
    maxTokens: {
      short: 256, // For simple responses
      medium: 1024, // For puzzle generation
      long: 2048, // For detailed explanations
      blog: 4000, // For comprehensive blog posts (whitepaper-style)
    },
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10_000,
  },

  // Caching
  cache: {
    enabled: true,
    ttl: {
      puzzleGeneration: 24 * 60 * 60, // 24 hours
      validation: 60 * 60, // 1 hour
      hints: 12 * 60 * 60, // 12 hours
    },
  },

  // Timeouts (in milliseconds)
  timeouts: {
    default: 30_000, // 30 seconds
    streaming: 60_000, // 60 seconds
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10_000, // 10 seconds
    backoffMultiplier: 2,
  },
} as const;

// API Keys validation
export function validateApiKeys(): {
  valid: boolean;
  missing: string[];
  provider: string;
} {
  const provider = AI_CONFIG.defaultProvider;
  const missing: string[] = [];

  switch (provider) {
    case "google":
      // Direct Google provider requires GOOGLE_AI_API_KEY
      // NOTE: Use "gateway" provider with only AI_GATEWAY_API_KEY instead
      if (!process.env.GOOGLE_AI_API_KEY) {
        missing.push(
          "GOOGLE_AI_API_KEY (or use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY)"
        );
      }
      break;
    case "groq":
      // Direct Groq provider requires GROQ_API_KEY
      // NOTE: Use "gateway" provider with only AI_GATEWAY_API_KEY instead
      if (!process.env.GROQ_API_KEY) {
        missing.push(
          "GROQ_API_KEY (or use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY)"
        );
      }
      break;
    case "xai":
      // Direct XAI provider requires XAI_API_KEY
      // NOTE: Use "gateway" provider with only AI_GATEWAY_API_KEY instead
      if (!process.env.XAI_API_KEY) {
        missing.push(
          "XAI_API_KEY (or use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY)"
        );
      }
      break;
    case "openai":
      // Direct OpenAI provider requires OPENAI_API_KEY
      // NOTE: Use "gateway" provider with only AI_GATEWAY_API_KEY instead
      if (!process.env.OPENAI_API_KEY) {
        missing.push(
          "OPENAI_API_KEY (or use AI_PROVIDER=gateway with only AI_GATEWAY_API_KEY)"
        );
      }
      break;
    case "gateway": {
      // Gateway is lenient - can work without API key in some cases
      // Provider API keys are configured in Vercel dashboard (AI Gateway > Integrations)
      // Dashboard API keys are used automatically - no env vars needed
      // On Vercel, VERCEL_OIDC_TOKEN is auto-provided
      // For local development, gateway can work without explicit keys (will fail gracefully if needed)
      // No validation required - let the gateway SDK handle it
      // No provider API keys needed - they're configured in Vercel dashboard
      break;
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    provider,
  };
}

// Environment-based configuration
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";

// Feature flags
export const AI_FEATURES = {
  dynamicPuzzleGeneration: process.env.AI_PUZZLE_GENERATION === "true",
  smartValidation: process.env.AI_SMART_VALIDATION === "true",
  dynamicHints: process.env.AI_DYNAMIC_HINTS === "true",
  difficultyAdjustment: process.env.AI_DIFFICULTY_ADJUSTMENT === "true",
  contentModeration: process.env.AI_CONTENT_MODERATION === "true",
} as const;
