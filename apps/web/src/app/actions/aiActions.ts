"use server";

import type {
  CharacterSuggestion,
  ContextualHint,
  WordSuggestion,
} from "@/ai/services/text-area-feedback";

/**
 * Suggestion / contextual-hint actions intentionally return empty results.
 *
 * Loading the answer server-side to drive autocomplete while the puzzle is
 * still open is an answer oracle (character/word leakage). Daily play uses
 * precomputed `puzzle.hints` and authoritative scoring via /api/puzzles/guess.
 */
export async function generateSuggestionsAction(_params: {
  currentInput: string;
  puzzleId: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  correctAnswer?: string;
}): Promise<{
  characterSuggestions: CharacterSuggestion[];
  wordSuggestions: WordSuggestion[];
}> {
  return { characterSuggestions: [], wordSuggestions: [] };
}

export async function generateContextualHintAction(_params: {
  currentInput: string;
  puzzleId: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  timeSpent?: number;
  correctAnswer?: string;
}): Promise<ContextualHint | null> {
  return null;
}
