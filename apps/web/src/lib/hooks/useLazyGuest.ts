"use client";

/**
 * Lazy Guest Creation Hook
 *
 * Only creates guest account when user starts interacting with puzzles,
 * not on initial page load. This keeps stats clean and reduces spam.
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface LazyGuestResult {
  ensureGuest: () => Promise<boolean>;
  isCreating: boolean;
  error: string | null;
}

export function useLazyGuest(): LazyGuestResult {
  const { isAuthenticated, userId, refreshAuth } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureGuest = useCallback(async (): Promise<boolean> => {
    // Already authenticated (either registered or guest)
    if (isAuthenticated && userId) {
      return true;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Get localStorage backup ID if available
      const localStorageGuestId =
        typeof window !== "undefined"
          ? localStorage.getItem("rebuzzle_guest_id")
          : null;

      // Call the lazy guest creation endpoint
      const response = await fetch("/api/auth/guest/lazy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localStorageGuestId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Store backup in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("rebuzzle_guest_id", data.user.id);
          }
          // Refresh auth context to pick up new session
          await refreshAuth();
          return true;
        }
      }

      setError("Failed to create guest session");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, userId, refreshAuth]);

  return { ensureGuest, isCreating, error };
}
