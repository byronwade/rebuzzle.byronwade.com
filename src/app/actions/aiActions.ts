"use server";

import type { PsychologicalTactic } from "@/ai/services/psychological-games";
import {
  generateConfidenceMessage,
  generateMisleadingHint,
  generatePsychologicalTactics as generateTactics,
  generateRedHerring,
  generateSocialPressureMessage,
  generateTimePressureMessage,
} from "@/ai/services/psychological-games";
import type {
  CharacterSuggestion,
  ContextualHint,
  WordSuggestion,
} from "@/ai/services/text-area-feedback";
import {
  generateContextualHint,
  generateSuggestions,
} from "@/ai/services/text-area-feedback";

/**
 * Server action to generate psychological tactics
 * This must be server-side to avoid CORS issues with AI Gateway
 */
export async function generatePsychologicalTactics(params: {
  puzzle: string;
  answer: string;
  difficulty: number;
  puzzleType?: string;
  currentInput?: string;
  progress?: number;
  timeSpent?: number;
}): Promise<PsychologicalTactic[]> {
  try {
    return await generateTactics(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate tactics:", error);
    // Return empty array on error - component will handle gracefully
    return [];
  }
}

/**
 * Server action to generate misleading hints
 */
export async function generateMisleadingHintAction(params: {
  puzzle: string;
  answer: string;
  difficulty: number;
  currentInput?: string;
}): Promise<string> {
  try {
    return await generateMisleadingHint(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate misleading hint:", error);
    return "Think about this from a different angle...";
  }
}

/**
 * Server action to generate red herrings
 */
export async function generateRedHerringAction(params: {
  puzzle: string;
  answer: string;
  difficulty: number;
  currentInput?: string;
}): Promise<string> {
  try {
    return await generateRedHerring(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate red herring:", error);
    return "Consider alternative interpretations...";
  }
}

/**
 * Server action to generate confidence message
 */
export async function generateConfidenceMessageAction(params: {
  puzzle: string;
  answer: string;
  difficulty: number;
  currentInput: string;
  progress: number;
}): Promise<string> {
  try {
    return await generateConfidenceMessage(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate confidence message:", error);
    return "Are you sure about that?";
  }
}

/**
 * Server action to generate time pressure message
 */
export async function generateTimePressureMessageAction(params: {
  difficulty: number;
  timeSpent: number;
  averageTime?: number;
}): Promise<string> {
  try {
    return await generateTimePressureMessage(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate time pressure:", error);
    return "Time's ticking...";
  }
}

/**
 * Server action to generate social pressure message
 */
export async function generateSocialPressureMessageAction(params: {
  difficulty: number;
  progress: number;
  timeSpent: number;
}): Promise<string> {
  try {
    return await generateSocialPressureMessage(params);
  } catch (error) {
    console.error("[aiActions] Failed to generate social pressure:", error);
    return "Most users find this straightforward...";
  }
}

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

