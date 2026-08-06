/**
 * Tournament selection among Apex candidates.
 */

import {
  blendScoreWithElo,
  type EloRankingOptions,
  resolveCandidateElo,
  targetEloForDifficulty,
} from "./elo-ratings";
import { scoreRubric, tournamentScore } from "./rubric";
import type { ApexCandidate } from "./types";

export function rankCandidates(
  candidates: ApexCandidate[],
  minRubricOverall: number,
  eloOptions?: EloRankingOptions
): ApexCandidate[] {
  const scored = candidates.map((c) => {
    const rubric = c.rubric ?? scoreRubric(c);
    const withRubric = { ...c, rubric };
    const baseScore = tournamentScore(withRubric, minRubricOverall);
    const targetDifficulty = eloOptions?.targetDifficulty ?? c.difficulty;
    const elo = resolveCandidateElo(
      {
        techniqueId: c.techniqueId,
        answer: c.answer,
        difficulty: c.difficulty,
        estimatedSolveRate: c.playerSim?.estimatedSolveRate,
      },
      eloOptions
    );
    return {
      ...withRubric,
      tournamentScore: blendScoreWithElo(baseScore, elo, targetEloForDifficulty(targetDifficulty)),
    };
  });

  return scored.sort((a, b) => (b.tournamentScore ?? -1) - (a.tournamentScore ?? -1));
}

export function pickWinner(
  candidates: ApexCandidate[],
  minRubricOverall: number,
  eloOptions?: EloRankingOptions
): { winner: ApexCandidate | null; ranked: ApexCandidate[] } {
  const ranked = rankCandidates(candidates, minRubricOverall, eloOptions);
  const winner = ranked.find((c) => (c.tournamentScore ?? -1) >= 0) ?? null;
  return { winner, ranked };
}
