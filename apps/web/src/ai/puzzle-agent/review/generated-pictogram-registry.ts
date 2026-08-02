import { createHash, randomUUID } from "node:crypto";
import type {
  GeneratedPictogramAuditEvent,
  GeneratedPictogramCandidate,
  GeneratedPictogramReview,
  GeneratedPictogramStatus,
} from "@/db/models";
import { scorePictogramClarity } from "../visual/pictogram-clarity";
import { evaluatePictogramPixelIntegrity } from "../visual/pictogram-pixel-integrity";
import { sanitizePictogramSvg } from "../visual/sanitize-svg";
import { INK_PICTOGRAM_STYLE_ID } from "../visual/style";
import { normalizeIconNamingGuess, resolveIconNamingGuess } from "./icon-recognition-service";

export const GENERATED_PICTOGRAM_REGISTRY_VERSION = "generated-pictogram-registry-v1";
export const GENERATED_PICTOGRAM_REQUIRED_REVIEWERS_PER_SIZE = 3;
export const GENERATED_PICTOGRAM_MAX_PENDING_PER_CONCEPT = 1;
export const GENERATED_PICTOGRAM_REVIEW_SIZES = [36, 72] as const;

export type GeneratedPictogramReviewSize = (typeof GENERATED_PICTOGRAM_REVIEW_SIZES)[number];

export type BlindGeneratedPictogramSpecimen = {
  fixtureId: string;
  sizePx: GeneratedPictogramReviewSize;
  svg: string;
};

export type GeneratedPictogramPanelProgress = {
  completed: number;
  available: number;
  remaining: number;
  complete: boolean;
};

export type GeneratedPictogramCandidateReport = {
  id: string;
  conceptLabel: string;
  status: GeneratedPictogramStatus;
  size36: { decisions: number; correct: number };
  size72: { decisions: number; correct: number };
  automatedConfidence?: number;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedPictogramRegistryReport = {
  registryVersion: typeof GENERATED_PICTOGRAM_REGISTRY_VERSION;
  candidatesVisibleToReviewer: number;
  pending: number;
  approved: number;
  rejected: number;
  quarantined: number;
  candidates: GeneratedPictogramCandidateReport[];
  generatedAt: string;
};

export type GeneratedPictogramRepository = {
  findCandidateByAssetSha256(assetSha256: string): Promise<GeneratedPictogramCandidate | null>;
  findCandidateById(id: string): Promise<GeneratedPictogramCandidate | null>;
  findApproved(input: {
    registryVersion: string;
    styleId: string;
    conceptKey: string;
  }): Promise<GeneratedPictogramCandidate | null>;
  countPendingForConcept(input: {
    registryVersion: string;
    styleId: string;
    conceptKey: string;
  }): Promise<number>;
  insertCandidate(candidate: GeneratedPictogramCandidate): Promise<boolean>;
  listCandidates(input: {
    registryVersion: string;
    statuses?: GeneratedPictogramStatus[];
    limit?: number;
  }): Promise<GeneratedPictogramCandidate[]>;
  listReviewerReviews(input: {
    registryVersion: string;
    reviewerId: string;
  }): Promise<GeneratedPictogramReview[]>;
  listCandidateReviews(input: {
    registryVersion: string;
    candidateId: string;
  }): Promise<GeneratedPictogramReview[]>;
  insertReview(review: GeneratedPictogramReview): Promise<boolean>;
  transitionCandidate(input: {
    id: string;
    expectedStatusVersion: number;
    fromStatuses: GeneratedPictogramStatus[];
    status: GeneratedPictogramStatus;
    humanEvidence?: GeneratedPictogramCandidate["humanEvidence"];
    event: GeneratedPictogramAuditEvent;
    updatedAt: Date;
  }): Promise<GeneratedPictogramCandidate | null>;
};

export class GeneratedPictogramReviewConflictError extends Error {
  constructor() {
    super("This generated-asset specimen has already been answered by this reviewer");
    this.name = "GeneratedPictogramReviewConflictError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeGeneratedPictogramConcept(value: string): string {
  return normalizeIconNamingGuess(value).slice(0, 48);
}

function phraseVariants(value: string): Set<string> {
  const normalized = normalizeIconNamingGuess(value);
  const variants = new Set([normalized]);
  const words = normalized.split(" ");
  const last = words.at(-1);
  if (last && last.length > 3) {
    if (last.endsWith("ies")) {
      variants.add([...words.slice(0, -1), `${last.slice(0, -3)}y`].join(" "));
    } else if (last.endsWith("s") && !last.endsWith("ss")) {
      variants.add([...words.slice(0, -1), last.slice(0, -1)].join(" "));
    } else {
      variants.add([...words.slice(0, -1), `${last}s`].join(" "));
    }
  }
  return variants;
}

export function matchesGeneratedPictogramConcept(guess: string, concept: string): boolean {
  const guesses = phraseVariants(guess);
  const concepts = phraseVariants(concept);
  return [...guesses].some((variant) => concepts.has(variant));
}

function fixtureId(candidateId: string, sizePx: GeneratedPictogramReviewSize): string {
  return sha256(`${GENERATED_PICTOGRAM_REGISTRY_VERSION}:${candidateId}:${sizePx}`).slice(0, 32);
}

function fixturesFor(candidate: GeneratedPictogramCandidate) {
  return GENERATED_PICTOGRAM_REVIEW_SIZES.map((sizePx) => ({
    fixtureId: fixtureId(candidate.id, sizePx),
    candidateId: candidate.id,
    sizePx,
    svg: candidate.svg,
  }));
}

function orderedFixtures(
  reviewerId: string,
  fixtures: Array<ReturnType<typeof fixturesFor>[number]>
) {
  return [...fixtures].sort((left, right) =>
    sha256(`${reviewerId}:${left.fixtureId}`).localeCompare(
      sha256(`${reviewerId}:${right.fixtureId}`)
    )
  );
}

function progress(available: number, completed: number): GeneratedPictogramPanelProgress {
  const safeCompleted = Math.max(0, Math.min(available, completed));
  return {
    completed: safeCompleted,
    available,
    remaining: available - safeCompleted,
    complete: safeCompleted === available,
  };
}

function uniqueReviews(reviews: GeneratedPictogramReview[]): GeneratedPictogramReview[] {
  const seen = new Set<string>();
  return reviews.filter((review) => {
    const key = `${review.candidateId}:${review.sizePx}:${review.reviewerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sizeEvidence(reviews: GeneratedPictogramReview[], sizePx: GeneratedPictogramReviewSize) {
  const decisions = reviews.filter((review) => review.sizePx === sizePx);
  return {
    decisions: decisions.length,
    correct: decisions.filter((review) => review.correct).length,
  };
}

function event(input: {
  action: GeneratedPictogramAuditEvent["action"];
  actor: GeneratedPictogramAuditEvent["actor"];
  reason: string;
  now: Date;
}): GeneratedPictogramAuditEvent {
  return { id: randomUUID(), ...input, createdAt: input.now };
}

export function createGeneratedPictogramRegistry(repository: GeneratedPictogramRepository) {
  async function evaluateCandidate(candidate: GeneratedPictogramCandidate) {
    const reviews = uniqueReviews(
      await repository.listCandidateReviews({
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        candidateId: candidate.id,
      })
    );
    const size36 = sizeEvidence(reviews, 36);
    const size72 = sizeEvidence(reviews, 72);
    const humanEvidence = {
      requiredReviewersPerSize: GENERATED_PICTOGRAM_REQUIRED_REVIEWERS_PER_SIZE,
      size36,
      size72,
    };
    const failed = [size36, size72].some(
      (size) =>
        size.decisions >= GENERATED_PICTOGRAM_REQUIRED_REVIEWERS_PER_SIZE &&
        size.correct < size.decisions
    );
    const approved =
      [size36, size72].every(
        (size) =>
          size.decisions >= GENERATED_PICTOGRAM_REQUIRED_REVIEWERS_PER_SIZE &&
          size.correct === size.decisions
      ) && !failed;
    if (!failed && !approved) return candidate;
    const now = new Date();
    return (
      (await repository.transitionCandidate({
        id: candidate.id,
        expectedStatusVersion: candidate.statusVersion,
        fromStatuses: ["pending"],
        status: approved ? "approved" : "rejected",
        humanEvidence,
        event: event({
          action: approved ? "approved" : "rejected",
          actor: "human-panel",
          reason: approved
            ? "Three independent exact-name decisions passed at both 36px and 72px"
            : "A player-size specimen failed unanimous blind naming",
          now,
        }),
        updatedAt: now,
      })) ?? candidate
    );
  }

  return {
    async submitCandidate(input: {
      concept: string;
      svg: string;
      clarityScore: number;
      seenAs?: string;
      recognitionConfidence?: number;
      recognitionProfiles?: Array<{ tileSize: number; seenAs: string; confidence: number }>;
      now?: Date;
    }): Promise<GeneratedPictogramCandidate | null> {
      const conceptLabel = input.concept.trim().slice(0, 48);
      const conceptKey = normalizeGeneratedPictogramConcept(conceptLabel);
      if (!conceptKey) throw new Error("Generated pictogram concept is required");
      const svg = sanitizePictogramSvg(input.svg);
      if (!svg) throw new Error("Generated pictogram candidate SVG is invalid");
      const clarity = scorePictogramClarity(svg);
      if (!clarity.ok) throw new Error("Generated pictogram candidate failed structural clarity");
      const pixelIntegrity = await evaluatePictogramPixelIntegrity(svg);
      if (!pixelIntegrity.ok) {
        throw new Error(
          `Generated pictogram candidate failed player-pixel integrity: ${pixelIntegrity.reasons.join(", ")}`
        );
      }
      const profileSizes = new Set((input.recognitionProfiles ?? []).map((row) => row.tileSize));
      if (!profileSizes.has(36) || !profileSizes.has(72)) {
        throw new Error(
          "Generated pictogram candidate lacks both player-size recognition profiles"
        );
      }
      const assetSha256 = sha256(svg);
      const existing = await repository.findCandidateByAssetSha256(assetSha256);
      if (existing) return existing;
      const pending = await repository.countPendingForConcept({
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        styleId: INK_PICTOGRAM_STYLE_ID,
        conceptKey,
      });
      if (pending >= GENERATED_PICTOGRAM_MAX_PENDING_PER_CONCEPT) return null;
      const now = input.now ?? new Date();
      const candidate: GeneratedPictogramCandidate = {
        id: `generated-pictogram:${assetSha256.slice(0, 32)}`,
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        styleId: INK_PICTOGRAM_STYLE_ID,
        conceptKey,
        conceptLabel,
        assetSha256,
        svg,
        status: "pending",
        statusVersion: 0,
        automatedEvidence: {
          clarityScore: Math.max(input.clarityScore, clarity.score),
          seenAs: input.seenAs,
          recognitionConfidence: input.recognitionConfidence,
          recognitionProfiles: input.recognitionProfiles ?? [],
        },
        auditHistory: [
          event({
            action: "submitted",
            actor: "generator",
            reason:
              "Passed current structural, player-pixel, and two-size automated recognition gates",
            now,
          }),
        ],
        createdAt: now,
        updatedAt: now,
      };
      const inserted = await repository.insertCandidate(candidate);
      return inserted ? candidate : await repository.findCandidateByAssetSha256(assetSha256);
    },

    async findApproved(concept: string): Promise<GeneratedPictogramCandidate | null> {
      const conceptKey = normalizeGeneratedPictogramConcept(concept);
      if (!conceptKey) return null;
      const candidate = await repository.findApproved({
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        styleId: INK_PICTOGRAM_STYLE_ID,
        conceptKey,
      });
      if (!candidate) return null;
      const pixelIntegrity = await evaluatePictogramPixelIntegrity(candidate.svg);
      const valid =
        candidate.status === "approved" &&
        candidate.assetSha256 === sha256(candidate.svg) &&
        sanitizePictogramSvg(candidate.svg) === candidate.svg &&
        scorePictogramClarity(candidate.svg).ok &&
        pixelIntegrity.ok;
      if (valid) return candidate;
      await this.quarantine(candidate.id, "Approved registry asset failed integrity validation");
      return null;
    },

    async quarantine(id: string, reason: string): Promise<void> {
      const candidate = await repository.findCandidateById(id);
      if (!candidate || candidate.status !== "approved") return;
      const now = new Date();
      await repository.transitionCandidate({
        id,
        expectedStatusVersion: candidate.statusVersion,
        fromStatuses: ["approved"],
        status: "quarantined",
        humanEvidence: candidate.humanEvidence,
        event: event({
          action: "quarantined",
          actor: "runtime-gate",
          reason: reason.trim().slice(0, 300) || "Runtime recognition regression",
          now,
        }),
        updatedAt: now,
      });
    },

    async getNext(reviewerIdInput: string): Promise<{
      specimen: BlindGeneratedPictogramSpecimen | null;
      progress: GeneratedPictogramPanelProgress;
    }> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const [candidates, reviews] = await Promise.all([
        repository.listCandidates({
          registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
          statuses: ["pending"],
          limit: 200,
        }),
        repository.listReviewerReviews({
          registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
          reviewerId,
        }),
      ]);
      const fixtures = candidates.flatMap(fixturesFor);
      const completed = new Set(reviews.map((review) => review.fixtureId));
      const next = orderedFixtures(reviewerId, fixtures).find(
        (fixture) => !completed.has(fixture.fixtureId)
      );
      return {
        specimen: next ? { fixtureId: next.fixtureId, sizePx: next.sizePx, svg: next.svg } : null,
        progress: progress(
          fixtures.length,
          fixtures.filter((row) => completed.has(row.fixtureId)).length
        ),
      };
    },

    async submitReview(input: {
      reviewerId: string;
      fixtureId: string;
      guess?: string;
      uncertain?: boolean;
      now?: Date;
    }): Promise<GeneratedPictogramPanelProgress> {
      const reviewerId = input.reviewerId.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const candidates = await repository.listCandidates({
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        statuses: ["pending"],
        limit: 200,
      });
      const fixture = candidates
        .flatMap(fixturesFor)
        .find((row) => row.fixtureId === input.fixtureId);
      if (!fixture) throw new Error("Unknown, stale, or already decided generated-asset specimen");
      const candidate = candidates.find((row) => row.id === fixture.candidateId)!;
      const rawGuess = (input.guess ?? "").trim().slice(0, 100);
      const uncertain = input.uncertain === true || !rawGuess;
      const normalizedGuess = normalizeIconNamingGuess(rawGuess);
      const inserted = await repository.insertReview({
        id: randomUUID(),
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        candidateId: candidate.id,
        fixtureId: fixture.fixtureId,
        sizePx: fixture.sizePx,
        reviewerId,
        rawGuess,
        normalizedGuess,
        matchedConcept: uncertain
          ? undefined
          : (resolveIconNamingGuess(rawGuess) ?? (normalizedGuess || undefined)),
        correct: !uncertain && matchesGeneratedPictogramConcept(rawGuess, candidate.conceptLabel),
        uncertain,
        createdAt: input.now ?? new Date(),
      });
      if (!inserted) throw new GeneratedPictogramReviewConflictError();
      await evaluateCandidate(candidate);
      const next = await this.getNext(reviewerId);
      return next.progress;
    },

    async getReport(
      reviewerIdInput: string,
      now = new Date()
    ): Promise<GeneratedPictogramRegistryReport> {
      const reviewerId = reviewerIdInput.trim().slice(0, 100);
      if (!reviewerId) throw new Error("Reviewer is required");
      const [candidates, reviewerReviews] = await Promise.all([
        repository.listCandidates({
          registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
          limit: 500,
        }),
        repository.listReviewerReviews({
          registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
          reviewerId,
        }),
      ]);
      const completedCandidateIds = new Set(
        candidates
          .filter((candidate) => {
            const sizes = new Set(
              reviewerReviews
                .filter((review) => review.candidateId === candidate.id)
                .map((review) => review.sizePx)
            );
            return sizes.has(36) && sizes.has(72);
          })
          .map((candidate) => candidate.id)
      );
      const visible = candidates.filter((candidate) => completedCandidateIds.has(candidate.id));
      const reports = await Promise.all(
        visible.map(async (candidate): Promise<GeneratedPictogramCandidateReport> => {
          const reviews = uniqueReviews(
            await repository.listCandidateReviews({
              registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
              candidateId: candidate.id,
            })
          );
          return {
            id: candidate.id,
            conceptLabel: candidate.conceptLabel,
            status: candidate.status,
            size36: sizeEvidence(reviews, 36),
            size72: sizeEvidence(reviews, 72),
            automatedConfidence: candidate.automatedEvidence.recognitionConfidence,
            createdAt: candidate.createdAt.toISOString(),
            updatedAt: candidate.updatedAt.toISOString(),
          };
        })
      );
      return {
        registryVersion: GENERATED_PICTOGRAM_REGISTRY_VERSION,
        candidatesVisibleToReviewer: reports.length,
        pending: reports.filter((row) => row.status === "pending").length,
        approved: reports.filter((row) => row.status === "approved").length,
        rejected: reports.filter((row) => row.status === "rejected").length,
        quarantined: reports.filter((row) => row.status === "quarantined").length,
        candidates: reports.sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
        ),
        generatedAt: now.toISOString(),
      };
    },
  };
}
