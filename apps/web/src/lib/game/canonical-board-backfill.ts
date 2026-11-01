import { compileCanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-board";
import type { CanonicalBoard } from "@/ai/puzzle-agent/visual/canonical-contract";
import type { PuzzleVisual } from "@/db/models";

export const CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT = 500;
export const CANONICAL_BOARD_BACKFILL_MAX_LIMIT = 5_000;

export type CanonicalBoardBackfillCollection = "puzzles" | "dailyPuzzleCandidates";

export type CanonicalBoardBackfillTarget = {
  collection: CanonicalBoardBackfillCollection;
  id: string;
  visual: PuzzleVisual;
  /** Candidate rows only: the `statusVersion` read with the visual, used to compare-and-set. */
  expectedStatusVersion?: number;
};

export type CanonicalBoardBackfillSource = {
  /** Composed visuals without a board; `limit` applies per collection. */
  listMissingBoards(limit: number): Promise<CanonicalBoardBackfillTarget[]>;
  /**
   * Writes only if the row is unchanged since it was listed (still no board and, for
   * candidates, the same `statusVersion`); false when another writer got there first.
   */
  saveBoard(input: {
    collection: CanonicalBoardBackfillCollection;
    id: string;
    canonicalBoard: CanonicalBoard;
    expectedStatusVersion?: number;
  }): Promise<boolean>;
};

export type CanonicalBoardBackfillFailure = {
  collection: CanonicalBoardBackfillCollection;
  id: string;
  error: string;
};

export type CanonicalBoardBackfillReport = {
  dryRun: boolean;
  scanned: number;
  alreadyBoarded: number;
  skippedUnicode: number;
  compiled: number;
  written: number;
  raced: number;
  failed: number;
  failures: CanonicalBoardBackfillFailure[];
  generatedAt: string;
};

/** Idempotent one-off: compile missing boards; failures are reported and left untouched. */
export function createCanonicalBoardBackfill(
  source: CanonicalBoardBackfillSource,
  compileBoard: (visual: PuzzleVisual) => Promise<CanonicalBoard> = compileCanonicalBoard,
  now: () => Date = () => new Date()
) {
  return {
    async run(input: { dryRun: boolean; limit?: number }): Promise<CanonicalBoardBackfillReport> {
      const limit = Math.max(
        1,
        Math.min(
          CANONICAL_BOARD_BACKFILL_MAX_LIMIT,
          Math.floor(input.limit ?? CANONICAL_BOARD_BACKFILL_DEFAULT_LIMIT)
        )
      );
      const targets = await source.listMissingBoards(limit);
      const report: CanonicalBoardBackfillReport = {
        dryRun: input.dryRun,
        scanned: targets.length,
        alreadyBoarded: 0,
        skippedUnicode: 0,
        compiled: 0,
        written: 0,
        raced: 0,
        failed: 0,
        failures: [],
        generatedAt: now().toISOString(),
      };
      for (const target of targets) {
        if (target.visual.canonicalBoard) {
          report.alreadyBoarded++;
          continue;
        }
        if (target.visual.mode === "unicode") {
          report.skippedUnicode++;
          continue;
        }
        let canonicalBoard: CanonicalBoard;
        try {
          canonicalBoard = await compileBoard(target.visual);
        } catch (error) {
          report.failed++;
          report.failures.push({
            collection: target.collection,
            id: target.id,
            error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
          });
          continue;
        }
        report.compiled++;
        if (input.dryRun) continue;
        const written = await source.saveBoard({
          collection: target.collection,
          id: target.id,
          canonicalBoard,
          ...(target.expectedStatusVersion === undefined
            ? {}
            : { expectedStatusVersion: target.expectedStatusVersion }),
        });
        if (written) report.written++;
        else report.raced++;
      }
      return report;
    },
  };
}
