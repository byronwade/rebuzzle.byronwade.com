"use client";

import { type CSSProperties, useMemo } from "react";
import type { PuzzleVisual } from "@/lib/gameSettings";
import { resolvePuzzleSurface } from "@/lib/puzzle-surface";
import { cn } from "@/lib/utils";
import { hasComposedVisual } from "./PuzzleVisualBoard";
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
 * Standard ink boards sit on paper (the surface they were drawn for).
 * Unicode/emoji boards keep the dark cinema plate. If a board paints
 * non-palette meaning colors, the surface flips for contrast.
 */
export function PuzzleStage({ puzzle, puzzleType, state, question, visual }: PuzzleStageProps) {
  const size = SMALL_TEXT_TYPES.has(puzzleType) ? "small" : "large";
  const composed = hasComposedVisual(visual);
  const surface = useMemo(() => resolvePuzzleSurface(visual), [visual]);
  const onPaper = surface.mode === "paper";

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
        {/* Atmospheric wash — cinema only; paper boards stay clean. */}
        {!onPaper ? <div aria-hidden className="puzzle-stage-glow" /> : null}

        {/*
         * The docked state scales this wrapper rather than swapping the type
         * size, so the shrink is one continuous motion instead of a cut.
         */}
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

      {question ? <p className="puzzle-stage-caption">{question}</p> : null}
    </div>
  );
}
