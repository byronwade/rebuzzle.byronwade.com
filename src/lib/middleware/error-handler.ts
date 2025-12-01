/**
 * Error Handler Middleware
 *
 * Centralized error handling for API routes
 */

import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sanitize error message for production
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    if (isProduction) {
      // In production, return generic error messages
      return "An error occurred. Please try again later.";
    }
    // In development, return actual error message
    return error.message;
  }
  return "An unknown error occurred";
}

/**
 * Handle errors in API routes
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error (in production, this should go to error tracking service)
  console.error("[API Error]:", error);

  // Determine status code
  let status = 500;
  let message = sanitizeError(error);

  if (error instanceof Error) {
    // Check for specific error types
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("authentication")
    ) {
      status = 401;
      message = isProduction ? "Unauthorized" : error.message;
    } else if (error.message.includes("Forbidden")) {
      status = 403;
      message = isProduction ? "Forbidden" : error.message;
    } else if (error.message.includes("Not Found")) {
      status = 404;
      message = isProduction ? "Not Found" : error.message;
    } else if (error.message.includes("Validation")) {
      status = 400;
      message = isProduction ? "Validation failed" : error.message;
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(isProduction
        ? {}
        : {
            details: error instanceof Error ? error.stack : String(error),
          }),
    },
    { status }
  );
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

