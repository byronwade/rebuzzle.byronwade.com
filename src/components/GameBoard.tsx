"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  analyticsEvents,
  trackEvent,
  trackPuzzleAbandon,
  trackPuzzleCompletion,
  trackPuzzleStart,
} from "@/lib/analytics";
import {
  getDifficultyName,
  getGroupedDailyDifficulties,
} from "@/lib/difficulty";
import { checkGuess } from "@/lib/gameLogic";
import type { GameData } from "@/lib/gameSettings";
import { gameSettings } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { HintBadge } from "./HintBadge";
import {
  PuzzleContainer,
  PuzzleDisplay,
  PuzzleQuestion,
} from "./PuzzleDisplay";
import { SmartAnswerInput } from "./SmartAnswerInput";

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

interface GameBoardProps {
  gameData: GameData;
}

// Game state reducer
interface GameState {
  currentGuess: string;
  gameOver: boolean;
  nextPlayTime: Date | null;
  attemptsLeft: number;
  shake: boolean;
  feedbackMessage: string;
  lastSubmittedGuess: string | null;
  finalGuess: string | null;
  wasSuccessful: boolean;
  finalAttempts: number;
  isGuessFilled: boolean;
  usedHints: number[];
  isSubmitting: boolean;
}

type GameAction =
  | { type: "SET_CURRENT_GUESS"; payload: string }
  | { type: "SET_GAME_OVER"; payload: boolean }
  | { type: "SET_NEXT_PLAY_TIME"; payload: Date | null }
  | { type: "SET_ATTEMPTS_LEFT"; payload: number }
  | { type: "SET_SHAKE"; payload: boolean }
  | { type: "SET_FEEDBACK_MESSAGE"; payload: string }
  | { type: "SET_LAST_SUBMITTED_GUESS"; payload: string | null }
  | { type: "SET_COMPLETION"; payload: { finalGuess: string; wasSuccessful: boolean; attempts: number; nextPlayTime: Date } }
  | { type: "SET_IS_GUESS_FILLED"; payload: boolean }
  | { type: "ADD_HINT"; payload: number }
  | { type: "SET_IS_SUBMITTING"; payload: boolean }
  | { type: "RESET_GUESS" };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "SET_CURRENT_GUESS":
      return { ...state, currentGuess: action.payload };
    case "SET_GAME_OVER":
      return { ...state, gameOver: action.payload };
    case "SET_NEXT_PLAY_TIME":
      return { ...state, nextPlayTime: action.payload };
    case "SET_ATTEMPTS_LEFT":
      return { ...state, attemptsLeft: action.payload };
    case "SET_SHAKE":
      return { ...state, shake: action.payload };
    case "SET_FEEDBACK_MESSAGE":
      return { ...state, feedbackMessage: action.payload };
    case "SET_LAST_SUBMITTED_GUESS":
      return { ...state, lastSubmittedGuess: action.payload };
    case "SET_COMPLETION":
      return {
        ...state,
        gameOver: true,
        finalGuess: action.payload.finalGuess,
        wasSuccessful: action.payload.wasSuccessful,
        finalAttempts: action.payload.attempts,
        nextPlayTime: action.payload.nextPlayTime,
      };
    case "SET_IS_GUESS_FILLED":
      return { ...state, isGuessFilled: action.payload };
    case "ADD_HINT":
      return {
        ...state,
        usedHints: [...state.usedHints, action.payload],
      };
    case "SET_IS_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "RESET_GUESS":
      return { ...state, currentGuess: "", isGuessFilled: false };
    default:
      return state;
  }
};

const initialState: GameState = {
  currentGuess: "",
  gameOver: false,
  nextPlayTime: null,
  attemptsLeft: gameSettings.maxAttempts,
  shake: false,
  feedbackMessage: "",
  lastSubmittedGuess: null,
  finalGuess: null,
  wasSuccessful: false,
  finalAttempts: 0,
  isGuessFilled: false,
  usedHints: [],
  isSubmitting: false,
};

export default function GameBoard({ gameData }: GameBoardProps) {
  // Consolidated game state using reducer
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  // Get puzzle display - support both new (puzzle) and legacy (rebusPuzzle) fields
  const puzzleDisplay = useMemo(
    () => gameData.puzzle || (gameData as { rebusPuzzle?: string }).rebusPuzzle || "",
    [gameData]
  );
  const puzzleType = gameData.puzzleType || "rebus";
  const [puzzle, setPuzzle] = useState<string>(puzzleDisplay);
  const [currentEventPuzzle, setCurrentEventPuzzle] =
    useState<GameData>(gameData);
  const [userStats, setUserStats] = useState<UserStats>({
    points: 0,
    streak: 0,
    totalGames: 0,
    wins: 0,
    achievements: [],
    level: 1,
    lastPlayDate: null,
    dailyChallengeStreak: 0,
  });
  const [error, setError] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  const router = useRouter();
  const { userId } = useAuth();

  // Check if the game is completed from gameData
  useEffect(() => {
    if (gameData.isCompleted) {
      dispatch({ type: "SET_GAME_OVER", payload: true });
    }
  }, [gameData.isCompleted]);

  // Track puzzle start on mount
  useEffect(() => {
    trackPuzzleStart({
      puzzleId: gameData.id || "unknown",
      puzzleType,
      difficulty:
        typeof gameData.difficulty === "number"
          ? gameData.difficulty.toString()
          : gameData.difficulty || "medium",
    });
    trackEvent(analyticsEvents.GAME_START, {
      puzzleId: gameData.id,
      puzzleType,
    });
  }, []);

  const handleHintReveal = useCallback(
    (hintIndex: number) => {
      if (gameState.gameOver) return;
      dispatch({ type: "ADD_HINT", payload: hintIndex });
      // Track hint usage
      trackEvent(analyticsEvents.HINT_USED, {
        puzzleId: gameData.id || "unknown",
        puzzleType,
        hintIndex,
        totalHintsUsed: gameState.usedHints.length + 1,
      });
    },
    [gameState.gameOver, gameState.usedHints.length, gameData.id, puzzleType]
  );

  const calculateHintPenalty = useCallback(
    () => gameState.usedHints.length * 0.25,
    [gameState.usedHints.length]
  );

  const setCompletionState = useCallback(
    (success: boolean, finalGuess: string, attempts: number) => {
      // Calculate next play time
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Dispatch completion action (batches all state updates)
      dispatch({
        type: "SET_COMPLETION",
        payload: {
          finalGuess,
          wasSuccessful: success,
          attempts,
          nextPlayTime: tomorrow,
        },
      });
    },
    []
  );

  const handleGuess = useCallback(async (guessValue?: string) => {
    // Use provided guess value or fall back to state
    const guess = guessValue?.trim() || gameState.currentGuess.trim();
    
    if (
      gameState.gameOver ||
      !currentEventPuzzle ||
      !guess ||
      gameState.isSubmitting
    ) {
      return;
    }

    // Update state with the guess if provided
    if (guessValue !== undefined && guessValue !== gameState.currentGuess) {
      dispatch({ type: "SET_CURRENT_GUESS", payload: guessValue });
    }

    // Optimistic UI update - disable input immediately
    dispatch({ type: "SET_IS_SUBMITTING", payload: true });
    const previousAttemptsLeft = gameState.attemptsLeft;
    const previousLastSubmittedGuess = gameState.lastSubmittedGuess;
    const guessToCheck = guess;

    try {
      const result = await checkGuess(guessToCheck, currentEventPuzzle.answer);

      if (result.correct) {
        // Optimistically update UI for correct guess
        const attempts = gameSettings.maxAttempts - previousAttemptsLeft + 1;
        setCompletionState(true, guessToCheck, attempts);

        // Puzzle completion will be tracked in database
        console.log("✅ Puzzle completed successfully!");

        // Update stats
        const newStats = { ...userStats };
        newStats.totalGames += 1;
        newStats.wins += 1;
        newStats.streak += 1;

        const hintPenalty = calculateHintPenalty();
        const basePoints = calculatePoints(attempts, gameState.usedHints.length);
        const finalPoints = Math.max(
          Math.floor(basePoints * (1 - hintPenalty)),
          1
        );
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

        // Update stats in database
        if (userId) {
          try {
            const response = await fetch("/api/user/update-stats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                gameResult: {
                  won: true,
                  attempts,
                  timeSpent: 0, // Could track actual time
                },
              }),
            });

            if (!response.ok) {
              console.error("Failed to update user stats in database");
            }
          } catch (error) {
            console.error("Error updating user stats:", error);
          }
        }

        // Track puzzle completion
        const completionTime = Date.now(); // Could track actual start time
        trackPuzzleCompletion({
          puzzleId: gameData.id || "unknown",
          puzzleType,
          difficulty:
            typeof gameData.difficulty === "number"
              ? gameData.difficulty.toString()
              : gameData.difficulty || "medium",
          attempts,
          hintsUsed: gameState.usedHints.length,
          completionTime,
          score: finalPoints,
        });
        trackEvent(analyticsEvents.GAME_COMPLETE, {
          puzzleId: gameData.id,
          puzzleType,
          attempts,
          hintsUsed: gameState.usedHints.length,
          score: finalPoints,
        });

        // Delay redirect with success params
        const timeoutId = setTimeout(() => {
          router.push(
            `/game-over?success=true&guess=${encodeURIComponent(guessToCheck)}&attempts=${attempts}`
          );
        }, 2000);

        // Store timeout ID for potential cleanup
        return () => clearTimeout(timeoutId);
      }
      // Optimistically update UI for incorrect guess
      const newAttemptsLeft = previousAttemptsLeft - 1;
      dispatch({ type: "SET_ATTEMPTS_LEFT", payload: newAttemptsLeft });
      dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: guessToCheck });

      if (newAttemptsLeft <= 0) {
        setCompletionState(false, guessToCheck, gameSettings.maxAttempts);

        // Puzzle failure will be tracked in database
        console.log("❌ Puzzle failed - stats updated in database");

        // Update stats for failure
        const newStats = { ...userStats };
        newStats.totalGames += 1;
        newStats.streak = 0; // Reset streak on failure
        newStats.lastPlayDate = new Date().toISOString();

        setUserStats(newStats);

        // Update stats in database
        if (userId) {
          try {
            const response = await fetch("/api/user/update-stats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                gameResult: {
                  won: false,
                  attempts: gameSettings.maxAttempts,
                  timeSpent: 0,
                },
              }),
            });

            if (!response.ok) {
              console.error("Failed to update user stats in database");
            }
          } catch (error) {
            console.error("Error updating user stats:", error);
          }
        }

        // Track puzzle abandonment (failed to complete)
        trackPuzzleAbandon({
          puzzleId: gameData.id || "unknown",
          puzzleType,
          attempts: gameSettings.maxAttempts,
          hintsUsed: gameState.usedHints.length,
        });
        trackEvent(analyticsEvents.PUZZLE_ABANDON, {
          puzzleId: gameData.id,
          puzzleType,
          attempts: gameSettings.maxAttempts,
          hintsUsed: gameState.usedHints.length,
        });

        // Redirect to failure page with params
        const timeoutId = setTimeout(() => {
          router.push(
            `/puzzle-failed?guess=${encodeURIComponent(guessToCheck)}&attempts=${gameSettings.maxAttempts}`
          );
        }, 2000);

        // Store timeout ID for potential cleanup
        return () => clearTimeout(timeoutId);
      }

      // Track guess submission
      trackEvent(analyticsEvents.GUESS_SUBMITTED, {
        puzzleId: gameData.id || "unknown",
        puzzleType,
        attemptNumber: gameSettings.maxAttempts - newAttemptsLeft,
        isCorrect: false,
      });

      handleIncorrectGuess(newAttemptsLeft);

      dispatch({ type: "RESET_GUESS" });
    } catch (error) {
      console.error("Error processing guess:", error);
      // Rollback optimistic update on error
      dispatch({ type: "SET_ATTEMPTS_LEFT", payload: previousAttemptsLeft });
      dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: previousLastSubmittedGuess });
      setError({
        message: "Failed to process your guess. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      dispatch({ type: "SET_IS_SUBMITTING", payload: false });
    }
  }, [
    gameState.gameOver,
    gameState.currentGuess,
    gameState.attemptsLeft,
    gameState.isSubmitting,
    gameState.usedHints,
    currentEventPuzzle,
    setCompletionState,
    userStats,
    router,
  ]);

  const handleIncorrectGuess = useCallback((attemptsLeft: number) => {
    dispatch({ type: "SET_SHAKE", payload: true });
    dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: `Incorrect! ${attemptsLeft} attempts left.` });
    setTimeout(() => {
      dispatch({ type: "SET_SHAKE", payload: false });
      dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: "" });
    }, 1000);
  }, []);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState.gameOver || gameState.nextPlayTime || !currentEventPuzzle || gameState.isSubmitting)
        return;

      if (key === "ENTER") {
        if (gameState.isGuessFilled) {
          handleGuess();
        }
      } else if (key === "BACKSPACE") {
        const newGuess = gameState.currentGuess.slice(0, -1);
        const isFilled = newGuess.length ===
          currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length;
        dispatch({ type: "SET_CURRENT_GUESS", payload: newGuess });
        dispatch({ type: "SET_IS_GUESS_FILLED", payload: isFilled });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: null });
      } else if (/^[A-Z]$/.test(key)) {
        const newGuess =
          gameState.currentGuess.length <
          currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length
            ? gameState.currentGuess + key
            : gameState.currentGuess;
        const isFilled = newGuess.length ===
          currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length;
        dispatch({ type: "SET_CURRENT_GUESS", payload: newGuess });
        dispatch({ type: "SET_IS_GUESS_FILLED", payload: isFilled });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: null });
      }
    },
    [
      gameState.gameOver,
      gameState.nextPlayTime,
      gameState.currentGuess,
      gameState.isGuessFilled,
      gameState.isSubmitting,
      currentEventPuzzle,
      handleGuess,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState.gameOver || gameState.nextPlayTime || gameState.isSubmitting) return;

      // Don't interfere with textarea/input keydown handlers
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLTextAreaElement || 
                            activeElement instanceof HTMLInputElement;
      
      if (event.key === "Enter") {
        // Only handle Enter for the old GuessBoxes component, not for SmartAnswerInput
        if (!isInputFocused && gameState.isGuessFilled) {
          event.preventDefault();
          handleGuess();
        }
        // If input is focused, let SmartAnswerInput handle it
      } else if (event.key === "Backspace") {
        if (!isInputFocused) {
          handleKeyPress("BACKSPACE");
        }
      } else {
        const key = event.key.toUpperCase();
        if (/^[A-Z]$/.test(key) && !isInputFocused) {
          handleKeyPress(key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    gameState.gameOver,
    gameState.nextPlayTime,
    gameState.isGuessFilled,
    gameState.isSubmitting,
    handleGuess,
    handleKeyPress,
  ]);

  return (
    <>
      <Script id="structured-data" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Game",
          name: "Rebuzzle",
          description:
            "A daily rebus puzzle game challenging players to solve visual word puzzles.",
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
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
        <main className="space-y-4">
          {/* Modern status bar */}
          <section
            aria-label="Game status"
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/80 p-4 shadow-md backdrop-blur-md transition-shadow duration-200 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 transition-all duration-200 hover:bg-purple-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:bg-purple-900/30 dark:hover:bg-purple-900/50">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-sm motion-reduce:animate-none" />
                    <span className="font-medium text-foreground text-sm">
                      {getDifficultyName(currentEventPuzzle?.difficulty)}
                    </span>
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80">
                  <div className="space-y-3">
                    <div>
                      <h4 className="mb-2 font-semibold text-base md:text-lg">
                        Daily Difficulties
                      </h4>
                      <p className="mb-3 text-muted-foreground text-sm">
                        These are the difficulty levels you might encounter day
                        to day:
                      </p>
                    </div>
                    <div className="space-y-2">
                      {getGroupedDailyDifficulties().map((difficulty) => {
                        const levelRange =
                          difficulty.levels.length === 1
                            ? `Level ${difficulty.levels[0]}`
                            : `Levels ${difficulty.levels[0]}-${difficulty.levels[difficulty.levels.length - 1]}`;
                        const isCurrentDifficulty = difficulty.levels.includes(
                          typeof currentEventPuzzle?.difficulty === "number"
                            ? currentEventPuzzle.difficulty
                            : 0
                        );

                        return (
                          <div
                            className={cn(
                              "rounded-lg border p-3",
                              isCurrentDifficulty
                                ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                                : "border-border bg-card"
                            )}
                            key={difficulty.name}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {difficulty.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {levelRange}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {difficulty.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {currentEventPuzzle?.hints && (
                <HintBadge
                  className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                  gameId={currentEventPuzzle.id}
                  hints={currentEventPuzzle.hints}
                  onHintReveal={handleHintReveal}
                />
              )}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm" />
              <span className="font-medium text-muted-foreground text-sm">
                {gameState.attemptsLeft} left
              </span>
            </div>
          </section>

          {/* Enhanced puzzle display */}
          <section aria-label="Puzzle" className="space-y-3 text-center">
            <PuzzleContainer>
              <PuzzleDisplay
                puzzle={puzzle}
                puzzleType={puzzleType}
                size={
                  // Text-based puzzles use smaller size for better readability
                  puzzleType === "riddle" ||
                  puzzleType === "trivia" ||
                  puzzleType === "logic-grid" ||
                  puzzleType === "cryptic-crossword"
                    ? "small"
                    : // Visual and code puzzles use large for better visibility
                      puzzleType === "rebus" ||
                        puzzleType === "pattern-recognition" ||
                        puzzleType === "number-sequence" ||
                        puzzleType === "caesar-cipher"
                      ? "large"
                      : // Default to large for other types
                        "large"
                }
              />
            </PuzzleContainer>
            <PuzzleQuestion puzzleType={puzzleType} />
          </section>

          {/* Smart answer input with real-time validation */}
          <section aria-label="Answer input" className="space-y-4">
            <SmartAnswerInput
              correctAnswer={currentEventPuzzle?.answer || ""}
              difficulty={currentEventPuzzle?.difficulty || 5}
              disabled={gameState.gameOver || gameState.isSubmitting}
              isSubmitting={gameState.isSubmitting}
              onSubmit={handleGuess}
              puzzle={currentEventPuzzle?.puzzle || ""}
              puzzleType={currentEventPuzzle?.puzzleType || "rebus"}
            />
          </section>

          {/* Enhanced feedback */}
          {gameState.feedbackMessage && (
            <div
              aria-live="polite"
              className="slide-in-from-top-2 fade-in-up animate-in rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center shadow-sm duration-300 motion-reduce:animate-none dark:border-blue-800 dark:bg-blue-900/20"
              role="status"
            >
              <p className="font-medium text-foreground text-sm">
                {gameState.feedbackMessage}
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div
              className="slide-in-from-top-2 fade-in-up animate-in rounded-2xl border border-red-200 bg-red-50 p-4 text-center shadow-md duration-300 motion-reduce:animate-none dark:border-red-800 dark:bg-red-900/20"
              role="alert"
            >
              <p className="font-semibold text-red-700 text-sm dark:text-red-400">
                {error.message}
              </p>
              {error.details && (
                <p className="mt-2 text-red-600 text-xs dark:text-red-500">
                  {error.details}
                </p>
              )}
              <Button
                className="mt-3"
                onClick={() => setError(null)}
                size="sm"
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
