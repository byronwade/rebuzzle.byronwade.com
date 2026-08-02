import { normalizeAnswerKey } from "./quality";
import type { PuzzleAgentResult } from "./schemas";
import type { PuzzleVisual } from "./visual/composition";

export type CapturedPuzzleComposition = {
  answer: string;
  visual: PuzzleVisual;
};

/** Adopt the exact tool-produced board; never trust a model-authored SVG/provenance copy. */
export function applyAuthoritativeComposition(
  puzzle: PuzzleAgentResult["puzzle"],
  composition: CapturedPuzzleComposition
): PuzzleAgentResult["puzzle"] {
  if (normalizeAnswerKey(puzzle.answer) !== normalizeAnswerKey(composition.answer)) {
    throw new Error(
      "Final answer changed after compose_puzzle_visual; compose the final answer again"
    );
  }

  return {
    ...puzzle,
    rebusPuzzle: composition.visual.unicodeFallback,
    visual: composition.visual,
  };
}
