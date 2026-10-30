import type { Puzzle } from "@/db/models";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { toPublicVisual } from "@/lib/game/public-visual";

/** Project an archive record into the same answer-free shape used by all archive clients. */
export function toPublicArchivePuzzle(puzzle: Puzzle) {
  const raw = puzzle as unknown as Record<string, unknown>;
  const publishedAt =
    raw.publishedAt instanceof Date ? raw.publishedAt : new Date(String(raw.publishedAt));
  const puzzleText = raw.puzzle ?? raw.rebusPuzzle;

  return toPublicPuzzle({
    id: raw.id,
    puzzle: puzzleText,
    rebusPuzzle: raw.rebusPuzzle,
    puzzleType: raw.puzzleType ?? "rebus",
    difficulty: raw.difficulty,
    hints: Array.isArray(raw.hints)
      ? raw.hints.filter((hint): hint is string => typeof hint === "string")
      : [],
    date: getUtcPuzzleDate(publishedAt),
    visual: toPublicVisual(raw.visual),
    aiGenerated: raw.aiGenerated ?? false,
  });
}
