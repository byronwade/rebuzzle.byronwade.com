"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { verifyToken } from "@/lib/jwt";
import type { GameData, PuzzleMetadata } from "../../lib/gameSettings";
import { getTodaysPuzzle } from "./puzzleGenerationActions";

const AUTH_COOKIE = "rebuzzle_auth";

interface Puzzle {
  id?: string;
  rebusPuzzle: string;
  difficulty: number;
  answer: string;
  explanation: string;
  hints: string[];
  topic: string;
  keyword: string;
  category: string;
  relevanceScore: number;
}

// Type definitions
type JsonMetadata = {
  hints?: string[];
  topic?: string;
  keyword?: string;
  category?: string;
  seoMetadata?: {
    keywords: string[];
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
};

// Puzzle completion is now tracked in database
// No cookies needed

// Helper to get today's date key (UTC)
const _getTodayKey = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Get UTC date range for today
const _getTodayRange = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { today, tomorrow };
};

/**
 * Get current user ID from auth cookie
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get(AUTH_COOKIE)?.value;

    if (!authToken) {
      return null;
    }

    const payload = await verifyToken(authToken);
    return payload?.userId || null;
  } catch (error) {
    console.error("[getCurrentUserId] Error:", error);
    return null;
  }
}

/**
 * Check if user has already attempted today's puzzle (success or failure)
 * Returns status to show appropriate message
 */
export const isPuzzleCompletedForToday = async (): Promise<{
  hasAttempt: boolean;
  wasSuccessful: boolean;
}> => {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      // No user logged in - allow playing
      return { hasAttempt: false, wasSuccessful: false };
    }

    const result = await db.puzzleAttemptOps.hasTodayAttempt(userId);
    return {
      hasAttempt: result.hasAttempt,
      wasSuccessful: result.wasSuccessful,
    };
  } catch (error) {
    console.error("[isPuzzleCompletedForToday] Error:", error);
    return { hasAttempt: false, wasSuccessful: false };
  }
};

// Set puzzle as completed in database
export async function setPuzzleCompleted(): Promise<void> {
  try {
    // Puzzle completion is now tracked in database
    // This function is kept for compatibility but does nothing
    console.log("Puzzle completion tracked in database");
  } catch (error) {
    console.error("[setPuzzleCompleted] Error:", error);
  }
}

// Helper to get today's puzzle using the server action
async function getTodaysPuzzleData(): Promise<Puzzle | null> {
  try {
    const result = await getTodaysPuzzle();
    if (result.success && result.puzzle) {
      return result.puzzle as Puzzle;
    }
    return null;
  } catch (error) {
    console.error("Failed to get today's puzzle:", error);
    return null;
  }
}

// Fetch game data - no caching to ensure puzzle is always fresh
// The puzzle only changes once per day, but we need users to always see today's puzzle
export async function fetchGameData(isPreview = false, isCompleted = false): Promise<GameData> {
  try {
    console.log("[fetchGameData] Starting with params:", {
      isPreview,
      isCompleted,
    });

    // Early return for completed puzzles
    if (isCompleted && !isPreview) {
      console.log("[fetchGameData] Returning early due to completed puzzle");
      return {
        id: "",
        puzzle: "",
        answer: "",
        explanation: "",
        difficulty: 5, // Use numeric difficulty
        leaderboard: [],
        hints: [],
        metadata: {},
        isCompleted: true,
        shouldRedirect: true,
        blogPost: null,
      };
    }

    const puzzle = await getTodaysPuzzleData();

    if (!puzzle) {
      // No puzzle available - return empty GameData to show NoPuzzleDisplay
      return {
        id: "",
        puzzle: "",
        answer: "",
        explanation: "",
        difficulty: 3,
        leaderboard: [],
        hints: [],
        metadata: {},
        isCompleted: false,
        shouldRedirect: false,
        blogPost: null,
      };
    }

    // Extract puzzle display field - support both new (puzzle) and legacy (rebusPuzzle) fields
    const puzzleAny = puzzle as any;
    let puzzleDisplay = puzzleAny.puzzle || puzzleAny.rebusPuzzle || "";

    // Safety check: If puzzle text matches answer, it's likely corrupted data
    if (puzzleDisplay === puzzle.answer || puzzleDisplay.trim() === puzzle.answer.trim()) {
      console.warn("⚠️ [GameData] Puzzle text matches answer - data may be corrupted");
      // Try to reconstruct from metadata or use fallback
      if (
        (puzzleAny.metadata as any)?.clues &&
        Array.isArray((puzzleAny.metadata as any).clues)
      ) {
        puzzleDisplay = (puzzleAny.metadata as any).clues.join("\n\n");
      } else if (puzzleAny.clues && Array.isArray(puzzleAny.clues)) {
        puzzleDisplay = puzzleAny.clues.join("\n\n");
      } else {
        puzzleDisplay =
          "A logic grid puzzle. Use deductive reasoning to solve the relationships.";
      }
    }

    const puzzleType = puzzleAny.puzzleType || puzzleAny.metadata?.puzzleType || "rebus";

    console.log("[fetchGameData] Found puzzle:", {
      id: puzzle.id || (puzzle as any).keyword,
      hasPuzzle: !!puzzleDisplay,
      puzzleType,
      hasAnswer: !!puzzle.answer,
      hasExplanation: !!puzzle.explanation,
    });

    const metadata = {
      topic: (puzzle as any).topic,
      keyword: (puzzle as any).keyword,
      category: puzzle.category,
      relevanceScore: (puzzle as any).relevanceScore,
      hints: puzzle.hints,
      puzzleType,
    } as PuzzleMetadata;

    return {
      id: puzzle.id || (puzzle as any).keyword || "",
      puzzle: puzzleDisplay,
      puzzleType,
      answer: puzzle.answer,
      explanation: puzzle.explanation || "",
      difficulty:
        typeof puzzle.difficulty === "number"
          ? puzzle.difficulty
          : puzzle.difficulty === "easy"
            ? 3
            : puzzle.difficulty === "medium"
              ? 5
              : 7,
      hints: puzzle.hints || [],
      leaderboard: [],
      isCompleted,
      shouldRedirect: isCompleted && !isPreview,
      metadata,
      blogPost: null, // No blog post in offline mode
    };
  } catch (error) {
    console.error("[fetchGameData] Error:", error);
    return {
      id: "",
      puzzle: "",
      answer: "",
      explanation: "",
      difficulty: 3, // Use numeric difficulty
      leaderboard: [],
      hints: [],
      metadata: {},
      isCompleted: false,
      shouldRedirect: false,
      blogPost: null,
    };
  }
}

// All database-dependent functions below are removed.
