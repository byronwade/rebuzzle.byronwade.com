/**
 * Responsive Puzzle Display Component
 *
 * Handles all puzzle types with proper responsive styling, wrapping, and
 * readability. Each puzzle type has optimized display settings.
 */

import { cn } from "@/lib/utils";

interface PuzzleDisplayProps {
  puzzle: string;
  puzzleType?: string;
  className?: string;
  size?: "small" | "medium" | "large";
}

/**
 * PuzzleDisplay - Responsive component for displaying all puzzle types
 *
 * Features:
 * - Puzzle type-specific styling (monospace for codes/numbers, emoji handling, etc.)
 * - Responsive font sizing across all screen sizes
 * - Proper wrapping and text breaking for different content types
 * - Container-aware sizing and alignment
 *
 * Puzzle Type Display Strategies:
 * - Rebus: Bold, centered, emoji-friendly wrapping
 * - Number Sequence: Monospace font, centered, medium-large size
 * - Caesar Cipher: Monospace font (looks like code), centered, medium-large
 * - Pattern Recognition: Emoji sequences with good spacing, centered
 * - Word Ladder: Text-based, centered, clear formatting
 * - Text-based (riddle, trivia, etc.): Left-aligned, paragraph style
 */
export function PuzzleDisplay({
  puzzle,
  puzzleType = "rebus",
  className,
  size = "large",
}: PuzzleDisplayProps) {
  const isRebus = puzzleType === "rebus";
  const isRiddle = puzzleType === "riddle";
  const isWordPuzzle = puzzleType === "word-puzzle";
  const isNumberSequence = puzzleType === "number-sequence";
  const isCaesarCipher = puzzleType === "caesar-cipher";
  const isPatternRecognition = puzzleType === "pattern-recognition";
  const isWordLadder = puzzleType === "word-ladder";

  // Text-based puzzle types that need paragraph-style formatting (left-aligned, normal font)
  const isTextBased =
    isRiddle ||
    puzzleType === "trivia" ||
    puzzleType === "logic-grid" ||
    puzzleType === "cryptic-crossword";

  // Code/number-based puzzles that benefit from monospace font
  const isMonospace = isNumberSequence || isCaesarCipher;

  // Puzzles with emoji/visual elements that need special spacing
  const isVisualSequence = isRebus || isPatternRecognition;

  // Determine base styling based on puzzle type
  const baseClasses = cn(
    // Base text color with dark mode support
    "text-gray-800 dark:text-gray-200",
    // Font family - monospace for codes/numbers, normal for others
    isMonospace && "font-mono",
    // Font weight - normal for text-based puzzles, bold for others
    isTextBased ? "font-normal" : "font-bold",
    // Responsive font sizes - text-based puzzles use normal paragraph text
    isTextBased && "text-sm leading-relaxed sm:text-base", // Normal paragraph text
    // Number sequences: medium-large, monospace
    isNumberSequence && size === "large" && "text-2xl sm:text-3xl md:text-4xl",
    isNumberSequence && size === "medium" && "text-xl sm:text-2xl md:text-3xl",
    isNumberSequence && size === "small" && "text-lg sm:text-xl md:text-2xl",
    // Caesar cipher: medium-large, monospace
    isCaesarCipher && size === "large" && "text-2xl sm:text-3xl md:text-4xl",
    isCaesarCipher && size === "medium" && "text-xl sm:text-2xl md:text-3xl",
    isCaesarCipher && size === "small" && "text-lg sm:text-xl md:text-2xl",
    // Pattern recognition: large, emoji-friendly
    isPatternRecognition &&
      size === "large" &&
      "text-3xl sm:text-4xl md:text-5xl",
    isPatternRecognition &&
      size === "medium" &&
      "text-2xl sm:text-3xl md:text-4xl",
    // Word ladder: centered, clear text
    isWordLadder && size === "large" && "text-2xl sm:text-3xl md:text-4xl",
    // Default sizing for other types
    !(
      isTextBased ||
      isNumberSequence ||
      isCaesarCipher ||
      isPatternRecognition ||
      isWordLadder
    ) &&
      size === "small" &&
      "text-base sm:text-lg md:text-xl",
    !(
      isTextBased ||
      isNumberSequence ||
      isCaesarCipher ||
      isPatternRecognition ||
      isWordLadder
    ) &&
      size === "medium" &&
      "text-2xl sm:text-3xl md:text-4xl",
    !(
      isTextBased ||
      isNumberSequence ||
      isCaesarCipher ||
      isPatternRecognition ||
      isWordLadder
    ) &&
      size === "large" &&
      "text-3xl sm:text-4xl md:text-5xl",
    // Line height for readability
    !isTextBased && "leading-tight sm:leading-snug",
    // Text alignment - left-align for text-based puzzles, center for others
    isTextBased ? "text-left" : "text-center",
    // Word breaking for long text
    isTextBased && "hyphens-auto break-words",
    // Emoji/symbol handling for rebus and pattern recognition puzzles
    isRebus && "break-all sm:break-words",
    isPatternRecognition && "break-words",
    // Spacing between elements - preserve spaces for sequences
    "whitespace-pre-wrap",
    // Special letter spacing for monospace puzzles (improves readability)
    isMonospace && "tracking-wider",
    // Prevent text selection issues
    "select-text",
    // Container constraints
    "max-w-full",
    // Additional text-based styling for paragraph appearance
    isTextBased && "mx-auto max-w-prose",
    // Custom className
    className
  );

  return (
    <div
      className={baseClasses}
      style={
        {
          // Better emoji rendering for visual puzzles
          fontFeatureSettings: isVisualSequence
            ? '"liga" 1, "calt" 1'
            : undefined,
          // Better line spacing for multi-line puzzles
          lineHeight: isRebus
            ? "1.2"
            : isPatternRecognition
              ? "1.6" // More spacing for emoji sequences
              : isMonospace
                ? "1.5" // Comfortable spacing for monospace
                : isTextBased
                  ? "1.5"
                  : "1.4",
          // Ensure proper wrapping
          overflowWrap: "anywhere",
          // Word breaking strategy
          wordBreak: isRebus
            ? ("break-all" as any)
            : isPatternRecognition
              ? ("break-words" as any)
              : ("break-words" as any),
          // Letter spacing for monospace (already handled by tracking-wider class)
          ...(isMonospace && { letterSpacing: "0.05em" }),
        } as React.CSSProperties
      }
    >
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
  const variantClasses = {
    default: "p-4 sm:p-6 md:p-8", // Reduced from p-6 sm:p-8 md:p-12
    compact: "p-3 sm:p-4 md:p-6", // Reduced from p-4 sm:p-6
    spacious: "p-6 sm:p-8 md:p-10", // Reduced from p-8 sm:p-12 md:p-16
  };

  return (
    <div
      className={cn(
        "rounded-3xl border-2 border-dashed bg-white shadow-inner",
        "border-gray-200 dark:border-gray-700 dark:bg-gray-800",
        "text-center",
        // Responsive padding
        variantClasses[variant],
        // Container constraints
        "w-full max-w-full",
        // No scrolling - content flows naturally
        "overflow-hidden",
        // Responsive min-height for consistent appearance (reduced)
        "min-h-[100px] sm:min-h-[120px] md:min-h-[140px]",
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

export function PuzzleQuestion({
  puzzleType = "rebus",
  className,
}: PuzzleQuestionProps) {
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
    <p
      className={cn(
        "font-medium text-gray-600",
        "text-sm sm:text-base",
        "mt-4 sm:mt-6",
        className
      )}
    >
      {questionText}
    </p>
  );
}
