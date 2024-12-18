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
import { KeyboardIcon, X, ArrowRight } from "lucide-react";
import { gameSettings } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { fetchGameData } from "@/app/actions/gameActions";
import { GameData } from "@/lib/gameData";
import { trackEvent, analyticsEvents } from "@/lib/analytics";
import { getFeatureFlag, featureFlags } from "@/lib/featureFlags";

interface GameBoardProps {
	initialPuzzle: GameData;
}

export default function GameBoard({ initialPuzzle }: GameBoardProps) {
	const [currentGuess, setCurrentGuess] = useState("");
	const [gameOver, setGameOver] = useState(false);
	const [nextPlayTime, setNextPlayTime] = useState<Date | null>(null);
	const [rebus, setRebus] = useState<string>(initialPuzzle.rebusPuzzle);
	const [currentEventPuzzle, setCurrentEventPuzzle] = useState<GameData>(initialPuzzle);
	const [showKeyboard, setShowKeyboard] = useState(false);
	const [attemptsLeft, setAttemptsLeft] = useState(gameSettings.maxAttempts);
	const [shake, setShake] = useState(false);
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [lastSubmittedGuess, setLastSubmittedGuess] = useState<string | null>(null);
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
	const [puzzlesPlayedToday, setPuzzlesPlayedToday] = useState(0);
	const [submittedGuesses, setSubmittedGuesses] = useState<string[]>([]);
	const [isGuessFilled, setIsGuessFilled] = useState(false);
	const [advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled] = useState(false);
	const [gameStartTime, setGameStartTime] = useState(Date.now()); // Added gameStartTime state
	const router = useRouter();

	useEffect(() => {
		const storedNextPlayTime = localStorage.getItem("nextPlayTime");
		if (storedNextPlayTime) {
			const nextPlay = new Date(storedNextPlayTime);
			if (nextPlay > new Date()) {
				setNextPlayTime(nextPlay);
				setGameOver(true);
				router.push("/game-over");
			} else {
				localStorage.removeItem("nextPlayTime");
			}
		}
	}, [router]);

	useEffect(() => {
		// Track game start when component mounts
		trackEvent(analyticsEvents.GAME_START);
	}, []);

	useEffect(() => {
		async function checkFeatureFlag() {
			const isEnabled = await getFeatureFlag(featureFlags.ADVANCED_ANALYTICS);
			setAdvancedAnalyticsEnabled(isEnabled);
		}
		checkFeatureFlag();
	}, []);

	const handleGuess = useCallback(async () => {
		if (currentEventPuzzle && currentGuess.length === currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length) {
			const result = await checkGuess(currentGuess, currentEventPuzzle.answer);

			if (advancedAnalyticsEnabled) {
				trackEvent(analyticsEvents.GUESS_SUBMITTED, {
					correct: result.correct,
					attempts: gameSettings.maxAttempts - attemptsLeft + 1,
					guessLength: currentGuess.length,
					timeTaken: Date.now() - gameStartTime,
				});
			} else {
				trackEvent(analyticsEvents.GUESS_SUBMITTED, {
					correct: result.correct,
					attempts: gameSettings.maxAttempts - attemptsLeft + 1,
				});
			}

			setSubmittedGuesses((prev) => [...prev, currentGuess]);
			setLastSubmittedGuess(currentGuess);

			if (result.correct) {
				setGameOver(true);
				setFeedbackMessage("Correct! Well done!");
				const tomorrow = new Date();
				tomorrow.setHours(tomorrow.getHours() + gameSettings.nextGameCountdownHours);
				setNextPlayTime(tomorrow);
				localStorage.setItem("nextPlayTime", tomorrow.toISOString());

				let newStats = { ...userStats };
				newStats = updateDailyChallenge(newStats);
				newStats.totalGames += 1;
				newStats.wins += 1;
				newStats.streak += 1;
				newStats.points += calculatePoints(true, newStats.streak, true);
				const newAchievements = checkAchievements(newStats);
				newStats.achievements = [...newStats.achievements, ...newAchievements];
				const { level } = getLevel(newStats.points);
				newStats.level = level;
				setUserStats(newStats);
				localStorage.setItem("userStats", JSON.stringify(newStats));

				trackEvent(analyticsEvents.GAME_COMPLETE, {
					success: true,
					attempts: gameSettings.maxAttempts - attemptsLeft + 1,
				});

				const encodedGuess = encodeURIComponent(currentGuess);
				const encodedSuccess = encodeURIComponent(result.correct.toString());
				router.push(`/game-over?guess=${encodedGuess}&success=${encodedSuccess}&attempts=${gameSettings.maxAttempts - attemptsLeft + 1}`);
				setPuzzlesPlayedToday(puzzlesPlayedToday + 1);
			} else {
				setAttemptsLeft((prev) => prev - 1);
				setShake(true);
				setTimeout(() => setShake(false), 500);
				if (attemptsLeft === 1) {
					setGameOver(true);
					setFeedbackMessage(`Game over! The correct answer was: ${currentEventPuzzle.answer}`);
					let newStats = { ...userStats };
					newStats.totalGames += 1;
					newStats.streak = 0;
					setUserStats(newStats);
					localStorage.setItem("userStats", JSON.stringify(newStats));

					trackEvent(analyticsEvents.GAME_COMPLETE, {
						success: false,
						attempts: gameSettings.maxAttempts,
					});

					const encodedGuess = encodeURIComponent(currentGuess);
					const encodedSuccess = "false";
					router.push(`/game-over?guess=${encodedGuess}&success=${encodedSuccess}&attempts=${gameSettings.maxAttempts}`);
					setPuzzlesPlayedToday(puzzlesPlayedToday + 1);
				} else {
					setFeedbackMessage(`Incorrect. ${attemptsLeft - 1} ${attemptsLeft - 1 === 1 ? "attempt" : "attempts"} left.`);
					setCurrentGuess("");
				}
			}
			setIsGuessFilled(false);
		}
	}, [currentGuess, currentEventPuzzle, router, userStats, puzzlesPlayedToday, attemptsLeft, advancedAnalyticsEnabled, gameStartTime]);

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

	const toggleKeyboard = () => {
		setShowKeyboard((prev) => !prev);
	};

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
			<div className={cn("w-full flex flex-col items-center", shake && "shake")}>
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

				<div className="w-full flex justify-center mb-2">
					<Badge variant="outline" className="text-[10px] sm:text-xs text-gray-600 border-gray-300 px-2 py-0.5">
						{nextPlayTime ? "Game Over" : `${attemptsLeft} ${attemptsLeft === 1 ? "Attempt" : "Attempts"} Left`}
					</Badge>
				</div>

				{currentEventPuzzle && (
					<div className="w-full flex flex-col items-center">
						<GuessBoxes currentGuess={currentGuess} answer={currentEventPuzzle.answer} gameOver={gameOver} lastSubmittedGuess={lastSubmittedGuess} submittedGuesses={submittedGuesses} onSubmit={handleGuess} isGuessFilled={isGuessFilled} handleGuess={handleGuess} />
						{isGuessFilled && !gameOver && (
							<Button onClick={handleGuess} className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center">
								<span className="mr-2">Enter</span>
								<ArrowRight className="h-4 w-4" />
							</Button>
						)}
					</div>
				)}

				<div className="w-full text-center text-sm text-gray-600 mt-2" aria-live="polite">
					{feedbackMessage}
				</div>

				<div className="w-full flex justify-center mt-4">
					<Button onClick={toggleKeyboard} variant="outline" size="sm" className="flex items-center gap-2" aria-label={showKeyboard ? "Hide keyboard" : "Show keyboard"}>
						{showKeyboard ? <X className="h-4 w-4" /> : <KeyboardIcon className="h-4 w-4" />}
						<span>{showKeyboard ? "Hide Keyboard" : "Show Keyboard"}</span>
					</Button>
				</div>

				{showKeyboard && (
					<div className="w-full flex justify-center mt-4">
						<Keyboard onKeyPress={handleKeyPress} disabled={gameOver || nextPlayTime !== null || !currentEventPuzzle} />
					</div>
				)}
			</div>
		</>
	);
}
