"use client";

import { useEffect, useRef } from "react";
import type { ServerSession } from "@/lib/auth/get-server-session";
import { useAuthSeed } from "./AuthProvider";

/**
 * Applies a streamed server session into AuthProvider without remounting
 * the page tree (avoids re-running PuzzleContent after Suspense resolves).
 */
export function AuthSessionSeed({ session }: { session: ServerSession }) {
  const seed = useAuthSeed();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    seed(session);
  }, [seed, session]);

  return null;
}
