"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/**
 * Client-only calendar-day comparison without effect-driven setState.
 * Server snapshot is always false to avoid hydration flicker.
 */
export function useIsLocalCalendarDay(dateString: string, offsetDays = 0): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      const today = startOfLocalDay(new Date());
      const target = startOfLocalDay(new Date(dateString));
      const dayMs = 24 * 60 * 60 * 1000;
      return today + offsetDays * dayMs === target;
    },
    () => false
  );
}
