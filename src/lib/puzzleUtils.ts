/**
 * Puzzle Utility Functions
 *
 * Helper functions for working with puzzle-type agnostic puzzles
 */

import { getPuzzleTypeConfig } from "@/ai/config/puzzle-types";

/**
 * Get the puzzle display field name for a given puzzle type
 * Different puzzle types may use different field names (e.g., rebus uses "rebusPuzzle", word-puzzle uses "puzzle")
 */
export function getPuzzleDisplayFieldName(puzzleType: string): string {
  try {
    const config = getPuzzleTypeConfig(puzzleType);
    // Check schema to find the puzzle display field
    // For rebus: it's "rebusPuzzle", for others it's usually "puzzle"
    if (puzzleType === "rebus") {
      return "rebusPuzzle";
    }
    // Default to "puzzle" for other types
    return "puzzle";
  } catch {
    // Fallback to "puzzle" if config not found
    return "puzzle";
  }
}

/**
 * Interface representing a puzzle object with potential legacy fields
 */
export interface PuzzleLike {
  puzzle?: string;
  rebusPuzzle?: string;
  puzzleType?: string;
  metadata?: {
    puzzleType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Extract the puzzle display value from a puzzle object
 * Handles both new (puzzle) and legacy (rebusPuzzle) fields
 */
export function getPuzzleDisplay(
  puzzle: PuzzleLike,
  puzzleType?: string
): string {
  // Try new generic field first
  if (puzzle.puzzle) {
    return puzzle.puzzle;
  }

  // Try legacy rebus field
  if (puzzle.rebusPuzzle) {
    return puzzle.rebusPuzzle;
  }

  // Try to get from puzzle type config
  if (puzzleType) {
    const fieldName = getPuzzleDisplayFieldName(puzzleType);
    if (typeof puzzle[fieldName] === "string") {
      return puzzle[fieldName] as string;
    }
  }

  // Fallback: try common field names
  return (
    (puzzle.puzzleText as string) ||
    (puzzle.content as string) ||
    (puzzle.display as string) ||
    ""
  );
}

/**
 * Get puzzle type from puzzle object
 */
export function getPuzzleType(puzzle: PuzzleLike): string {
  return puzzle.puzzleType || puzzle.metadata?.puzzleType || "rebus";
}

/**
 * Get puzzle type display name
 */
export function getPuzzleTypeName(puzzleType: string): string {
  try {
    const config = getPuzzleTypeConfig(puzzleType);
    return config.name;
  } catch {
    return puzzleType;
  }
}

