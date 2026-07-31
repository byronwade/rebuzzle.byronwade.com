/**
 * Tournament selection among Apex candidates.
 */

import { scoreRubric, tournamentScore } from "./rubric";
import type { ApexCandidate } from "./types";

export function rankCandidates(
  candidates: ApexCandidate[],
  minRubricOverall: number
): ApexCandidate[] {
  const scored = candidates.map((c) => {
    const rubric = c.rubric ?? scoreRubric(c);
    const withRubric = { ...c, rubric };
    return {
      ...withRubric,
      tournamentScore: tournamentScore(withRubric, minRubricOverall),
    };
  });

  return scored.sort((a, b) => (b.tournamentScore ?? -1) - (a.tournamentScore ?? -1));
}

export function pickWinner(
  candidates: ApexCandidate[],
  minRubricOverall: number
): { winner: ApexCandidate | null; ranked: ApexCandidate[] } {
  const ranked = rankCandidates(candidates, minRubricOverall);
  const winner = ranked.find((c) => (c.tournamentScore ?? -1) >= 0) ?? null;
  return { winner, ranked };
}
