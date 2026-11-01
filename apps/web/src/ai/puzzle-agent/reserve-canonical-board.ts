import {
  type ReservePuzzle,
  ReservePuzzleExhaustedError,
  type SelectedReservePuzzle,
} from "./reserve-puzzles";
import { compileCanonicalBoard } from "./visual/canonical-board";
import type { CanonicalBoard } from "./visual/canonical-contract";

/** Bounded: each retry reloads the answer archive, so a broken corpus cannot stall the play path. */
export const RESERVE_BOARD_MAX_ATTEMPTS = 5;

export type ReserveBoardSkip = { reserveId: string; error: string };

export type SelectedReserveWithBoard = Omit<SelectedReservePuzzle, "puzzle"> & {
  puzzle: ReservePuzzle & {
    visual: ReservePuzzle["visual"] & { canonicalBoard: CanonicalBoard };
  };
  skippedReserves: ReserveBoardSkip[];
};

/** Select a reserve whose checked board compiles; skip (never publish) any that do not. */
export async function selectReserveWithCanonicalBoard(input: {
  select: (excludeIds: ReadonlySet<string>) => Promise<SelectedReservePuzzle>;
  compileBoard?: (visual: ReservePuzzle["visual"]) => Promise<CanonicalBoard>;
  maxAttempts?: number;
  onSkip?: (skip: ReserveBoardSkip) => void;
}): Promise<SelectedReserveWithBoard> {
  const compileBoard = input.compileBoard ?? compileCanonicalBoard;
  const maxAttempts = input.maxAttempts ?? RESERVE_BOARD_MAX_ATTEMPTS;
  const excludeIds = new Set<string>();
  const skippedReserves: ReserveBoardSkip[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Throws ReservePuzzleExhaustedError once every remaining reserve is excluded.
    const selected = await input.select(excludeIds);
    let canonicalBoard: CanonicalBoard;
    try {
      canonicalBoard = await compileBoard(selected.puzzle.visual);
    } catch (error) {
      const skip = {
        reserveId: selected.puzzle.id,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
      };
      skippedReserves.push(skip);
      input.onSkip?.(skip);
      excludeIds.add(selected.puzzle.id);
      continue;
    }
    return {
      ...selected,
      puzzle: {
        ...selected.puzzle,
        visual: { ...selected.puzzle.visual, canonicalBoard },
      },
      skippedReserves,
    };
  }
  throw new ReservePuzzleExhaustedError(
    "No reserve board compiled within the attempt budget",
    skippedReserves.map((skip) => `${skip.reserveId}: ${skip.error}`)
  );
}
