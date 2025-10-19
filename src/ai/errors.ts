/**
 * AI Error Handling System
 *
 * Handles quota limits, API failures, and provides fallback mechanisms
 */

import { AI_CONFIG } from "./config"

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "AIError"
  }
}

export class QuotaExceededError extends AIError {
  constructor(
    public quotaType: "minute" | "day" | "month",
    public resetTime?: Date
  ) {
    super(
      `AI quota exceeded for ${quotaType}. Please try again later.`,
      "QUOTA_EXCEEDED",
      429
    )
    this.name = "QuotaExceededError"
  }

  getResetMessage(): string {
    if (!this.resetTime) {
      return "Quota will reset soon. Please try again in a few minutes."
    }

    const now = new Date()
    const diffMs = this.resetTime.getTime() - now.getTime()
    const diffMins = Math.ceil(diffMs / 60000)

    if (diffMins <= 1) {
      return "Quota resets in less than a minute."
    } else if (diffMins < 60) {
      return `Quota resets in ${diffMins} minutes.`
    } else {
      const hours = Math.floor(diffMins / 60)
      return `Quota resets in ${hours} hour${hours > 1 ? "s" : ""}.`
    }
  }
}

export class RateLimitError extends AIError {
  constructor(public retryAfter?: number) {
    super(
      "Rate limit exceeded. Please slow down your requests.",
      "RATE_LIMIT",
      429
    )
    this.name = "RateLimitError"
  }
}

export class AIProviderError extends AIError {
  constructor(
    message: string,
    public provider: string,
    statusCode?: number
  ) {
    super(message, "PROVIDER_ERROR", statusCode)
    this.name = "AIProviderError"
  }
}

/**
 * Parse AI SDK errors into typed errors
 */
export function parseAIError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error
  }

  if (error && typeof error === "object") {
    const err = error as any

    // Quota exceeded (429)
    if (err.status === 429 || err.statusCode === 429 || err.code === "429") {
      const resetTime = err.headers?.["x-ratelimit-reset"]
        ? new Date(parseInt(err.headers["x-ratelimit-reset"]) * 1000)
        : undefined

      return new QuotaExceededError("minute", resetTime)
    }

    // Rate limit
    if (err.message?.includes("rate limit") || err.message?.includes("too many requests")) {
      return new RateLimitError(err.retryAfter)
    }

    // Provider errors
    if (err.status === 503 || err.statusCode === 503) {
      return new AIProviderError("AI service temporarily unavailable", AI_CONFIG.defaultProvider, 503)
    }

    if (err.status === 500 || err.statusCode === 500) {
      return new AIProviderError("AI service error", AI_CONFIG.defaultProvider, 500)
    }
  }

  // Generic AI error
  return new AIError(
    error instanceof Error ? error.message : "Unknown AI error",
    "UNKNOWN_ERROR",
    500
  )
}

/**
 * Create user-friendly error response
 */
export function createErrorResponse(error: AIError): {
  error: string
  code: string
  statusCode: number
  retryable: boolean
  fallbackAvailable: boolean
  message: string
} {
  if (error instanceof QuotaExceededError) {
    return {
      error: "AI Quota Exceeded",
      code: error.code,
      statusCode: error.statusCode || 429,
      retryable: true,
      fallbackAvailable: true,
      message: error.getResetMessage(),
    }
  }

  if (error instanceof RateLimitError) {
    return {
      error: "Rate Limit Exceeded",
      code: error.code,
      statusCode: 429,
      retryable: true,
      fallbackAvailable: true,
      message: error.retryAfter
        ? `Please retry after ${error.retryAfter} seconds`
        : "Please slow down your requests and try again in a moment",
    }
  }

  if (error instanceof AIProviderError) {
    return {
      error: `AI Provider Error (${error.provider})`,
      code: error.code,
      statusCode: error.statusCode || 500,
      retryable: error.statusCode === 503,
      fallbackAvailable: true,
      message: error.message,
    }
  }

  return {
    error: "AI Error",
    code: error.code,
    statusCode: error.statusCode || 500,
    retryable: false,
    fallbackAvailable: false,
    message: error.message,
  }
}
