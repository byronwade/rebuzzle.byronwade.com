"use server";

import { prisma } from "../../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GameData, LeaderboardEntry, PuzzleMetadata } from "../../lib/gameSettings";

export async function fetchGameData(): Promise<GameData> {
	try {
		// Find the latest puzzle
		const puzzle = await prisma.puzzle.findFirst({
			orderBy: {
				scheduledFor: "desc",
			},
			select: {
				id: true,
				rebusPuzzle: true,
				answer: true,
				explanation: true,
				difficulty: true,
				metadata: true,
			},
		});

		if (!puzzle) {
			console.error("No puzzles found in the database");
			throw new Error("No puzzles available");
		}

		console.log(`Using puzzle with ID: ${puzzle.id}`);

		// Initialize empty leaderboard
		let leaderboardWithNames: LeaderboardEntry[] = [];

		try {
			// Get the puzzle attempts for this specific puzzle
			const puzzleAttempts = await prisma.puzzleAttempt.findMany({
				where: {
					puzzleId: puzzle.id,
					correct: true,
				},
				select: {
					userId: true,
					createdAt: true,
					user: {
						select: {
							username: true,
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			// Group users by their success
			const userSuccesses = new Map<string, { username: string; dates: Date[] }>();

			puzzleAttempts.forEach((attempt) => {
				const userId = attempt.userId;
				if (!userSuccesses.has(userId)) {
					userSuccesses.set(userId, {
						username: attempt.user?.username || "Anonymous",
						dates: [],
					});
				}
				const userSuccess = userSuccesses.get(userId);
				if (userSuccess) {
					userSuccess.dates.push(attempt.createdAt);
				}
			});

			// Convert to leaderboard format
			leaderboardWithNames = Array.from(userSuccesses.values())
				.map(({ username, dates }) => {
					// Create a 7-day array of successes
					const correctAnswers = Array(7).fill(0);
					dates.forEach((date) => {
						const dayIndex = 6 - Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
						if (dayIndex >= 0 && dayIndex < 7) {
							correctAnswers[dayIndex] = 1;
						}
					});

					return {
						name: username,
						correctAnswers,
					};
				})
				.slice(0, 5); // Take top 5
		} catch (leaderboardError) {
			console.error("Failed to fetch leaderboard:", leaderboardError);
			// Continue without leaderboard data
		}

		// Map difficulty number to string type
		const difficultyMap: Record<number, "easy" | "medium" | "hard"> = {
			1: "easy",
			2: "easy",
			3: "easy",
			4: "medium",
			5: "medium",
			6: "medium",
			7: "hard",
			8: "hard",
			9: "hard",
			10: "hard",
		};

		const metadata = puzzle.metadata as PuzzleMetadata;

		return {
			id: puzzle.id,
			rebusPuzzle: puzzle.rebusPuzzle,
			answer: puzzle.answer,
			explanation: puzzle.explanation,
			difficulty: difficultyMap[puzzle.difficulty] || "medium",
			leaderboard: leaderboardWithNames,
			hints: metadata?.hints || [],
			metadata,
		};
	} catch (error) {
		console.error("Failed to fetch game data:", error);
		throw new Error("Failed to load puzzle. Please try again later.");
	}
}

export async function getTodaysPuzzle() {
	try {
		// Find the latest puzzle
		const puzzle = await prisma.puzzle.findFirst({
			orderBy: {
				scheduledFor: "desc",
			},
			select: {
				id: true,
				rebusPuzzle: true,
				difficulty: true,
				metadata: true,
			},
		});

		if (!puzzle) {
			throw new Error("No puzzle available");
		}

		return {
			success: true,
			puzzle: {
				id: puzzle.id,
				rebusPuzzle: puzzle.rebusPuzzle,
				difficulty: puzzle.difficulty,
				hints: puzzle.metadata?.hints || [],
			},
		};
	} catch (error) {
		console.error("Failed to get puzzle:", error);
		return {
			success: false,
			error: "Failed to load puzzle",
		};
	}
}

export async function checkPuzzleAnswer(puzzleId: string, answer: string) {
	try {
		const session = await auth();
		const userId = session?.userId;
		if (!userId) {
			throw new Error("User not authenticated");
		}

		// Start a game session or update existing one
		const existingSession = await prisma.gameSession.findFirst({
			where: {
				userId,
				puzzleId,
				endTime: null,
			},
		});

		let gameSession;
		if (!existingSession) {
			gameSession = await prisma.gameSession.create({
				data: {
					userId,
					puzzleId,
					startTime: new Date(),
					attempts: 1,
				},
			});
		} else {
			gameSession = await prisma.gameSession.update({
				where: { id: existingSession.id },
				data: {
					attempts: { increment: 1 },
				},
			});
		}

		// Get the puzzle
		const puzzle = await prisma.puzzle.findUnique({
			where: { id: puzzleId },
			select: {
				answer: true,
				explanation: true,
			},
		});

		if (!puzzle) {
			throw new Error("Puzzle not found");
		}

		// Compare answers (case-insensitive)
		const isCorrect = puzzle.answer.toLowerCase() === answer.toLowerCase();

		// Record the attempt
		const attempt = await prisma.puzzleAttempt.create({
			data: {
				userId,
				puzzleId,
				answer,
				correct: isCorrect,
			},
		});

		// If correct, update game session and user stats
		if (isCorrect) {
			await prisma.gameSession.update({
				where: { id: gameSession.id },
				data: {
					endTime: new Date(),
					isSolved: true,
				},
			});

			// Update user stats
			await prisma.$transaction(async (tx) => {
				const stats = await tx.userStats.findUnique({
					where: { userId },
				});

				if (stats) {
					await tx.userStats.update({
						where: { userId },
						data: {
							totalGames: { increment: 1 },
							wins: { increment: 1 },
							points: { increment: 100 }, // Base points for solving
							lastPlayDate: new Date(),
						},
					});
				} else {
					await tx.userStats.create({
						data: {
							userId,
							totalGames: 1,
							wins: 1,
							points: 100,
							lastPlayDate: new Date(),
						},
					});
				}
			});
		}

		return {
			success: true,
			correct: isCorrect,
			alreadySolved: false, // We'll track this through game sessions instead
			explanation: isCorrect ? puzzle.explanation : null,
		};
	} catch (error) {
		console.error("Failed to check puzzle answer:", error);
		return {
			success: false,
			error: "Failed to check answer",
		};
	}
}

export async function getUserStats(userId: string) {
	try {
		// Get total attempts and correct solutions
		const stats = await prisma.puzzleAttempt.groupBy({
			by: ["correct"],
			where: {
				userId,
			},
			_count: true,
		});

		// Calculate streak
		const attempts = await prisma.puzzleAttempt.findMany({
			where: {
				userId,
				correct: true,
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				createdAt: true,
			},
		});

		let currentStreak = 0;
		let maxStreak = 0;
		let streak = 0;

		if (attempts.length > 0) {
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);

			let lastDate = new Date(attempts[0].createdAt);
			lastDate.setUTCHours(0, 0, 0, 0);

			// Check if the user solved today's puzzle
			if (lastDate.getTime() === today.getTime()) {
				streak = 1;
				for (let i = 1; i < attempts.length; i++) {
					const currentDate = new Date(attempts[i].createdAt);
					currentDate.setUTCHours(0, 0, 0, 0);

					const expectedDate = new Date(lastDate);
					expectedDate.setDate(expectedDate.getDate() - 1);

					if (currentDate.getTime() === expectedDate.getTime()) {
						streak++;
						lastDate = currentDate;
					} else {
						break;
					}
				}
				currentStreak = streak;
			}

			// Calculate max streak
			streak = 1;
			lastDate = new Date(attempts[0].createdAt);
			lastDate.setUTCHours(0, 0, 0, 0);

			for (let i = 1; i < attempts.length; i++) {
				const currentDate = new Date(attempts[i].createdAt);
				currentDate.setUTCHours(0, 0, 0, 0);

				const expectedDate = new Date(lastDate);
				expectedDate.setDate(expectedDate.getDate() - 1);

				if (currentDate.getTime() === expectedDate.getTime()) {
					streak++;
					maxStreak = Math.max(maxStreak, streak);
					lastDate = currentDate;
				} else {
					streak = 1;
					lastDate = currentDate;
				}
			}
			maxStreak = Math.max(maxStreak, streak);
		}

		// Calculate total attempts and success rate
		const totalAttempts = stats.reduce((acc, curr) => acc + curr._count, 0);
		const correctAttempts = stats.find((s) => s.correct)?._count || 0;
		const successRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

		return {
			success: true,
			stats: {
				totalAttempts,
				correctAttempts,
				successRate: Math.round(successRate * 100) / 100,
				currentStreak,
				maxStreak,
			},
		};
	} catch (error) {
		console.error("Failed to get user stats:", error);
		return {
			success: false,
			error: "Failed to load user statistics",
		};
	}
}
