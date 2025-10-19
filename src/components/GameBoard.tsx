"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuessBoxes } from "./GuessBoxes";
import { Keyboard } from "./Keyboard";
import { checkGuess } from "@/lib/gameLogic";
import { ArrowRight } from "lucide-react";
import { gameSettings } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import Script from "next/script";
import type { GameData } from "@/lib/gameSettings";
import { HintBadge } from "./HintBadge";

// Simple local implementations to replace deleted dependencies
interface UserStats {
	points: number;
	streak: number;
	totalGames: number;
	wins: number;
	achievements: string[];
	level: number;
	lastPlayDate: string | null;
	dailyChallengeStreak: number;
}

const calculatePoints = (attempts: number, hintsUsed: number): number => {
	const basePoints = 100;
	const attemptPenalty = (gameSettings.maxAttempts - attempts) * 10;
	const hintPenalty = hintsUsed * 25;
	return Math.max(10, basePoints - attemptPenalty - hintPenalty);
};

const trackEvent = (event: string) => {
	console.log(`Analytics event: ${event}`);
};

interface GameBoardProps {
	gameData: GameData;
}

export default function GameBoard({ gameData }: GameBoardProps) {
	const [currentGuess, setCurrentGuess] = useState("");
	const [gameOver, setGameOver] = useState(false);
	const [nextPlayTime, setNextPlayTime] = useState<Date | null>(() => {
		if (typeof window !== "undefined") {
			const storedTime = localStorage.getItem("nextPlayTime");
			return storedTime ? new Date(storedTime) : null;
		}
		return null;
	});
	const [rebus, setRebus] = useState<string>(gameData.rebusPuzzle);
	const [currentEventPuzzle, setCurrentEventPuzzle] = useState<GameData>(gameData);
	const [attemptsLeft, setAttemptsLeft] = useState<number>(gameSettings.maxAttempts);
	const [shake, setShake] = useState(false);
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [lastSubmittedGuess, setLastSubmittedGuess] = useState<string | null>(null);
	const [finalGuess, setFinalGuess] = useState<string | null>(null);
	const [wasSuccessful, setWasSuccessful] = useState<boolean>(false);
	const [finalAttempts, setFinalAttempts] = useState<number>(0);
	const [userStats, setUserStats] = useState<UserStats>(() => {
		if (typeof window !== "undefined") {
			const savedStats = localStorage.getItem("userStats");
			return savedStats
				? JSON.parse(savedStats)
				: {
						points: 0,
						streak: 0,
						totalGames: 0,
						wins: 0,
						achievements: [],
						level: 1,
						lastPlayDate: null,
						dailyChallengeStreak: 0,
					};
		}
		return {
			points: 0,
			streak: 0,
			totalGames: 0,
			wins: 0,
			achievements: [],
			level: 1,
			lastPlayDate: null,
			dailyChallengeStreak: 0,
		};
	});
	const [error, setError] = useState<{ message: string; details?: string } | null>(null);
	const [isGuessFilled, setIsGuessFilled] = useState(false);
	const [usedHints, setUsedHints] = useState<number[]>([]);
	const router = useRouter();

	// Check if the game is completed from localStorage or gameData
	useEffect(() => {
		const checkCompletionState = async () => {
			try {
				const completionHash = localStorage.getItem("gameCompletion");
				if (completionHash) {
					// Decode and verify the completion data
					const decodedData = JSON.parse(atob(completionHash));

					// Verify the data is for the current puzzle
					if (decodedData.puzzleId === currentEventPuzzle?.id) {
						const now = new Date();
						const nextPlayTime = new Date(decodedData.nextPlayTime);

						if (nextPlayTime > now) {
							setGameOver(true);
							setNextPlayTime(nextPlayTime);
							setFinalGuess(decodedData.finalGuess);
							setWasSuccessful(decodedData.wasSuccessful);
							setFinalAttempts(decodedData.finalAttempts);
							setAttemptsLeft(decodedData.attemptsLeft);
							setUsedHints(decodedData.hintsUsed);
						} else {
							// Clear expired completion data
							localStorage.removeItem("gameCompletion");
						}
					} else {
						// Clear completion data for different puzzle
						localStorage.removeItem("gameCompletion");
					}
				}

				if (gameData.isCompleted) {
					setGameOver(true);
				}
			} catch (error) {
				console.error("Error checking completion state:", error);
				// If there's any error in parsing/verifying, clear the completion data
				localStorage.removeItem("gameCompletion");
			}
		};

		checkCompletionState();
	}, [gameData.isCompleted, currentEventPuzzle?.id]);

	useEffect(() => {
		trackEvent("GAME_START");
	}, []);

	const handleHintReveal = (hintIndex: number) => {
		if (gameOver) return;
		setUsedHints((prev) => [...prev, hintIndex]);
	};

	const calculateHintPenalty = () => {
		return usedHints.length * 0.25;
	};

	const setCompletionState = useCallback(
		(success: boolean, finalGuess: string, attempts: number) => {
			// Set local state
			setGameOver(true);
			setFinalGuess(finalGuess);
			setWasSuccessful(success);
			setFinalAttempts(attempts);

			// Store completion state in localStorage with timestamp
			const now = new Date();
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(0, 0, 0, 0);

			const completionData = {
				nextPlayTime: tomorrow.toISOString(),
				finalGuess,
				wasSuccessful: success,
				finalAttempts: attempts,
				timestamp: now.toISOString(),
				puzzleId: currentEventPuzzle.id,
				attemptsLeft,
				hintsUsed: usedHints,
			};

			// Store encrypted or hashed version of the completion data
			const dataString = JSON.stringify(completionData);
			const hash = btoa(dataString); // Basic encoding, should use more secure method in production

			localStorage.setItem("gameCompletion", hash);
		},
		[currentEventPuzzle?.id, attemptsLeft, usedHints]
	);

	const handleGuess = useCallback(async () => {
		if (gameOver || !currentEventPuzzle || currentGuess.length !== currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length) {
			return;
		}

		try {
			const result = await checkGuess(currentGuess, currentEventPuzzle.answer);

			if (result.correct) {
				const attempts = gameSettings.maxAttempts - attemptsLeft + 1;
				setCompletionState(true, currentGuess, attempts);

				// Set success in cookies (server-side)
				try {
					const { setPuzzleCompleted } = await import("../app/actions/cookieActions");
					await setPuzzleCompleted(currentEventPuzzle.answer, true, attempts);
					console.log("✅ Puzzle completed successfully!");
				} catch (error) {
					console.error("Error setting completion cookie:", error);
				}

				// Update stats
				const newStats = { ...userStats };
				newStats.totalGames += 1;
				newStats.wins += 1;
				newStats.streak += 1;

				const hintPenalty = calculateHintPenalty();
				const basePoints = calculatePoints(gameSettings.maxAttempts - attemptsLeft + 1, usedHints.length);
				const finalPoints = Math.max(Math.floor(basePoints * (1 - hintPenalty)), 1);
				newStats.points += finalPoints;

				// Simple level calculation
				newStats.level = Math.floor(newStats.points / 1000) + 1;

				// Simple achievements check
				const newAchievements: string[] = [];
				if (newStats.streak === 5) newAchievements.push("5-day streak");
				if (newStats.wins === 10) newAchievements.push("10 wins");
				newStats.achievements = [...newStats.achievements, ...newAchievements];

				newStats.lastPlayDate = new Date().toISOString();

				setUserStats(newStats);
				localStorage.setItem("userStats", JSON.stringify(newStats));

				trackEvent("PUZZLE_SOLVED");

				// Delay redirect with cleanup
				const timeoutId = setTimeout(() => {
					router.push("/game-over");
				}, 2000);

				// Store timeout ID for potential cleanup
				return () => clearTimeout(timeoutId);
			} else {
				const newAttemptsLeft = attemptsLeft - 1;
				setAttemptsLeft(newAttemptsLeft);
				setLastSubmittedGuess(currentGuess);

				if (newAttemptsLeft <= 0) {
					setCompletionState(false, currentGuess, gameSettings.maxAttempts);

					// Set failure in cookies (server-side)
					try {
						const { setPuzzleCompleted } = await import("../app/actions/cookieActions");
						await setPuzzleCompleted(currentEventPuzzle.answer, false, gameSettings.maxAttempts);
						console.log("❌ Puzzle failed - stored in cookies");
					} catch (error) {
						console.error("Error setting failure cookie:", error);
					}

					// Update stats for failure
					const newStats = { ...userStats };
					newStats.totalGames += 1;
					newStats.streak = 0; // Reset streak on failure
					newStats.lastPlayDate = new Date().toISOString();

					setUserStats(newStats);
					localStorage.setItem("userStats", JSON.stringify(newStats));

					trackEvent("PUZZLE_FAILED");

					// Redirect to failure page with countdown
					const timeoutId = setTimeout(() => {
						router.push("/puzzle-failed");
					}, 2000);

					// Store timeout ID for potential cleanup
					return () => clearTimeout(timeoutId);
				} else {
					handleIncorrectGuess(newAttemptsLeft);
				}
			}

			setCurrentGuess("");
		} catch (error) {
			console.error("Error processing guess:", error);
			setError({
				message: "Failed to process your guess. Please try again.",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}, [gameOver, currentEventPuzzle, currentGuess, attemptsLeft, setCompletionState, userStats, usedHints, router]);

	// Removed dead code - function was never called

	const handleIncorrectGuess = (attemptsLeft: number) => {
		setShake(true);
		setFeedbackMessage(`Incorrect! ${attemptsLeft} attempts left.`);
		setTimeout(() => {
			setShake(false);
			setFeedbackMessage("");
		}, 1000);
	};

	const handleKeyPress = useCallback(
		(key: string) => {
			if (gameOver || nextPlayTime || !currentEventPuzzle) return;

			if (key === "ENTER") {
				if (isGuessFilled) {
					handleGuess();
				}
			} else if (key === "BACKSPACE") {
				setCurrentGuess((prev) => {
					const newGuess = prev.slice(0, -1);
					setIsGuessFilled(newGuess.length === currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length);
					return newGuess;
				});
				setLastSubmittedGuess(null);
			} else if (/^[A-Z]$/.test(key)) {
				setCurrentGuess((prev) => {
					const newGuess = prev.length < currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length ? prev + key : prev;
					setIsGuessFilled(newGuess.length === currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length);
					return newGuess;
				});
				setLastSubmittedGuess(null);
			}
		},
		[gameOver, nextPlayTime, currentEventPuzzle, handleGuess, isGuessFilled]
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (gameOver || nextPlayTime) return;

			if (event.key === "Enter") {
				event.preventDefault();
				if (isGuessFilled) {
					handleGuess();
				}
			} else if (event.key === "Backspace") {
				handleKeyPress("BACKSPACE");
			} else {
				const key = event.key.toUpperCase();
				if (/^[A-Z]$/.test(key)) {
					handleKeyPress(key);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [gameOver, nextPlayTime, handleGuess, handleKeyPress, isGuessFilled]);

	return (
		<>
			<Script id="structured-data" type="application/ld+json">
				{JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Game",
					name: "Rebuzzle",
					description: "A daily rebus puzzle game challenging players to solve visual word puzzles.",
					url: "https://rebuzzle.com",
					genre: "Puzzle",
					gamePlatform: "Web Browser",
					applicationCategory: "Game",
					operatingSystem: "Any",
					author: {
						"@type": "Organization",
						name: "Rebuzzle Team",
					},
					offers: {
						"@type": "Offer",
						price: "0",
						priceCurrency: "USD",
					},
				})}
			</Script>
			<div className="flex flex-col min-h-screen bg-slate-50">
				{/* Game content area with modern design */}
				<div className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
					<div className="max-w-2xl mx-auto space-y-6">
						{/* Modern status bar */}
						<div className="flex items-center justify-between p-4 bg-white backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full">
									<div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
									<span className="text-sm font-medium text-gray-700">Level {currentEventPuzzle?.difficulty || 1}</span>
								</div>
								{currentEventPuzzle?.hints && <HintBadge hints={currentEventPuzzle.hints} onHintReveal={handleHintReveal} gameId={currentEventPuzzle.id} className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" />}
							</div>
							<div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
								<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								<span className="text-sm font-medium text-gray-600">{attemptsLeft} left</span>
							</div>
						</div>

						{/* Enhanced puzzle display */}
						<div className="text-center space-y-4">
							<div className="p-8 sm:p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
								<div className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 leading-tight">{rebus}</div>
							</div>
							<p className="text-gray-600 font-medium">What does this rebus puzzle represent?</p>
						</div>

						{/* Enhanced guess input area */}
						<div className="space-y-4">
							<GuessBoxes currentGuess={currentGuess} answer={currentEventPuzzle?.answer || ""} gameOver={gameOver} lastSubmittedGuess={lastSubmittedGuess} submittedGuesses={[]} onSubmit={handleGuess} isGuessFilled={isGuessFilled} handleGuess={handleGuess} />
						</div>

						{/* Modern submit button */}
						<div className="flex gap-3">
							<Button onClick={handleGuess} disabled={!isGuessFilled || gameOver} size="lg" className={cn("flex-1 h-14 text-lg font-semibold rounded-2xl", "bg-purple-600 hover:bg-purple-700 text-white", "shadow-lg hover:shadow-xl transition-all duration-300", "disabled:opacity-50 disabled:cursor-not-allowed", shake && "animate-bounce")}>
								<ArrowRight className="mr-2 h-5 w-5" />
								Submit Answer
							</Button>
						</div>

						{/* Enhanced feedback */}
						{feedbackMessage && (
							<div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center">
								<p className="text-lg font-medium text-gray-700">{feedbackMessage}</p>
							</div>
						)}
					</div>
				</div>

				{/* Modern keyboard */}
				<div className="bg-white backdrop-blur-sm border-t border-gray-100">
					<Keyboard onKeyPress={handleKeyPress} disabled={gameOver} />
				</div>
			</div>
		</>
	);
}
