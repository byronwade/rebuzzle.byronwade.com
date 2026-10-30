/**
 * Classifies a `/api/puzzles/guess` response before the daily board acts on it.
 *
 * A daily rollover (`409` with `reloadDaily: true`) means no guess was recorded
 * and the board is showing yesterday's puzzle: it must reload, never render a
 * loss. Other `409`s and non-winning `locked` replies mean the day is already
 * closed. Everything else is a scored guess.
 */
export type GuessResponseOutcome = "reload-daily" | "locked" | "scored";

export function classifyGuessResponse(
  status: number,
  result: { reloadDaily?: boolean; locked?: boolean; success?: boolean }
): GuessResponseOutcome {
  if (status === 409 && result.reloadDaily === true) return "reload-daily";
  if (status === 409 || (result.locked && result.success !== true)) return "locked";
  return "scored";
}
