/**
 * Sign out other devices after a password change.
 *
 * JWTs can't be recalled, so a token issued before the user's
 * passwordChangedAt is treated as signed out. Lookups are cached briefly per
 * instance; other instances catch up within the TTL.
 */

import { db } from "@/db";

const TTL_MS = 30_000;
const MAX_ENTRIES = 5_000;

type Entry = { changedAtSec: number; expires: number };
const cache = new Map<string, Entry>();

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function remember(userId: string, changedAtSec: number): Entry {
  if (cache.size >= MAX_ENTRIES) cache.clear();
  const entry = { changedAtSec, expires: Date.now() + TTL_MS };
  cache.set(userId, entry);
  return entry;
}

/** Call after storing a new passwordChangedAt so this instance sees it at once. */
export function noteCredentialsChanged(userId: string, changedAt: Date): void {
  remember(userId, toSeconds(changedAt));
}

/** True when the token was issued before the user's last password change. */
export async function isSessionRevoked(userId: string, issuedAtSec?: number): Promise<boolean> {
  if (issuedAtSec === undefined) return false;
  let entry = cache.get(userId);
  if (!entry || entry.expires < Date.now()) {
    try {
      const user = await db.userOps.findById(userId);
      entry = remember(
        userId,
        !user
          ? Number.POSITIVE_INFINITY
          : user.passwordChangedAt
            ? toSeconds(new Date(user.passwordChangedAt))
            : 0
      );
    } catch {
      // Fail open: a database hiccup must not sign everyone out.
      return false;
    }
  }
  // Same-second tokens survive, so the device that changed the password and
  // got a fresh token stays signed in.
  return issuedAtSec < entry.changedAtSec;
}

/**
 * Exact check against a user record already loaded (no cache). Use it on
 * privileged paths, where a stale cache entry on another instance matters.
 */
export function issuedBeforePasswordChange(
  user: { passwordChangedAt?: Date | null },
  issuedAtSec?: number
): boolean {
  if (issuedAtSec === undefined || !user.passwordChangedAt) return false;
  return issuedAtSec < toSeconds(new Date(user.passwordChangedAt));
}

/** Test hook. */
export function clearSessionRevocationCache(): void {
  cache.clear();
}
