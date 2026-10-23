"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLazyGuest } from "@/lib/hooks/useLazyGuest";

/**
 * After the puzzle shell is visible, warm a guest session during idle time
 * so the first guess isn't blocked on account creation.
 */
export function PrefetchGuestClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const { ensureGuest } = useLazyGuest();
  // Warm once per mount. A failed warm-up must not retry on re-render — the
  // first guess retries on its own, and the endpoint is rate limited per IP.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || attemptedRef.current) {
      return;
    }

    const warm = () => {
      attemptedRef.current = true;
      void ensureGuest();
    };

    if (typeof globalThis !== "undefined" && "requestIdleCallback" in globalThis) {
      const idleWindow = globalThis as Window & typeof globalThis;
      const id = idleWindow.requestIdleCallback(warm, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback(id);
    }

    const timeout = globalThis.setTimeout(warm, 500);
    return () => globalThis.clearTimeout(timeout);
  }, [ensureGuest, isAuthenticated, isLoading]);

  return null;
}
