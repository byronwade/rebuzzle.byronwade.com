/**
 * Cookie Utilities
 *
 * Secure cookie management for authentication tokens.
 * Canonical cookie name: rebuzzle_auth (guests, signup, server session).
 * Legacy auth_token is still read during migration.
 */

import type { NextResponse } from "next/server";

/** Canonical auth cookie — used by guests, signup, and server session seed */
export const AUTH_COOKIE_NAME = "rebuzzle_auth";
/** Legacy cookie name from older login path — still accepted when reading */
export const LEGACY_AUTH_COOKIE_NAME = "auth_token";

/**
 * Session duration in days - shared across JWT and cookies
 * Update this single value to change session length everywhere
 */
export const SESSION_DURATION_DAYS = 7;
const COOKIE_MAX_AGE = SESSION_DURATION_DAYS * 24 * 60 * 60; // Convert to seconds
const isProduction = process.env.NODE_ENV === "production";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    // Lax matches guest/signup cookies and still blocks most CSRF
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

/**
 * Set authentication cookie with secure settings
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions(COOKIE_MAX_AGE));
  // Drop legacy cookie so only one session source remains
  response.cookies.set(LEGACY_AUTH_COOKIE_NAME, "", cookieOptions(0));
  return response;
}

/**
 * Clear authentication cookie(s)
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, "", cookieOptions(0));
  response.cookies.set(LEGACY_AUTH_COOKIE_NAME, "", cookieOptions(0));
  return response;
}

/** Parse Cookie header into a map */
export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const trimmed = cookie.trim();
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Get authentication token from request cookies.
 * Prefers rebuzzle_auth, falls back to legacy auth_token.
 */
export function getAuthTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies[AUTH_COOKIE_NAME] || cookies[LEGACY_AUTH_COOKIE_NAME] || null;
}
