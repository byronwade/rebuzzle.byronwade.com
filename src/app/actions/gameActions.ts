"use server";

import type { GameData, LeaderboardEntry, PuzzleMetadata, Difficulty } from "../../lib/gameSettings";
import { unstable_cache } from "next/cache";
// No cookies needed - using database
import { getTodaysPuzzle } from "./puzzleGenerationActions";

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

// Constants
const CACHE_TIMES = {
	SHORT: 60, // 1 minute
	MEDIUM: 3600, // 1 hour
	LONG: 86400, // 24 hours
} as const;

// Puzzle completion is now tracked in database
// No cookies needed

// Helper to get today's date key (UTC)
const getTodayKey = () => {
	const now = new Date();
	return now.toISOString().split("T")[0];
};

// Get UTC date range for today
const getTodayRange = () => {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
	return { today, tomorrow };
};

// Check puzzle completion from database
export const isPuzzleCompletedForToday = async (): Promise<boolean> => {
	try {
		// This should check the database for completion status
		// For now, return false as completion is handled by gameData
		return false;
	} catch (error) {
		console.error("[isPuzzleCompletedForToday] Error:", error);
		return false;
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

// Cache the daily puzzle fetch with optimized query
export const fetchGameData = unstable_cache(
	async (isPreview = false, isCompleted = false): Promise<GameData> => {
		try {
			console.log("[fetchGameData] Starting with params:", { isPreview, isCompleted });

			// Early return for completed puzzles
			if (isCompleted && !isPreview) {
				console.log("[fetchGameData] Returning early due to completed puzzle");
				return {
					id: "",
					rebusPuzzle: "",
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
				// Fallback if puzzle generation fails
				return {
					id: "fallback",
					rebusPuzzle: "📱 🏠",
					answer: "smartphone",
					explanation: "Smart + Phone = Smartphone",
					difficulty: 3, // Use numeric difficulty
					leaderboard: [],
					hints: ["Think about technology", "This is a beginner level puzzle", "The answer is a single word"],
					metadata: {
						topic: "Technology",
						keyword: "smartphone",
						category: "modern tech",
						relevanceScore: 8,
						hints: ["Think about technology", "This is a beginner level puzzle", "The answer is a single word"],
					},
					isCompleted: false,
					shouldRedirect: false,
					blogPost: null,
				};
			}

			console.log("[fetchGameData] Found puzzle:", {
				id: puzzle.id || puzzle.keyword,
				hasRebusPuzzle: !!puzzle.rebusPuzzle,
				hasAnswer: !!puzzle.answer,
				hasExplanation: !!puzzle.explanation,
			});

			const metadata = {
				topic: puzzle.topic,
				keyword: puzzle.keyword,
				category: puzzle.category,
				relevanceScore: puzzle.relevanceScore,
				hints: puzzle.hints,
			} as PuzzleMetadata;

			return {
				id: puzzle.id || puzzle.keyword,
				rebusPuzzle: puzzle.rebusPuzzle,
				answer: puzzle.answer,
				explanation: puzzle.explanation,
				difficulty: puzzle.difficulty,
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
				rebusPuzzle: "",
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
	},
	["daily-puzzle"],
	{
		revalidate: CACHE_TIMES.MEDIUM,
		tags: ["daily-puzzle"],
	}
);

// All database-dependent functions below are removed.
