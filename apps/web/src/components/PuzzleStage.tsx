"use client";

import type { PuzzleVisual } from "@/lib/gameSettings";
import { PuzzleDisplay } from "./PuzzleDisplay";

export type StageState = "hero" | "docked";

interface PuzzleStageProps {
  puzzle: string;
  puzzleType: string;
  /**
   * `hero` before the first guess — the puzzle owns the screen.
   * `docked` once the thread starts — it shrinks and pins to the top so the
   * conversation has room, the way a video collapses when you start reading
   * the comments.
   */
  state: StageState;
  question?: string;
  /** Generative composed board (Ink Pictograms / text / images). */
  visual?: PuzzleVisual;
}

const SMALL_TEXT_TYPES = new Set(["riddle", "trivia", "logic-grid", "cryptic-crossword"]);

/**
 * The puzzle plate.
 *
 * A single dark, letterboxed surface with no visible chrome beyond its own
 * edge — the puzzle is the only lit thing on it. Both states share one element
 * so the shrink is a real transition rather than a swap.
 */
export function PuzzleStage({ puzzle, puzzleType, state, question, visual }: PuzzleStageProps) {
  const size = SMALL_TEXT_TYPES.has(puzzleType) ? "small" : "large";

  return (
    <div className="puzzle-stage w-full" data-state={state}>
      <div className="puzzle-stage-plate">
        {/* Atmospheric wash — the plate is lit from behind, not decorated. */}
        <div aria-hidden className="puzzle-stage-glow" />

        {/*
         * The docked state scales this wrapper rather than swapping the type
         * size, so the shrink is one continuous motion instead of a cut.
         */}
        <div className="puzzle-stage-content">
          <PuzzleDisplay
            className="text-white"
            puzzle={puzzle}
            puzzleType={puzzleType}
            size={size}
            visual={visual}
          />
        </div>
      </div>

      {question ? <p className="puzzle-stage-caption">{question}</p> : null}
    </div>
  );
}
