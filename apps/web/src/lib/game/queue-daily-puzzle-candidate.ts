import { randomUUID } from "node:crypto";
import {
  CANONICAL_BOARD_FAILED,
  compileCanonicalBoard,
  hasTrustedCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-board";
import type { CanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-contract";
import type { DailyPuzzleCandidate } from "@/db/models";
import { logger } from "@/lib/logger";
import type { DailyPuzzleCandidateRepository } from "./daily-puzzle-candidate-repository";

type CandidateVisual = NonNullable<DailyPuzzleCandidate["payload"]["visual"]>;

/** Compiles the checked board shown to playtesters and players. Throws when it cannot. */
export type DailyCandidateBoardCompiler = (visual: CandidateVisual) => Promise<CanonicalBoard>;

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
  | "recordCanonicalBoard"
>;

const REJECTION_DETAIL_MAX = 300;

/** True for a row whose board should be (re)compiled from its stored visual before playtest. */
async function needsCanonicalBoard(candidate: DailyPuzzleCandidate): Promise<boolean> {
  const visual = candidate.payload.visual;
  if (!visual || candidate.playtestSubmittedAt) return false;
  if (candidate.status === "rejected") return candidate.rejectionReason === CANONICAL_BOARD_FAILED;
  return candidate.status === "reviewing" && !(await hasTrustedCanonicalBoard(visual));
}

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
  now: () => Date = () => new Date(),
  compileBoard: DailyCandidateBoardCompiler = compileCanonicalBoard
) {
  // Compile before insert so playtesters and players see the same pixels. A board that
  // cannot compile is recorded as rejected; the date then falls back to the reserve path.
  async function tryCompile(
    visual: CandidateVisual,
    context: { generationKey: string; candidateId: string }
  ): Promise<{ board: CanonicalBoard } | { detail: string }> {
    try {
      return { board: await compileBoard(visual) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Daily candidate canonical board failed to compile", {
        ...context,
        reason: CANONICAL_BOARD_FAILED,
        error: message,
      });
      return { detail: message.trim().slice(0, REJECTION_DETAIL_MAX) };
    }
  }

  // Recompile from the row's stored visual (never regenerate), so a transient compile
  // failure does not hold the date's generation key forever.
  async function recompileStoredBoard(
    candidate: DailyPuzzleCandidate,
    visual: CandidateVisual
  ): Promise<DailyPuzzleCandidate> {
    const result = await tryCompile(visual, {
      generationKey: candidate.generationKey,
      candidateId: candidate.id,
    });
    const recorded = await repository.recordCanonicalBoard({
      id: candidate.id,
      expectedStatusVersion: candidate.statusVersion,
      updatedAt: now(),
      ...("board" in result ? { canonicalBoard: result.board } : { failureDetail: result.detail }),
    });
    // A lost compare-and-set means another writer moved the row; return its current state.
    return recorded ?? (await repository.findById(candidate.id)) ?? candidate;
  }

  async function insertWithCanonicalBoard(
    generationKey: string,
    payload: DailyPuzzleCandidate["payload"],
    visual: CandidateVisual
  ): Promise<DailyPuzzleCandidate> {
    const id = randomUUID();
    const result = await tryCompile(visual, { generationKey, candidateId: id });
    const createdAt = now();
    const base = {
      id,
      generationKey,
      policyVersion: "human-reviewed-daily-v1" as const,
      statusVersion: 0,
      createdAt,
      updatedAt: createdAt,
    };
    return repository.insert(
      "board" in result
        ? {
            ...base,
            status: "reviewing",
            payload: { ...payload, visual: { ...visual, canonicalBoard: result.board } },
          }
        : {
            ...base,
            status: "rejected",
            rejectionReason: CANONICAL_BOARD_FAILED,
            rejectionDetail: result.detail,
            payload,
          }
    );
  }

  return {
    async enqueue(input: {
      generationKey: string;
      payload: DailyPuzzleCandidate["payload"];
    }): Promise<DailyPuzzleCandidate> {
      if (!isDateKey(input.generationKey)) {
        throw new Error("Daily candidate generation key must be a UTC date");
      }
      const visual = input.payload.visual;
      if (input.payload.puzzleType !== "rebus" || !visual) {
        throw new Error("Daily candidate requires a validated visual board");
      }

      const existing = await repository.findByGenerationKey(input.generationKey);
      const candidate = !existing
        ? await insertWithCanonicalBoard(input.generationKey, input.payload, visual)
        : existing.payload.visual && (await needsCanonicalBoard(existing))
          ? await recompileStoredBoard(existing, existing.payload.visual)
          : existing;

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
