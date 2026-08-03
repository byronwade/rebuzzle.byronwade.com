/**
 * Responsive Puzzle Display Component
 *
 * Handles all puzzle types with proper responsive styling, wrapping, and
 * readability. Each puzzle type has optimized display settings.
 */

import type { PuzzleType, PuzzleVisual } from "@/lib/gameSettings";
import { getPuzzleQuestion } from "@/lib/puzzle-questions";
import { hasComposedVisual } from "@/lib/puzzle-visual";
import { cn } from "@/lib/utils";
import { PuzzleVisualBoard } from "./PuzzleVisualBoard";

type DisplaySize = "small" | "medium" | "large";

interface PuzzleDisplayProps {
  puzzle: string;
  puzzleType?: PuzzleType | string;
  className?: string;
  size?: DisplaySize;
  /** Generative composed board (Ink Pictograms / text / images) */
  visual?: PuzzleVisual;
}

/** Puzzle type categories for styling */
type PuzzleCategory = "text" | "monospace" | "visual" | "default";

/** Get the category for a puzzle type */
function getPuzzleCategory(puzzleType: string): PuzzleCategory {
  const textTypes = ["riddle", "trivia", "logic-grid", "cryptic-crossword"];
  const monospaceTypes = ["number-sequence", "caesar-cipher"];
  const visualTypes = ["rebus", "pattern-recognition"];

  if (textTypes.includes(puzzleType)) return "text";
  if (monospaceTypes.includes(puzzleType)) return "monospace";
  if (visualTypes.includes(puzzleType)) return "visual";
  return "default";
}

/** Size classes mapped by category and size - using viewport-responsive sizing */
const SIZE_CLASSES: Record<PuzzleCategory, Record<DisplaySize, string>> = {
  text: {
    small: "puzzle-text-sm",
    medium: "puzzle-text-sm",
    large: "puzzle-text-sm",
  },
  monospace: {
    small: "puzzle-monospace-sm",
    medium: "puzzle-monospace-md",
    large: "puzzle-monospace-lg",
  },
  visual: {
    small: "puzzle-visual-sm",
    medium: "puzzle-visual-md",
    large: "puzzle-visual-lg",
  },
  default: {
    small: "puzzle-default-sm",
    medium: "puzzle-default-md",
    large: "puzzle-default-lg",
  },
};

/** Line height by category */
const LINE_HEIGHT: Record<PuzzleCategory, string> = {
  text: "1.5",
  monospace: "1.5",
  visual: "1.4",
  default: "1.4",
};

/**
 * PuzzleDisplay - Responsive component for displaying all puzzle types
 *
 * Features:
 * - Puzzle type-specific styling (monospace for codes/numbers, emoji handling, etc.)
 * - Responsive font sizing across all screen sizes
 * - Proper wrapping and text breaking for different content types
 * - Container-aware sizing and alignment
 */
export function PuzzleDisplay({
  puzzle,
  puzzleType = "rebus",
  className,
  size = "large",
  visual,
}: PuzzleDisplayProps) {
  const category = getPuzzleCategory(puzzleType);
  const composed = hasComposedVisual(visual);

  const isTextBased = category === "text";
  const isMonospace = category === "monospace";
  const isVisual = category === "visual";
  const isRebus = puzzleType === "rebus";

  const inlineStyles = {
    fontFeatureSettings: isVisual ? '"liga" 1, "calt" 1' : undefined,
    lineHeight: LINE_HEIGHT[category],
    overflowWrap: "anywhere" as const,
    wordBreak: (isRebus ? "break-all" : "break-word") as "break-all" | "break-word",
  };

  if (composed && visual) {
    return (
      <PuzzleVisualBoard
        visual={visual}
        fallback={puzzle || visual.unicodeFallback}
        size={size}
        className={cn("select-text max-w-full", className)}
      />
    );
  }

  const baseClasses = cn(
    // Base text color — the puzzle is the loudest ink on the page
    "text-foreground",
    // Font family — mono is reserved for ciphers and sequences
    isMonospace && "font-mono",
    // Font weight — 600 is the ceiling
    isTextBased ? "font-normal" : "font-semibold",
    !isTextBased && "tracking-[-0.02em]",
    // Size classes
    SIZE_CLASSES[category][size],
    // Line height
    !isTextBased && "leading-tight sm:leading-snug",
    // Text alignment
    isTextBased ? "text-left" : "text-center",
    // Word breaking
    isTextBased && "hyphens-auto break-words",
    isRebus && "break-all sm:break-words",
    isVisual && "break-words",
    // Spacing
    "whitespace-pre-wrap",
    // Selection
    "select-text",
    // Container
    "max-w-full",
    isTextBased && "mx-auto max-w-prose",
    // Custom
    className
  );

  return (
    <div className={baseClasses} style={inlineStyles}>
      {puzzle}
    </div>
  );
}

/**
 * PuzzleContainer - Wrapper with consistent styling
 */
interface PuzzleContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "compact" | "spacious";
}

export function PuzzleContainer({
  children,
  className,
  variant = "compact", // Changed to compact for mobile-friendly default
}: PuzzleContainerProps) {
  return (
    <div
      className={cn(
        // An inset region a step deeper than the card it sits in
        "rounded-lg border border-border bg-inset",
        "flex flex-col items-center justify-center text-center",
        // Viewport-responsive padding using CSS class
        "puzzle-container-responsive",
        // Container constraints
        "w-full max-w-full",
        // No scrolling - content flows naturally
        "overflow-hidden",
        // Viewport-responsive min-height
        "puzzle-min-height",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * PuzzleQuestion - Consistent question text for all puzzle types
 */
interface PuzzleQuestionProps {
  puzzleType?: string;
  className?: string;
}

function PuzzleQuestion({ puzzleType = "rebus", className }: PuzzleQuestionProps) {
  const questionText = getPuzzleQuestion(puzzleType);

  return <p className={cn("mt-4 text-balance text-subtle text-sm", className)}>{questionText}</p>;
}
