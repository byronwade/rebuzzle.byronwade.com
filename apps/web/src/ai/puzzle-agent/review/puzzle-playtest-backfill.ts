import type { Puzzle } from "@/db/models";
import { PuzzleVisualSchema } from "../visual/composition";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { PUZZLE_PLAYTEST_CONTRACT_VERSION } from "./puzzle-playtest-service";

export const PUZZLE_PLAYTEST_BACKFILL_MAX_LIMIT = 200;
export const PUZZLE_PLAYTEST_BACKFILL_DEFAULT_LIMIT = 100;

export type PuzzlePlaytestBackfillExclusion =
  | "not-ai-generated"
  | "not-rebus"
  | "reserve-or-lab"
  | "missing-composed-visual"
  | "missing-responsive-blind-evidence"
  | "missing-editorial-evidence"
  | "missing-structural-novelty"
  | "missing-solve-estimate"
  | "missing-identity";

export type PuzzlePlaytestBackfillSource = {
  listRecentPuzzles(scanLimit: number): Promise<Puzzle[]>;
  listQueuedPuzzleIds(input: { contractVersion: string; puzzleIds: string[] }): Promise<string[]>;
};

export type PuzzlePlaytestCandidateSubmitter = (input: {
  puzzleId: string;
  answer: string;
  visual: NonNullable<Puzzle["visual"]>;
  techniqueId?: string;
  difficultyScore: number;
  difficultyLevel?: string;
  generationMethod?: string;
  automatedEstimatedSolveRate?: number;
}) => Promise<unknown>;

export type PuzzlePlaytestBackfillReport = {
  contractVersion: typeof PUZZLE_PLAYTEST_CONTRACT_VERSION;
  dryRun: boolean;
  requestedLimit: number;
  scanned: number;
  eligible: number;
  alreadyQueued: number;
  eligibleUnqueued: number;
  queued: number;
  excluded: number;
  exclusionReasons: Record<PuzzlePlaytestBackfillExclusion, number>;
  truncated: boolean;
  generatedAt: string;
};

const EXCLUSIONS: readonly PuzzlePlaytestBackfillExclusion[] = [
  "not-ai-generated",
  "not-rebus",
  "reserve-or-lab",
  "missing-composed-visual",
  "missing-responsive-blind-evidence",
  "missing-editorial-evidence",
  "missing-structural-novelty",
  "missing-solve-estimate",
  "missing-identity",
] as const;

function difficultyScore(puzzle: Puzzle): number {
  const metadataScore = puzzle.metadata?.difficultyScore;
  if (typeof metadataScore === "number") return metadataScore;
  if (typeof puzzle.difficulty === "number") return puzzle.difficulty;
  if (puzzle.difficulty === "easy") return 4;
  if (puzzle.difficulty === "medium") return 6;
  return 7;
}

export function inspectPuzzleForPlaytestBackfill(puzzle: Puzzle): {
  eligible: boolean;
  reason?: PuzzlePlaytestBackfillExclusion;
} {
  if (!puzzle.id?.trim() || !puzzle.answer?.trim()) {
    return { eligible: false, reason: "missing-identity" };
  }
  if (puzzle.metadata?.aiGenerated !== true) {
    return { eligible: false, reason: "not-ai-generated" };
  }
  if (puzzle.puzzleType !== "rebus") {
    return { eligible: false, reason: "not-rebus" };
  }
  if (puzzle.metadata?.reserveEvidence || puzzle.metadata?.lab === true) {
    return { eligible: false, reason: "reserve-or-lab" };
  }
  const visual = PuzzleVisualSchema.safeParse(puzzle.visual);
  if (!visual.success || visual.data.mode !== "composed") {
    return { eligible: false, reason: "missing-composed-visual" };
  }
  const playability = puzzle.metadata?.playabilityEvidence;
  if (
    !playability ||
    playability.blind.profileCount < PUZZLE_BOARD_RECOGNITION_PROFILES.length ||
    playability.blind.profiles.length < PUZZLE_BOARD_RECOGNITION_PROFILES.length
  ) {
    return { eligible: false, reason: "missing-responsive-blind-evidence" };
  }
  if (playability.editorial.acceptedProfiles < PUZZLE_BOARD_RECOGNITION_PROFILES.length) {
    return { eligible: false, reason: "missing-editorial-evidence" };
  }
  if (puzzle.metadata?.noveltyEvidence?.version !== "structural-v1") {
    return { eligible: false, reason: "missing-structural-novelty" };
  }
  if (typeof puzzle.metadata?.estimatedSolveRate !== "number") {
    return { eligible: false, reason: "missing-solve-estimate" };
  }
  return { eligible: true };
}

export function createPuzzlePlaytestBackfillService(
  source: PuzzlePlaytestBackfillSource,
  submitCandidate: PuzzlePlaytestCandidateSubmitter
) {
  return {
    async run(input?: {
      dryRun?: boolean;
      limit?: number;
      now?: Date;
    }): Promise<PuzzlePlaytestBackfillReport> {
      const dryRun = input?.dryRun !== false;
      const requestedLimit = Math.max(
        1,
        Math.min(
          PUZZLE_PLAYTEST_BACKFILL_MAX_LIMIT,
          Math.round(input?.limit ?? PUZZLE_PLAYTEST_BACKFILL_DEFAULT_LIMIT)
        )
      );
      const scanLimit = Math.min(1000, requestedLimit * 5);
      const rows = await source.listRecentPuzzles(scanLimit);
      const exclusionReasons = Object.fromEntries(
        EXCLUSIONS.map((reason) => [reason, 0])
      ) as Record<PuzzlePlaytestBackfillExclusion, number>;
      const eligible: Puzzle[] = [];
      for (const puzzle of rows) {
        const inspection = inspectPuzzleForPlaytestBackfill(puzzle);
        if (inspection.eligible) eligible.push(puzzle);
        else if (inspection.reason) exclusionReasons[inspection.reason] += 1;
      }
      const queuedIds = new Set(
        await source.listQueuedPuzzleIds({
          contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
          puzzleIds: eligible.map((puzzle) => puzzle.id),
        })
      );
      const unqueued = eligible.filter((puzzle) => !queuedIds.has(puzzle.id));
      const selected = unqueued.slice(0, requestedLimit);
      let queued = 0;
      if (!dryRun) {
        for (const puzzle of selected) {
          await submitCandidate({
            puzzleId: puzzle.id,
            answer: puzzle.answer,
            visual: puzzle.visual!,
            techniqueId: puzzle.metadata?.techniqueId,
            difficultyScore: difficultyScore(puzzle),
            difficultyLevel: puzzle.metadata?.difficultyLevel,
            generationMethod: puzzle.metadata?.generationMethod,
            automatedEstimatedSolveRate: puzzle.metadata?.estimatedSolveRate,
          });
          queued += 1;
        }
      }
      return {
        contractVersion: PUZZLE_PLAYTEST_CONTRACT_VERSION,
        dryRun,
        requestedLimit,
        scanned: rows.length,
        eligible: eligible.length,
        alreadyQueued: eligible.length - unqueued.length,
        eligibleUnqueued: unqueued.length,
        queued,
        excluded: rows.length - eligible.length,
        exclusionReasons,
        truncated: rows.length === scanLimit || unqueued.length > selected.length,
        generatedAt: (input?.now ?? new Date()).toISOString(),
      };
    },
  };
}
