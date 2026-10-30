import { randomUUID } from "node:crypto";
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

      const candidate =
        (await repository.findByGenerationKey(input.generationKey)) ??
        (await repository.insert({
          id: randomUUID(),
          generationKey: input.generationKey,
          policyVersion: "human-reviewed-daily-v1",
          status: "reviewing",
          statusVersion: 0,
          payload: input.payload,
          createdAt: now(),
          updatedAt: now(),
        }));

      if (candidate.status !== "reviewing" || candidate.playtestSubmittedAt) return candidate;
      return submitForPlaytest(candidate, repository, playtest, now);
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
          await submitForPlaytest(candidate, repository, playtest, now);
          submitted++;
        } catch {
          failed++;
        }
      }
      return { attempted: pending.length, submitted, failed };
    },
  };
}
