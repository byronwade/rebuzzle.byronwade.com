/**
 * Guest Identification Service
 *
 * Multi-layer identification for guest users:
 * 1. Device ID (desktop/mobile apps)
 * 2. Cookie (rebuzzle_guest_token)
 * 3. IP hash lookup
 * 4. localStorage backup (client-side only)
 */

import { createHash } from "crypto";
import type { User } from "@/db/models";
import { userOps } from "@/db/operations";

export interface GuestIdentificationResult {
  found: boolean;
  userId?: string;
  user?: User;
  identifiedBy: "deviceId" | "cookie" | "ip" | "localStorage" | "none";
}

export interface GuestIdentificationInput {
  cookieGuestToken?: string;
  ipAddress: string;
  localStorageGuestId?: string;
  deviceId?: string;
}

/**
 * Hash IP address for privacy-safe storage
 * Uses SHA-256 with a salt to prevent reverse lookup
 */
export function hashIpAddress(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    // In production, require a proper salt for security
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "IP_HASH_SALT environment variable is required in production for secure IP hashing. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }
    // In development, use a warning and fallback
    console.warn(
      "Warning: IP_HASH_SALT not set. Using development fallback. Set this in production!"
    );
  }
  return createHash("sha256")
    .update(`${salt || "dev-only-salt"}:${ip}`)
    .digest("hex");
}

/**
 * Extract client IP from request headers
 * Checks multiple headers for compatibility with different proxies/CDNs
 */
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip =
    forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown";

  return ip;
}

/**
 * Extract device ID from request headers (desktop/mobile apps)
 */
export function extractDeviceId(request: Request): string | null {
  return request.headers.get("X-Device-Id");
}

/**
 * Identify guest user from multiple layers
 * Priority: deviceId > cookie > IP hash > localStorage
 */
export async function identifyGuest(
  input: GuestIdentificationInput
): Promise<GuestIdentificationResult> {
  // Layer 0: Device ID (for desktop/mobile apps)
  if (input.deviceId) {
    const user = await userOps.findGuestByDeviceId(input.deviceId);
    if (user) {
      return {
        found: true,
        userId: user.id,
        user,
        identifiedBy: "deviceId",
      };
    }
  }

  // Layer 1: Cookie lookup
  if (input.cookieGuestToken) {
    const user = await userOps.findByGuestToken(input.cookieGuestToken);
    if (user) {
      return {
        found: true,
        userId: user.id,
        user,
        identifiedBy: "cookie",
      };
    }
  }

  // Layer 2: IP hash lookup
  if (input.ipAddress && input.ipAddress !== "unknown") {
    const ipHash = hashIpAddress(input.ipAddress);
    const userByIp = await userOps.findGuestByIpHash(ipHash);
    if (userByIp) {
      return {
        found: true,
        userId: userByIp.id,
        user: userByIp,
        identifiedBy: "ip",
      };
    }
  }

  // Layer 3: localStorage fallback (passed from client)
  if (input.localStorageGuestId) {
    const userByLocalStorage = await userOps.findById(input.localStorageGuestId);
    if (userByLocalStorage?.isGuest) {
      return {
        found: true,
        userId: userByLocalStorage.id,
        user: userByLocalStorage,
        identifiedBy: "localStorage",
      };
    }
  }

  return {
    found: false,
    identifiedBy: "none",
  };
}
