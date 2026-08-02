import { distinctJudgeResults } from "../quality-contract";

export const EDITORIAL_FAILURE_KINDS = [
  "wrong_object",
  "answer_leak",
  "missing_cue",
  "ambiguous",
  "broken_layout",
  "unreadable",
] as const;

export type EditorialFailureKind = (typeof EDITORIAL_FAILURE_KINDS)[number];

export type EditorialReviewAttempt = {
  model: string;
  profileId: string;
  verdict: "publish" | "reject";
  confidence: number;
  cueCoverage: number;
  answerVisibleVerbatim: boolean;
  failureKinds: EditorialFailureKind[];
  strongestAlternate?: string;
  reason: string;
};

export type EditorialReviewSummary = {
  ok: boolean;
  profileCount: number;
  acceptedProfiles: number;
  rejectedProfiles: string[];
  missingProfiles: string[];
  failureKinds: EditorialFailureKind[];
  reasons: string[];
  confidence: number;
};

export function editorialReviewPublishBlockers(
  evidence: {
    editorialProfileCount?: number;
    editorialAcceptedProfiles?: number;
    editorialFailureKinds?: string[];
    editorialReasons?: string[];
  },
  expectedProfileCount = 3
): string[] {
  const blockers: string[] = [];
  if ((evidence.editorialProfileCount ?? 0) < expectedProfileCount) {
    blockers.push("Answer-aware screenshot review did not cover every production profile");
  }
  if ((evidence.editorialAcceptedProfiles ?? 0) < expectedProfileCount) {
    const kinds = evidence.editorialFailureKinds?.length
      ? ` (${evidence.editorialFailureKinds.join(", ")})`
      : "";
    blockers.push(`Independent screenshot editors rejected at least one profile${kinds}`);
  }
  if (evidence.editorialReasons?.length) {
    blockers.push(...evidence.editorialReasons.slice(0, 3));
  }
  return Array.from(new Set(blockers));
}

export function editorialAttemptsToObservation(input: {
  caseId: string;
  profileId: string;
  attempts: EditorialReviewAttempt[];
  minConfidence: number;
}): {
  caseId: string;
  profileId: string;
  judgeCount: number;
  publishVotes: number;
  rejectVotes: number;
  detectedFailureKinds: EditorialFailureKind[];
  answerLeakVotes: number;
} {
  const attempts = distinctJudgeResults(
    input.attempts.filter((attempt) => attempt.profileId === input.profileId)
  );
  const confident = attempts.filter((attempt) => attempt.confidence >= input.minConfidence);
  return {
    caseId: input.caseId,
    profileId: input.profileId,
    judgeCount: attempts.length,
    publishVotes: confident.filter((attempt) => attempt.verdict === "publish").length,
    rejectVotes: confident.filter((attempt) => attempt.verdict === "reject").length,
    detectedFailureKinds: Array.from(new Set(confident.flatMap((attempt) => attempt.failureKinds))),
    answerLeakVotes: confident.filter((attempt) => attempt.answerVisibleVerbatim).length,
  };
}

/** Require a confident independent majority at every production presentation. */
export function summarizeEditorialReviewAttempts(input: {
  attempts: EditorialReviewAttempt[];
  expectedProfileIds: readonly string[];
  requiredVotes: number;
  minConfidence: number;
}): EditorialReviewSummary {
  const attempts = distinctJudgeResults(input.attempts, (attempt) => attempt.profileId);
  const testedProfiles = new Set(attempts.map((attempt) => attempt.profileId));
  const missingProfiles = input.expectedProfileIds.filter((id) => !testedProfiles.has(id));
  const rejectedProfiles: string[] = [];
  const reasons: string[] = [];
  let acceptedProfiles = 0;

  for (const profileId of input.expectedProfileIds) {
    const profileAttempts = attempts.filter((attempt) => attempt.profileId === profileId);
    const confident = profileAttempts.filter(
      (attempt) => attempt.confidence >= input.minConfidence
    );
    const publishVotes = confident.filter((attempt) => attempt.verdict === "publish").length;
    const rejectAttempts = confident.filter((attempt) => attempt.verdict === "reject");
    if (
      profileAttempts.length >= input.requiredVotes &&
      publishVotes >= input.requiredVotes &&
      rejectAttempts.length < input.requiredVotes
    ) {
      acceptedProfiles += 1;
      continue;
    }
    rejectedProfiles.push(profileId);
    if (profileAttempts.length < input.requiredVotes) {
      reasons.push(`${profileId}: not enough independent editorial judges`);
    } else if (rejectAttempts.length) {
      reasons.push(...rejectAttempts.map((attempt) => `${profileId}: ${attempt.reason}`));
    } else {
      reasons.push(`${profileId}: editorial confidence below publication threshold`);
    }
  }

  const rejectedProfileIds = new Set(rejectedProfiles);
  const confidentAttempts = attempts.filter(
    (attempt) =>
      rejectedProfileIds.has(attempt.profileId) && attempt.confidence >= input.minConfidence
  );
  const failureKinds = Array.from(
    new Set(
      confidentAttempts
        .filter((attempt) => attempt.verdict === "reject")
        .flatMap((attempt) => attempt.failureKinds)
    )
  );
  const confidence = attempts.length
    ? attempts.reduce((sum, attempt) => sum + attempt.confidence, 0) / attempts.length
    : 0;

  return {
    ok:
      missingProfiles.length === 0 &&
      acceptedProfiles === input.expectedProfileIds.length &&
      rejectedProfiles.length === 0,
    profileCount: testedProfiles.size,
    acceptedProfiles,
    rejectedProfiles,
    missingProfiles,
    failureKinds,
    reasons: Array.from(new Set(reasons)),
    confidence,
  };
}
