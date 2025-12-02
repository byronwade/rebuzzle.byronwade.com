"use server";

import type {
  CharacterSuggestion,
  ContextualHint,
  WordSuggestion,
} from "@/ai/services/text-area-feedback";
import { generateContextualHint, generateSuggestions } from "@/ai/services/text-area-feedback";

/**
 * Server action to generate suggestions
 */
export async function generateSuggestionsAction(params: {
  currentInput: string;
  correctAnswer: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
}): Promise<{
  characterSuggestions: CharacterSuggestion[];
  wordSuggestions: WordSuggestion[];
}> {
  try {
    return await generateSuggestions(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate suggestions:", error);
    return {
      characterSuggestions: [],
      wordSuggestions: [],
    };
  }
}

/**
 * Server action to generate contextual hint
 */
export async function generateContextualHintAction(params: {
  currentInput: string;
  correctAnswer: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  timeSpent?: number;
}): Promise<ContextualHint | null> {
  try {
    return await generateContextualHint(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate contextual hint:", error);
    return null;
  }
}
