/**
 * API Response Utilities
 *
 * Provides consistent response formatting for all API routes.
 * Includes type-safe error handling and response builders.
 */

import { NextResponse } from "next/server";

/** Standard API error codes */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

/** HTTP status codes mapped to error codes */
const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/** Standard API success response */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Combined API response type */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse["meta"],
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return NextResponse.json(response, {
    status: ERROR_STATUS_MAP[code],
    headers,
  });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  badRequest: (message = "Invalid request", details?: Record<string, unknown>) =>
    apiError("BAD_REQUEST", message, details),

  unauthorized: (message = "Authentication required") => apiError("UNAUTHORIZED", message),

  forbidden: (message = "Access denied") => apiError("FORBIDDEN", message),

  notFound: (resource = "Resource") => apiError("NOT_FOUND", `${resource} not found`),

  methodNotAllowed: (allowed: string[]) =>
    apiError("METHOD_NOT_ALLOWED", `Method not allowed. Use: ${allowed.join(", ")}`),

  conflict: (message = "Resource already exists") => apiError("CONFLICT", message),

  validationError: (errors: Record<string, string>) =>
    apiError("UNPROCESSABLE_ENTITY", "Validation failed", { errors }),

  rateLimited: (retryAfter: number, limit: number, remaining: number, reset: number) =>
    apiError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      { retryAfter },
      {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
      }
    ),

  internalError: (message = "An unexpected error occurred") => apiError("INTERNAL_ERROR", message),

  serviceUnavailable: (message = "Service temporarily unavailable") =>
    apiError("SERVICE_UNAVAILABLE", message),
};

/**
 * Handle unknown errors and return appropriate response
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  // Log error for debugging
  console.error(`[API Error]${context ? ` ${context}:` : ""}`, error);

  // Handle known error types
  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === "ValidationError") {
      return ApiErrors.badRequest(error.message);
    }
    if (error.name === "UnauthorizedError") {
      return ApiErrors.unauthorized(error.message);
    }
    if (error.name === "NotFoundError") {
      return ApiErrors.notFound(error.message);
    }

    // Generic error - don't expose details in production
    const message =
      process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred";
    return ApiErrors.internalError(message);
  }

  // Unknown error type
  return ApiErrors.internalError();
}

/**
 * Validate request body and return parsed data or error response
 */
export async function parseRequestBody<T>(
  request: Request,
  validator?: (data: unknown) => data is T
): Promise<{ data: T } | { error: NextResponse<ApiErrorResponse> }> {
  try {
    const body = await request.json();

    if (validator && !validator(body)) {
      return { error: ApiErrors.badRequest("Invalid request body") };
    }

    return { data: body as T };
  } catch {
    return { error: ApiErrors.badRequest("Invalid JSON in request body") };
  }
}

/**
 * Check if response is an error response
 */
export function isApiError(
  result: { data: unknown } | { error: NextResponse }
): result is { error: NextResponse } {
  return "error" in result;
}
