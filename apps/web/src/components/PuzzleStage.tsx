"use client";

import type { CSSProperties } from "react";
import type { PuzzleVisual } from "@/lib/gameSettings";
import { resolvePuzzleSurface } from "@/lib/puzzle-surface";
import { hasComposedVisual } from "@/lib/puzzle-visual";
import { cn } from "@/lib/utils";
import { PuzzleDisplay } from "./PuzzleDisplay";

export type StageState = "hero" | "docked" | "compact";

interface PuzzleStageProps {
  puzzle: string;
  puzzleType: string;
  /**
   * `hero` before the first guess — the puzzle owns the screen.
   * `docked` once the thread starts — it shrinks and pins to the top.
   * `compact` while the mobile keyboard is open — full puzzle, top-pinned plate.
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
 * Standard ink boards sit on paper (the surface they were drawn for).
 * Unicode/emoji boards keep the dark cinema plate. If a board paints
 * non-palette meaning colors, the surface flips for contrast.
 */
export function PuzzleStage({ puzzle, puzzleType, state, question, visual }: PuzzleStageProps) {
  const composed = hasComposedVisual(visual);
  const surface = resolvePuzzleSurface(visual);
  const onPaper = surface.mode === "paper";
  // Compact (keyboard) keeps large tiles — chrome is hidden, so match hero scale.
  const size = SMALL_TEXT_TYPES.has(puzzleType) ? "small" : state === "docked" ? "medium" : "large";

  return (
    <div className="puzzle-stage w-full" data-state={state} data-surface={surface.mode}>
      <div
        className={cn("puzzle-stage-plate", onPaper && "puzzle-stage-plate--paper")}
        style={
          onPaper
            ? ({
                "--puzzle-canvas": surface.canvas,
                "--puzzle-ink": surface.ink,
              } as CSSProperties)
            : undefined
        }
      >
        {!onPaper ? <div aria-hidden className="puzzle-stage-glow" /> : null}

        <div className="puzzle-stage-content">
          <PuzzleDisplay
            className={onPaper || composed ? undefined : "text-white"}
            puzzle={puzzle}
            puzzleType={puzzleType}
            size={size}
            visual={visual}
          />
        </div>
      </div>

      {question && state !== "compact" ? <p className="puzzle-stage-caption">{question}</p> : null}
    </div>
  );
}
