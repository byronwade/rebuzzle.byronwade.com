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
  snapshot = { points: stats.points, streak: stats.streak };
  fetchedAt = Date.now();
  emit();
}

function load() {
  if (inflight) return inflight;
  inflight = fetch("/api/user/stats", { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as {
        stats?: { points?: number; streak?: number } | null;
      };
      snapshot = {
        points: data.stats?.points ?? 0,
        streak: data.stats?.streak ?? 0,
      };
      fetchedAt = Date.now();
      emit();
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** HUD stats for the signed-in (or guest) player; null until loaded or when signed out. */
export function usePlayerHud(userId: string | null, refreshKey?: string) {
  useEffect(() => {
    if (ownerId !== userId) {
      // Account switch or sign-out: never show the previous player's numbers.
      ownerId = userId;
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
