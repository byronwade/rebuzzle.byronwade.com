"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Streak and points for the header HUD.
 *
 * One fetch of /api/user/stats per session (re-run after a short TTL on
 * navigation), shared by every subscriber. The game board publishes fresh
 * numbers after a solve so the HUD ticks up without another round trip.
 */
export type PlayerHudStats = {
  points: number;
  streak: number;
};

const REFRESH_AFTER_MS = 60_000;

let snapshot: PlayerHudStats | null = null;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
let ownerId: string | null = null;
// Bumped on every owner change and every publish, so a response that started
// before either (another player's, or pre-solve numbers) is dropped.
let generation = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

export function publishPlayerStats(stats: PlayerHudStats) {
  // A read already in flight saw the pre-solve numbers; don't let it land.
  generation += 1;
  inflight = null;
  snapshot = { points: stats.points, streak: stats.streak };
  fetchedAt = Date.now();
  emit();
}

function load() {
  if (inflight) return inflight;
  const requestGeneration = generation;
  const request: Promise<void> = fetch("/api/user/stats", { credentials: "include" })
    .then(async (response) => {
      if (!response.ok || requestGeneration !== generation) return;
      const data = (await response.json()) as {
        stats?: { points?: number; streak?: number } | null;
      };
      if (requestGeneration !== generation) return;
      snapshot = {
        points: data.stats?.points ?? 0,
        streak: data.stats?.streak ?? 0,
      };
      fetchedAt = Date.now();
      emit();
    })
    .catch(() => {})
    .finally(() => {
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

/** HUD stats for the signed-in (or guest) player; null until loaded or when signed out. */
export function usePlayerHud(userId: string | null, refreshKey?: string) {
  useEffect(() => {
    if (ownerId !== userId) {
      // Account switch or sign-out: never show the previous player's numbers.
      ownerId = userId;
      generation += 1;
      inflight = null;
      snapshot = null;
      fetchedAt = 0;
      emit();
    }
    if (!userId) return;
    if (Date.now() - fetchedAt < REFRESH_AFTER_MS) return;
    void load();
  }, [userId, refreshKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
