"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuessBoxes } from "./GuessBoxes";
import { Keyboard } from "./Keyboard";
import { checkGuess } from "@/lib/gameLogic";
import { calculatePoints, checkAchievements, getLevel, updateDailyChallenge, UserStats } from "@/lib/gamification";
import { ArrowRight } from "lucide-react";
import { gameSettings } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { fetchGameData } from "@/app/actions/gameActions";
import { GameData } from "@/lib/gameSettings";
import { trackEvent, analyticsEvents } from "@/lib/analytics";
import { getFeatureFlag, featureFlags } from "@/lib/featureFlags";
import { HintBadge } from "./HintBadge";
import { useAuth } from "./AuthProvider";
import { InfoDialog } from "./InfoDialog";

interface GameBoardProps {
	gameData: GameData;
}

export default function GameBoard({ gameData }: GameBoardProps) {
	const { isAuthenticated } = useAuth();
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
	const [advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled] = useState(false);
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
		trackEvent(analyticsEvents.GAME_START);
	}, []);

	useEffect(() => {
		async function checkFeatureFlag() {
			const isEnabled = await getFeatureFlag("ADVANCED_ANALYTICS");
			setAdvancedAnalyticsEnabled(isEnabled);
		}
		checkFeatureFlag();
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

				try {
					await fetch("/api/completion", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
					});
				} catch (error) {
					console.error("Error setting completion state:", error);
				}

				await updateStatsAndRedirect(true);
			} else {
				const newAttemptsLeft = attemptsLeft - 1;
				setAttemptsLeft(newAttemptsLeft);

				if (newAttemptsLeft === 0) {
					setCompletionState(false, currentGuess, gameSettings.maxAttempts);
					await updateStatsAndRedirect(false);
				} else {
					handleIncorrectGuess(newAttemptsLeft);
				}
			}
		} catch (error) {
			console.error("Error processing guess:", error);
			setError({
				message: "Error processing guess",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}, [currentGuess, currentEventPuzzle, attemptsLeft, gameOver, setCompletionState]);

	const updateStatsAndRedirect = async (success: boolean) => {
		try {
			const newStats = { ...userStats };
			newStats.totalGames += 1;

			if (success) {
				newStats.wins += 1;
				newStats.streak += 1;
				newStats.dailyChallengeStreak = updateDailyChallenge(newStats).dailyChallengeStreak;

				const hintPenalty = calculateHintPenalty();
				const basePoints = calculatePoints(true, newStats.streak, true);
				const finalPoints = Math.max(Math.floor(basePoints * (1 - hintPenalty)), 1);
				newStats.points += finalPoints;

				const newAchievements = checkAchievements(newStats);
				newStats.achievements = [...newStats.achievements, ...newAchievements];
				const { level } = getLevel(newStats.points);
				newStats.level = level;

				trackEvent(analyticsEvents.GAME_COMPLETE, {
					success: true,
					attempts: gameSettings.maxAttempts - attemptsLeft + 1,
					hintsUsed: usedHints.length,
					pointsEarned: finalPoints,
					hintPenalty: hintPenalty,
					puzzleId: currentEventPuzzle?.id,
				});
			} else {
				newStats.streak = 0;
				trackEvent(analyticsEvents.GAME_COMPLETE, {
					success: false,
					attempts: gameSettings.maxAttempts,
					puzzleId: currentEventPuzzle?.id,
				});
			}

			// Only store stats if user is authenticated
			if (isAuthenticated) {
				localStorage.setItem("userStats", JSON.stringify(newStats));
				setUserStats(newStats);
			}

			// Redirect to game over page
			const attempts = success ? gameSettings.maxAttempts - attemptsLeft + 1 : gameSettings.maxAttempts;
			router.push(`/game-over?guess=${encodeURIComponent(currentGuess)}&success=${success}&attempts=${attempts}`);
		} catch (error) {
			console.error("Error updating stats:", error);
			setError({
				message: "Error updating stats",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	const handleIncorrectGuess = (attemptsLeft: number) => {
		setShake(true);
		setTimeout(() => setShake(false), 500);
		setFeedbackMessage(`Incorrect. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`);
		setCurrentGuess("");
		setIsGuessFilled(false);
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
			<InfoDialog />
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
			<div className={cn("w-full flex flex-col items-center pb-32 sm:pb-0", shake && "shake")}>
				<Card className="w-full aspect-[16/8] bg-blue-100 flex items-center justify-center mb-4 sm:mb-6 p-4 sm:p-6 md:p-8">
					{error ? (
						<div className="text-red-500 text-center">
							<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">{error.message}</h2>
							{error.details && <pre className="text-xs overflow-auto max-h-40 bg-gray-100 p-2 rounded">{error.details}</pre>}
						</div>
					) : (
						<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-blue-600 text-center">{rebus || "Loading puzzle..."}</h2>
					)}
				</Card>

				<div className="w-full flex justify-between items-center mb-2">
					<Badge variant="outline" className="text-[10px] sm:text-xs text-gray-600 border-gray-300 px-2 py-0.5">
						{gameOver ? "Game Over" : `${attemptsLeft} ${attemptsLeft === 1 ? "Attempt" : "Attempts"} Left`}
					</Badge>
					{!gameOver && currentEventPuzzle.hints && currentEventPuzzle.hints.length > 0 && <HintBadge hints={currentEventPuzzle.hints} onHintReveal={handleHintReveal} gameId={currentEventPuzzle.id} />}
				</div>

				{currentEventPuzzle && (
					<div className="w-full flex flex-col items-center">
						<GuessBoxes currentGuess={currentGuess} answer={currentEventPuzzle.answer} gameOver={gameOver} lastSubmittedGuess={lastSubmittedGuess} submittedGuesses={[]} onSubmit={handleGuess} isGuessFilled={isGuessFilled} handleGuess={handleGuess} />

						{isGuessFilled && !gameOver && (
							<Button onClick={handleGuess} className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center">
								<span className="mr-2">Enter</span>
								<ArrowRight className="h-4 w-4" />
							</Button>
						)}
						{gameOver && (
							<Button
								onClick={() => {
									router.push(`/game-over?guess=${encodeURIComponent(finalGuess || "")}&success=${wasSuccessful}&attempts=${finalAttempts}`);
								}}
								className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md flex items-center"
							>
								<span className="mr-2">View Results</span>
								<ArrowRight className="h-4 w-4" />
							</Button>
						)}
					</div>
				)}

				<div className="w-full text-center text-sm text-gray-600 mt-2" aria-live="polite">
					{gameOver ? <p>Game over! Come back at midnight for a new puzzle.</p> : feedbackMessage}
				</div>

				{!gameOver && (
					<div className="w-full">
						<p className="hidden sm:block text-center text-sm text-gray-500 mb-4">You can use your keyboard to type - just start typing!</p>
						<Keyboard onKeyPress={handleKeyPress} disabled={gameOver || nextPlayTime !== null || !currentEventPuzzle} />
					</div>
				)}
			</div>
		</>
	);
}
