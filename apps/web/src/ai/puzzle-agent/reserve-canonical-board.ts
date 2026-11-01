import { createHash } from "node:crypto";
import { DEMANDING_RESERVE_PUZZLES } from "./demanding-reserve-puzzles";
import {
  type ReservePuzzle,
  ReservePuzzleExhaustedError,
  type SelectedReservePuzzle,
} from "./reserve-puzzles";
import { canonicalSourceFingerprint, compileCanonicalBoard } from "./visual/canonical-board";
import type { CanonicalBoard } from "./visual/canonical-contract";

/** Bounded: each retry re-runs selection, so a broken corpus cannot stall the play path. */
export const RESERVE_BOARD_MAX_ATTEMPTS = 5;

/** Process-wide memory of reserves whose board failed, so fallbacks don't recompile them. */
export const RESERVE_BOARD_FAILURE_CACHE_LIMIT = 200;
const failedReserveBoards = new Map<string, string>(); // `${reserveId}:${fingerprint}` -> reserveId

export function resetReserveBoardFailureCacheForTests(): void {
  failedReserveBoards.clear();
}

/** Keyed by source fingerprint, so an edited reserve is retried. */
function failureKey(reserve: Pick<ReservePuzzle, "id" | "visual">): string {
  let fingerprint: string;
  try {
    fingerprint = canonicalSourceFingerprint(reserve.visual);
  } catch {
    // A visual the schema rejects has no canonical fingerprint; hash its raw source instead.
    fingerprint = `raw-${createHash("sha256").update(JSON.stringify(reserve.visual)).digest("hex")}`;
  }
  return `${reserve.id}:${fingerprint}`;
}

function rememberFailure(reserve: Pick<ReservePuzzle, "id" | "visual">): void {
  const key = failureKey(reserve);
  failedReserveBoards.delete(key);
  failedReserveBoards.set(key, reserve.id);
  while (failedReserveBoards.size > RESERVE_BOARD_FAILURE_CACHE_LIMIT) {
    const oldest = failedReserveBoards.keys().next().value;
    if (oldest === undefined) break;
    failedReserveBoards.delete(oldest);
  }
}

function knownFailedReserveIds(corpus: readonly ReservePuzzle[]): Set<string> {
  const ids = new Set<string>();
  if (!failedReserveBoards.size) return ids;
  const failedIds = new Set(failedReserveBoards.values());
  for (const reserve of corpus) {
    if (failedIds.has(reserve.id) && failedReserveBoards.has(failureKey(reserve)))
      ids.add(reserve.id);
  }
  return ids;
}

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
  /** The corpus `select` draws from; used to match remembered failures to current visuals. */
  corpus?: readonly ReservePuzzle[];
}): Promise<SelectedReserveWithBoard> {
  const compileBoard = input.compileBoard ?? compileCanonicalBoard;
  const maxAttempts = input.maxAttempts ?? RESERVE_BOARD_MAX_ATTEMPTS;
  const excludeIds = knownFailedReserveIds(input.corpus ?? DEMANDING_RESERVE_PUZZLES);
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
      rememberFailure(selected.puzzle);
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
