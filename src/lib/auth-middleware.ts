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
 * Get authenticated user from request cookies
 * Returns null if user is not authenticated or token is invalid
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | null> {
  const token = getAuthTokenFromRequest(request);

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

