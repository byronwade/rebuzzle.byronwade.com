/**
 * Cookie Utilities
 *
 * Secure cookie management for authentication tokens
 */

import type { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
/**
 * Session duration in days - shared across JWT and cookies
 * Update this single value to change session length everywhere
 */
export const SESSION_DURATION_DAYS = 7;
const COOKIE_MAX_AGE = SESSION_DURATION_DAYS * 24 * 60 * 60; // Convert to seconds
const isProduction = process.env.NODE_ENV === "production";

/**
 * Set authentication cookie with secure settings
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  const cookieOptions = [
    `${AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "SameSite=Strict",
    "HttpOnly",
  ];

  // Only set Secure flag in production (HTTPS required)
  if (isProduction) {
    cookieOptions.push("Secure");
  }

  response.headers.set("Set-Cookie", cookieOptions.join("; "));

  return response;
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  const cookieOptions = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Strict",
    "HttpOnly",
  ];

  // Only set Secure flag in production
  if (isProduction) {
    cookieOptions.push("Secure");
  }

  response.headers.set("Set-Cookie", cookieOptions.join("; "));

  return response;
}

/**
 * Get authentication token from request cookies
 */
export function getAuthTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const trimmed = cookie.trim();
      // Handle cookie values that contain "=" (e.g., base64 encoded values)
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

  return cookies[AUTH_COOKIE_NAME] || null;
}
