import type { NextResponse } from "next/server";

export type CacheHeaderOptions = {
  /** Public CDN-cacheable response (default true when not private). */
  public?: boolean;
  /** Browser max-age in seconds. */
  maxAge?: number;
  /** Shared/CDN max-age in seconds. */
  sMaxAge?: number;
  /** stale-while-revalidate in seconds. */
  staleWhileRevalidate?: number;
  /** Force private, no-store (auth / per-user data). */
  private?: boolean;
};

/** Build a Cache-Control header value. */
export function buildCacheControl(options: CacheHeaderOptions = {}): string {
  if (options.private) {
    return "private, no-store";
  }
  const isPublic = options.public !== false;
  const maxAge = options.maxAge ?? 0;
  const sMaxAge = options.sMaxAge ?? maxAge;
  const parts = [isPublic ? "public" : "private", `max-age=${maxAge}`, `s-maxage=${sMaxAge}`];
  if (options.staleWhileRevalidate != null) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  return parts.join(", ");
}

/**
 * Attach an explicit Cache-Control policy to a NextResponse.
 * Prefer passing headers inline via `buildCacheControl` so static analyzers see
 * the `"Cache-Control"` key in the route module.
 */
function withCacheHeaders<T extends NextResponse>(
  response: T,
  options: CacheHeaderOptions = {}
): T {
  response.headers.set("Cache-Control", buildCacheControl(options));
  return response;
}

/** Headers object with literal Cache-Control key (doctor-friendly). */
function cacheControlHeaders(options: CacheHeaderOptions = {}): { "Cache-Control": string } {
  return { "Cache-Control": buildCacheControl(options) };
}
