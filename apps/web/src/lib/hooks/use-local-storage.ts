"use client";

import { useSyncExternalStore } from "react";

function subscribeToKey(key: string, onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      onStoreChange();
    }
  };
  const onCustom = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(`rebuzzle:storage:${key}`, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(`rebuzzle:storage:${key}`, onCustom);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Notify same-tab listeners after a local write. */
export function notifyLocalStorage(key: string): void {
  try {
    window.dispatchEvent(new Event(`rebuzzle:storage:${key}`));
  } catch {
    // ignore
  }
}

/**
 * Subscribe to a localStorage string key without effect-driven setState.
 * Server snapshot is always `null` to avoid hydration mismatches.
 */
export function useLocalStorageRaw(key: string): string | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => readRaw(key),
    () => null
  );
}

/**
 * Parse JSON from localStorage. Returns `fallback` when missing/invalid/SSR.
 */
export function useLocalStorageJson<T>(key: string, fallback: T): T {
  const raw = useLocalStorageRaw(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    notifyLocalStorage(key);
  } catch {
    // ignore quota / private mode
  }
}
