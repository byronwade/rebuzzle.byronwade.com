"use client";

import type { CSSProperties, ReactNode } from "react";
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
  /**
   * Mobile-only: tap the plate to toggle docked ↔ expanded after the thread starts.
   * Desktop keeps hero scale and does not pass this.
   */
  onToggleSize?: () => void;
  /** When true with onToggleSize, announce the next action for assistive tech. */
  sizeExpanded?: boolean;
}

const SMALL_TEXT_TYPES = new Set(["riddle", "trivia", "logic-grid", "cryptic-crossword"]);

/**
 * The puzzle plate.
 *
 * Standard ink boards sit on paper (the surface they were drawn for).
 * Unicode/emoji boards keep the dark cinema plate. If a board paints
 * non-palette meaning colors, the surface flips for contrast.
 */
export function PuzzleStage({
  puzzle,
  puzzleType,
  state,
  question,
  visual,
  onToggleSize,
  sizeExpanded = false,
}: PuzzleStageProps) {
  const composed = hasComposedVisual(visual);
  const surface = resolvePuzzleSurface(visual);
  const onPaper = surface.mode === "paper";
  // Compact (keyboard) keeps large tiles — chrome is hidden, so match hero scale.
  const size = SMALL_TEXT_TYPES.has(puzzleType) ? "small" : state === "docked" ? "medium" : "large";
  const toggleable = Boolean(onToggleSize);

  const plateClassName = cn(
    "puzzle-stage-plate",
    onPaper && "puzzle-stage-plate--paper",
    toggleable && "puzzle-stage-plate--toggleable"
  );
  const plateStyle = onPaper
    ? ({
        "--puzzle-canvas": surface.canvas,
        "--puzzle-ink": surface.ink,
      } as CSSProperties)
    : undefined;

  const plateBody: ReactNode = (
    <>
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
    </>
  );

  return (
    <div className="puzzle-stage w-full" data-state={state} data-surface={surface.mode}>
      {toggleable ? (
        <button
          aria-expanded={sizeExpanded}
          aria-label={sizeExpanded ? "Puzzle — tap to shrink" : "Puzzle — tap to enlarge"}
          className={plateClassName}
          onClick={onToggleSize}
          style={plateStyle}
          type="button"
        >
          {plateBody}
        </button>
      ) : (
        <div className={plateClassName} style={plateStyle}>
          {plateBody}
        </div>
      )}

      {question && state !== "compact" ? <p className="puzzle-stage-caption">{question}</p> : null}
      {toggleable ? (
        <p className="puzzle-stage-toggle-hint" aria-hidden>
          {sizeExpanded ? "Tap puzzle to shrink" : "Tap puzzle to enlarge"}
        </p>
      ) : null}
    </div>
  );
}
