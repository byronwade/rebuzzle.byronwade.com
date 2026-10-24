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

/**
 * One creation request per page, shared by every caller (idle warm-up and the
 * first guess). The endpoint is rate limited per IP, so duplicate or looping
 * requests can lock a whole household or classroom out of playing.
 */
let inFlight: Promise<boolean> | null = null;

export function useLazyGuest(): LazyGuestResult {
  const { isAuthenticated, userId, refreshAuth } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureGuest = useCallback(async (): Promise<boolean> => {
    // Already authenticated (either registered or guest)
    if (isAuthenticated && userId) {
      return true;
    }

    if (inFlight) {
      return inFlight;
    }

    setIsCreating(true);
    setError(null);

    inFlight = (async (): Promise<boolean> => {
      try {
        // Get localStorage backup ID if available
        const localStorageGuestId =
          typeof window !== "undefined" ? localStorage.getItem("rebuzzle_guest_id") : null;

        // Call the lazy guest creation endpoint
        const response = await fetch("/api/auth/guest/lazy", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localStorageGuestId }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            success?: boolean;
            user?: { id: string };
            alreadyAuthenticated?: boolean;
            isAuthenticated?: boolean;
            error?: string;
          };
          if (data.success && data.user) {
            // Store backup in localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("rebuzzle_guest_id", data.user.id);
            }
            // Refresh auth context to pick up new / existing session
            await refreshAuth();
            setIsCreating(false);
            return true;
          }
          // Legacy response shape — cookie already present
          if (data.alreadyAuthenticated || data.isAuthenticated) {
            await refreshAuth();
            setIsCreating(false);
            return true;
          }
          setError(data.error || "Failed to create guest session");
          setIsCreating(false);
          return false;
        }

        setError(
          response.status === 429
            ? "Too many sessions started from this network. Wait a few minutes and try again."
            : "Failed to create guest session"
        );
        setIsCreating(false);
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsCreating(false);
        return false;
      }
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }, [isAuthenticated, userId, refreshAuth]);

  return { ensureGuest, isCreating, error };
}
