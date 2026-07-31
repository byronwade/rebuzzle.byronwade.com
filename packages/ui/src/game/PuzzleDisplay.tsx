/**
 * Responsive Puzzle Display Component
 *
 * Handles all puzzle types with proper responsive styling, wrapping, and
 * readability. Each puzzle type has optimized display settings.
 */

import { useMemo } from "react";
import { cn } from "../utils/cn";

type DisplaySize = "small" | "medium" | "large";

export type PuzzleType =
  | "rebus"
  | "word-puzzle"
  | "riddle"
  | "trivia"
  | "logic-grid"
  | "number-sequence"
  | "caesar-cipher"
  | "word-ladder"
  | "pattern-recognition"
  | "cryptic-crossword";

interface PuzzleDisplayProps {
  puzzle: string;
  puzzleType?: PuzzleType | string;
  className?: string;
  size?: DisplaySize;
}

type PuzzleCategory = "text" | "monospace" | "visual" | "default";

function getPuzzleCategory(puzzleType: string): PuzzleCategory {
  const textTypes = ["riddle", "trivia", "logic-grid", "cryptic-crossword"];
  const monospaceTypes = ["number-sequence", "caesar-cipher"];
  const visualTypes = ["rebus", "pattern-recognition"];

  if (textTypes.includes(puzzleType)) return "text";
  if (monospaceTypes.includes(puzzleType)) return "monospace";
  if (visualTypes.includes(puzzleType)) return "visual";
  return "default";
}

const SIZE_CLASSES: Record<PuzzleCategory, Record<DisplaySize, string>> = {
  text: {
    small: "text-sm leading-relaxed sm:text-base",
    medium: "text-sm leading-relaxed sm:text-base",
    large: "text-sm leading-relaxed sm:text-base",
  },
  monospace: {
    small: "text-lg sm:text-xl md:text-2xl",
    medium: "text-xl sm:text-2xl md:text-3xl",
    large: "text-2xl sm:text-3xl md:text-4xl",
  },
  visual: {
    small: "text-2xl sm:text-3xl md:text-4xl",
    medium: "text-2xl sm:text-3xl md:text-4xl",
    large: "text-3xl sm:text-4xl md:text-5xl",
  },
  default: {
    small: "text-base sm:text-lg md:text-xl",
    medium: "text-2xl sm:text-3xl md:text-4xl",
    large: "text-3xl sm:text-4xl md:text-5xl",
  },
};

const LINE_HEIGHT: Record<PuzzleCategory, string> = {
  text: "1.5",
  monospace: "1.5",
  visual: "1.4",
  default: "1.4",
};

export function PuzzleDisplay({
  puzzle,
  puzzleType = "rebus",
  className,
  size = "large",
}: PuzzleDisplayProps) {
  const category = useMemo(() => getPuzzleCategory(puzzleType), [puzzleType]);

  const isTextBased = category === "text";
  const isMonospace = category === "monospace";
  const isVisual = category === "visual";
  const isRebus = puzzleType === "rebus";

  const baseClasses = cn(
    "text-gray-800 dark:text-gray-200",
    isMonospace && "font-mono tracking-wider",
    isTextBased ? "font-normal" : "font-bold",
    SIZE_CLASSES[category][size],
    !isTextBased && "leading-tight sm:leading-snug",
    isTextBased ? "text-left" : "text-center",
    isTextBased && "hyphens-auto break-words",
    isRebus && "break-all sm:break-words",
    isVisual && "break-words",
    "whitespace-pre-wrap",
    "select-text",
    "max-w-full",
    isTextBased && "mx-auto max-w-prose",
    className
  );

  const inlineStyles = useMemo(
    () => ({
      fontFeatureSettings: isVisual ? '"liga" 1, "calt" 1' : undefined,
      lineHeight: LINE_HEIGHT[category],
      overflowWrap: "anywhere" as const,
      wordBreak: (isRebus ? "break-all" : "break-word") as "break-all" | "break-word",
    }),
    [category, isVisual, isRebus]
  );

  return (
    <div className={baseClasses} style={inlineStyles}>
      {puzzle}
    </div>
  );
}

interface PuzzleContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "compact" | "spacious";
}

export function PuzzleContainer({
  children,
  className,
  variant = "compact",
}: PuzzleContainerProps) {
  const variantClasses = {
    default: "p-4 sm:p-6 md:p-8",
    compact: "p-3 sm:p-4 md:p-6",
    spacious: "p-6 sm:p-8 md:p-10",
  };

  return (
    <div
      className={cn(
        "rounded-3xl border-2 border-dashed bg-white shadow-inner",
        "border-gray-200 dark:border-gray-700 dark:bg-gray-800",
        "text-center",
        variantClasses[variant],
        "w-full max-w-full",
        "overflow-hidden",
        "min-h-[100px] sm:min-h-[120px] md:min-h-[140px]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface PuzzleQuestionProps {
  puzzleType?: string;
  className?: string;
}

export function PuzzleQuestion({ puzzleType = "rebus", className }: PuzzleQuestionProps) {
  const questionText =
    puzzleType === "rebus"
      ? "What does this rebus puzzle represent?"
      : puzzleType === "word-puzzle"
        ? "What is the answer to this word puzzle?"
        : puzzleType === "riddle"
          ? "What is the answer to this riddle?"
          : puzzleType === "logic-grid"
            ? "Use deductive reasoning to solve this logic grid puzzle"
            : puzzleType === "number-sequence"
              ? "What comes next in this number sequence?"
              : puzzleType === "caesar-cipher"
                ? "Decode this encrypted message"
                : puzzleType === "word-ladder"
                  ? "Transform the start word into the end word"
                  : puzzleType === "pattern-recognition"
                    ? "What pattern comes next?"
                    : puzzleType === "trivia"
                      ? "What is the answer to this trivia question?"
                      : puzzleType === "cryptic-crossword"
                        ? "Solve this cryptic crossword clue"
                        : "What is the answer to this puzzle?";

  return (
    <p className={cn("font-medium text-muted-foreground", "text-sm", "mt-4", className)}>
      {questionText}
    </p>
  );
}
