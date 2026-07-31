"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
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

/**
 * Check if user has already attempted today's puzzle (success or failure)
 */
export async function isPuzzleCompletedForToday(): Promise<{
  hasAttempt: boolean;
  wasSuccessful: boolean;
}> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
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
}

function emptyGameData(): GameData {
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

/**
 * Fetch today's puzzle payload for the game board.
 * Puzzle DB reads are cached via Cache Components ("use cache").
 */
export async function fetchGameData(_isPreview = false): Promise<GameData> {
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
      answer: puzzle.answer,
      explanation: puzzle.explanation || "",
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
