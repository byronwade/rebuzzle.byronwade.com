/**
 * AI Configuration
 *
 * Centralized configuration for AI providers and models
 */

export const AI_CONFIG = {
  // Provider selection (can be changed via env)
  defaultProvider: (process.env.AI_PROVIDER || "google") as "groq" | "xai" | "openai" | "google",

  // Google AI configuration
  google: {
    apiKey: process.env.GOOGLE_AI_API_KEY || "AIzaSyAh71K0RVO7LTB3bHRRiKTUJy7dIib_Oho",
    quotaLimits: {
      requestsPerMinute: 15, // Free tier limit
      requestsPerDay: 1500,  // Free tier limit
      warningThreshold: 0.8, // Warn at 80%
    },
  },

  // Model configurations
  models: {
    google: {
      fast: "gemini-2.0-flash-exp", // Fastest, free tier
      smart: "gemini-1.5-pro", // Best reasoning
      creative: "gemini-1.5-flash", // Good balance
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
    },
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
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
    default: 30000, // 30 seconds
    streaming: 60000, // 60 seconds
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
  },
} as const

// API Keys validation
export function validateApiKeys(): {
  valid: boolean
  missing: string[]
  provider: string
} {
  const provider = AI_CONFIG.defaultProvider
  const missing: string[] = []

  switch (provider) {
    case "google":
      if (!process.env.GOOGLE_AI_API_KEY && !AI_CONFIG.google.apiKey) {
        missing.push("GOOGLE_AI_API_KEY")
      }
      break
    case "groq":
      if (!process.env.GROQ_API_KEY) missing.push("GROQ_API_KEY")
      break
    case "xai":
      if (!process.env.XAI_API_KEY) missing.push("XAI_API_KEY")
      break
    case "openai":
      if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY")
      break
  }

  return {
    valid: missing.length === 0,
    missing,
    provider,
  }
}

// Environment-based configuration
export const isDevelopment = process.env.NODE_ENV === "development"
export const isProduction = process.env.NODE_ENV === "production"

// Feature flags
export const AI_FEATURES = {
  dynamicPuzzleGeneration: process.env.AI_PUZZLE_GENERATION === "true",
  smartValidation: process.env.AI_SMART_VALIDATION === "true",
  dynamicHints: process.env.AI_DYNAMIC_HINTS === "true",
  difficultyAdjustment: process.env.AI_DIFFICULTY_ADJUSTMENT === "true",
  contentModeration: process.env.AI_CONTENT_MODERATION === "true",
} as const
