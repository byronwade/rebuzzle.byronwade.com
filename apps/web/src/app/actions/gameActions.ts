"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { isAdmin } from "@/lib/admin-auth";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { verifyToken } from "@/lib/jwt";
import type { GameData, PuzzleMetadata, PuzzleType } from "../../lib/gameSettings";
import { getTodaysPuzzle } from "./puzzleGenerationActions";

const AUTH_COOKIE = "rebuzzle_auth";

/** Shape returned by getTodaysPuzzle (cached DB hit or generated/fallback). */
type TodaysPuzzle = {
  id?: string;
  puzzle?: string;
  rebusPuzzle?: string;
  puzzleType?: string;
  difficulty: number | string;
  answer: string;
  explanation?: string;
  hints?: string[];
  topic?: string;
  keyword?: string;
  category?: string;
  relevanceScore?: number;
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

export type AttemptStatus = {
  hasAttempt: boolean;
  wasSuccessful: boolean;
  /** True when we couldn't determine status — caller should fail closed */
  statusUnknown?: boolean;
};

/**
 * Check if user has already finalized today's puzzle (success or failure).
 * Fail closed on errors so a DB blip can't reopen the board.
 */
export async function isPuzzleCompletedForToday(): Promise<AttemptStatus> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { hasAttempt: false, wasSuccessful: false };
    }

    const result = await db.puzzleAttemptOps.hasTodayAttempt(userId, getUtcPuzzleDate());
    return {
      hasAttempt: result.hasAttempt,
      wasSuccessful: result.wasSuccessful,
    };
  } catch (error) {
    console.error("[isPuzzleCompletedForToday] Error:", error);
    return { hasAttempt: true, wasSuccessful: false, statusUnknown: true };
  }
}

/** Whether the signed-in user can use ?preview=true to bypass the daily lock UI. */
export async function canUsePuzzlePreview(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    return await isAdmin(userId);
  } catch {
    return false;
  }
}

function emptyGameData(): GameData {
  return {
    id: "",
    puzzle: "",
    explanation: "",
    difficulty: 3,
    leaderboard: [],
    hints: [],
    metadata: {},
    isCompleted: false,
    blogPost: null,
  };
}

function toDifficulty(difficulty: number | string): number {
  if (typeof difficulty === "number") {
    return difficulty;
  }
  if (difficulty === "easy") return 3;
  if (difficulty === "medium") return 5;
  if (difficulty === "hard") return 7;
  return Number(difficulty) || 5;
}

export type PublicGameData = Omit<GameData, "answer"> & {
  /** Never populated for an active board */
  answer?: undefined;
};

/**
 * Solution payload for /game-over — only after the daily lock is held.
 */
export async function fetchGameOverSolution(): Promise<{
  answer: string;
  explanation: string;
  difficulty: number;
  puzzleType?: PuzzleType;
  locked: boolean;
}> {
  try {
    const [userId, puzzleResult] = await Promise.all([
      getCurrentUserId(),
      getTodaysPuzzle(),
    ]);
    const puzzle = (puzzleResult.success ? puzzleResult.puzzle : null) as TodaysPuzzle | null;

    if (!puzzle) {
      return { answer: "", explanation: "", difficulty: 5, locked: false };
    }

    let locked = false;
    if (userId) {
      const status = await db.puzzleAttemptOps.hasTodayAttempt(userId, getUtcPuzzleDate());
      locked = status.hasAttempt;
    }

    return {
      answer: locked ? puzzle.answer : "",
      explanation: locked ? puzzle.explanation || "" : "",
      difficulty: toDifficulty(puzzle.difficulty),
      puzzleType: (puzzle.puzzleType || "rebus") as PuzzleType,
      locked,
    };
  } catch (error) {
    console.error("[fetchGameOverSolution] Error:", error);
    return { answer: "", explanation: "", difficulty: 5, locked: false };
  }
}

/**
 * Fetch today's puzzle payload for the game board.
 * The answer is intentionally omitted — guesses go through /api/puzzles/guess.
 */
export async function fetchGameData(_isPreview = false): Promise<PublicGameData> {
  try {
    const result = await getTodaysPuzzle();
    const puzzle = (result.success ? result.puzzle : null) as TodaysPuzzle | null;

    if (!puzzle) {
      return emptyGameData();
    }

    const puzzleDisplay = puzzle.puzzle || puzzle.rebusPuzzle || "";
    const puzzleType = (puzzle.puzzleType || "rebus") as PuzzleType;

    const metadata = {
      topic: puzzle.topic,
      keyword: puzzle.keyword,
      category: puzzle.category,
      relevanceScore: puzzle.relevanceScore,
      hints: puzzle.hints,
      puzzleType,
    } as PuzzleMetadata;

    return {
      id: puzzle.id || puzzle.keyword || "",
      puzzle: puzzleDisplay,
      puzzleType,
      // answer omitted — never ship the solution to an active client
      explanation: "", // revealed after lock via /api/puzzles/guess
      difficulty: toDifficulty(puzzle.difficulty),
      hints: puzzle.hints || [],
      leaderboard: [],
      isCompleted: false,
      metadata,
      blogPost: null,
    };
  } catch (error) {
    console.error("[fetchGameData] Error:", error);
    return emptyGameData();
  }
}
