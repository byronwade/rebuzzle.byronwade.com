import { BLIND_SOLVE_REQUIRED_VOTES } from "../quality-contract";
import { countDeclaredBoardCues, getDeclaredBoardCues } from "../visual/board-cues";
import type { PuzzleVisual } from "../visual/composition";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { PUZZLE_GENERATOR_BENCHMARK_VERSION } from "./types";

export const LIVE_GENERATOR_CANARY_MIN_ATTEMPTS = 8;
export const LIVE_GENERATOR_CANARY_REQUIRED_PROFILES = PUZZLE_BOARD_RECOGNITION_PROFILES.length;
export { countDeclaredBoardCues };

export type LiveGeneratorCanaryObservation = {
  id: string;
  targetDifficulty: number;
  tierLabel: "Hard" | "Difficult" | "Evil" | "Impossible";
  status: "accepted" | "rejected";
  durationMs: number;
  answer?: string;
  answerKey?: string;
  fingerprint?: string;
  techniqueId?: string;
  qualityScore?: number;
  funScore?: number;
  uniquenessScore?: number;
  assetSources: string[];
  boardDeclaredCueCount: number;
  boardProfileCount: number;
  boardCompleteProfileCount: number;
  boardDistinctModels: number;
  blindProfileCount: number;
  blindCompleteProfileCount: number;
  editorialProfileCount: number;
  editorialAcceptedProfiles: number;
  renderedProfileCount: number;
  error?: string;
};

export type BoardCueEvidenceProfile = {
  profileId: string;
  models: string[];
  conceptVotes?: Record<string, number>;
  textVotes?: Record<string, number>;
  operatorVotes?: Record<string, number>;
};

export type LiveGeneratorCanaryReport = {
  version: string;
  archiveMode: "live" | "fixture";
  attempted: number;
  accepted: number;
  rejected: number;
  acceptanceYield: number;
  attemptedTierCount: number;
  acceptedTierCount: number;
  techniqueCount: number;
  uniqueAnswerRate: number;
  uniqueFingerprintRate: number;
  approvedAssetRate: number;
  evidenceCompleteRate: number;
  qualityGateRate: number;
  p95DurationMs: number;
  rejectionReasons: Record<string, number>;
  promotion: { passed: boolean; failures: string[] };
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

function rejectionKind(message?: string): string {
  if (!message) return "unknown";
  const normalized = message.toLowerCase();
  if (normalized.includes("human approval") || normalized.includes("pending_human_review")) {
    return "asset_pending_human_review";
  }
  if (
    normalized.includes("querysrv") ||
    normalized.includes("mongodb") ||
    normalized.includes("bad auth") ||
    normalized.includes("authentication failed")
  ) {
    return "archive_unavailable";
  }
  if (normalized.includes("response_format") || normalized.includes("invalid schema")) {
    return "provider_schema";
  }
  if (normalized.includes("recogn")) return "recognition";
  if (normalized.includes("blind") || normalized.includes("solve")) return "blind_solve";
  if (normalized.includes("editorial")) return "editorial";
  if (normalized.includes("unique") || normalized.includes("archive")) return "novelty";
  if (normalized.includes("rubric") || normalized.includes("quality")) return "quality";
  if (normalized.includes("gateway") || normalized.includes("model")) return "provider";
  return "other";
}

function distinctNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim().toLocaleLowerCase("en-US")).filter(Boolean))
  );
}

/**
 * Re-check persisted board evidence instead of trusting profile presence alone.
 * A vote means that judge saw the cue at its full declared multiplicity.
 */
export function hasCompleteBoardCueEvidence(input: {
  visual: PuzzleVisual;
  profile: BoardCueEvidenceProfile;
  requiredVotes?: number;
}): boolean {
  const requiredVotes = input.requiredVotes ?? BLIND_SOLVE_REQUIRED_VOTES;
  if (distinctNonEmpty(input.profile.models).length < requiredVotes) return false;

  const declaredCues = getDeclaredBoardCues(input.visual);
  if (declaredCues.unverifiableImageCount > 0) return false;
  const concepts = new Set(declaredCues.concepts);
  const text = new Set(declaredCues.text);
  const operators = new Set(declaredCues.operators);

  return (
    Array.from(concepts).every(
      (concept) => (input.profile.conceptVotes?.[concept] ?? 0) >= requiredVotes
    ) &&
    Array.from(text).every(
      (content) => (input.profile.textVotes?.[content] ?? 0) >= requiredVotes
    ) &&
    Array.from(operators).every(
      (symbol) => (input.profile.operatorVotes?.[symbol] ?? 0) >= requiredVotes
    )
  );
}

/** Count only the exact production profiles, exactly once each. */
export function countCompleteBoardCueProfiles(input: {
  visual: PuzzleVisual;
  profiles: BoardCueEvidenceProfile[];
  requiredVotes?: number;
}): number {
  return PUZZLE_BOARD_RECOGNITION_PROFILES.filter((expected) => {
    const matches = input.profiles.filter((profile) => profile.profileId === expected.id);
    return (
      matches.length === 1 &&
      hasCompleteBoardCueEvidence({
        visual: input.visual,
        profile: matches[0]!,
        requiredVotes: input.requiredVotes,
      })
    );
  }).length;
}

function completeEvidence(observation: LiveGeneratorCanaryObservation): boolean {
  return (
    observation.boardDeclaredCueCount > 0 &&
    observation.boardProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.boardCompleteProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.boardDistinctModels >= 2 &&
    observation.blindProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.blindCompleteProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.editorialProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.editorialAcceptedProfiles === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES &&
    observation.renderedProfileCount === LIVE_GENERATOR_CANARY_REQUIRED_PROFILES
  );
}

/** Score real generator attempts. Missing evidence and partial runs fail closed. */
export function scoreLiveGeneratorCanary(
  observations: LiveGeneratorCanaryObservation[],
  options: { archiveMode?: "live" | "fixture" } = {}
): LiveGeneratorCanaryReport {
  const archiveMode = options.archiveMode ?? "live";
  const accepted = observations.filter((observation) => observation.status === "accepted");
  const approvedAssets = accepted.filter((observation) =>
    observation.assetSources.every((source) => source === "catalog" || source === "approved-cache")
  ).length;
  const evidenceComplete = accepted.filter(completeEvidence).length;
  const qualityPassed = accepted.filter(
    (observation) =>
      (observation.qualityScore ?? 0) >= 74 &&
      (observation.funScore ?? 0) >= 68 &&
      (observation.uniquenessScore ?? 0) >= 50
  ).length;
  const answerKeys = accepted.flatMap((observation) =>
    observation.answerKey ? [observation.answerKey] : []
  );
  const fingerprints = accepted.flatMap((observation) =>
    observation.fingerprint ? [observation.fingerprint] : []
  );
  const attemptedTierCount = new Set(observations.map((observation) => observation.tierLabel)).size;
  const acceptedTierCount = new Set(accepted.map((observation) => observation.tierLabel)).size;
  const techniqueCount = new Set(accepted.flatMap((observation) => observation.techniqueId ?? []))
    .size;
  const uniqueAnswerRate = rate(new Set(answerKeys).size, accepted.length);
  const uniqueFingerprintRate = rate(new Set(fingerprints).size, accepted.length);
  const acceptanceYield = rate(accepted.length, observations.length);
  const approvedAssetRate = rate(approvedAssets, accepted.length);
  const evidenceCompleteRate = rate(evidenceComplete, accepted.length);
  const qualityGateRate = rate(qualityPassed, accepted.length);
  const rejectionReasons = Object.fromEntries(
    Array.from(
      observations
        .filter((observation) => observation.status === "rejected")
        .reduce((counts, observation) => {
          const kind = rejectionKind(observation.error);
          counts.set(kind, (counts.get(kind) ?? 0) + 1);
          return counts;
        }, new Map<string, number>())
        .entries()
    ).sort(([left], [right]) => left.localeCompare(right))
  );
  const requiredTechniqueCount = Math.min(3, accepted.length);
  const failures = [
    ...(archiveMode !== "live"
      ? ["Archive mode is fixture; live novelty evidence is required for promotion"]
      : []),
    ...(observations.length < LIVE_GENERATOR_CANARY_MIN_ATTEMPTS
      ? [
          `Only ${observations.length}/${LIVE_GENERATOR_CANARY_MIN_ATTEMPTS} required live attempts were run`,
        ]
      : []),
    ...(attemptedTierCount < 4 ? [`Tier coverage ${attemptedTierCount}/4 is incomplete`] : []),
    ...(accepted.length < 4 ? [`Only ${accepted.length}/4 required puzzles were accepted`] : []),
    ...(acceptanceYield < 0.5
      ? [`Generator acceptance yield ${(acceptanceYield * 100).toFixed(1)}% is below 50%`]
      : []),
    ...(acceptedTierCount < Math.min(4, accepted.length)
      ? [`Accepted tier coverage ${acceptedTierCount}/4 is incomplete`]
      : []),
    ...(techniqueCount < requiredTechniqueCount
      ? [`Technique diversity ${techniqueCount}/${requiredTechniqueCount} is too low`]
      : []),
    ...(accepted.length > 0 && uniqueAnswerRate < 1 ? ["Accepted answers are not unique"] : []),
    ...(accepted.length > 0 && uniqueFingerprintRate < 1
      ? ["Accepted visual fingerprints are not unique"]
      : []),
    ...(accepted.length > 0 && approvedAssetRate < 1
      ? ["At least one accepted puzzle used an unapproved asset"]
      : []),
    ...(accepted.length > 0 && evidenceCompleteRate < 1
      ? ["At least one accepted puzzle lacks complete rendered evaluation evidence"]
      : []),
    ...(accepted.length > 0 && qualityGateRate < 1
      ? ["At least one accepted puzzle missed a quality hard gate"]
      : []),
  ];

  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    archiveMode,
    attempted: observations.length,
    accepted: accepted.length,
    rejected: observations.length - accepted.length,
    acceptanceYield,
    attemptedTierCount,
    acceptedTierCount,
    techniqueCount,
    uniqueAnswerRate,
    uniqueFingerprintRate,
    approvedAssetRate,
    evidenceCompleteRate,
    qualityGateRate,
    p95DurationMs: p95(observations.map((observation) => observation.durationMs)),
    rejectionReasons,
    promotion: { passed: failures.length === 0, failures },
  };
}
