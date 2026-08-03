"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True only after hydration. Prefer this over `useState` + `useEffect(setMounted)`.
 * Uses the React-recommended `useSyncExternalStore` client/server snapshot split.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
