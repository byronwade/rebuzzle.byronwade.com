import { createHash, randomUUID } from "node:crypto";
import { fuzzyMatch, normalizeString } from "@rebuzzle/game-logic/fuzzy-match";
import type {
  PuzzlePlaytestCandidate,
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

export const PUZZLE_PLAYTEST_CONTRACT_VERSION = "puzzle-playtest-v2";
export const PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE = 5;
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

export type PuzzlePlaytestReport = {
  contractVersion: typeof PUZZLE_PLAYTEST_CONTRACT_VERSION;
  requiredReviewersPerProfile: number;
  candidateCount: number;
  openCandidates: number;
  completedCandidates: number;
  reviewerCount: number;
  reviewerCoverage: PuzzlePlaytestReviewerCoverage;
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

export function expectedHumanSolveFloor(difficultyScore: number): number {
  if (difficultyScore <= 5) return 0.65;
  if (difficultyScore <= 6) return 0.5;
  if (difficultyScore <= 7) return 0.35;
  return 0.2;
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

function reportFailures(input: {
  completedCandidates: number;
  minimumCandidates: number;
  reviewerCount: number;
  minimumReviewers: number;
  maximumReviewerDecisionShare: number | null;
  maximumAllowedReviewerDecisionShare: number;
  difficultyTierScores: PuzzlePlaytestStratumScore[];
  minimumCandidatesPerDifficultyTier: number;
  techniqueScores: PuzzlePlaytestStratumScore[];
  classifiedTechniqueCandidates: number;
  minimumTechniques: number;
  maximumTechniqueShare: number;
  candidateFloorPassRate: number | null;
  minimumFloorPassRate: number;
  ambiguityRate: number | null;
  maximumAmbiguityRate: number;
  visualFailureRate: number | null;
  maximumVisualFailureRate: number;
  highConfidenceWrongRate: number | null;
  maximumHighConfidenceWrongRate: number;
  responsiveSolveGap: number | null;
  maximumResponsiveSolveGap: number;
  solveCalibrationCoverage: number | null;
  minimumSolveCalibrationCoverage: number;
  solveCalibrationMeanAbsoluteError: number | null;
  maximumSolveCalibrationMeanAbsoluteError: number;
  solveCalibrationBias: number | null;
  maximumAbsoluteSolveCalibrationBias: number;
}): string[] {
  const failures: string[] = [];
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
  const undercoveredDifficultyTiers = input.difficultyTierScores
    .filter((score) => score.candidates < input.minimumCandidatesPerDifficultyTier)
    .map((score) => `${score.id} ${score.candidates}/${input.minimumCandidatesPerDifficultyTier}`);
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
    input.candidateFloorPassRate === null ||
    input.candidateFloorPassRate < input.minimumFloorPassRate
  ) {
    failures.push(`Difficulty-adjusted candidate floor below ${input.minimumFloorPassRate}`);
  }
  if (input.ambiguityRate === null || input.ambiguityRate > input.maximumAmbiguityRate) {
    failures.push(`Multiple-answer rate above ${input.maximumAmbiguityRate}`);
  }
  if (
    input.visualFailureRate === null ||
    input.visualFailureRate > input.maximumVisualFailureRate
  ) {
    failures.push(`Visual playability failure rate above ${input.maximumVisualFailureRate}`);
  }
  if (
    input.highConfidenceWrongRate === null ||
    input.highConfidenceWrongRate > input.maximumHighConfidenceWrongRate
  ) {
    failures.push(
      `High-confidence wrong-answer rate above ${input.maximumHighConfidenceWrongRate}`
    );
  }
  if (
    input.responsiveSolveGap === null ||
    input.responsiveSolveGap > input.maximumResponsiveSolveGap
  ) {
    failures.push(`Responsive solve-rate gap above ${input.maximumResponsiveSolveGap}`);
  }
  if (
    input.solveCalibrationCoverage === null ||
    input.solveCalibrationCoverage < input.minimumSolveCalibrationCoverage
  ) {
    failures.push(
      `Automated solve-rate calibration coverage below ${input.minimumSolveCalibrationCoverage}`
    );
  }
  if (
    input.solveCalibrationMeanAbsoluteError === null ||
    input.solveCalibrationMeanAbsoluteError > input.maximumSolveCalibrationMeanAbsoluteError
  ) {
    failures.push(
      `Automated solve-rate mean absolute error above ${input.maximumSolveCalibrationMeanAbsoluteError}`
    );
  }
  if (
    input.solveCalibrationBias === null ||
    Math.abs(input.solveCalibrationBias) > input.maximumAbsoluteSolveCalibrationBias
  ) {
    failures.push(
      `Automated solve-rate absolute bias above ${input.maximumAbsoluteSolveCalibrationBias}`
    );
  }
  return failures;
}

export function createPuzzlePlaytestService(
  repository: PuzzlePlaytestRepository,
  renderer: PuzzlePlaytestRenderer = async (visual, profileId) =>
    renderPuzzleVisualProfile(PuzzleVisualSchema.parse(visual), profileId)
) {
  async function evaluateCandidate(candidate: PuzzlePlaytestCandidate) {
    const reviews = uniqueReviews(
      await repository.listReviews({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        candidateIds: [candidate.id],
      })
    );
    const counts = countByProfile(reviews);
    const complete = PUZZLE_BOARD_RECOGNITION_PROFILES.every(
      (profile) => (counts.get(profile.id) ?? 0) >= PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE
    );
    if (!complete || candidate.status === "complete") return candidate;
    return (
      (await repository.completeCandidate({
        id: candidate.id,
        expectedStatusVersion: candidate.statusVersion,
        updatedAt: new Date(),
      })) ?? candidate
    );
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
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const [candidates, reviewerReviews] = await Promise.all([
        repository.listCandidates({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          statuses: ["open"],
          limit: 200,
        }),
        repository.listReviews({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          reviewerId,
        }),
      ]);
      const reviewed = new Set(reviewerReviews.map((review) => review.candidateId));
      const available = candidates.length;
      const completed = candidates.filter((candidate) => reviewed.has(candidate.id)).length;
      const pending = candidates
        .filter((candidate) => !reviewed.has(candidate.id))
        .sort((left, right) =>
          sha256(`${reviewerId}:${left.id}`).localeCompare(sha256(`${reviewerId}:${right.id}`))
        );
      const candidate = pending[0];
      if (!candidate) {
        return { specimen: null, progress: progress(available, completed) };
      }
      const candidateReviews = uniqueReviews(
        await repository.listReviews({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          candidateIds: [candidate.id],
        })
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
      const candidates = await repository.listCandidates({
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        statuses: ["open"],
        limit: 200,
      });
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
      await evaluateCandidate(match.candidate);
      return (await this.getNext(reviewerId)).progress;
    },

    async getReport(reviewerIdInput: string, now = new Date()): Promise<PuzzlePlaytestReport> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const [candidates, rawReviews, rawReviewerReviews] = await Promise.all([
        repository.listCandidates({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          limit: 1000,
        }),
        repository.listReviews({ contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION }),
        repository.listReviews({ contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION, reviewerId }),
      ]);
      const reviews = uniqueReviews(rawReviews);
      const reviewerReviews = uniqueReviews(rawReviewerReviews);
      const completeIds = new Set(
        candidates
          .filter((candidate) => candidate.status === "complete")
          .map((candidate) => candidate.id)
      );
      const completedReviews = reviews.filter((review) => completeIds.has(review.candidateId));
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
      const completeCandidates = candidates.filter((candidate) => completeIds.has(candidate.id));
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
        const solveRate = ratio(rows.filter((review) => review.correct).length, rows.length) ?? 0;
        const ambiguous = rows.filter(
          (review) => review.failureReason === "multiple-answers"
        ).length;
        return solveRate >= expectedHumanSolveFloor(candidate.difficultyScore) && ambiguous <= 1;
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
      const ambiguityRate = ratio(
        completedReviews.filter((review) => review.failureReason === "multiple-answers").length,
        completedReviews.length
      );
      const visualFailureRate = ratio(
        completedReviews.filter(isVisualFailure).length,
        completedReviews.length
      );
      const highConfidenceWrongRate = ratio(
        completedReviews.filter((review) => !review.correct && review.confidence >= 4).length,
        completedReviews.length
      );
      const releaseFailures = reportFailures({
        completedCandidates: completeCandidates.length,
        minimumCandidates: PUZZLE_PLAYTEST_RELEASE_SAMPLE,
        reviewerCount: reviewerCoverage.reviewers,
        minimumReviewers: PUZZLE_PLAYTEST_RELEASE_MIN_REVIEWERS,
        maximumReviewerDecisionShare: reviewerCoverage.maximumDecisionShare,
        maximumAllowedReviewerDecisionShare: PUZZLE_PLAYTEST_RELEASE_MAX_REVIEWER_SHARE,
        difficultyTierScores,
        minimumCandidatesPerDifficultyTier: PUZZLE_PLAYTEST_RELEASE_MIN_PER_DIFFICULTY_TIER,
        techniqueScores,
        classifiedTechniqueCandidates: techniqueScores.reduce(
          (sum, score) => sum + score.candidates,
          0
        ),
        minimumTechniques: PUZZLE_PLAYTEST_RELEASE_MIN_TECHNIQUES,
        maximumTechniqueShare: PUZZLE_PLAYTEST_RELEASE_MAX_TECHNIQUE_SHARE,
        candidateFloorPassRate,
        minimumFloorPassRate: 0.9,
        ambiguityRate,
        maximumAmbiguityRate: 0.12,
        visualFailureRate,
        maximumVisualFailureRate: 0.05,
        highConfidenceWrongRate,
        maximumHighConfidenceWrongRate: 0.08,
        responsiveSolveGap,
        maximumResponsiveSolveGap: 0.12,
        solveCalibrationCoverage,
        minimumSolveCalibrationCoverage: 0.8,
        solveCalibrationMeanAbsoluteError,
        maximumSolveCalibrationMeanAbsoluteError: 0.15,
        solveCalibrationBias,
        maximumAbsoluteSolveCalibrationBias: 0.1,
      });
      const marketLeadingFailures = reportFailures({
        completedCandidates: completeCandidates.length,
        minimumCandidates: PUZZLE_PLAYTEST_MARKET_SAMPLE,
        reviewerCount: reviewerCoverage.reviewers,
        minimumReviewers: PUZZLE_PLAYTEST_MARKET_MIN_REVIEWERS,
        maximumReviewerDecisionShare: reviewerCoverage.maximumDecisionShare,
        maximumAllowedReviewerDecisionShare: PUZZLE_PLAYTEST_MARKET_MAX_REVIEWER_SHARE,
        difficultyTierScores,
        minimumCandidatesPerDifficultyTier: PUZZLE_PLAYTEST_MARKET_MIN_PER_DIFFICULTY_TIER,
        techniqueScores,
        classifiedTechniqueCandidates: techniqueScores.reduce(
          (sum, score) => sum + score.candidates,
          0
        ),
        minimumTechniques: PUZZLE_PLAYTEST_MARKET_MIN_TECHNIQUES,
        maximumTechniqueShare: PUZZLE_PLAYTEST_MARKET_MAX_TECHNIQUE_SHARE,
        candidateFloorPassRate,
        minimumFloorPassRate: 0.97,
        ambiguityRate,
        maximumAmbiguityRate: 0.05,
        visualFailureRate,
        maximumVisualFailureRate: 0.02,
        highConfidenceWrongRate,
        maximumHighConfidenceWrongRate: 0.03,
        responsiveSolveGap,
        maximumResponsiveSolveGap: 0.05,
        solveCalibrationCoverage,
        minimumSolveCalibrationCoverage: 0.95,
        solveCalibrationMeanAbsoluteError,
        maximumSolveCalibrationMeanAbsoluteError: 0.1,
        solveCalibrationBias,
        maximumAbsoluteSolveCalibrationBias: 0.05,
      });
      const failureReasons = Object.fromEntries(
        PUZZLE_PLAYTEST_FAILURE_REASONS.map((reason) => [
          reason,
          completedReviews.filter((review) => review.failureReason === reason).length,
        ])
      ) as Record<PuzzlePlaytestFailureReason, number>;
      const visibleIds = new Set(reviewerReviews.map((review) => review.candidateId));
      const visibleCandidates = candidates
        .filter((candidate) => visibleIds.has(candidate.id))
        .map((candidate): PuzzlePlaytestCandidateReport => {
          const rows = reviews.filter((review) => review.candidateId === candidate.id);
          const correct = rows.filter((review) => review.correct).length;
          return {
            candidateId: candidate.id,
            puzzleId: candidate.puzzleId,
            answer: candidate.answer,
            status: candidate.status,
            difficultyScore: candidate.difficultyScore,
            techniqueId: candidate.techniqueId,
            decisions: rows.length,
            correct,
            solveRate: ratio(correct, rows.length),
            expectedSolveFloor: expectedHumanSolveFloor(candidate.difficultyScore),
            ambiguityRate: ratio(
              rows.filter((review) => review.failureReason === "multiple-answers").length,
              rows.length
            ),
          };
        });
      return {
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        requiredReviewersPerProfile: PUZZLE_PLAYTEST_REQUIRED_REVIEWERS_PER_PROFILE,
        candidateCount: candidates.length,
        openCandidates: candidates.filter((candidate) => candidate.status === "open").length,
        completedCandidates: completeCandidates.length,
        reviewerCount: reviewerCoverage.reviewers,
        reviewerCoverage,
        decisionCount: reviews.length,
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
