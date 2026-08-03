/**
 * Progressive-hint vision — pure gating helpers (no AI SDK imports).
 *
 * The tournament itself lives in player-sim.ts; these helpers decide when to
 * spend and how to block publication.
 */

import type { PlayerSimResult } from "./types";

/** Blind pass failed dominance — worth spending a hinted unlock check. */
export function shouldRunProgressiveHintVision(blind: {
  profilesWithDominantTarget: number;
  profileCount: number;
  topTargetFoundBy: number;
  requiredVotes: number;
}): boolean {
  if (blind.profileCount <= 0) return false;
  if (blind.profilesWithDominantTarget >= blind.profileCount) return false;
  return blind.topTargetFoundBy < blind.requiredVotes * blind.profileCount;
}

/** Publication blockers from a completed progressive-hint pass. */
export function progressiveHintPublishBlockers(sim: PlayerSimResult): string[] {
  if (sim.hintedAttempted && sim.hintedUnlocksVisualSolve === false) {
    return [
      "Progressive-hint vision failed: early hints did not unlock the intended answer on the board",
    ];
  }
  return [];
}
