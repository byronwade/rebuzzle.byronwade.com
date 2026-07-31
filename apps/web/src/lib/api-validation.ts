/**
 * API Validation Helpers
 *
 * Shared validation utilities for API routes
 */

/**
 * Parse and validate a date string
 * Returns undefined for invalid/missing dates instead of Invalid Date
 */
export function parseDate(dateString: string | null): Date | undefined {
  if (!dateString) return undefined;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

/**
 * Parse and validate pagination parameters
 * Returns safe defaults for invalid values
 */
export function parsePagination(
  pageStr: string | null,
  limitStr: string | null,
  maxLimit = 100
): { page: number; limit: number } {
  const parsedPage = parseInt(pageStr || "1", 10);
  const parsedLimit = parseInt(limitStr || "20", 10);

  return {
    page: Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
    limit: Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, maxLimit),
  };
}

/**
 * Sanitize a string for safe MongoDB usage
 * Prevents NoSQL injection by removing/escaping special characters
 */
export function sanitizeString(input: string | null, maxLength = 1000): string | undefined {
  if (!input) return undefined;

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1f\x7f]/g, "");

  // Truncate to max length
  sanitized = sanitized.slice(0, maxLength);

  return sanitized || undefined;
}

/**
 * Sanitize MongoDB ObjectId-like strings
 * Only allows alphanumeric characters and hyphens
 */
export function sanitizeId(input: string | null): string | undefined {
  if (!input) return undefined;

  // Only allow alphanumeric, hyphens, and underscores
  const sanitized = input.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 100);

  return sanitized || undefined;
}

/**
 * Validate enum parameter
 * Returns undefined if value is not in allowed list
 */
export function validateEnum<T extends string>(
  value: string | null,
  allowedValues: readonly T[]
): T | undefined {
  if (!value) return undefined;
  return allowedValues.includes(value as T) ? (value as T) : undefined;
}

/**
 * Escape special regex characters in a string
 * Prevents ReDoS attacks and regex injection when using $regex in MongoDB
 */
export function escapeRegex(input: string): string {
  // Escape all special regex characters: . * + ? ^ $ { } [ ] | ( ) \ /
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create a safe regex search pattern for MongoDB
 * Escapes special characters and limits length
 */
export function safeSearchRegex(input: string | null, maxLength = 200): string | undefined {
  if (!input) return undefined;

  // Sanitize and truncate
  const sanitized = sanitizeString(input, maxLength);
  if (!sanitized) return undefined;

  // Escape regex special characters
  return escapeRegex(sanitized);
}

/**
 * Create a standardized error response
 */
export function apiError(
  message: string,
  code: string,
  status: number
): { error: string; code: string; status: number } {
  return { error: message, code, status };
}
