import type { EloRankingOptions } from "./elo-ratings";
import { rankCandidates } from "./tournament";
import type { ApexCandidate } from "./types";

const RUNTIME_GUARD_FAILURE =
  "Rendered finalist evaluation stopped before runner-up to preserve the runtime deadline";
const MAX_FAILURE_DETAIL_LENGTH = 320;

export type FinalistSelectionResult = {
  winner: ApexCandidate | null;
  ranked: ApexCandidate[];
  failures: string[];
  revisionAttempts: number;
};

type FinalistPreparation = (candidate: ApexCandidate) => Promise<ApexCandidate>;
type FinalistRevision = (candidate: ApexCandidate) => Promise<ApexCandidate | null>;

function isEligibleForRenderedEvaluation(candidate: ApexCandidate): boolean {
  return (
    candidate.publishable &&
    candidate.isUnique &&
    candidate.solvable &&
    candidate.inBand &&
    candidate.critique?.verdict !== "reject"
  );
}

function canAttemptCritiqueRevision(candidate: ApexCandidate): boolean {
  return (
    candidate.critique?.source === "model" &&
    candidate.critique.verdict === "revise" &&
    candidate.critique.reviseInstructions.length > 0
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
  prepare?: FinalistPreparation;
  canStartRevision?: () => boolean;
  revise?: FinalistRevision;
  maxRevisions?: number;
  /** Soft Elo prior used while pre-ranking cheap drafts before vision spend. */
  eloOptions?: EloRankingOptions;
}): Promise<FinalistSelectionResult> {
  const eloOptions = input.eloOptions;
  const preRanked = rankCandidates(input.candidates, input.minRubricOverall, eloOptions);
  const preparedById = new Map<string, ApexCandidate>();
  const evaluatedById = new Map<string, ApexCandidate>();
  const failures: string[] = [];
  const maxRevisions = Math.min(1, Math.max(0, input.maxRevisions ?? 1));
  let revisionAttempts = 0;

  for (const draft of preRanked) {
    if (!isEligibleForRenderedEvaluation(draft)) {
      failures.push(preRankingFailure(draft, input.minRubricOverall));
      continue;
    }

    const candidate = input.prepare ? await input.prepare(draft) : draft;
    let prepared = rankCandidates([candidate], input.minRubricOverall, eloOptions)[0];
    if (!prepared) {
      failures.push(`${draft.id}: finalist preparation returned no candidate`);
      continue;
    }
    preparedById.set(prepared.id, prepared);

    if (!isEligibleForRenderedEvaluation(prepared)) {
      const canRevise =
        Boolean(input.revise) &&
        revisionAttempts < maxRevisions &&
        canAttemptCritiqueRevision(prepared);

      if (!canRevise) {
        failures.push(preRankingFailure(prepared, input.minRubricOverall));
        continue;
      }

      if (input.canStartRevision && !input.canStartRevision()) {
        failures.push(
          `${preRankingFailure(prepared, input.minRubricOverall)}; critique-guided revision skipped by runtime guard`
        );
        continue;
      }

      revisionAttempts += 1;
      const revised = await input.revise!(prepared);
      if (!revised) {
        failures.push(
          `${preRankingFailure(prepared, input.minRubricOverall)}; critique-guided revision returned no candidate`
        );
        continue;
      }

      const revisedCandidate = input.prepare ? await input.prepare(revised) : revised;
      prepared = rankCandidates([revisedCandidate], input.minRubricOverall, eloOptions)[0];
      if (!prepared) {
        failures.push(`${revised.id}: finalist revision returned no candidate`);
        continue;
      }
      preparedById.set(prepared.id, prepared);

      if (!isEligibleForRenderedEvaluation(prepared)) {
        failures.push(preRankingFailure(prepared, input.minRubricOverall));
        continue;
      }
    }

    if (!input.canStartEvaluation()) {
      failures.push(RUNTIME_GUARD_FAILURE);
      break;
    }

    const evaluated = await input.evaluate(prepared);
    const rescored = rankCandidates([evaluated], input.minRubricOverall, eloOptions)[0];
    if (!rescored) {
      failures.push("Rendered finalist evaluation returned no candidate");
      continue;
    }
    evaluatedById.set(rescored.id, rescored);

    if (rescored.publishable && (rescored.tournamentScore ?? -1) >= 0) {
      const ranked = preRanked.map(
        (value) => evaluatedById.get(value.id) ?? preparedById.get(value.id) ?? value
      );
      const withoutReplacedDraft = ranked.filter((value) => value.id !== draft.id);
      const seenIds = new Set<string>();
      const outputRanked: typeof ranked = [];
      for (const value of [rescored, ...withoutReplacedDraft]) {
        if (seenIds.has(value.id)) continue;
        seenIds.add(value.id);
        outputRanked.push(value);
      }
      return { winner: rescored, ranked: outputRanked, failures, revisionAttempts };
    }

    failures.push(...rescored.rejectReasons);
  }

  return {
    winner: null,
    ranked: preRanked.map(
      (value) => evaluatedById.get(value.id) ?? preparedById.get(value.id) ?? value
    ),
    failures,
    revisionAttempts,
  };
}
