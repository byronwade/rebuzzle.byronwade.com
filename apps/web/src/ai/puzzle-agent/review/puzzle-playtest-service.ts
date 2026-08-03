import { createHash, randomUUID } from "node:crypto";
import { fuzzyMatch, normalizeString } from "@rebuzzle/game-logic/fuzzy-match";
import {
  type BinomialInterval,
  ONE_SIDED_95_Z,
  wilsonScoreInterval,
} from "@/ai/statistics/binomial";
import type {
  PuzzlePlaytestCandidate,
  PuzzlePlaytestEvidenceRole,
  PuzzlePlaytestFailureReason,
  PuzzlePlaytestReview,
} from "@/db/models";
import { type DifficultyTier, getDifficultyLevelForScore } from "../difficulty-levels";
import { isKnownTechniqueId } from "../quality";
import { PuzzleVisualSchema } from "../visual/composition";
import {
  PUZZLE_BOARD_RECOGNITION_PROFILES,
  type PuzzleBoardRecognitionProfileId,
} from "../visual/presentation";
import { renderPuzzleVisualProfile } from "../visual/render-board";
import {
  absoluteBootstrapBound,
  estimatePuzzlePlaytestClusterEvidence,
  type PuzzlePlaytestClusterEvidence,
  responsiveSolveGapUpperBound,
} from "./puzzle-playtest-cluster-evidence";
import { buildPuzzlePlaytestControlCorpus } from "./puzzle-playtest-controls";
import { expectedHumanSolveFloor, humanSolveFloorEvidence } from "./puzzle-playtest-solve-floor";

export { expectedHumanSolveFloor, humanSolveFloorEvidence } from "./puzzle-playtest-solve-floor";

export const PUZZLE_PLAYTEST_CONTRACT_VERSION = "puzzle-playtest-v3";
export const PUZZLE_PLAYTEST_READINESS_VERSION = "puzzle-playtest-readiness-v3";
export const PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE = 5;
export const PUZZLE_PLAYTEST_REQUIRED_CONTROLS_PER_REVIEWER = 4;
export const PUZZLE_PLAYTEST_MINIMUM_CORRECT_CONTROLS = 3;
export const PUZZLE_PLAYTEST_RELEASE_SAMPLE = 30;
export const PUZZLE_PLAYTEST_MARKET_SAMPLE = 100;
export const PUZZLE_PLAYTEST_RELEASE_MIN_REVIEWERS = 20;
export const PUZZLE_PLAYTEST_MARKET_MIN_REVIEWERS = 50;
export const PUZZLE_PLAYTEST_RELEASE_MAX_REVIEWER_SHARE = 0.075;
export const PUZZLE_PLAYTEST_MARKET_MAX_REVIEWER_SHARE = 0.035;
export const PUZZLE_PLAYTEST_RELEASE_MIN_TECHNIQUES = 6;
export const PUZZLE_PLAYTEST_MARKET_MIN_TECHNIQUES = 10;
export const PUZZLE_PLAYTEST_RELEASE_MAX_TECHNIQUE_SHARE = 0.35;
export const PUZZLE_PLAYTEST_MARKET_MAX_TECHNIQUE_SHARE = 0.2;
export const PUZZLE_PLAYTEST_RELEASE_MIN_PER_DIFFICULTY_TIER = 3;
export const PUZZLE_PLAYTEST_MARKET_MIN_PER_DIFFICULTY_TIER = 15;

export const PUZZLE_PLAYTEST_FAILURE_REASONS = [
  "unrecognizable-artwork",
  "unreadable-layout",
  "missing-cue",
  "multiple-answers",
  "too-hard",
  "other",
] as const satisfies readonly PuzzlePlaytestFailureReason[];

export type BlindPuzzlePlaytestSpecimen = {
  fixtureId: string;
  imageDataUrl: string;
  width: number;
  height: number;
};

export type PuzzlePlaytestProgress = {
  completed: number;
  available: number;
  remaining: number;
  complete: boolean;
};

export type PuzzlePlaytestProfileScore = {
  profileId: PuzzleBoardRecognitionProfileId;
  decisions: number;
  correct: number;
  solveRate: number | null;
  ambiguityRate: number | null;
  visualFailureRate: number | null;
  medianSolveMs: number | null;
};

export type PuzzlePlaytestCandidateReport = {
  candidateId: string;
  puzzleId: string;
  answer: string;
  status: PuzzlePlaytestCandidate["status"];
  difficultyScore: number;
  techniqueId?: string;
  decisions: number;
  correct: number;
  solveRate: number | null;
  solveRateLowerBound: number;
  expectedSolveFloor: number;
  ambiguityRate: number | null;
};

export type PuzzlePlaytestStratumScore = {
  id: string;
  candidates: number;
  share: number | null;
  decisions: number;
  correct: number;
  solveRate: number | null;
};

export type PuzzlePlaytestReviewerCoverage = {
  reviewers: number;
  maximumDecisionsByOneReviewer: number;
  maximumDecisionShare: number | null;
};

export type PuzzlePlaytestReviewerQuality = {
  reviewers: number;
  evaluatedReviewers: number;
  qualifiedReviewers: number;
  excludedReviewers: number;
  pendingReviewers: number;
  qualificationRate: number | null;
  controlDecisions: number;
  qualifiedGeneratedDecisions: number;
  unscoredGeneratedDecisions: number;
};

export type PuzzlePlaytestStatisticalEvidence = {
  method: "one-sided-wilson-score";
  confidenceLevel: 0.95;
  reviewerExclusion: BinomialInterval;
  candidateFloorPass: BinomialInterval;
  ambiguity: BinomialInterval;
  visualFailure: BinomialInterval;
  highConfidenceWrong: BinomialInterval;
  solveCalibrationCoverage: BinomialInterval;
};

export type PuzzlePlaytestConservativeEvidence = {
  method: "wilson-envelope-with-pigeonhole-bootstrap";
  confidenceLevel: 0.95;
  candidateFloorPassLowerBound: number | null;
  ambiguityUpperBound: number | null;
  visualFailureUpperBound: number | null;
  highConfidenceWrongUpperBound: number | null;
  responsiveSolveGapUpperBound: number | null;
  solveCalibrationMeanAbsoluteErrorUpperBound: number | null;
  solveCalibrationAbsoluteBiasUpperBound: number | null;
};

export type PuzzlePlaytestReport = {
  contractVersion: typeof PUZZLE_PLAYTEST_CONTRACT_VERSION;
  readinessVersion: typeof PUZZLE_PLAYTEST_READINESS_VERSION;
  requiredReviewersPerProfile: number;
  candidateCount: number;
  openCandidates: number;
  completedCandidates: number;
  reviewerCount: number;
  reviewerCoverage: PuzzlePlaytestReviewerCoverage;
  reviewerQuality: PuzzlePlaytestReviewerQuality;
  statisticalEvidence: PuzzlePlaytestStatisticalEvidence;
  clusteredEvidence: PuzzlePlaytestClusterEvidence;
  conservativeEvidence: PuzzlePlaytestConservativeEvidence;
  controlCandidateCount: number;
  decisionCount: number;
  completedDecisionCount: number;
  overallSolveRate: number | null;
  ambiguityRate: number | null;
  visualFailureRate: number | null;
  highConfidenceWrongRate: number | null;
  responsiveSolveGap: number | null;
  candidateFloorPassRate: number | null;
  solveCalibrationCoverage: number | null;
  solveCalibrationMeanAbsoluteError: number | null;
  solveCalibrationBias: number | null;
  profileScores: PuzzlePlaytestProfileScore[];
  difficultyTierScores: PuzzlePlaytestStratumScore[];
  techniqueScores: PuzzlePlaytestStratumScore[];
  failureReasons: Record<PuzzlePlaytestFailureReason, number>;
  visibleCandidates: PuzzlePlaytestCandidateReport[];
  releaseReady: boolean;
  marketLeadingReady: boolean;
  releaseFailures: string[];
  marketLeadingFailures: string[];
  generatedAt: string;
};

export type PuzzlePlaytestRepository = {
  insertCandidate(candidate: PuzzlePlaytestCandidate): Promise<boolean>;
  findCandidateByPuzzleId(input: {
    contractVersion: string;
    puzzleId: string;
  }): Promise<PuzzlePlaytestCandidate | null>;
  findCandidateById(id: string): Promise<PuzzlePlaytestCandidate | null>;
  listCandidates(input: {
    contractVersion: string;
    statuses?: PuzzlePlaytestCandidate["status"][];
    evidenceRoles?: PuzzlePlaytestEvidenceRole[];
    limit?: number;
  }): Promise<PuzzlePlaytestCandidate[]>;
  listReviews(input: {
    contractVersion: string;
    reviewerId?: string;
    candidateIds?: string[];
  }): Promise<PuzzlePlaytestReview[]>;
  insertReview(review: PuzzlePlaytestReview): Promise<boolean>;
  completeCandidate(input: {
    id: string;
    expectedStatusVersion: number;
    updatedAt: Date;
  }): Promise<PuzzlePlaytestCandidate | null>;
};

export type PuzzlePlaytestRenderer = (
  visual: PuzzlePlaytestCandidate["visual"],
  profileId: PuzzleBoardRecognitionProfileId
) => Promise<{ pixels: Uint8Array; width: number; height: number }>;

export class PuzzlePlaytestConflictError extends Error {
  constructor() {
    super("This puzzle has already been playtested by this reviewer");
    this.name = "PuzzlePlaytestConflictError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureId(candidateId: string, profileId: PuzzleBoardRecognitionProfileId): string {
  return sha256(`${PUZZLE_PLAYTEST_CONTRACT_VERSION}:${candidateId}:${profileId}`).slice(0, 32);
}

function profileForFixture(candidateId: string, inputFixtureId: string) {
  return PUZZLE_BOARD_RECOGNITION_PROFILES.find(
    (profile) => fixtureId(candidateId, profile.id) === inputFixtureId
  )?.id;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

function isVisualFailure(review: PuzzlePlaytestReview): boolean {
  return (
    review.failureReason === "unrecognizable-artwork" ||
    review.failureReason === "unreadable-layout" ||
    review.failureReason === "missing-cue"
  );
}

function progress(available: number, completed: number): PuzzlePlaytestProgress {
  const safe = Math.max(0, Math.min(available, completed));
  return { completed: safe, available, remaining: available - safe, complete: safe === available };
}

function countByProfile(reviews: PuzzlePlaytestReview[]) {
  return new Map(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => [
      profile.id,
      reviews.filter((review) => review.profileId === profile.id).length,
    ])
  );
}

function uniqueReviews(reviews: PuzzlePlaytestReview[]): PuzzlePlaytestReview[] {
  const seen = new Set<string>();
  return reviews.filter((review) => {
    const key = `${review.contractVersion}:${review.candidateId}:${review.reviewerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type ReviewerQualificationStatus = "pending" | "qualified" | "excluded";

type ReviewerQualification = {
  status: ReviewerQualificationStatus;
  decisions: number;
  correct: number;
};

function reviewerQualification(
  reviews: PuzzlePlaytestReview[],
  controlCandidateIds: ReadonlySet<string>
): ReviewerQualification {
  const controls = reviews
    .filter((review) => controlCandidateIds.has(review.candidateId))
    .slice(0, PUZZLE_PLAYTEST_REQUIRED_CONTROLS_PER_REVIEWER);
  const correct = controls.filter((review) => review.correct).length;
  if (controls.length < PUZZLE_PLAYTEST_REQUIRED_CONTROLS_PER_REVIEWER) {
    return { status: "pending", decisions: controls.length, correct };
  }
  return {
    status: correct >= PUZZLE_PLAYTEST_MINIMUM_CORRECT_CONTROLS ? "qualified" : "excluded",
    decisions: controls.length,
    correct,
  };
}

function reviewerQualificationMap(
  reviews: PuzzlePlaytestReview[],
  controlCandidateIds: ReadonlySet<string>
): Map<string, ReviewerQualification> {
  const byReviewer = new Map<string, PuzzlePlaytestReview[]>();
  for (const review of reviews) {
    const rows = byReviewer.get(review.reviewerId) ?? [];
    rows.push(review);
    byReviewer.set(review.reviewerId, rows);
  }
  return new Map(
    [...byReviewer].map(([reviewerId, rows]) => [
      reviewerId,
      reviewerQualification(rows, controlCandidateIds),
    ])
  );
}

function reportFailures(input: {
  completedCandidates: number;
  minimumCandidates: number;
  reviewerCount: number;
  minimumReviewers: number;
  maximumReviewerDecisionShare: number | null;
  maximumAllowedReviewerDecisionShare: number;
  reviewerExclusionEvidence: BinomialInterval;
  maximumReviewerExclusionRate: number;
  difficultyTierScores: PuzzlePlaytestStratumScore[];
  minimumCandidatesPerDifficultyTier: number;
  techniqueScores: PuzzlePlaytestStratumScore[];
  classifiedTechniqueCandidates: number;
  minimumTechniques: number;
  maximumTechniqueShare: number;
  candidateFloorPassEvidence: BinomialInterval;
  candidateFloorPassLowerBound: number | null;
  minimumFloorPassRate: number;
  ambiguityUpperBound: number | null;
  maximumAmbiguityRate: number;
  visualFailureUpperBound: number | null;
  maximumVisualFailureRate: number;
  highConfidenceWrongUpperBound: number | null;
  maximumHighConfidenceWrongRate: number;
  responsiveSolveGapUpperBound: number | null;
  maximumResponsiveSolveGap: number;
  solveCalibrationCoverageEvidence: BinomialInterval;
  minimumSolveCalibrationCoverage: number;
  solveCalibrationMeanAbsoluteErrorUpperBound: number | null;
  maximumSolveCalibrationMeanAbsoluteError: number;
  solveCalibrationAbsoluteBiasUpperBound: number | null;
  maximumAbsoluteSolveCalibrationBias: number;
}): string[] {
  const failures: string[] = [];
  const observed = (evidence: BinomialInterval) =>
    `${evidence.rate.toFixed(3)}, ${evidence.events}/${evidence.total}`;
  if (input.completedCandidates < input.minimumCandidates) {
    failures.push(
      `Completed generated-puzzle sample ${input.completedCandidates}/${input.minimumCandidates}`
    );
  }
  if (input.reviewerCount < input.minimumReviewers) {
    failures.push(`Independent reviewer breadth ${input.reviewerCount}/${input.minimumReviewers}`);
  }
  if (
    input.maximumReviewerDecisionShare === null ||
    input.maximumReviewerDecisionShare > input.maximumAllowedReviewerDecisionShare
  ) {
    failures.push(`One-reviewer decision share above ${input.maximumAllowedReviewerDecisionShare}`);
  }
  if (input.reviewerExclusionEvidence.upper > input.maximumReviewerExclusionRate) {
    failures.push(
      `Failed-control reviewer rate 95% upper bound ${input.reviewerExclusionEvidence.upper.toFixed(3)} above ${input.maximumReviewerExclusionRate} (observed ${observed(input.reviewerExclusionEvidence)})`
    );
  }
  const undercoveredDifficultyTiers = input.difficultyTierScores.flatMap((score) =>
    score.candidates < input.minimumCandidatesPerDifficultyTier
      ? [`${score.id} ${score.candidates}/${input.minimumCandidatesPerDifficultyTier}`]
      : []
  );
  if (undercoveredDifficultyTiers.length) {
    failures.push(`Difficulty-tier coverage incomplete: ${undercoveredDifficultyTiers.join(", ")}`);
  }
  if (input.techniqueScores.length < input.minimumTechniques) {
    failures.push(`Technique breadth ${input.techniqueScores.length}/${input.minimumTechniques}`);
  }
  if (input.classifiedTechniqueCandidates < input.completedCandidates) {
    failures.push(
      `Named-technique coverage ${input.classifiedTechniqueCandidates}/${input.completedCandidates}`
    );
  }
  const dominantTechnique = input.techniqueScores.find(
    (score) => score.share !== null && score.share > input.maximumTechniqueShare
  );
  if (dominantTechnique) {
    failures.push(
      `Technique concentration ${dominantTechnique.id} ${dominantTechnique.share!.toFixed(3)} above ${input.maximumTechniqueShare}`
    );
  }
  if (
    input.candidateFloorPassLowerBound === null ||
    input.candidateFloorPassLowerBound < input.minimumFloorPassRate
  ) {
    failures.push(
      input.candidateFloorPassLowerBound === null
        ? "Cluster-aware candidate-floor uncertainty unavailable"
        : `Difficulty-adjusted candidate-floor conservative 95% lower bound ${input.candidateFloorPassLowerBound.toFixed(3)} below ${input.minimumFloorPassRate} (observed ${observed(input.candidateFloorPassEvidence)})`
    );
  }
  if (
    input.ambiguityUpperBound === null ||
    input.ambiguityUpperBound > input.maximumAmbiguityRate
  ) {
    failures.push(
      input.ambiguityUpperBound === null
        ? "Cluster-aware multiple-answer uncertainty unavailable"
        : `Multiple-answer conservative 95% upper bound ${input.ambiguityUpperBound.toFixed(3)} above ${input.maximumAmbiguityRate}`
    );
  }
  if (
    input.visualFailureUpperBound === null ||
    input.visualFailureUpperBound > input.maximumVisualFailureRate
  ) {
    failures.push(
      input.visualFailureUpperBound === null
        ? "Cluster-aware visual-playability uncertainty unavailable"
        : `Visual-playability conservative 95% upper bound ${input.visualFailureUpperBound.toFixed(3)} above ${input.maximumVisualFailureRate}`
    );
  }
  if (
    input.highConfidenceWrongUpperBound === null ||
    input.highConfidenceWrongUpperBound > input.maximumHighConfidenceWrongRate
  ) {
    failures.push(
      input.highConfidenceWrongUpperBound === null
        ? "Cluster-aware high-confidence-wrong uncertainty unavailable"
        : `High-confidence wrong-answer conservative 95% upper bound ${input.highConfidenceWrongUpperBound.toFixed(3)} above ${input.maximumHighConfidenceWrongRate}`
    );
  }
  if (
    input.responsiveSolveGapUpperBound === null ||
    input.responsiveSolveGapUpperBound > input.maximumResponsiveSolveGap
  ) {
    failures.push(
      input.responsiveSolveGapUpperBound === null
        ? "Cluster-aware responsive solve-rate uncertainty unavailable"
        : `Responsive solve-rate conservative 95% upper bound ${input.responsiveSolveGapUpperBound.toFixed(3)} above ${input.maximumResponsiveSolveGap}`
    );
  }
  if (input.solveCalibrationCoverageEvidence.lower < input.minimumSolveCalibrationCoverage) {
    failures.push(
      `Automated solve-rate coverage 95% lower bound ${input.solveCalibrationCoverageEvidence.lower.toFixed(3)} below ${input.minimumSolveCalibrationCoverage} (observed ${observed(input.solveCalibrationCoverageEvidence)})`
    );
  }
  if (
    input.solveCalibrationMeanAbsoluteErrorUpperBound === null ||
    input.solveCalibrationMeanAbsoluteErrorUpperBound >
      input.maximumSolveCalibrationMeanAbsoluteError
  ) {
    failures.push(
      input.solveCalibrationMeanAbsoluteErrorUpperBound === null
        ? "Cluster-aware solve-rate mean absolute error uncertainty unavailable"
        : `Automated solve-rate mean absolute error conservative 95% upper bound ${input.solveCalibrationMeanAbsoluteErrorUpperBound.toFixed(3)} above ${input.maximumSolveCalibrationMeanAbsoluteError}`
    );
  }
  if (
    input.solveCalibrationAbsoluteBiasUpperBound === null ||
    input.solveCalibrationAbsoluteBiasUpperBound > input.maximumAbsoluteSolveCalibrationBias
  ) {
    failures.push(
      input.solveCalibrationAbsoluteBiasUpperBound === null
        ? "Cluster-aware solve-rate bias uncertainty unavailable"
        : `Automated solve-rate absolute bias conservative 95% upper bound ${input.solveCalibrationAbsoluteBiasUpperBound.toFixed(3)} above ${input.maximumAbsoluteSolveCalibrationBias}`
    );
  }
  return failures;
}

export function createPuzzlePlaytestService(
  repository: PuzzlePlaytestRepository,
  renderer: PuzzlePlaytestRenderer = async (visual, profileId) =>
    renderPuzzleVisualProfile(PuzzleVisualSchema.parse(visual), profileId)
) {
  async function ensureControlCandidates(now = new Date()): Promise<PuzzlePlaytestCandidate[]> {
    const existingCandidates = await repository.listCandidates({
      contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
      evidenceRoles: ["control"],
      limit: 100,
    });
    const existingPuzzleIds = new Set(existingCandidates.map((candidate) => candidate.puzzleId));
    let foundMissingControl = false;
    for (const control of buildPuzzlePlaytestControlCorpus()) {
      const puzzleId = `reviewer-control:${control.id}`;
      if (existingPuzzleIds.has(puzzleId)) continue;
      foundMissingControl = true;
      const visual = PuzzleVisualSchema.parse(control.visual);
      await repository.insertCandidate({
        id: `puzzle-playtest-control:${sha256(`${control.id}:${control.answer}:${JSON.stringify(visual)}`).slice(0, 32)}`,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "control",
        puzzleId,
        answer: control.answer,
        answerKey: normalizeString(control.answer).replaceAll(" ", ""),
        visual,
        techniqueId: "simple_compound",
        difficultyScore: 1,
        difficultyLevel: "control",
        generationMethod: "frozen-reviewer-control",
        status: "open",
        statusVersion: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    return foundMissingControl
      ? repository.listCandidates({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          evidenceRoles: ["control"],
          limit: 100,
        })
      : existingCandidates;
  }

  async function loadEvidence(options?: { ensureControls?: boolean }): Promise<{
    candidates: PuzzlePlaytestCandidate[];
    reviews: PuzzlePlaytestReview[];
  }> {
    const controls =
      options?.ensureControls === false
        ? await repository.listCandidates({
            contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
            evidenceRoles: ["control"],
            limit: 100,
          })
        : await ensureControlCandidates();
    const [generated, reviews] = await Promise.all([
      repository.listCandidates({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRoles: ["generated"],
        limit: 2000,
      }),
      repository.listReviews({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
      }),
    ]);
    return { candidates: [...generated, ...controls], reviews: uniqueReviews(reviews) };
  }

  async function evaluateCandidate(
    candidate: PuzzlePlaytestCandidate,
    evidence?: { candidates: PuzzlePlaytestCandidate[]; reviews: PuzzlePlaytestReview[] }
  ) {
    if (candidate.evidenceRole === "control" || candidate.status === "complete") return candidate;
    const current = evidence ?? (await loadEvidence());
    const controlIds = new Set(
      current.candidates.flatMap((row) => (row.evidenceRole === "control" ? [row.id] : []))
    );
    const qualifications = reviewerQualificationMap(current.reviews, controlIds);
    const qualifiedReviews = current.reviews.filter(
      (review) =>
        review.candidateId === candidate.id &&
        qualifications.get(review.reviewerId)?.status === "qualified"
    );
    const counts = countByProfile(qualifiedReviews);
    const complete = PUZZLE_BOARD_RECOGNITION_PROFILES.every(
      (profile) => (counts.get(profile.id) ?? 0) >= PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE
    );
    if (!complete) return candidate;
    return (
      (await repository.completeCandidate({
        id: candidate.id,
        expectedStatusVersion: candidate.statusVersion,
        updatedAt: new Date(),
      })) ?? candidate
    );
  }

  async function refreshCandidateCompletions(): Promise<void> {
    const evidence = await loadEvidence();
    for (const candidate of evidence.candidates) {
      if (candidate.evidenceRole === "generated" && candidate.status === "open") {
        await evaluateCandidate(candidate, evidence);
      }
    }
  }

  async function getNextAssignment(reviewerIdInput: string): Promise<{
    specimen: BlindPuzzlePlaytestSpecimen | null;
    progress: PuzzlePlaytestProgress;
  }> {
    const reviewerId = reviewerIdInput.trim().slice(0, 100);
    if (!reviewerId) throw new Error("Reviewer is required");
    const { candidates, reviews } = await loadEvidence();
    const generatedCandidates = candidates.filter(
      (candidate) => candidate.evidenceRole === "generated" && candidate.status === "open"
    );
    const controlCandidates = candidates.filter(
      (candidate) => candidate.evidenceRole === "control" && candidate.status === "open"
    );
    const controlIds = new Set(controlCandidates.map((candidate) => candidate.id));
    const reviewerReviews = reviews.filter((review) => review.reviewerId === reviewerId);
    const qualifications = reviewerQualificationMap(reviews, controlIds);
    const reviewed = new Set(reviewerReviews.map((review) => review.candidateId));
    const qualification = reviewerQualification(reviewerReviews, controlIds);
    const pendingControls = controlCandidates
      .filter((candidate) => !reviewed.has(candidate.id))
      .sort((left, right) =>
        sha256(`${reviewerId}:control:${left.id}`).localeCompare(
          sha256(`${reviewerId}:control:${right.id}`)
        )
      );
    const pendingGenerated = generatedCandidates
      .filter((candidate) => !reviewed.has(candidate.id))
      .sort((left, right) =>
        sha256(`${reviewerId}:generated:${left.id}`).localeCompare(
          sha256(`${reviewerId}:generated:${right.id}`)
        )
      );
    const reviewerGeneratedDecisions = reviewerReviews.filter(
      (review) => !controlIds.has(review.candidateId)
    ).length;
    const shouldServeControl =
      qualification.status === "pending" &&
      (reviewerGeneratedDecisions >= qualification.decisions || pendingGenerated.length === 0);
    const candidate =
      qualification.status === "excluded"
        ? undefined
        : qualification.status === "qualified"
          ? pendingGenerated[0]
          : shouldServeControl
            ? pendingControls[0]
            : (pendingGenerated[0] ?? pendingControls[0]);
    const completed =
      generatedCandidates.filter((row) => reviewed.has(row.id)).length +
      Math.min(qualification.decisions, PUZZLE_PLAYTEST_REQUIRED_CONTROLS_PER_REVIEWER);
    const available =
      qualification.status === "excluded"
        ? completed
        : generatedCandidates.length +
          Math.min(controlCandidates.length, PUZZLE_PLAYTEST_REQUIRED_CONTROLS_PER_REVIEWER);
    if (!candidate) {
      return { specimen: null, progress: progress(available, completed) };
    }
    const candidateReviews = reviews.filter(
      (review) =>
        review.candidateId === candidate.id &&
        qualifications.get(review.reviewerId)?.status !== "excluded"
    );
    const counts = countByProfile(candidateReviews);
    const profile = [...PUZZLE_BOARD_RECOGNITION_PROFILES].sort((left, right) => {
      const countDelta = (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0);
      return (
        countDelta ||
        sha256(`${reviewerId}:${candidate.id}:${left.id}`).localeCompare(
          sha256(`${reviewerId}:${candidate.id}:${right.id}`)
        )
      );
    })[0]!;
    const rendered = await renderer(candidate.visual, profile.id);
    return {
      specimen: {
        fixtureId: fixtureId(candidate.id, profile.id),
        imageDataUrl: `data:image/png;base64,${Buffer.from(rendered.pixels).toString("base64")}`,
        width: rendered.width,
        height: rendered.height,
      },
      progress: progress(available, completed),
    };
  }

  return {
    async submitCandidate(input: {
      puzzleId: string;
      answer: string;
      visual: PuzzlePlaytestCandidate["visual"];
      techniqueId?: string;
      difficultyScore: number;
      difficultyLevel?: string;
      generationMethod?: string;
      automatedEstimatedSolveRate?: number;
      now?: Date;
    }): Promise<PuzzlePlaytestCandidate> {
      const puzzleId = input.puzzleId.trim().slice(0, 100);
      const answer = input.answer.trim().slice(0, 120);
      if (!puzzleId || !answer) throw new Error("Puzzle playtest candidate identity is required");
      const visual = PuzzleVisualSchema.parse(input.visual);
      const existing = await repository.findCandidateByPuzzleId({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        puzzleId,
      });
      if (existing) return existing;
      const now = input.now ?? new Date();
      const candidate: PuzzlePlaytestCandidate = {
        id: `puzzle-playtest:${sha256(`${puzzleId}:${answer}:${JSON.stringify(visual)}`).slice(0, 32)}`,
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        evidenceRole: "generated",
        puzzleId,
        answer,
        answerKey: normalizeString(answer).replaceAll(" ", ""),
        visual,
        techniqueId: input.techniqueId?.trim().slice(0, 80),
        difficultyScore: Math.max(1, Math.min(10, Math.round(input.difficultyScore))),
        difficultyLevel: input.difficultyLevel?.trim().slice(0, 24),
        generationMethod: input.generationMethod?.trim().slice(0, 80),
        automatedEstimatedSolveRate:
          typeof input.automatedEstimatedSolveRate === "number"
            ? Math.max(0, Math.min(1, input.automatedEstimatedSolveRate))
            : undefined,
        status: "open",
        statusVersion: 0,
        createdAt: now,
        updatedAt: now,
      };
      const inserted = await repository.insertCandidate(candidate);
      if (inserted) return candidate;
      const raced = await repository.findCandidateByPuzzleId({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        puzzleId,
      });
      if (!raced) throw new Error("Failed to persist puzzle playtest candidate");
      return raced;
    },

    async getNext(reviewerIdInput: string): Promise<{
      specimen: BlindPuzzlePlaytestSpecimen | null;
      progress: PuzzlePlaytestProgress;
    }> {
      return getNextAssignment(reviewerIdInput);
    },

    async submitReview(input: {
      reviewerId: string;
      fixtureId: string;
      guess?: string;
      gaveUp?: boolean;
      failureReason?: PuzzlePlaytestFailureReason;
      confidence?: number;
      elapsedMs?: number;
      now?: Date;
    }): Promise<PuzzlePlaytestProgress> {
      const reviewerId = input.reviewerId.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const { candidates: allCandidates } = await loadEvidence();
      const candidates = allCandidates.filter((candidate) => candidate.status === "open");
      const match = candidates
        .map((candidate) => ({
          candidate,
          profileId: profileForFixture(candidate.id, input.fixtureId),
        }))
        .find((row) => row.profileId);
      if (!match?.profileId) throw new Error("Unknown, stale, or completed playtest specimen");
      const rawGuess = (input.guess ?? "").trim().slice(0, 160);
      const gaveUp = input.gaveUp === true || !rawGuess;
      const failureReason = PUZZLE_PLAYTEST_FAILURE_REASONS.includes(
        input.failureReason as PuzzlePlaytestFailureReason
      )
        ? input.failureReason
        : undefined;
      if (gaveUp && !failureReason) throw new Error("Choose why this puzzle was not playable");
      const confidence = Math.max(1, Math.min(5, Math.round(input.confidence ?? 3))) as
        | 1
        | 2
        | 3
        | 4
        | 5;
      const elapsedMs = Math.max(1_000, Math.min(3_600_000, Math.round(input.elapsedMs ?? 1_000)));
      const inserted = await repository.insertReview({
        id: randomUUID(),
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        candidateId: match.candidate.id,
        fixtureId: input.fixtureId,
        profileId: match.profileId,
        reviewerId,
        rawGuess,
        normalizedGuess: normalizeString(rawGuess),
        correct: !gaveUp && fuzzyMatch(rawGuess, match.candidate.answer, 82),
        gaveUp,
        failureReason,
        confidence,
        elapsedMs,
        createdAt: input.now ?? new Date(),
      });
      if (!inserted) throw new PuzzlePlaytestConflictError();
      if (match.candidate.evidenceRole === "control") {
        await refreshCandidateCompletions();
      } else {
        await evaluateCandidate(match.candidate);
      }
      return (await getNextAssignment(reviewerId)).progress;
    },

    async getReport(
      reviewerIdInput: string,
      now = new Date(),
      options?: { readOnly?: boolean }
    ): Promise<PuzzlePlaytestReport> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      if (!options?.readOnly) await refreshCandidateCompletions();
      const { candidates, reviews } = await loadEvidence({
        ensureControls: !options?.readOnly,
      });
      const reviewerReviews = reviews.filter((review) => review.reviewerId === reviewerId);
      const controlCandidates = candidates.filter(
        (candidate) => candidate.evidenceRole === "control"
      );
      const generatedCandidates = candidates.filter(
        (candidate) => candidate.evidenceRole === "generated"
      );
      const controlIds = new Set(controlCandidates.map((candidate) => candidate.id));
      const qualifications = reviewerQualificationMap(reviews, controlIds);
      const qualifiedReviewerIds = new Set(
        [...qualifications].flatMap(([id, qualification]) =>
          qualification.status === "qualified" ? [id] : []
        )
      );
      const generatedReviews = reviews.filter((review) => !controlIds.has(review.candidateId));
      const qualifiedGeneratedReviews = generatedReviews.filter((review) =>
        qualifiedReviewerIds.has(review.reviewerId)
      );
      const completeIds = new Set(
        generatedCandidates.flatMap((candidate) =>
          candidate.status === "complete" ? [candidate.id] : []
        )
      );
      const completedReviews = qualifiedGeneratedReviews.filter((review) =>
        completeIds.has(review.candidateId)
      );
      const profileScores = PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => {
        const rows = completedReviews.filter((review) => review.profileId === profile.id);
        return {
          profileId: profile.id,
          decisions: rows.length,
          correct: rows.filter((review) => review.correct).length,
          solveRate: ratio(rows.filter((review) => review.correct).length, rows.length),
          ambiguityRate: ratio(
            rows.filter((review) => review.failureReason === "multiple-answers").length,
            rows.length
          ),
          visualFailureRate: ratio(rows.filter(isVisualFailure).length, rows.length),
          medianSolveMs: median(rows.map((review) => review.elapsedMs)),
        };
      });
      const solveRates = profileScores
        .map((profile) => profile.solveRate)
        .filter((value): value is number => value !== null);
      const responsiveSolveGap = solveRates.length
        ? Math.max(...solveRates) - Math.min(...solveRates)
        : null;
      const completeCandidates = generatedCandidates.filter((candidate) =>
        completeIds.has(candidate.id)
      );
      const evaluatedQualifications = [...qualifications.values()].filter(
        (qualification) => qualification.status !== "pending"
      );
      const excludedReviewers = evaluatedQualifications.filter(
        (qualification) => qualification.status === "excluded"
      ).length;
      const reviewerQuality: PuzzlePlaytestReviewerQuality = {
        reviewers: qualifications.size,
        evaluatedReviewers: evaluatedQualifications.length,
        qualifiedReviewers: qualifiedReviewerIds.size,
        excludedReviewers,
        pendingReviewers: [...qualifications.values()].filter(
          (qualification) => qualification.status === "pending"
        ).length,
        qualificationRate: ratio(qualifiedReviewerIds.size, evaluatedQualifications.length),
        controlDecisions: reviews.filter((review) => controlIds.has(review.candidateId)).length,
        qualifiedGeneratedDecisions: qualifiedGeneratedReviews.length,
        unscoredGeneratedDecisions: generatedReviews.length - qualifiedGeneratedReviews.length,
      };
      const reviewerDecisionCounts = new Map<string, number>();
      for (const review of completedReviews) {
        reviewerDecisionCounts.set(
          review.reviewerId,
          (reviewerDecisionCounts.get(review.reviewerId) ?? 0) + 1
        );
      }
      const maximumDecisionsByOneReviewer = Math.max(0, ...reviewerDecisionCounts.values());
      const reviewerCoverage: PuzzlePlaytestReviewerCoverage = {
        reviewers: reviewerDecisionCounts.size,
        maximumDecisionsByOneReviewer,
        maximumDecisionShare: ratio(maximumDecisionsByOneReviewer, completedReviews.length),
      };

      function stratumScore(
        id: string,
        rows: PuzzlePlaytestCandidate[]
      ): PuzzlePlaytestStratumScore {
        const rowIds = new Set(rows.map((candidate) => candidate.id));
        const decisions = completedReviews.filter((review) => rowIds.has(review.candidateId));
        const correct = decisions.filter((review) => review.correct).length;
        return {
          id,
          candidates: rows.length,
          share: ratio(rows.length, completeCandidates.length),
          decisions: decisions.length,
          correct,
          solveRate: ratio(correct, decisions.length),
        };
      }

      const difficultyTierScores = (["hard", "difficult", "evil", "impossible"] as const).map(
        (tier: DifficultyTier) =>
          stratumScore(
            tier,
            completeCandidates.filter(
              (candidate) => getDifficultyLevelForScore(candidate.difficultyScore).tier === tier
            )
          )
      );
      const techniqueScores = [
        ...new Set(
          completeCandidates
            .map((candidate) => candidate.techniqueId)
            .filter((techniqueId): techniqueId is string => isKnownTechniqueId(techniqueId))
        ),
      ]
        .sort()
        .map((techniqueId) =>
          stratumScore(
            techniqueId,
            completeCandidates.filter((candidate) => candidate.techniqueId === techniqueId)
          )
        )
        .sort(
          (left, right) => right.candidates - left.candidates || left.id.localeCompare(right.id)
        );
      const candidatePasses = completeCandidates.filter((candidate) => {
        const rows = completedReviews.filter((review) => review.candidateId === candidate.id);
        const solveEvidence = humanSolveFloorEvidence(
          rows.filter((review) => review.correct).length,
          rows.length,
          candidate.difficultyScore
        );
        const ambiguous = rows.filter(
          (review) => review.failureReason === "multiple-answers"
        ).length;
        return solveEvidence.passes && ambiguous <= 1;
      }).length;
      const candidateFloorPassRate = ratio(candidatePasses, completeCandidates.length);
      const calibrationRows = completeCandidates.flatMap((candidate) => {
        if (candidate.automatedEstimatedSolveRate === undefined) return [];
        const rows = completedReviews.filter((review) => review.candidateId === candidate.id);
        const observed = ratio(rows.filter((review) => review.correct).length, rows.length);
        return observed === null
          ? []
          : [
              {
                error: candidate.automatedEstimatedSolveRate - observed,
              },
            ];
      });
      const solveCalibrationCoverage = ratio(calibrationRows.length, completeCandidates.length);
      const solveCalibrationMeanAbsoluteError = ratio(
        calibrationRows.reduce((sum, row) => sum + Math.abs(row.error), 0),
        calibrationRows.length
      );
      const solveCalibrationBias = ratio(
        calibrationRows.reduce((sum, row) => sum + row.error, 0),
        calibrationRows.length
      );
      const ambiguityEvents = completedReviews.filter(
        (review) => review.failureReason === "multiple-answers"
      ).length;
      const visualFailureEvents = completedReviews.filter(isVisualFailure).length;
      const highConfidenceWrongEvents = completedReviews.filter(
        (review) => !review.correct && review.confidence >= 4
      ).length;
      const ambiguityRate = ratio(ambiguityEvents, completedReviews.length);
      const visualFailureRate = ratio(visualFailureEvents, completedReviews.length);
      const highConfidenceWrongRate = ratio(highConfidenceWrongEvents, completedReviews.length);
      const statisticalEvidence: PuzzlePlaytestStatisticalEvidence = {
        method: "one-sided-wilson-score",
        confidenceLevel: 0.95,
        reviewerExclusion: wilsonScoreInterval(
          reviewerQuality.excludedReviewers,
          reviewerQuality.evaluatedReviewers,
          ONE_SIDED_95_Z
        ),
        candidateFloorPass: wilsonScoreInterval(
          candidatePasses,
          completeCandidates.length,
          ONE_SIDED_95_Z
        ),
        ambiguity: wilsonScoreInterval(ambiguityEvents, completedReviews.length, ONE_SIDED_95_Z),
        visualFailure: wilsonScoreInterval(
          visualFailureEvents,
          completedReviews.length,
          ONE_SIDED_95_Z
        ),
        highConfidenceWrong: wilsonScoreInterval(
          highConfidenceWrongEvents,
          completedReviews.length,
          ONE_SIDED_95_Z
        ),
        solveCalibrationCoverage: wilsonScoreInterval(
          calibrationRows.length,
          completeCandidates.length,
          ONE_SIDED_95_Z
        ),
      };
      const clusteredEvidence = estimatePuzzlePlaytestClusterEvidence({
        reviews: completedReviews,
        candidates: completeCandidates,
      });
      const conservativeUpperBound = (
        analyticUpper: number,
        clusteredUpper: number | undefined
      ): number | null =>
        typeof clusteredUpper === "number" ? Math.max(analyticUpper, clusteredUpper) : null;
      const conservativeEvidence: PuzzlePlaytestConservativeEvidence = {
        method: "wilson-envelope-with-pigeonhole-bootstrap",
        confidenceLevel: 0.95,
        candidateFloorPassLowerBound:
          typeof clusteredEvidence.metrics.candidateFloorPassRate?.lower === "number"
            ? Math.min(
                statisticalEvidence.candidateFloorPass.lower,
                clusteredEvidence.metrics.candidateFloorPassRate.lower
              )
            : null,
        ambiguityUpperBound: conservativeUpperBound(
          statisticalEvidence.ambiguity.upper,
          clusteredEvidence.metrics.ambiguityRate?.upper
        ),
        visualFailureUpperBound: conservativeUpperBound(
          statisticalEvidence.visualFailure.upper,
          clusteredEvidence.metrics.visualFailureRate?.upper
        ),
        highConfidenceWrongUpperBound: conservativeUpperBound(
          statisticalEvidence.highConfidenceWrong.upper,
          clusteredEvidence.metrics.highConfidenceWrongRate?.upper
        ),
        responsiveSolveGapUpperBound: responsiveSolveGapUpperBound(clusteredEvidence),
        solveCalibrationMeanAbsoluteErrorUpperBound:
          clusteredEvidence.metrics.solveCalibrationMeanAbsoluteError === undefined
            ? null
            : Math.max(
                clusteredEvidence.metrics.solveCalibrationMeanAbsoluteError.observed,
                clusteredEvidence.metrics.solveCalibrationMeanAbsoluteError.upper
              ),
        solveCalibrationAbsoluteBiasUpperBound: absoluteBootstrapBound(
          clusteredEvidence.metrics.solveCalibrationBias
        ),
      };
      const releaseFailures = reportFailures({
        completedCandidates: completeCandidates.length,
        minimumCandidates: PUZZLE_PLAYTEST_RELEASE_SAMPLE,
        reviewerCount: reviewerCoverage.reviewers,
        minimumReviewers: PUZZLE_PLAYTEST_RELEASE_MIN_REVIEWERS,
        maximumReviewerDecisionShare: reviewerCoverage.maximumDecisionShare,
        maximumAllowedReviewerDecisionShare: PUZZLE_PLAYTEST_RELEASE_MAX_REVIEWER_SHARE,
        reviewerExclusionEvidence: statisticalEvidence.reviewerExclusion,
        maximumReviewerExclusionRate: 0.2,
        difficultyTierScores,
        minimumCandidatesPerDifficultyTier: PUZZLE_PLAYTEST_RELEASE_MIN_PER_DIFFICULTY_TIER,
        techniqueScores,
        classifiedTechniqueCandidates: techniqueScores.reduce(
          (sum, score) => sum + score.candidates,
          0
        ),
        minimumTechniques: PUZZLE_PLAYTEST_RELEASE_MIN_TECHNIQUES,
        maximumTechniqueShare: PUZZLE_PLAYTEST_RELEASE_MAX_TECHNIQUE_SHARE,
        candidateFloorPassEvidence: statisticalEvidence.candidateFloorPass,
        candidateFloorPassLowerBound: conservativeEvidence.candidateFloorPassLowerBound,
        minimumFloorPassRate: 0.9,
        ambiguityUpperBound: conservativeEvidence.ambiguityUpperBound,
        maximumAmbiguityRate: 0.12,
        visualFailureUpperBound: conservativeEvidence.visualFailureUpperBound,
        maximumVisualFailureRate: 0.05,
        highConfidenceWrongUpperBound: conservativeEvidence.highConfidenceWrongUpperBound,
        maximumHighConfidenceWrongRate: 0.08,
        responsiveSolveGapUpperBound: conservativeEvidence.responsiveSolveGapUpperBound,
        maximumResponsiveSolveGap: 0.12,
        solveCalibrationCoverageEvidence: statisticalEvidence.solveCalibrationCoverage,
        minimumSolveCalibrationCoverage: 0.8,
        solveCalibrationMeanAbsoluteErrorUpperBound:
          conservativeEvidence.solveCalibrationMeanAbsoluteErrorUpperBound,
        maximumSolveCalibrationMeanAbsoluteError: 0.15,
        solveCalibrationAbsoluteBiasUpperBound:
          conservativeEvidence.solveCalibrationAbsoluteBiasUpperBound,
        maximumAbsoluteSolveCalibrationBias: 0.1,
      });
      const marketLeadingFailures = reportFailures({
        completedCandidates: completeCandidates.length,
        minimumCandidates: PUZZLE_PLAYTEST_MARKET_SAMPLE,
        reviewerCount: reviewerCoverage.reviewers,
        minimumReviewers: PUZZLE_PLAYTEST_MARKET_MIN_REVIEWERS,
        maximumReviewerDecisionShare: reviewerCoverage.maximumDecisionShare,
        maximumAllowedReviewerDecisionShare: PUZZLE_PLAYTEST_MARKET_MAX_REVIEWER_SHARE,
        reviewerExclusionEvidence: statisticalEvidence.reviewerExclusion,
        maximumReviewerExclusionRate: 0.1,
        difficultyTierScores,
        minimumCandidatesPerDifficultyTier: PUZZLE_PLAYTEST_MARKET_MIN_PER_DIFFICULTY_TIER,
        techniqueScores,
        classifiedTechniqueCandidates: techniqueScores.reduce(
          (sum, score) => sum + score.candidates,
          0
        ),
        minimumTechniques: PUZZLE_PLAYTEST_MARKET_MIN_TECHNIQUES,
        maximumTechniqueShare: PUZZLE_PLAYTEST_MARKET_MAX_TECHNIQUE_SHARE,
        candidateFloorPassEvidence: statisticalEvidence.candidateFloorPass,
        candidateFloorPassLowerBound: conservativeEvidence.candidateFloorPassLowerBound,
        minimumFloorPassRate: 0.97,
        ambiguityUpperBound: conservativeEvidence.ambiguityUpperBound,
        maximumAmbiguityRate: 0.05,
        visualFailureUpperBound: conservativeEvidence.visualFailureUpperBound,
        maximumVisualFailureRate: 0.02,
        highConfidenceWrongUpperBound: conservativeEvidence.highConfidenceWrongUpperBound,
        maximumHighConfidenceWrongRate: 0.03,
        responsiveSolveGapUpperBound: conservativeEvidence.responsiveSolveGapUpperBound,
        maximumResponsiveSolveGap: 0.05,
        solveCalibrationCoverageEvidence: statisticalEvidence.solveCalibrationCoverage,
        minimumSolveCalibrationCoverage: 0.95,
        solveCalibrationMeanAbsoluteErrorUpperBound:
          conservativeEvidence.solveCalibrationMeanAbsoluteErrorUpperBound,
        maximumSolveCalibrationMeanAbsoluteError: 0.1,
        solveCalibrationAbsoluteBiasUpperBound:
          conservativeEvidence.solveCalibrationAbsoluteBiasUpperBound,
        maximumAbsoluteSolveCalibrationBias: 0.05,
      });
      const failureReasons = Object.fromEntries(
        PUZZLE_PLAYTEST_FAILURE_REASONS.map((reason) => [
          reason,
          completedReviews.filter((review) => review.failureReason === reason).length,
        ])
      ) as Record<PuzzlePlaytestFailureReason, number>;
      const visibleIds = new Set(reviewerReviews.map((review) => review.candidateId));
      const visibleCandidates = generatedCandidates.flatMap(
        (candidate): PuzzlePlaytestCandidateReport[] => {
          if (!visibleIds.has(candidate.id)) return [];
          const rows = qualifiedGeneratedReviews.filter(
            (review) => review.candidateId === candidate.id
          );
          const correct = rows.filter((review) => review.correct).length;
          const solveEvidence = humanSolveFloorEvidence(
            correct,
            rows.length,
            candidate.difficultyScore
          );
          return [
            {
              candidateId: candidate.id,
              puzzleId: candidate.puzzleId,
              answer: candidate.answer,
              status: candidate.status,
              difficultyScore: candidate.difficultyScore,
              techniqueId: candidate.techniqueId,
              decisions: rows.length,
              correct,
              solveRate: ratio(correct, rows.length),
              solveRateLowerBound: solveEvidence.lower,
              expectedSolveFloor: expectedHumanSolveFloor(candidate.difficultyScore),
              ambiguityRate: ratio(
                rows.filter((review) => review.failureReason === "multiple-answers").length,
                rows.length
              ),
            },
          ];
        }
      );
      return {
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        readinessVersion: PUZZLE_PLAYTEST_READINESS_VERSION,
        requiredReviewersPerProfile: PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE,
        candidateCount: generatedCandidates.length,
        openCandidates: generatedCandidates.filter((candidate) => candidate.status === "open")
          .length,
        completedCandidates: completeCandidates.length,
        reviewerCount: reviewerCoverage.reviewers,
        reviewerCoverage,
        reviewerQuality,
        statisticalEvidence,
        clusteredEvidence,
        conservativeEvidence,
        controlCandidateCount: controlCandidates.length,
        decisionCount: generatedReviews.length,
        completedDecisionCount: completedReviews.length,
        overallSolveRate: ratio(
          completedReviews.filter((review) => review.correct).length,
          completedReviews.length
        ),
        ambiguityRate,
        visualFailureRate,
        highConfidenceWrongRate,
        responsiveSolveGap,
        candidateFloorPassRate,
        solveCalibrationCoverage,
        solveCalibrationMeanAbsoluteError,
        solveCalibrationBias,
        profileScores,
        difficultyTierScores,
        techniqueScores,
        failureReasons,
        visibleCandidates,
        releaseReady: releaseFailures.length === 0,
        marketLeadingReady: marketLeadingFailures.length === 0,
        releaseFailures,
        marketLeadingFailures,
        generatedAt: now.toISOString(),
      };
    },
  };
}
