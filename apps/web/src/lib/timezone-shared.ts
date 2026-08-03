import { isValidIanaTimeZone } from "@/lib/game/daily-lock";

/** Cookie written by the client from `Intl.resolvedOptions().timeZone`. */
export const TIMEZONE_COOKIE_NAME = "rebuzzle-tz";

export const FALLBACK_TIME_ZONE = "UTC";

/** Normalize a candidate IANA zone; returns null when unusable. */
export function normalizeTimeZone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!isValidIanaTimeZone(trimmed)) return null;
  return trimmed;
}

/** Client-side cookie writer (path=/, 1 year, Lax). */
export function buildTimeZoneCookie(timeZone: string): string {
  const maxAge = 60 * 60 * 24 * 365;
  return `${TIMEZONE_COOKIE_NAME}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
