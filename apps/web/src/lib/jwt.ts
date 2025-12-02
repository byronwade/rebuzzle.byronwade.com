/**
 * JWT Token Utilities
 *
 * Secure JWT token generation and verification using jose library
 * Compatible with Edge runtime
 */

import { jwtVerify, SignJWT } from "jose";
import { SESSION_DURATION_DAYS } from "./cookies";

// Use shared session duration constant for consistency
const TOKEN_EXPIRATION_DAYS = SESSION_DURATION_DAYS;

/**
 * Get the JWT secret, throwing an error if not configured
 */
function getSecret(): Uint8Array {
  const AUTH_SECRET = process.env.AUTH_SECRET;
  if (!AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET environment variable is required for JWT token signing. " +
        "Please set it in your .env.local file. " +
        "You can generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return new TextEncoder().encode(AUTH_SECRET);
}

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token with user data
 */
export async function signToken(payload: {
  userId: string;
  username: string;
  email: string;
}): Promise<string> {
  const secret = getSecret();
  const expirationTime = Math.floor(Date.now() / 1000 + TOKEN_EXPIRATION_DAYS * 24 * 60 * 60);

  const jwt = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);

  return jwt;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (_error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}

/**
 * Decode a JWT token without verification (use with caution)
 * This is useful for reading token data when you don't need to verify
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));

    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (_error) {
    return null;
  }
}
