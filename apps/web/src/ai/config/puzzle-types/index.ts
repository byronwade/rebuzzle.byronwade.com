/**
 * Puzzle Type Registry
 *
 * Central registry for all puzzle type configurations.
 * Add new puzzle types here to make them available system-wide.
 */

import type { PuzzleTypeConfig } from "../types";
import { CAESAR_CIPHER_CONFIG } from "./caesar-cipher";
import { CRYPTIC_CROSSWORD_CONFIG } from "./cryptic-crossword";
import { LOGIC_GRID_CONFIG } from "./logic-grid";
import { NUMBER_SEQUENCE_CONFIG } from "./number-sequence";
import { PATTERN_RECOGNITION_CONFIG } from "./pattern-recognition";
import { REBUS_CONFIG } from "./rebus";
import { RIDDLE_CONFIG } from "./riddle";
import { TRIVIA_CONFIG } from "./trivia";
import { WORD_LADDER_CONFIG } from "./word-ladder";
import { WORD_PUZZLE_CONFIG } from "./word-puzzle";

/**
 * Registry of all puzzle type configurations
 *
 * To add a new puzzle type:
 * 1. Create a new config file in this directory (e.g., logic-puzzle.ts)
 * 2. Import it above
 * 3. Add it to the registry below
 */
export const PUZZLE_TYPE_REGISTRY: Record<string, PuzzleTypeConfig> = {
  rebus: REBUS_CONFIG,
  "word-puzzle": WORD_PUZZLE_CONFIG,
  riddle: RIDDLE_CONFIG,
  "logic-grid": LOGIC_GRID_CONFIG,
  "number-sequence": NUMBER_SEQUENCE_CONFIG,
  "caesar-cipher": CAESAR_CIPHER_CONFIG,
  "word-ladder": WORD_LADDER_CONFIG,
  "pattern-recognition": PATTERN_RECOGNITION_CONFIG,
  trivia: TRIVIA_CONFIG,
  "cryptic-crossword": CRYPTIC_CROSSWORD_CONFIG,
  // Add more puzzle types here as they are created
};

/**
 * Get a puzzle type configuration by ID
 */
export function getPuzzleTypeConfig(typeId: string): PuzzleTypeConfig {
  const config = PUZZLE_TYPE_REGISTRY[typeId];

  if (!config) {
    throw new Error(
      `Puzzle type "${typeId}" not found. Available types: ${Object.keys(PUZZLE_TYPE_REGISTRY).join(", ")}`
    );
  }

  return config;
}

/**
 * List all available puzzle types
 */
export function listPuzzleTypes(): string[] {
  return Object.keys(PUZZLE_TYPE_REGISTRY);
}

/**
 * Check if a puzzle type exists
 */
export function hasPuzzleType(typeId: string): boolean {
  return typeId in PUZZLE_TYPE_REGISTRY;
}

/**
 * Get all puzzle type configs
 */
export function getAllPuzzleTypeConfigs(): Record<string, PuzzleTypeConfig> {
  return { ...PUZZLE_TYPE_REGISTRY };
}
