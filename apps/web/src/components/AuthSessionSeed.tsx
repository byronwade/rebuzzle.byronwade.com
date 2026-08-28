"use client";

import { useLayoutEffect, useRef } from "react";
import type { ServerSession } from "@/lib/auth/get-server-session";
import { useAuthSeed } from "./AuthProvider";

/**
 * Applies a streamed server session into AuthProvider without remounting
 * the page tree (avoids re-running PuzzleContent after Suspense resolves).
 * useLayoutEffect applies before paint effects so PrefetchGuestClient and
 * notification hooks see the real session instead of a false logged-out window.
 */
export function AuthSessionSeed({ session }: { session: ServerSession }) {
  const seed = useAuthSeed();
  const applied = useRef(false);

  useLayoutEffect(() => {
    if (applied.current) return;
    applied.current = true;
    seed(session);
  }, [seed, session]);

  return null;
}
