import { rankCandidates } from "./tournament";
import type { ApexCandidate } from "./types";

const RUNTIME_GUARD_FAILURE =
  "Rendered finalist evaluation stopped before runner-up to preserve the runtime deadline";

export type FinalistSelectionResult = {
  winner: ApexCandidate | null;
  ranked: ApexCandidate[];
  failures: string[];
};

/**
 * Pre-rank cheap candidate drafts and spend rendered-evaluation work only on
 * the strongest eligible finalist. A runner-up is evaluated only when the
 * prior finalist fails a rendered publish gate.
 */
export async function selectQualifiedFinalist(input: {
  candidates: ApexCandidate[];
  minRubricOverall: number;
  canStartEvaluation: () => boolean;
  evaluate: (candidate: ApexCandidate) => Promise<ApexCandidate>;
}): Promise<FinalistSelectionResult> {
  const preRanked = rankCandidates(input.candidates, input.minRubricOverall);
  const eligible = preRanked.filter(
    (candidate) => candidate.publishable && (candidate.tournamentScore ?? -1) >= 0
  );
  const evaluatedById = new Map<string, ApexCandidate>();
  const failures: string[] = [];

  for (const candidate of eligible) {
    if (!input.canStartEvaluation()) {
      failures.push(RUNTIME_GUARD_FAILURE);
      break;
    }

    const evaluated = await input.evaluate(candidate);
    const rescored = rankCandidates([evaluated], input.minRubricOverall)[0];
    if (!rescored) {
      failures.push("Rendered finalist evaluation returned no candidate");
      continue;
    }
    evaluatedById.set(candidate.id, rescored);

    if (rescored.publishable && (rescored.tournamentScore ?? -1) >= 0) {
      const ranked = preRanked.map((value) => evaluatedById.get(value.id) ?? value);
      return { winner: rescored, ranked, failures };
    }

    failures.push(...rescored.rejectReasons);
  }

  return {
    winner: null,
    ranked: preRanked.map((value) => evaluatedById.get(value.id) ?? value),
    failures,
  };
}
