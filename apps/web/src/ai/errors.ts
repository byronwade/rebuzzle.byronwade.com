/**
 * AI Error Handling System
 *
 * Handles quota limits, API failures, and provides fallback mechanisms
 */

import { AI_CONFIG } from "./config";

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AIError";
  }
}

export class QuotaExceededError extends AIError {
  constructor(
    public quotaType: "minute" | "day" | "month",
    public resetTime?: Date
  ) {
    super(`AI quota exceeded for ${quotaType}. Please try again later.`, "QUOTA_EXCEEDED", 429);
    this.name = "QuotaExceededError";
  }

  getResetMessage(): string {
    if (!this.resetTime) {
      return "Quota will reset soon. Please try again in a few minutes.";
    }

    const now = new Date();
    const diffMs = this.resetTime.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60_000);

    if (diffMins <= 1) {
      return "Quota resets in less than a minute.";
    }
    if (diffMins < 60) {
      return `Quota resets in ${diffMins} minutes.`;
    }
    const hours = Math.floor(diffMins / 60);
    return `Quota resets in ${hours} hour${hours > 1 ? "s" : ""}.`;
  }
}

export class RateLimitError extends AIError {
  constructor(public retryAfter?: number) {
    super("Rate limit exceeded. Please slow down your requests.", "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

export class AIProviderError extends AIError {
  constructor(
    message: string,
    public provider: string,
    statusCode?: number
  ) {
    super(message, "PROVIDER_ERROR", statusCode);
    this.name = "AIProviderError";
  }
}

/**
 * Parse AI SDK errors into typed errors
 */
export function parseAIError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  // Extract error message for quota detection
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;

  // Check for model not found errors (should trigger fallback to next model)
  if (
    errorMessage.includes("not found") ||
    (errorMessage.includes("Model") && errorMessage.includes("not found")) ||
    errorMessage.includes("model_not_found")
  ) {
    // Check if this is a nested error with model_not_found type
    if (errorObj) {
      const err = errorObj as {
        type?: string;
        data?: { error?: { type?: string; message?: string } };
      };
      if (err.type === "model_not_found" || err.data?.error?.type === "model_not_found") {
        return new AIError(errorMessage, "MODEL_NOT_FOUND", 404);
      }
    }
    // Return as model not found error (retryable)
    return new AIError(errorMessage, "MODEL_NOT_FOUND", 404);
  }

  // Check for quota exceeded in message (Google API format)
  if (
    errorMessage.includes("exceeded your current quota") ||
    errorMessage.includes("Quota exceeded for metric") ||
    errorMessage.includes("RESOURCE_EXHAUSTED") ||
    errorMessage.includes("quota")
  ) {
    // Try to extract retry delay from message
    const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
    const retrySeconds = retryMatch?.[1] ? Number.parseFloat(retryMatch[1]) : undefined;
    const resetTime = retrySeconds ? new Date(Date.now() + retrySeconds * 1000) : undefined;

    return new QuotaExceededError("minute", resetTime);
  }

  if (errorObj) {
    interface ErrorWithStatus {
      status?: number;
      statusCode?: number;
      code?: string;
      message?: string;
      retryAfter?: number;
      headers?: {
        [key: string]: string;
      };
      lastError?: unknown;
      cause?: unknown;
      errors?: unknown[];
    }
    const err = errorObj as ErrorWithStatus;

    // Check nested errors (AI SDK RetryError wraps the actual error)
    // Try lastError first (most common in AI SDK)
    if (err.lastError) {
      const nested = parseAIError(err.lastError);
      if (nested instanceof QuotaExceededError || nested.code === "QUOTA_EXCEEDED") {
        return nested;
      }
      // Also check for model_not_found in nested errors
      if (nested.code === "MODEL_NOT_FOUND") {
        return nested;
      }
    }

    // Try cause property (standard Error.cause)
    if (err.cause) {
      const nested = parseAIError(err.cause);
      if (nested instanceof QuotaExceededError || nested.code === "QUOTA_EXCEEDED") {
        return nested;
      }
      // Also check for model_not_found in nested errors
      if (nested.code === "MODEL_NOT_FOUND") {
        return nested;
      }
    }

    // Try errors array (AI SDK RetryError has this)
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      const lastErr = err.errors[err.errors.length - 1];
      const nested = parseAIError(lastErr);
      if (nested instanceof QuotaExceededError || nested.code === "QUOTA_EXCEEDED") {
        return nested;
      }
      // Also check for model_not_found in nested errors
      if (nested.code === "MODEL_NOT_FOUND") {
        return nested;
      }
    }

    // Check for model_not_found in error data structure (Gateway returns this)
    interface GatewayErrorData {
      data?: {
        error?: {
          type?: string;
          message?: string;
        };
      };
      type?: string;
    }
    const gatewayErr = errorObj as GatewayErrorData;
    if (
      gatewayErr.type === "model_not_found" ||
      gatewayErr.data?.error?.type === "model_not_found"
    ) {
      return new AIError(gatewayErr.data?.error?.message || errorMessage, "MODEL_NOT_FOUND", 404);
    }

    // Quota exceeded (429) - check status codes
    if (err.status === 429 || err.statusCode === 429 || err.code === "429") {
      const resetTime = err.headers?.["x-ratelimit-reset"]
        ? new Date(Number.parseInt(err.headers["x-ratelimit-reset"], 10) * 1000)
        : undefined;

      return new QuotaExceededError("minute", resetTime);
    }

    // Rate limit
    if (err.message?.includes("rate limit") || err.message?.includes("too many requests")) {
      return new RateLimitError(err.retryAfter);
    }

    // Provider errors
    if (err.status === 503 || err.statusCode === 503) {
      return new AIProviderError(
        "AI service temporarily unavailable",
        AI_CONFIG.defaultProvider,
        503
      );
    }

    if (err.status === 500 || err.statusCode === 500) {
      return new AIProviderError("AI service error", AI_CONFIG.defaultProvider, 500);
    }
  }

  // Generic AI error
  return new AIError(
    error instanceof Error ? error.message : "Unknown AI error",
    "UNKNOWN_ERROR",
    500
  );
}

/**
 * Create user-friendly error response
 */
export function createErrorResponse(error: AIError): {
  error: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  fallbackAvailable: boolean;
  message: string;
} {
  if (error instanceof QuotaExceededError) {
    return {
      error: "AI Quota Exceeded",
      code: error.code,
      statusCode: error.statusCode || 429,
      retryable: true,
      fallbackAvailable: true,
      message: error.getResetMessage(),
    };
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
    };
  }

  if (error instanceof AIProviderError) {
    return {
      error: `AI Provider Error (${error.provider})`,
      code: error.code,
      statusCode: error.statusCode || 500,
      retryable: error.statusCode === 503,
      fallbackAvailable: true,
      message: error.message,
    };
  }

  return {
    error: "AI Error",
    code: error.code,
    statusCode: error.statusCode || 500,
    retryable: false,
    fallbackAvailable: false,
    message: error.message,
  };
}
