import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { compileCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-board";
import type { DailyPuzzleCandidate } from "@/db/models";
import type { DailyPuzzleCandidateRepository } from "./daily-puzzle-candidate-repository";

export type DailyPuzzleCandidatePlaytestSubmitter = {
  submitCandidate(input: {
    puzzleId: string;
    answer: string;
    visual: NonNullable<DailyPuzzleCandidate["payload"]["visual"]>;
    techniqueId?: string;
    difficultyScore: number;
    difficultyLevel?: string;
    generationMethod?: string;
    automatedEstimatedSolveRate?: number;
  }): Promise<unknown>;
};

type QueueRepository = Pick<
  DailyPuzzleCandidateRepository,
  | "insert"
  | "findById"
  | "findByGenerationKey"
  | "list"
  | "replacePayloadForReview"
  | "markPlaytestSubmitted"
  | "markPlaytestSubmissionFailed"
>;

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

async function prepareCandidateForReview(
  candidate: DailyPuzzleCandidate,
  repository: QueueRepository,
  now: () => Date
): Promise<DailyPuzzleCandidate | null> {
  if (candidate.status !== "reviewing" || candidate.playtestSubmittedAt) return candidate;
  const visual = candidate.payload.visual;
  if (!visual) throw new Error("Daily candidate requires a validated visual board");

  const canonicalBoard = await compileCanonicalBoard(visual);
  if (isDeepStrictEqual(visual.canonicalBoard, canonicalBoard)) return candidate;

  return repository.replacePayloadForReview({
    id: candidate.id,
    expectedStatusVersion: candidate.statusVersion,
    payload: {
      ...candidate.payload,
      visual: { ...visual, canonicalBoard },
    },
    updatedAt: now(),
  });
}

async function submitForPlaytest(
  candidate: DailyPuzzleCandidate,
  repository: QueueRepository,
  playtest: DailyPuzzleCandidatePlaytestSubmitter,
  now: () => Date
): Promise<DailyPuzzleCandidate> {
  const visual = candidate.payload.visual;
  if (!visual) throw new Error("Daily candidate requires a validated visual board");
  const metadata = candidate.payload.metadataExtra;
  try {
    await playtest.submitCandidate({
      puzzleId: candidate.id,
      answer: candidate.payload.answer,
      visual,
      difficultyScore: candidate.payload.difficulty,
      techniqueId: metadataString(metadata, "techniqueId"),
      difficultyLevel: metadataString(metadata, "difficultyLevel"),
      generationMethod: metadataString(metadata, "generationMethod"),
      automatedEstimatedSolveRate:
        typeof metadata?.estimatedSolveRate === "number" ? metadata.estimatedSolveRate : undefined,
    });
  } catch (error) {
    try {
      await repository.markPlaytestSubmissionFailed({
        id: candidate.id,
        message: error instanceof Error ? error.message : String(error),
        updatedAt: now(),
      });
    } catch {
      // The absence of playtestSubmittedAt keeps the row retryable if status recording also fails.
    }
    throw error;
  }

  const submittedAt = now();
  return (
    (await repository.markPlaytestSubmitted({
      id: candidate.id,
      submittedAt,
    })) ??
    (await repository.findById(candidate.id)) ?? {
      ...candidate,
      playtestSubmittedAt: submittedAt,
      updatedAt: submittedAt,
    }
  );
}

export function createDailyPuzzleCandidateQueue(
  repository: QueueRepository,
  playtest: DailyPuzzleCandidatePlaytestSubmitter,
  now: () => Date = () => new Date()
) {
  return {
    async enqueue(input: {
      generationKey: string;
      payload: DailyPuzzleCandidate["payload"];
    }): Promise<DailyPuzzleCandidate> {
      if (!isDateKey(input.generationKey)) {
        throw new Error("Daily candidate generation key must be a UTC date");
      }
      if (input.payload.puzzleType !== "rebus" || !input.payload.visual) {
        throw new Error("Daily candidate requires a validated visual board");
      }

      let candidate = await repository.findByGenerationKey(input.generationKey);
      let preparedForReview = false;
      if (!candidate) {
        const id = randomUUID();
        const canonicalBoard = await compileCanonicalBoard(input.payload.visual);
        const prepared = await repository.insert({
          id,
          generationKey: input.generationKey,
          policyVersion: "human-reviewed-daily-v1",
          status: "reviewing",
          statusVersion: 0,
          payload: {
            ...input.payload,
            visual: { ...input.payload.visual, canonicalBoard },
          },
          createdAt: now(),
          updatedAt: now(),
        });
        candidate = prepared;
        preparedForReview = prepared.id === id;
      }

      if (candidate.status !== "reviewing" || candidate.playtestSubmittedAt) return candidate;
      const reviewCandidate = preparedForReview
        ? candidate
        : await prepareCandidateForReview(candidate, repository, now);
      if (!reviewCandidate) return (await repository.findById(candidate.id)) ?? candidate;
      if (reviewCandidate.status !== "reviewing" || reviewCandidate.playtestSubmittedAt) {
        return reviewCandidate;
      }
      return submitForPlaytest(reviewCandidate, repository, playtest, now);
    },

    async retryPending(
      limit = 20
    ): Promise<{ attempted: number; submitted: number; failed: number }> {
      const pending = await repository.list({
        statuses: ["reviewing"],
        withoutPlaytestSubmission: true,
        limit,
      });
      let submitted = 0;
      let failed = 0;
      for (const candidate of pending) {
        try {
          const reviewCandidate = await prepareCandidateForReview(candidate, repository, now);
          if (reviewCandidate?.status !== "reviewing" || reviewCandidate.playtestSubmittedAt) {
            continue;
          }
          await submitForPlaytest(reviewCandidate, repository, playtest, now);
          submitted++;
        } catch {
          failed++;
        }
      }
      return { attempted: pending.length, submitted, failed };
    },
  };
}
