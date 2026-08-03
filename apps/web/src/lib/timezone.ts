import { cookies, headers } from "next/headers";
import { FALLBACK_TIME_ZONE, normalizeTimeZone, TIMEZONE_COOKIE_NAME } from "@/lib/timezone-shared";

export {
  buildTimeZoneCookie,
  FALLBACK_TIME_ZONE,
  normalizeTimeZone,
  TIMEZONE_COOKIE_NAME,
} from "@/lib/timezone-shared";

/**
 * Resolve the player's IANA time zone for request-time puzzle day math.
 * Preference: cookie → Vercel IP timezone → UTC.
 */
export async function resolveRequestTimeZone(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const fromCookie = normalizeTimeZone(cookieStore.get(TIMEZONE_COOKIE_NAME)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // cookies() unavailable outside a request
  }

  try {
    const headerStore = await headers();
    const fromVercel = normalizeTimeZone(headerStore.get("x-vercel-ip-timezone"));
    if (fromVercel) return fromVercel;
  } catch {
    // headers() unavailable outside a request
  }

  return FALLBACK_TIME_ZONE;
}
