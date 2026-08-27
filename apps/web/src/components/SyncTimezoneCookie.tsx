"use client";

import { useEffect } from "react";
import { buildTimeZoneCookie, TIMEZONE_COOKIE_NAME } from "@/lib/timezone-shared";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Persists the browser IANA time zone so later requests unlock the daily
 * puzzle at the player's local midnight (generation stays one UTC day key).
 *
 * Do not router.refresh() on first visit — that re-runs the full RSC tree and
 * makes cold loads feel twice as slow. First paint already uses
 * x-vercel-ip-timezone (then UTC) via resolveRequestTimeZone.
 */
export function SyncTimezoneCookie() {
  useEffect(() => {
    const timeZone = globalThis.Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
    if (!timeZone) return;

    const existing = readCookie(TIMEZONE_COOKIE_NAME);
    if (existing === timeZone) return;

    document.cookie = buildTimeZoneCookie(timeZone);
  }, []);

  return null;
}
