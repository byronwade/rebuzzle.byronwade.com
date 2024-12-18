"use server";

import { prisma } from "@/lib/prisma";
import { GameData, LeaderboardEntry, PuzzleMetadata, Difficulty } from "../../lib/gameSettings";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { Prisma, PrismaClient } from "@prisma/client";

// Type definitions
type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
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

const COMPLETION_COOKIE_PREFIX = "puzzle_completed_";

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

// Helper function to handle database errors with better context
function handleDatabaseError(error: unknown, context: string): never {
	console.error(`[${new Date().toISOString()}] Database error in ${context}:`, error);
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		throw new Error(`Database error (${error.code}): ${error.message}`);
	} else if (error instanceof Error) {
		throw new Error(`Database error: ${error.message}`);
	}
	throw new Error(`Unknown database error in ${context}`);
}

// Helper function to retry database operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, context: string, maxRetries = 3, initialDelay = 1000): Promise<T> {
	let lastError: Error | null = null;
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Unknown error");
			console.error(`[${new Date().toISOString()}] Error in ${context} (attempt ${attempt}/${maxRetries}):`, error);
			if (attempt < maxRetries) {
				const delay = initialDelay * Math.pow(2, attempt - 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	throw lastError || new Error(`Failed after ${maxRetries} attempts in ${context}`);
}

// Cache puzzle completion state
export const isPuzzleCompletedForToday = async (): Promise<boolean> => {
	try {
		const cookieStore = await cookies();
		const todayKey = getTodayKey();
		const cookieName = `${COMPLETION_COOKIE_PREFIX}${todayKey}`;
		const cookie = cookieStore.get(cookieName);
		return cookie?.value === "true";
	} catch (error) {
		console.error("[isPuzzleCompletedForToday] Error:", error);
		return false;
	}
};

// Helper to set puzzle as completed
export async function setPuzzleCompleted(): Promise<void> {
	try {
		const cookieStore = await cookies();
		const todayKey = getTodayKey();
		const cookieName = `${COMPLETION_COOKIE_PREFIX}${todayKey}`;
		const tomorrow = new Date();
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		tomorrow.setUTCHours(0, 0, 0, 0);

		const cookie: ResponseCookie = {
			name: cookieName,
			value: "true",
			expires: tomorrow,
			path: "/",
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		};

		cookieStore.set(cookie);
	} catch (error) {
		console.error("[setPuzzleCompleted] Error:", error);
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
					difficulty: "medium" as Difficulty,
					leaderboard: [],
					hints: [],
					metadata: {},
					isCompleted: true,
					shouldRedirect: true,
					blogPost: null,
				};
			}

			const { today, tomorrow } = getTodayRange();
			console.log("[fetchGameData] Date range:", {
				today: today.toISOString(),
				tomorrow: tomorrow.toISOString(),
			});

			// Try to get any puzzle (not just today's)
			const puzzle = await retryOperation(
				async () =>
					prisma.puzzle.findFirst({
						select: {
							id: true,
							rebusPuzzle: true,
							answer: true,
							explanation: true,
							difficulty: true,
							metadata: true,
							scheduledFor: true,
							blogPost: {
								select: {
									title: true,
									slug: true,
									publishedAt: true,
								},
							},
						},
						orderBy: {
							scheduledFor: "desc",
						},
					}),
				"fetchGameData.findPuzzle"
			);

			if (!puzzle) {
				console.log("[fetchGameData] No puzzle found in database");
				return {
					id: "",
					rebusPuzzle: "",
					answer: "",
					explanation: "",
					difficulty: "medium" as Difficulty,
					leaderboard: [],
					hints: [],
					metadata: {},
					isCompleted: false,
					shouldRedirect: false,
					blogPost: null,
				};
			}

			console.log("[fetchGameData] Found puzzle:", {
				id: puzzle.id,
				scheduledFor: puzzle.scheduledFor,
				hasRebusPuzzle: !!puzzle.rebusPuzzle,
				hasAnswer: !!puzzle.answer,
				hasExplanation: !!puzzle.explanation,
				hasBlogPost: !!puzzle.blogPost,
			});

			const metadata = (puzzle.metadata || {}) as JsonMetadata;
			const difficultyValue = typeof puzzle.difficulty === "number" ? (puzzle.difficulty <= 3 ? "easy" : puzzle.difficulty <= 6 ? "medium" : "hard") : "medium";

			return {
				id: puzzle.id,
				rebusPuzzle: puzzle.rebusPuzzle,
				answer: puzzle.answer,
				explanation: puzzle.explanation,
				difficulty: difficultyValue as Difficulty,
				hints: metadata?.hints || [],
				leaderboard: [],
				isCompleted,
				shouldRedirect: isCompleted && !isPreview,
				metadata,
				blogPost: puzzle.blogPost,
			};
		} catch (error) {
			console.error("[fetchGameData] Error:", error);
			return {
				id: "",
				rebusPuzzle: "",
				answer: "",
				explanation: "",
				difficulty: "medium" as Difficulty,
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

// Cache today's puzzle data with minimal fields
export const getTodaysPuzzle = unstable_cache(
	async () => {
		try {
			const { today, tomorrow } = getTodayRange();

			const puzzle = await retryOperation(
				async () =>
					prisma.puzzle.findFirst({
						where: {
							scheduledFor: {
								gte: today,
								lt: tomorrow,
							},
						},
						select: {
							id: true,
							rebusPuzzle: true,
							difficulty: true,
							metadata: true,
						},
					}),
				"getTodaysPuzzle.findPuzzle"
			);

			if (!puzzle) {
				throw new Error("No puzzle available for today");
			}

			const metadata = puzzle.metadata as JsonMetadata;

			return {
				success: true,
				puzzle: {
					id: puzzle.id,
					rebusPuzzle: puzzle.rebusPuzzle,
					difficulty: puzzle.difficulty,
					hints: metadata?.hints || [],
				},
			};
		} catch (error) {
			console.error("[getTodaysPuzzle] Error:", error);
			return {
				success: false,
				error: "Failed to load puzzle",
			};
		}
	},
	["todays-puzzle"],
	{
		revalidate: CACHE_TIMES.LONG,
		tags: ["daily-puzzle"],
	}
);

// Cache hint state with minimal fields
export const getHintState = unstable_cache(
	async (gameId: string) => {
		try {
			const puzzle = await retryOperation(
				async () =>
					prisma.puzzle.findUnique({
						where: { id: gameId },
						select: {
							metadata: true,
						},
					}),
				"getHintState.findPuzzle"
			);

			const metadata = puzzle?.metadata as JsonMetadata;
			const hints = metadata?.hints || [];

			return {
				hints,
				totalHints: hints.length,
			};
		} catch (error) {
			console.error("[getHintState] Error:", error);
			return {
				hints: [],
				totalHints: 0,
			};
		}
	},
	["hint-state"],
	{
		revalidate: CACHE_TIMES.LONG,
		tags: ["daily-puzzle"],
	}
);
