import {
  PUZZLE_PLAYTEST_CONTRACT_VERSION,
  type PuzzlePlaytestCandidateAdmission,
} from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import {
  type PublicationAssetCheck,
  verifyPublicationAssets,
} from "@/ai/puzzle-agent/visual/publication-assets";
import type { DailyPuzzleCandidate, DailyPuzzleCandidateHumanEvidence } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "./daily-puzzle-candidate-repository";
import type { PersistDailyPuzzleInput } from "./persist-daily-puzzle";

const DAILY_CANDIDATE_REVIEW_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;

export type DailyCandidatePublisherReviewService = {
  getCandidateAdmission(puzzleId: string, now?: Date): Promise<PuzzlePlaytestCandidateAdmission>;
};

type PersistDailyPuzzleResult = { id: string; alreadyExisted: boolean };
type PersistCandidate = (input: PersistDailyPuzzleInput) => Promise<PersistDailyPuzzleResult>;
type VerifyAssets = (
  visual: NonNullable<DailyPuzzleCandidate["payload"]["visual"]>
) => Promise<PublicationAssetCheck>;

function evidenceForCandidate(
  admission: PuzzlePlaytestCandidateAdmission,
  admittedAt: Date
): DailyPuzzleCandidateHumanEvidence | null {
  const solveEvidence = admission.solveEvidence;
  if (!solveEvidence || admission.contractVersion !== PUZZLE_PLAYTEST_CONTRACT_VERSION) return null;
  return {
    contractVersion: admission.contractVersion,
    qualifiedDecisions: admission.qualifiedDecisions,
    profileCoverage: admission.profileCoverage,
    correct: solveEvidence.events,
    solveRate: solveEvidence.rate,
    solveRateLowerBound: solveEvidence.lower,
    expectedSolveFloor: solveEvidence.expectedFloor,
    ambiguityReports: admission.ambiguityReports,
    visualFailureReports: admission.visualFailureReports,
    admittedAt: admittedAt.toISOString(),
  };
}

function hasRequiredCoverage(admission: PuzzlePlaytestCandidateAdmission): boolean {
  return (
    admission.profileCoverage.length > 0 &&
    admission.profileCoverage.every(
      (profile) => profile.decisions >= admission.requiredReviewersPerProfile
    ) &&
    admission.qualifiedDecisions >=
      admission.profileCoverage.length * admission.requiredReviewersPerProfile
  );
}

const SUPERSEDED = Symbol("daily-date-already-published");

function isDuplicateAnswer(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Refusing to persist duplicate answer") ||
    error.message.includes("Concurrent publication used this answer")
  );
}

export function createReviewedDailyPuzzlePublisher(input: {
  repository: DailyPuzzleCandidateRepository;
  reviewService: DailyCandidatePublisherReviewService;
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  const verifyAssets = input.verifyAssets ?? verifyPublicationAssets;

  async function publishAssignedCandidate(candidate: DailyPuzzleCandidate, dateString: string) {
    if (!candidate.humanEvidence) {
      throw new Error("Assigned daily candidate is missing its human admission evidence");
    }
    const evidence = candidate.humanEvidence;
    const payload = candidate.payload;
    // Candidates can wait weeks in review; artwork approved at generation may since have
    // been quarantined. Recheck now (fail closed) and keep the candidate for a later retry.
    if (payload.visual) {
      const assets = await verifyAssets(payload.visual);
      if (!assets.ok) {
        await input.repository.releaseAssignment({
          id: candidate.id,
          dateString,
          updatedAt: now(),
        });
        return null;
      }
    }
    let persisted: PersistDailyPuzzleResult;
    try {
      persisted = await input.persist({
        ...payload,
        dateString,
        humanPlaytestAdmission: {
          policyVersion: candidate.policyVersion,
          candidateId: candidate.id,
          contractVersion: evidence.contractVersion,
          qualifiedDecisions: evidence.qualifiedDecisions,
          profileCoverage: evidence.profileCoverage,
          correct: evidence.correct,
          solveRate: evidence.solveRate,
          solveRateLowerBound: evidence.solveRateLowerBound,
          expectedSolveFloor: evidence.expectedSolveFloor,
          ambiguityReports: evidence.ambiguityReports,
          visualFailureReports: evidence.visualFailureReports,
          admittedAt: evidence.admittedAt,
        },
      });
    } catch (error) {
      if (!isDuplicateAnswer(error)) throw error;
      await input.repository.skip({
        id: candidate.id,
        reason: error instanceof Error ? error.message : "Duplicate answer",
        updatedAt: now(),
      });
      return null;
    }

    if (persisted.alreadyExisted) {
      // Another publication (e.g. a concurrent reserve) won this date. Its row, not this
      // candidate's board, is what guesses validate against, so keep the candidate for
      // a later date and let the caller serve the persisted puzzle.
      await input.repository.releaseAssignment({
        id: candidate.id,
        dateString,
        updatedAt: now(),
      });
      return SUPERSEDED;
    }

    await input.repository.markPublished({
      id: candidate.id,
      dateString,
      puzzleId: persisted.id,
      updatedAt: now(),
    });

    return {
      ...payload,
      id: persisted.id,
      puzzle: payload.puzzleDisplay,
      date: dateString,
      topic: payload.category,
      relevanceScore: 8,
      fromDatabase: true,
      aiGenerated: true,
      humanReviewed: true,
    };
  }

  async function publishReadyCandidate(dateString: string) {
    const readyCandidates = await input.repository.list({
      statuses: ["ready"],
      limit: 100,
    });
    for (const candidate of readyCandidates) {
      const claimed = await input.repository.claimReadyForDate({
        id: candidate.id,
        dateString,
      });
      if (!claimed || claimed.status !== "assigned" || claimed.assignedDate !== dateString) {
        continue;
      }
      const published = await publishAssignedCandidate(claimed, dateString);
      if (published) return published;
    }
    return null;
  }

  return {
    async publishForDate(dateString: string) {
      const existingAssignment = await input.repository.findAssignmentForDate(dateString);
      if (existingAssignment?.status === "assigned") {
        const resumed = await publishAssignedCandidate(existingAssignment, dateString);
        if (resumed === SUPERSEDED) return null;
        if (resumed) return resumed;
      } else if (existingAssignment?.status === "published") {
        throw new Error("Published daily candidate has no matching public puzzle row");
      }

      const previouslyAdmitted = await publishReadyCandidate(dateString);
      if (previouslyAdmitted === SUPERSEDED) return null;
      if (previouslyAdmitted) return previouslyAdmitted;

      const reviewingCandidates = await input.repository.list({
        statuses: ["reviewing"],
        limit: 100,
      });
      for (const candidate of reviewingCandidates) {
        if (now().getTime() - candidate.createdAt.getTime() > DAILY_CANDIDATE_REVIEW_EXPIRY_MS) {
          await input.repository.skip({
            id: candidate.id,
            reason: "Candidate expired after 60 days without completing blind review",
            updatedAt: now(),
          });
          continue;
        }
        if (!candidate.playtestSubmittedAt) continue;
        const admission = await input.reviewService.getCandidateAdmission(candidate.id, now());
        const evidence = evidenceForCandidate(admission, now());
        const eligible = Boolean(
          admission.eligible &&
            admission.candidateStatus === "complete" &&
            hasRequiredCoverage(admission) &&
            admission.solveEvidence?.passes &&
            admission.ambiguityReports <= 1 &&
            admission.visualFailureReports === 0 &&
            evidence
        );

        if (eligible && evidence) {
          await input.repository.markReady({
            id: candidate.id,
            expectedStatusVersion: candidate.statusVersion,
            updatedAt: now(),
            humanEvidence: evidence,
          });
        } else if (admission.candidateStatus === "complete") {
          await input.repository.skip({
            id: candidate.id,
            reason: admission.reasons.join("; ") || "Candidate failed daily admission",
            updatedAt: now(),
          });
        }
      }

      const admitted = await publishReadyCandidate(dateString);
      return admitted === SUPERSEDED ? null : admitted;
    },
  };
}

export async function publishReviewedDailyPuzzle(input: {
  dateString: string;
  repository: DailyPuzzleCandidateRepository;
  reviewService: DailyCandidatePublisherReviewService;
  persist: PersistCandidate;
  verifyAssets?: VerifyAssets;
  now?: () => Date;
}) {
  return createReviewedDailyPuzzlePublisher(input).publishForDate(input.dateString);
}
