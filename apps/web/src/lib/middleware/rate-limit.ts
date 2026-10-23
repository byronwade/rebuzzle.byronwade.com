/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting for API routes using in-memory storage.
 * For production, consider using Redis or Vercel Edge Config.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (clears on serverless function restart)
// For production, use Redis or Vercel Edge Config
const store: RateLimitStore = {};

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }
  lastCleanup = now;

  Object.keys(store).forEach((key) => {
    const entry = store[key];
    if (entry && entry.resetAt < now) {
      delete store[key];
    }
  });
}

export interface RateLimitOptions {
  /**
   * Bucket name. Each limiter counts in its own bucket, so analytics beacons
   * never spend the login / guest-session allowance for the same IP.
   */
  name?: string;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Rate limit middleware
 */
export function rateLimit(options: RateLimitOptions) {
  return async (request: Request): Promise<RateLimitResult | null> => {
    cleanupExpiredEntries();

    // Custom keys are already scoped by their caller. The shared IP key is
    // scoped by bucket name so separate limiters never spend one allowance.
    const customKey = options.keyGenerator?.(request);
    const baseKey = customKey || getDefaultKey(request);
    const key = options.name ? `${options.name}:${baseKey}` : baseKey;

    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;

    // Get or create entry
    let entry = store[key];

    if (!entry || entry.resetAt < now) {
      // Create new window
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      store[key] = entry;
    }

    // Check limit
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: entry.resetAt,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;

    return {
      success: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - entry.count),
      reset: entry.resetAt,
    };
  };
}

/**
 * Get default key from request (IP address)
 */
function getDefaultKey(request: Request): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown";

  return `rate-limit:${ip}`;
}

/**
 * Get user-based key (for authenticated routes)
 */
export function getUserKey(userId: string): string {
  return `rate-limit:user:${userId}`;
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    name: "auth",
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
  }),

  // Moderate rate limit for API endpoints
  // Anonymous guest sessions: households, classrooms and offices share one IP.
  guest: rateLimit({
    name: "guest",
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  }),

  api: rateLimit({
    name: "api",
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  }),

  // Generous rate limit for public endpoints
  public: rateLimit({
    name: "public",
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  }),

  // Strict rate limit for AI endpoints
  ai: rateLimit({
    name: "ai",
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  }),

  // Daily puzzle guesses
  guess: rateLimit({
    name: "guess",
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
};
