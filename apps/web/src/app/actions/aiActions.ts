"use server";

import type {
  CharacterSuggestion,
  ContextualHint,
  WordSuggestion,
} from "@/ai/services/text-area-feedback";
import { generateContextualHint, generateSuggestions } from "@/ai/services/text-area-feedback";
import { cookies } from "next/headers";
import { db } from "@/db";
import { verifyToken } from "@/lib/jwt";

const AUTH_COOKIE = "rebuzzle_auth";

async function getAuthedUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get(AUTH_COOKIE)?.value;
    if (!authToken) return null;
    const payload = await verifyToken(authToken);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

async function resolvePuzzleAnswer(puzzleId: string): Promise<string | null> {
  if (!puzzleId) return null;
  const puzzle = await db.puzzleOps.findById(puzzleId);
  return puzzle?.answer || null;
}

/**
 * Server action to generate suggestions.
 * Loads the answer server-side from puzzleId — never trust a client-supplied answer.
 */
export async function generateSuggestionsAction(params: {
  currentInput: string;
  puzzleId: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  /** @deprecated Ignored — answer is loaded from the puzzle record */
  correctAnswer?: string;
}): Promise<{
  characterSuggestions: CharacterSuggestion[];
  wordSuggestions: WordSuggestion[];
}> {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return { characterSuggestions: [], wordSuggestions: [] };
    }

    const answer = await resolvePuzzleAnswer(params.puzzleId);
    if (!answer) {
      return { characterSuggestions: [], wordSuggestions: [] };
    }

    return await generateSuggestions({
      currentInput: params.currentInput,
      correctAnswer: answer,
      difficulty: params.difficulty,
      puzzleType: params.puzzleType,
      puzzle: params.puzzle,
    });
  } catch (error) {
    console.error("[aiActions] Failed to generate suggestions:", error);
    return {
      characterSuggestions: [],
      wordSuggestions: [],
    };
  }
}

/**
 * Server action to generate contextual hint.
 * Loads the answer server-side from puzzleId.
 */
export async function generateContextualHintAction(params: {
  currentInput: string;
  puzzleId: string;
  difficulty: number;
  puzzleType?: string;
  puzzle?: string;
  timeSpent?: number;
  /** @deprecated Ignored — answer is loaded from the puzzle record */
  correctAnswer?: string;
}): Promise<ContextualHint | null> {
  try {
    const userId = await getAuthedUserId();
    if (!userId) return null;

    const answer = await resolvePuzzleAnswer(params.puzzleId);
    if (!answer) return null;

    return await generateContextualHint({
      currentInput: params.currentInput,
      correctAnswer: answer,
      difficulty: params.difficulty,
      puzzleType: params.puzzleType,
      puzzle: params.puzzle,
      timeSpent: params.timeSpent,
    });
  } catch (error) {
    console.error("[aiActions] Failed to generate contextual hint:", error);
    return null;
  }
}
