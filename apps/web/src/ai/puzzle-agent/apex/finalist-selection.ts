import { rankCandidates } from "./tournament";
import type { ApexCandidate } from "./types";

const RUNTIME_GUARD_FAILURE =
  "Rendered finalist evaluation stopped before runner-up to preserve the runtime deadline";
const MAX_FAILURE_DETAIL_LENGTH = 320;

export type FinalistSelectionResult = {
  winner: ApexCandidate | null;
  ranked: ApexCandidate[];
  failures: string[];
};

function isEligibleForRenderedEvaluation(candidate: ApexCandidate): boolean {
  return (
    candidate.publishable &&
    candidate.isUnique &&
    candidate.solvable &&
    candidate.inBand &&
    candidate.critique?.verdict !== "reject"
  );
}

function compactFailureDetail(detail: string): string {
  const compact = detail.replace(/\s+/g, " ").trim();
  return compact.length > MAX_FAILURE_DETAIL_LENGTH
    ? `${compact.slice(0, MAX_FAILURE_DETAIL_LENGTH - 1)}…`
    : compact;
}

function preRankingFailure(candidate: ApexCandidate, minRubricOverall: number): string {
  const reasons = [...candidate.rejectReasons];
  if (!candidate.publishable && !reasons.length) reasons.push("publishable gate failed");
  if (!candidate.isUnique) reasons.push("uniqueness gate failed");
  if (!candidate.solvable) reasons.push("solvability gate failed");
  if (!candidate.inBand) reasons.push("difficulty band gate failed");
  if (
    candidate.critique?.verdict === "reject" &&
    !reasons.some((reason) => reason.startsWith("Critique reject:"))
  ) {
    reasons.push(`Critique reject: ${candidate.critique.summary}`);
  }
  if (candidate.rubric && candidate.rubric.overall < minRubricOverall) {
    reasons.push(`Preliminary rubric ${candidate.rubric.overall} below ${minRubricOverall}`);
  }

  const detail = reasons.length
    ? reasons.slice(0, 3).map(compactFailureDetail).join("; ")
    : "candidate failed a rendered-evaluation eligibility gate";
  return `${candidate.id}: ${detail}`;
}

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
  const eligible = preRanked.filter(isEligibleForRenderedEvaluation);
  const preRankingFailures = preRanked
    .filter((candidate) => !isEligibleForRenderedEvaluation(candidate))
    .map((candidate) => preRankingFailure(candidate, input.minRubricOverall));
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
    failures: [...preRankingFailures, ...failures],
  };
}
