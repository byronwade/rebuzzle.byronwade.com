/**
 * Middleware Utilities
 *
 * Common middleware functions for API routes.
 * Provides rate limiting, request validation, and response helpers.
 *
 * @example
 * ```ts
 * import { rateLimiters, ApiErrors, apiSuccess } from "@/lib/middleware";
 *
 * export async function POST(request: Request) {
 *   // Rate limiting
 *   const rateLimit = await rateLimiters.auth(request);
 *   if (!rateLimit?.success) {
 *     return ApiErrors.rateLimited(rateLimit?.retryAfter || 60, ...);
 *   }
 *
 *   // ... handle request
 *   return apiSuccess({ user: { id: "123" } });
 * }
 * ```
 */

export * from "../api-response";
export * from "./rate-limit";
