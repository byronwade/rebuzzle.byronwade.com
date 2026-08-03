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

/** A project/account spending cap. Retrying cannot succeed until an operator changes it. */
export class AIBudgetExceededError extends AIError {
  constructor() {
    super(
      "AI Gateway budget exhausted. Increase the project Gateway budget before retrying.",
      "AI_BUDGET_EXCEEDED",
      429
    );
    this.name = "AIBudgetExceededError";
  }
}

function collectErrorSignals(error: unknown): string {
  const signals: string[] = [];
  const queue: Array<{ value: unknown; depth: number }> = [{ value: error, depth: 0 }];
  const seen = new Set<unknown>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth > 6 || current.value == null) continue;

    if (typeof current.value === "string" || typeof current.value === "number") {
      signals.push(String(current.value));
      continue;
    }
    if (typeof current.value !== "object" || seen.has(current.value)) continue;
    seen.add(current.value);

    const record = current.value as Record<string, unknown>;
    for (const key of ["name", "message", "type", "code"]) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") {
        signals.push(String(value));
      }
    }
    for (const key of ["data", "error", "cause", "lastError", "errors"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        for (const item of value) queue.push({ value: item, depth: current.depth + 1 });
      } else if (value != null) {
        queue.push({ value, depth: current.depth + 1 });
      }
    }
  }

  return signals.join(" ");
}

/** True only for a hard project/account budget cap, not a transient rate quota. */
export function isHardAIBudgetError(error: unknown): boolean {
  if (error instanceof AIBudgetExceededError) return true;
  if (error instanceof AIError && error.code === "AI_BUDGET_EXCEEDED") return true;

  const signals = collectErrorSignals(error);
  return (
    /quota_for_entity_exceeded/i.test(signals) ||
    /api key budget exceeded/i.test(signals) ||
    /(?:project|account|gateway) budget (?:has been )?exceeded/i.test(signals) ||
    /current spend[^\n]*limit/i.test(signals)
  );
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
  // Spending caps are terminal. Detect nested Gateway/RetryError payloads before
  // generic auth or quota handling so callers can stop all fallback fan-out.
  if (isHardAIBudgetError(error)) {
    return error instanceof AIBudgetExceededError ? error : new AIBudgetExceededError();
  }

  if (error instanceof AIError) {
    return error;
  }

  // Extract provider text for quota / auth classification (not a UI status string)
  const providerText = error instanceof Error ? error.message : String(error);
  const errorObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const errorName = error instanceof Error ? error.name : "";

  // AI Gateway auth — surface actionable remediation (production wraps this as GatewayError)
  if (
    errorName === "GatewayAuthenticationError" ||
    errorName === "GatewayError" ||
    /unauthenticated/i.test(providerText) ||
    /ai_gateway_api_key/i.test(providerText)
  ) {
    const onVercel = Boolean(process.env.VERCEL);
    const remediation = onVercel
      ? "Add AI_GATEWAY_API_KEY (vck_…) in Vercel → Project Settings → Environment Variables for Production and Preview, or enable Settings → Security → OIDC Federation."
      : "Set AI_GATEWAY_API_KEY (vck_…) in apps/web/.env.local and restart the dev server.";
    return new AIError(
      `AI Gateway Unauthenticated. ${remediation} Learn more: https://ai-sdk.dev/unauthenticated-ai-gateway`,
      "AUTH_ERROR",
      401
    );
  }

  // Check for model not found errors (should trigger fallback to next model)
  if (
    providerText.includes("not found") ||
    (providerText.includes("Model") && providerText.includes("not found")) ||
    providerText.includes("model_not_found")
  ) {
    // Check if this is a nested error with model_not_found type
    if (errorObj) {
      const err = errorObj as {
        type?: string;
        data?: { error?: { type?: string; message?: string } };
      };
      if (err.type === "model_not_found" || err.data?.error?.type === "model_not_found") {
        return new AIError(providerText, "MODEL_NOT_FOUND", 404);
      }
    }
    // Return as model not found error (retryable)
    return new AIError(providerText, "MODEL_NOT_FOUND", 404);
  }

  // Check for quota exceeded in message (Google API format)
  if (
    providerText.includes("exceeded your current quota") ||
    providerText.includes("Quota exceeded for metric") ||
    providerText.includes("RESOURCE_EXHAUSTED") ||
    providerText.includes("quota")
  ) {
    // Try to extract retry delay from message
    const retryMatch = providerText.match(/retry in ([\d.]+)s/i);
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

    // Try nested failure list (AI SDK RetryError has this)
    const nestedFailures = Array.isArray(err["errors"]) ? err["errors"] : null;
    if (nestedFailures && nestedFailures.length > 0) {
      const lastErr = nestedFailures[nestedFailures.length - 1];
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
      return new AIError(gatewayErr.data?.error?.message || providerText, "MODEL_NOT_FOUND", 404);
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
  if (error instanceof AIBudgetExceededError || error.code === "AI_BUDGET_EXCEEDED") {
    return {
      error: "AI Budget Exceeded",
      code: error.code,
      statusCode: error.statusCode || 429,
      retryable: false,
      fallbackAvailable: false,
      message: error.message,
    };
  }

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
