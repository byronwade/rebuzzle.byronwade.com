"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { buildTimeZoneCookie, TIMEZONE_COOKIE_NAME } from "@/lib/timezone-shared";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Persists the browser IANA time zone so server renders unlock the daily
 * puzzle at the player's local midnight (generation stays one UTC day key).
 */
export function SyncTimezoneCookie() {
  const router = useRouter();
  const refreshedRef = useRef(false);

  useEffect(() => {
    const timeZone = globalThis.Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
    if (!timeZone) return;

    const existing = readCookie(TIMEZONE_COOKIE_NAME);
    if (existing === timeZone) return;

    const hadCookie = Boolean(existing);
    document.cookie = buildTimeZoneCookie(timeZone);

    // Cookie wasn't available for the RSC payload — refresh once so serve/lock
    // match local midnight. Vercel IP TZ usually covers first paint.
    if (!(hadCookie || refreshedRef.current)) {
      refreshedRef.current = true;
      router.refresh();
    }
  }, [router]);

  return null;
}
