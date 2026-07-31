"use client";

import { useEffect } from "react";
import { fireConfetti } from "@/lib/confetti";

/**
 * Mount-triggered confetti burst (game-over page). Prefer `fireConfetti()` for
 * in-thread celebrations so the burst can start the moment the puzzle solves.
 */
export function Confetti() {
  useEffect(() => {
    void fireConfetti();
  }, []);

  return null;
}
