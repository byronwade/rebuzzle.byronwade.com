"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. SSR-safe: returns `false` until hydrated.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false
  );
}

/** Tailwind `md` breakpoint — true below 768px. */
export function useIsNarrowViewport(): boolean {
  return useMediaQuery("(max-width: 767.98px)");
}
