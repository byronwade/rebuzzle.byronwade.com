import { fuzzyMatch } from "@rebuzzle/game-logic/fuzzy-match";
import {
  BLIND_SOLVE_DOMINANCE_MARGIN,
  BLIND_SOLVE_REQUIRED_VOTES,
  distinctJudgeResults,
} from "../quality-contract";
import type { PlayerSimResult } from "./types";

export type BlindSolveHypothesis = {
  answer: string;
  confidence: number;
  rationale: string;
};

export type BlindSolveAttempt = {
  model: string;
  profileId?: string;
  visibleElements: string[];
  relationships: string[];
  hypotheses: BlindSolveHypothesis[];
  confidence: number;
};

export type BlindSolveSummary = {
  targetFoundBy: number;
  /** Judges that ranked the intended answer first. */
  topTargetFoundBy: number;
  /** Judges whose intended answer beat the strongest alternate by at least 5 points. */
  dominantTargetFoundBy: number;
  judgeCount: number;
  /** Confidence-weighted top-1 solve rate; lower-ranked mentions receive no solve credit. */
  estimatedSolveRate: number;
  confidence: number;
  wrongParses: string[];
  likelySolvePath: string;
  profileCount: number;
  profilesWithTarget: number;
  profilesWithTopTarget: number;
  profilesWithDominantTarget: number;
  meanReciprocalRank: number;
  strongestWrongConfidence: number;
  requiredVotes: number;
  profileResults: BlindSolveProfileResult[];
};

export type BlindSolveProfileResult = {
  profileId: string;
  judgeCount: number;
  targetFoundBy: number;
  topTargetFoundBy: number;
  dominantTargetFoundBy: number;
  meanReciprocalRank: number;
  strongestWrongConfidence: number;
};

type RankedAttempt = {
  attempt: BlindSolveAttempt;
  ranked: BlindSolveHypothesis[];
  target?: BlindSolveHypothesis;
  targetRank: number;
  topTarget: boolean;
  dominantTarget: boolean;
  strongestWrongConfidence: number;
};

/**
 * Hard publication blockers derived only from screenshot-first evidence.
 * Every production presentation must make the intended answer both reachable
 * and the strongest interpretation for every required independent judge.
 */
export function blindSolvePublishBlockers(
  sim: PlayerSimResult,
  expectedProfileCount = 3,
  requiredVotes = BLIND_SOLVE_REQUIRED_VOTES
): string[] {
  const blockers: string[] = [];
  if (sim.confidence < 0.45) {
    blockers.push("Blind screenshot solve simulation was unavailable or low-confidence");
  }
  const profileResults = sim.blindProfileResults ?? [];
  const uniqueProfileCount = new Set(profileResults.map((profile) => profile.profileId)).size;
  if (
    profileResults.length !== expectedProfileCount ||
    uniqueProfileCount !== expectedProfileCount ||
    (sim.blindProfileCount ?? 0) !== expectedProfileCount
  ) {
    blockers.push(
      "Blind solve tournament did not cover each production board profile exactly once"
    );
  }
  if (profileResults.length === 0) {
    blockers.push("Blind solve tournament is missing per-profile consensus evidence");
  }
  const underJudged = profileResults.filter((profile) => profile.judgeCount < requiredVotes);
  if (underJudged.length) {
    blockers.push(
      `Blind solve profiles lack ${requiredVotes}-judge coverage: ${underJudged
        .map((profile) => profile.profileId)
        .join(", ")}`
    );
  }
  const targetDisagreements = profileResults.filter(
    (profile) => profile.targetFoundBy < requiredVotes
  );
  const topDisagreements = profileResults.filter(
    (profile) => profile.topTargetFoundBy < requiredVotes
  );
  const dominantDisagreements = profileResults.filter(
    (profile) => profile.dominantTargetFoundBy < requiredVotes
  );
  const profilesWithTarget = profileResults.filter(
    (profile) => profile.targetFoundBy >= requiredVotes
  ).length;
  const profilesWithTopTarget = profileResults.filter(
    (profile) => profile.topTargetFoundBy >= requiredVotes
  ).length;
  const profilesWithDominantTarget = profileResults.filter(
    (profile) => profile.dominantTargetFoundBy >= requiredVotes
  ).length;
  if (profilesWithTarget < expectedProfileCount) {
    blockers.push(
      `The intended answer lacked ${requiredVotes}-judge agreement in every production board profile${
        targetDisagreements.length
          ? `: ${targetDisagreements.map((profile) => profile.profileId).join(", ")}`
          : ""
      }`
    );
  }
  if (profilesWithTopTarget < expectedProfileCount) {
    blockers.push(
      `The intended answer lacked ${requiredVotes}-judge top-rank agreement in every board profile${
        topDisagreements.length
          ? `: ${topDisagreements.map((profile) => profile.profileId).join(", ")}`
          : ""
      }`
    );
  }
  if (profilesWithDominantTarget < expectedProfileCount) {
    blockers.push(
      `A competing answer remained credible to at least one required judge${
        dominantDisagreements.length
          ? `: ${dominantDisagreements.map((profile) => profile.profileId).join(", ")}`
          : ""
      }`
    );
  }
  return Array.from(new Set(blockers));
}

export function toPlayabilityEvidence(sim: PlayerSimResult): {
  blind: {
    profileCount: number;
    profilesWithTarget: number;
    profilesWithTopTarget: number;
    profilesWithDominantTarget: number;
    topTargetFoundBy: number;
    dominantTargetFoundBy: number;
    meanReciprocalRank: number;
    strongestWrongConfidence: number;
    requiredVotes: number;
    profiles: BlindSolveProfileResult[];
  };
  editorial: {
    profileCount: number;
    acceptedProfiles: number;
    confidence: number;
    failureKinds: string[];
  };
} {
  return {
    blind: {
      profileCount: sim.blindProfileCount ?? 0,
      profilesWithTarget: sim.blindProfilesWithTarget ?? 0,
      profilesWithTopTarget: sim.blindProfilesWithTopTarget ?? 0,
      profilesWithDominantTarget: sim.blindProfilesWithDominantTarget ?? 0,
      topTargetFoundBy: sim.blindTopTargetFoundBy ?? 0,
      dominantTargetFoundBy: sim.blindDominantTargetFoundBy ?? 0,
      meanReciprocalRank: sim.blindMeanReciprocalRank ?? 0,
      strongestWrongConfidence: sim.blindStrongestWrongConfidence ?? 0,
      requiredVotes: sim.blindRequiredVotes ?? BLIND_SOLVE_REQUIRED_VOTES,
      profiles: sim.blindProfileResults ?? [],
    },
    editorial: {
      profileCount: sim.editorialProfileCount ?? 0,
      acceptedProfiles: sim.editorialAcceptedProfiles ?? 0,
      confidence: sim.editorialConfidence ?? 0,
      failureKinds: sim.editorialFailureKinds ?? [],
    },
  };
}

function rankAttempt(answer: string, attempt: BlindSolveAttempt): RankedAttempt {
  const ranked = [...attempt.hypotheses].sort((a, b) => b.confidence - a.confidence);
  const targetIndex = ranked.findIndex((hypothesis) => fuzzyMatch(hypothesis.answer, answer, 82));
  const target = targetIndex >= 0 ? ranked[targetIndex] : undefined;
  const strongestWrongConfidence = ranked.reduce(
    (strongest, hypothesis) =>
      fuzzyMatch(hypothesis.answer, answer, 82)
        ? strongest
        : Math.max(strongest, hypothesis.confidence),
    0
  );
  const topTarget = targetIndex === 0;
  return {
    attempt,
    ranked,
    target,
    targetRank: targetIndex >= 0 ? targetIndex + 1 : 0,
    topTarget,
    dominantTarget:
      topTarget &&
      Boolean(
        target && target.confidence >= strongestWrongConfidence + BLIND_SOLVE_DOMINANCE_MARGIN
      ),
    strongestWrongConfidence,
  };
}

/** Summarize independent screenshot-only solve attempts without exposing intent. */
export function summarizeBlindSolveAttempts(input: {
  answer: string;
  attempts: BlindSolveAttempt[];
  requiredVotes?: number;
}): BlindSolveSummary {
  const requiredVotes = input.requiredVotes ?? BLIND_SOLVE_REQUIRED_VOTES;
  const attempts = distinctJudgeResults(
    input.attempts,
    (attempt) => attempt.profileId ?? "unprofiled"
  );
  const rankedAttempts = attempts.map((attempt) => rankAttempt(input.answer, attempt));
  const targetMatches = rankedAttempts.map((result) => result.target);
  const targetFoundBy = rankedAttempts.filter((result) => Boolean(result.target)).length;
  const topTargetFoundBy = rankedAttempts.filter((result) => result.topTarget).length;
  const dominantTargetFoundBy = rankedAttempts.filter((result) => result.dominantTarget).length;
  const solveConfidence =
    rankedAttempts.length > 0
      ? rankedAttempts.reduce(
          (sum, result) => sum + (result.topTarget ? (result.target?.confidence ?? 0) : 0),
          0
        ) / rankedAttempts.length
      : 0;

  const wrongParses = Array.from(
    new Map(
      rankedAttempts
        .flatMap((result) => result.ranked)
        .filter((hypothesis) => !fuzzyMatch(hypothesis.answer, input.answer, 82))
        .sort((a, b) => b.confidence - a.confidence)
        .map((hypothesis) => [hypothesis.answer.toLowerCase(), hypothesis.answer])
    ).values()
  ).slice(0, 5);

  const bestTarget = targetMatches
    .filter((match): match is BlindSolveHypothesis => Boolean(match))
    .sort((a, b) => b.confidence - a.confidence)[0];
  const strongestAttempt = [...attempts].sort((a, b) => b.confidence - a.confidence)[0];
  const likelySolvePath =
    bestTarget?.rationale ||
    strongestAttempt?.relationships.join("; ") ||
    "Blind screenshot solvers did not find a reliable path.";
  const evaluatorConfidence =
    attempts.length > 0
      ? attempts.reduce((sum, attempt) => sum + attempt.confidence, 0) / attempts.length
      : 0;
  const profileIds = Array.from(
    new Set(attempts.map((attempt) => attempt.profileId).filter(Boolean))
  ) as string[];
  const profileResults = profileIds.map((profileId): BlindSolveProfileResult => {
    const profileAttempts = rankedAttempts.filter(
      (result) => result.attempt.profileId === profileId
    );
    return {
      profileId,
      judgeCount: profileAttempts.length,
      targetFoundBy: profileAttempts.filter((result) => Boolean(result.target)).length,
      topTargetFoundBy: profileAttempts.filter((result) => result.topTarget).length,
      dominantTargetFoundBy: profileAttempts.filter((result) => result.dominantTarget).length,
      meanReciprocalRank: rateMean(
        profileAttempts.map((result) => (result.targetRank > 0 ? 1 / result.targetRank : 0))
      ),
      strongestWrongConfidence: profileAttempts.reduce(
        (strongest, result) => Math.max(strongest, result.strongestWrongConfidence),
        0
      ),
    };
  });
  const profilesWithTarget = profileResults.filter(
    (profile) => profile.targetFoundBy >= requiredVotes
  ).length;
  const profilesWithTopTarget = profileResults.filter(
    (profile) => profile.topTargetFoundBy >= requiredVotes
  ).length;
  const profilesWithDominantTarget = profileResults.filter(
    (profile) => profile.dominantTargetFoundBy >= requiredVotes
  ).length;
  const meanReciprocalRank =
    rankedAttempts.length > 0
      ? rankedAttempts.reduce(
          (sum, result) => sum + (result.targetRank > 0 ? 1 / result.targetRank : 0),
          0
        ) / rankedAttempts.length
      : 0;
  const strongestWrongConfidence = rankedAttempts.reduce(
    (strongest, result) => Math.max(strongest, result.strongestWrongConfidence),
    0
  );

  return {
    targetFoundBy,
    topTargetFoundBy,
    dominantTargetFoundBy,
    judgeCount: attempts.length,
    estimatedSolveRate: Math.max(0, Math.min(1, solveConfidence)),
    confidence: Math.max(0, Math.min(1, evaluatorConfidence)),
    wrongParses,
    likelySolvePath,
    profileCount: profileIds.length,
    profilesWithTarget,
    profilesWithTopTarget,
    profilesWithDominantTarget,
    meanReciprocalRank,
    strongestWrongConfidence,
    requiredVotes,
    profileResults,
  };
}

function rateMean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
