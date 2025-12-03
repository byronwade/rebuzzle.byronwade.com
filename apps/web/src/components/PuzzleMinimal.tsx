"use client";

import { cn } from "@/lib/utils";

interface PuzzleMinimalProps {
  /**
   * The puzzle content to display
   */
  puzzle: string;
  /**
   * The type of puzzle (affects how content is displayed)
   */
  puzzleType: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * PuzzleMinimal - A compact version of the puzzle display for when keyboard is visible.
 *
 * Shows a condensed version of the puzzle to remind users what they're solving
 * while keeping the input area visible above the keyboard.
 *
 * @example
 * ```tsx
 * {isKeyboardVisible ? (
 *   <PuzzleMinimal puzzle={puzzleDisplay} puzzleType={puzzleType} />
 * ) : (
 *   <FullPuzzleDisplay ... />
 * )}
 * ```
 */
export function PuzzleMinimal({ puzzle, puzzleType, className }: PuzzleMinimalProps) {
  /**
   * Get the minimal content based on puzzle type.
   * - Visual puzzles (rebus, emoji): Show full puzzle in smaller size
   * - Text puzzles: Truncate with ellipsis
   */
  const getMinimalContent = (): string => {
    // Visual puzzle types that should show full content
    const visualTypes = ["rebus", "pattern-recognition", "emoji", "visual"];

    if (visualTypes.includes(puzzleType)) {
      // For visual puzzles, show the full puzzle (emojis, symbols, etc.)
      return puzzle;
    }

    // For text-based puzzles, truncate if too long
    const maxLength = 60;
    if (puzzle.length > maxLength) {
      return puzzle.slice(0, maxLength) + "...";
    }

    return puzzle;
  };

  /**
   * Get the appropriate font size class based on puzzle type
   */
  const getFontSizeClass = (): string => {
    const visualTypes = ["rebus", "pattern-recognition", "emoji", "visual"];

    if (visualTypes.includes(puzzleType)) {
      // Larger font for emoji/visual puzzles so they're still readable
      return "text-xl sm:text-2xl";
    }

    // Smaller font for text puzzles
    return "text-sm sm:text-base";
  };

  const content = getMinimalContent();
  const fontSizeClass = getFontSizeClass();

  return (
    <div
      className={cn(
        "puzzle-minimal",
        "flex items-center justify-center",
        "px-4 py-3",
        "text-center",
        "transition-opacity duration-200",
        className
      )}
    >
      <div
        className={cn(
          "rounded-xl",
          "bg-muted/50",
          "border border-dashed border-border/50",
          "px-4 py-2",
          "max-w-full",
          "overflow-hidden"
        )}
      >
        <span
          className={cn(
            fontSizeClass,
            "font-medium",
            "text-foreground/80",
            "whitespace-pre-wrap",
            "break-words"
          )}
          style={{
            // Ensure emojis and special characters render correctly
            fontFamily:
              '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          }}
        >
          {content}
        </span>
      </div>
    </div>
  );
}
