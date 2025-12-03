/**
 * Authentication Middleware
 *
 * Utilities for verifying authentication in API routes
 */

import { getAuthTokenFromRequest } from "./cookies";
import { verifyToken } from "./jwt";

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
}

/**
 * Get authentication token from request
 * Checks Authorization header (Bearer token) first, then falls back to cookies
 *
 * This allows desktop/mobile apps to use Bearer tokens while web uses cookies
 */
function getAuthToken(request: Request): string | null {
  // Check Authorization header first (for desktop/mobile apps)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Fall back to cookie (for web app)
  return getAuthTokenFromRequest(request);
}

/**
 * Get authenticated user from request
 * Supports both Bearer token (Authorization header) and cookie-based auth
 * Returns null if user is not authenticated or token is invalid
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = getAuthToken(request);

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
  };
}
