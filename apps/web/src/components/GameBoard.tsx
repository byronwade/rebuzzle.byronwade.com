"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  analyticsEvents,
  trackEvent,
  trackPuzzleAbandon,
  trackPuzzleCompletion,
  trackPuzzleStart,
} from "@/lib/analytics";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import type { GameData } from "@/lib/gameSettings";
import {
  calculateGamePoints,
  engagementConfig,
  gameSettings,
  getDailyBonusMultiplier,
  rollLuckySolve,
} from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { useLazyGuest } from "@/lib/hooks/useLazyGuest";
import { useAuth } from "./AuthProvider";
import { calculateScore, determineAchievements } from "./CelebrationOverlay";
import { DifficultyBadge } from "./DifficultyBadge";
import { useGameContext } from "./GameContext";
import { GuessTrail } from "./GuessTrail";
import { HintBadge } from "./HintBadge";
import { KeyboardAwareLayout } from "./KeyboardAwareLayout";
import { PuzzleContainer, PuzzleDisplay, PuzzleQuestion } from "./PuzzleDisplay";
import { PuzzleMinimal } from "./PuzzleMinimal";
import { PuzzleSkeleton } from "./PuzzleSkeleton";
import { SmartAnswerInput } from "./SmartAnswerInput";

const CelebrationOverlay = dynamic(
  () => import("./CelebrationOverlay").then((mod) => mod.CelebrationOverlay),
  { ssr: false }
);

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

interface GameBoardProps {
  gameData: GameData;
}

// Guess history types
interface WordResult {
  word: string;
  correct: boolean;
  similarity?: number;
}

interface GuessAttempt {
  text: string;
  timestamp: Date;
  wordResults: WordResult[];
  attemptNumber: number;
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
  isSubmitting: boolean;
  guessHistory: GuessAttempt[];
  showCelebration: boolean;
  celebrationScore: number;
  startTime: number;
  // Bonus indicators for variable rewards
  isLuckySolve: boolean;
  dailyBonusMultiplier: number;
  // Hint state
  hintsUsed: number;
  currentHintIndex: number;
}

type GameAction =
  | { type: "SET_CURRENT_GUESS"; payload: string }
  | { type: "SET_GAME_OVER"; payload: boolean }
  | { type: "SET_NEXT_PLAY_TIME"; payload: Date | null }
  | { type: "SET_ATTEMPTS_LEFT"; payload: number }
  | { type: "SET_SHAKE"; payload: boolean }
  | { type: "SET_FEEDBACK_MESSAGE"; payload: string }
  | { type: "SET_LAST_SUBMITTED_GUESS"; payload: string | null }
  | {
      type: "SET_COMPLETION";
      payload: {
        finalGuess: string;
        wasSuccessful: boolean;
        attempts: number;
        nextPlayTime: Date;
        score: number;
        isLuckySolve?: boolean;
        dailyBonusMultiplier?: number;
      };
    }
  | { type: "SET_IS_GUESS_FILLED"; payload: boolean }
  | { type: "SET_IS_SUBMITTING"; payload: boolean }
  | { type: "RESET_GUESS" }
  | { type: "ADD_GUESS_HISTORY"; payload: GuessAttempt }
  | { type: "SET_SHOW_CELEBRATION"; payload: boolean }
  | { type: "REVEAL_HINT" };

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
        showCelebration: action.payload.wasSuccessful,
        celebrationScore: action.payload.score,
        isLuckySolve: action.payload.isLuckySolve ?? false,
        dailyBonusMultiplier: action.payload.dailyBonusMultiplier ?? 1,
      };
    case "SET_IS_GUESS_FILLED":
      return { ...state, isGuessFilled: action.payload };
    case "SET_IS_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "RESET_GUESS":
      return { ...state, currentGuess: "", isGuessFilled: false };
    case "ADD_GUESS_HISTORY":
      return {
        ...state,
        guessHistory: [...state.guessHistory, action.payload],
      };
    case "SET_SHOW_CELEBRATION":
      return { ...state, showCelebration: action.payload };
    case "REVEAL_HINT":
      return {
        ...state,
        hintsUsed: state.hintsUsed + 1,
        currentHintIndex: state.currentHintIndex + 1,
      };
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
  isSubmitting: false,
  guessHistory: [],
  showCelebration: false,
  celebrationScore: 0,
  startTime: Date.now(),
  isLuckySolve: false,
  dailyBonusMultiplier: 1,
  hintsUsed: 0,
  currentHintIndex: 0,
};

export default function GameBoard({ gameData }: GameBoardProps) {
  // Consolidated game state using reducer
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  // Get puzzle display - support both new (puzzle) and legacy (rebusPuzzle) fields
  const puzzleDisplay = useMemo(
    () => gameData.puzzle || gameData.rebusPuzzle || "",
    [gameData.puzzle, gameData.rebusPuzzle]
  );
  const puzzleType = gameData.puzzleType || "rebus";
  const currentEventPuzzle = gameData;
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
  const { userId, isLoading: authLoading } = useAuth();
  const { ensureGuest, isCreating: isCreatingGuest } = useLazyGuest();
  // PrefetchGuestClient warms the session in idle time; board stays interactive.
  const guestReady = Boolean(userId) || !authLoading;
  const { startGame, endGame, setGameState: setContextGameState } = useGameContext();

  // Load stats after auth — cookie identity, no userId query param
  useEffect(() => {
    if (!userId) return;

    const loadUserStats = async () => {
      try {
        const response = await fetch("/api/user/stats");
        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setUserStats({
              points: data.stats.points || 0,
              streak: data.stats.streak || 0,
              totalGames: data.stats.totalGames || 0,
              wins: data.stats.wins || 0,
              achievements: [],
              level: data.stats.level || 1,
              lastPlayDate: data.stats.lastPlayDate || null,
              dailyChallengeStreak: data.stats.dailyChallengeStreak || 0,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load user stats:", err);
      }
    };

    loadUserStats();
  }, [userId]);

  // Sync game state with context for header display
  useEffect(() => {
    if (!gameData.isCompleted) {
      startGame(typeof gameData.difficulty === "number" ? gameData.difficulty : 5);
    }
    return () => {
      endGame();
    };
  }, [gameData.difficulty, gameData.isCompleted, startGame, endGame]);

  // Sync attempts with context
  useEffect(() => {
    setContextGameState({
      currentAttempts: gameSettings.maxAttempts - gameState.attemptsLeft,
    });
  }, [gameState.attemptsLeft, setContextGameState]);

  // Check if the game is completed from gameData
  useEffect(() => {
    if (gameData.isCompleted) {
      dispatch({ type: "SET_GAME_OVER", payload: true });
      endGame();
    }
  }, [gameData.isCompleted, endGame]);

  // Track puzzle start AFTER guest is created
  useEffect(() => {
    if (!guestReady) return; // Wait for guest creation

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
  }, [gameData.id, gameData.difficulty, puzzleType, guestReady]);

  const setCompletionState = useCallback(
    (success: boolean, finalGuess: string, attempts: number, serverScore?: number) => {
      // Daily rollover is UTC midnight — matches server puzzle day + lock
      const tomorrow = getNextUtcMidnight();

      const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

      // Prefer authoritative server points; fall back to local estimate for UX only
      let score =
        typeof serverScore === "number" && serverScore > 0
          ? serverScore
          : success
            ? calculateScore(
                attempts,
                timeTaken,
                userStats.streak,
                difficultyLevel,
                gameState.hintsUsed
              )
            : 0;

      let isLucky = false;
      let dailyMultiplier = 1;

      // Only apply cosmetic lucky/daily multipliers when we don't have server score
      if (success && !(typeof serverScore === "number" && serverScore > 0)) {
        const luckyResult = rollLuckySolve();
        isLucky = luckyResult.isLucky;
        const dailyBonus = getDailyBonusMultiplier();
        dailyMultiplier = dailyBonus.multiplier;
        if (isLucky) {
          score = Math.round(score * luckyResult.multiplier);
        } else if (dailyBonus.hasBonus) {
          score = Math.round(score * dailyMultiplier);
        }
      }

      dispatch({
        type: "SET_COMPLETION",
        payload: {
          finalGuess,
          wasSuccessful: success,
          attempts,
          nextPlayTime: tomorrow,
          score,
          isLuckySolve: isLucky,
          dailyBonusMultiplier: dailyMultiplier,
        },
      });

      if (success) {
        haptics.celebration();
      } else {
        haptics.error();
      }
    },
    [gameState.startTime, gameState.hintsUsed, userStats.streak, gameData.difficulty]
  );

  const handleIncorrectGuess = useCallback((attemptsLeft: number, similarity?: number) => {
    dispatch({ type: "SET_SHAKE", payload: true });

    // Near-miss feedback - psychology: Zeigarnik effect makes almost-wins more motivating
    const isNearMiss = similarity !== undefined && similarity >= engagementConfig.nearMissThreshold;
    const message = isNearMiss
      ? `So close! ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`
      : `Incorrect! ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`;

    dispatch({
      type: "SET_FEEDBACK_MESSAGE",
      payload: message,
    });

    // Haptic feedback - different for near-miss
    if (isNearMiss) {
      haptics.warning(); // Gentler feedback for near-miss
    } else {
      haptics.error();
    }

    setTimeout(
      () => {
        dispatch({ type: "SET_SHAKE", payload: false });
        dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: "" });
      },
      isNearMiss ? 1500 : 1000
    ); // Show near-miss message longer
  }, []);

  const handleGuess = useCallback(
    async (guessValue?: string) => {
      // Use provided guess value or fall back to state
      const guess = guessValue?.trim() || gameState.currentGuess.trim();

      if (gameState.gameOver || !currentEventPuzzle || !guess || gameState.isSubmitting) {
        return;
      }

      // Must have a session cookie before scoring. ensureGuest sets cookies even
      // if React auth state hasn't re-rendered yet — continue after success.
      if (!userId) {
        const created = await ensureGuest();
        if (!created) {
          toast({
            title: "Session error",
            description: "Couldn't start your session. Please refresh and try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Update state with the guess if provided
      if (guessValue !== undefined && guessValue !== gameState.currentGuess) {
        dispatch({ type: "SET_CURRENT_GUESS", payload: guessValue });
      }

      // Optimistic UI update - disable input immediately
      dispatch({ type: "SET_IS_SUBMITTING", payload: true });
      dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: "Checking..." });
      const previousAttemptsLeft = gameState.attemptsLeft;
      const previousLastSubmittedGuess = gameState.lastSubmittedGuess;
      const guessToCheck = guess;
      const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

      try {
        const response = await fetch("/api/puzzles/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleId: gameData.id,
            guess: guessToCheck,
            timeSpentSeconds: timeTaken,
            hintsUsed: gameState.hintsUsed,
          }),
        });

        const result = (await response.json()) as {
          success?: boolean;
          correct?: boolean;
          similarity?: number;
          attemptNumber?: number;
          attemptsLeft?: number;
          gameOver?: boolean;
          locked?: boolean;
          wasSuccessful?: boolean;
          wordResults?: WordResult[];
          answer?: string;
          explanation?: string;
          pointsEarned?: number;
          error?: string;
        };

        dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: "" });

        // Already locked / replay blocked
        if (response.status === 409 || result.locked) {
          setCompletionState(Boolean(result.wasSuccessful), guessToCheck, gameSettings.maxAttempts);
          router.push(
            result.wasSuccessful
              ? `/game-over?success=true&guess=${encodeURIComponent(guessToCheck)}`
              : `/game-over?success=false&guess=${encodeURIComponent(guessToCheck)}&attempts=${gameSettings.maxAttempts}`
          );
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to process guess");
        }

        const wordResults: WordResult[] = result.wordResults || [];
        const attemptNumber = result.attemptNumber ?? gameSettings.maxAttempts - previousAttemptsLeft + 1;

        if (result.correct) {
          const attempts = attemptNumber;
          const earnedPoints =
            result.pointsEarned ??
            calculateGamePoints(attempts, timeTaken, userStats.streak + 1, difficultyLevel);

          const winningHistory = [
            ...gameState.guessHistory,
            {
              text: guessToCheck,
              timestamp: new Date(),
              wordResults,
              attemptNumber: attempts,
            },
          ];

          dispatch({
            type: "ADD_GUESS_HISTORY",
            payload: {
              text: guessToCheck,
              timestamp: new Date(),
              wordResults,
              attemptNumber: attempts,
            },
          });

          setCompletionState(true, guessToCheck, attempts, earnedPoints);

          const newStats = { ...userStats };
          newStats.totalGames += 1;
          newStats.wins += 1;
          newStats.streak += 1;
          newStats.points += earnedPoints;
          newStats.level = Math.floor(newStats.points / 1000) + 1;
          newStats.lastPlayDate = new Date().toISOString();
          setUserStats(newStats);

          trackPuzzleCompletion({
            puzzleId: gameData.id || "unknown",
            puzzleType,
            difficulty:
              typeof gameData.difficulty === "number"
                ? gameData.difficulty.toString()
                : gameData.difficulty || "medium",
            attempts,
            hintsUsed: gameState.hintsUsed,
            completionTime: timeTaken * 1000,
            score: earnedPoints,
          });
          trackEvent(analyticsEvents.GAME_COMPLETE, {
            puzzleId: gameData.id,
            puzzleType,
            attempts,
            hintsUsed: gameState.hintsUsed,
            score: earnedPoints,
          });

          // Persist solution + completion for game-over (server reveals only after lock)
          if (result.answer || result.explanation) {
            localStorage.setItem(
              "lastGameSolution",
              JSON.stringify({
                answer: result.answer,
                explanation: result.explanation,
                puzzleId: gameData.id,
                puzzleDate: new Date().toISOString().slice(0, 10),
              })
            );
          }
          localStorage.setItem(
            "lastGameCompletion",
            JSON.stringify({
              guessHistory: winningHistory,
              timeTaken,
              usedHints: gameState.hintsUsed,
              streak: userStats.streak + 1,
              score: earnedPoints,
            })
          );

          return;
        }

        // Incorrect guess
        const newAttemptsLeft = result.attemptsLeft ?? previousAttemptsLeft - 1;
        dispatch({ type: "SET_ATTEMPTS_LEFT", payload: newAttemptsLeft });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: guessToCheck });

        dispatch({
          type: "ADD_GUESS_HISTORY",
          payload: {
            text: guessToCheck,
            timestamp: new Date(),
            wordResults,
            attemptNumber,
          },
        });

        if (result.gameOver || newAttemptsLeft <= 0) {
          setCompletionState(false, guessToCheck, gameSettings.maxAttempts);

          const newStats = { ...userStats };
          newStats.totalGames += 1;
          newStats.streak = 0;
          newStats.lastPlayDate = new Date().toISOString();
          setUserStats(newStats);

          trackPuzzleAbandon({
            puzzleId: gameData.id || "unknown",
            puzzleType,
            attempts: gameSettings.maxAttempts,
            hintsUsed: gameState.hintsUsed,
          });
          trackEvent(analyticsEvents.PUZZLE_ABANDON, {
            puzzleId: gameData.id,
            puzzleType,
            attempts: gameSettings.maxAttempts,
            hintsUsed: gameState.hintsUsed,
          });

          if (result.answer || result.explanation) {
            localStorage.setItem(
              "lastGameSolution",
              JSON.stringify({
                answer: result.answer,
                explanation: result.explanation,
                puzzleId: gameData.id,
                puzzleDate: new Date().toISOString().slice(0, 10),
              })
            );
          }

          const completionData = {
            guessHistory: [
              ...gameState.guessHistory,
              {
                text: guessToCheck,
                timestamp: new Date(),
                wordResults,
                attemptNumber: gameSettings.maxAttempts,
              },
            ],
            timeTaken,
            usedHints: gameState.hintsUsed,
            streak: 0,
            score: 0,
          };
          localStorage.setItem("lastGameCompletion", JSON.stringify(completionData));

          router.push(
            `/game-over?success=false&guess=${encodeURIComponent(guessToCheck)}&attempts=${gameSettings.maxAttempts}`
          );
          return;
        }

        trackEvent(analyticsEvents.GUESS_SUBMITTED, {
          puzzleId: gameData.id || "unknown",
          puzzleType,
          attemptNumber,
          isCorrect: false,
        });

        const overallSimilarity =
          typeof result.similarity === "number"
            ? result.similarity
            : wordResults.length > 0
              ? Math.round(
                  wordResults.reduce((acc, w) => acc + (w.similarity ?? 0), 0) / wordResults.length
                )
              : 0;

        handleIncorrectGuess(newAttemptsLeft, overallSimilarity);
        dispatch({ type: "RESET_GUESS" });
      } catch (error) {
        console.error("Error processing guess:", error);
        dispatch({ type: "SET_ATTEMPTS_LEFT", payload: previousAttemptsLeft });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: previousLastSubmittedGuess });
        setError({
          message: "Failed to process your guess. Please try again.",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        dispatch({ type: "SET_IS_SUBMITTING", payload: false });
      }
    },
    [
      gameState.gameOver,
      gameState.currentGuess,
      gameState.attemptsLeft,
      gameState.isSubmitting,
      gameState.lastSubmittedGuess,
      gameState.startTime,
      gameState.guessHistory,
      gameState.hintsUsed,
      currentEventPuzzle,
      setCompletionState,
      userStats,
      userId,
      ensureGuest,
      gameData.id,
      puzzleType,
      gameData.difficulty,
      router,
      handleIncorrectGuess,
    ]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (
        gameState.gameOver ||
        gameState.nextPlayTime ||
        !currentEventPuzzle ||
        gameState.isSubmitting
      )
        return;

      // Free-form answers — no answer-length gating (answer is not on the client)
      if (key === "ENTER") {
        if (gameState.currentGuess.trim()) {
          handleGuess();
        }
      } else if (key === "BACKSPACE") {
        const newGuess = gameState.currentGuess.slice(0, -1);
        dispatch({ type: "SET_CURRENT_GUESS", payload: newGuess });
        dispatch({ type: "SET_IS_GUESS_FILLED", payload: newGuess.trim().length > 0 });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: null });
      } else if (/^[A-Z]$/.test(key)) {
        const newGuess = gameState.currentGuess + key;
        dispatch({ type: "SET_CURRENT_GUESS", payload: newGuess });
        dispatch({ type: "SET_IS_GUESS_FILLED", payload: true });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: null });
      }
    },
    [
      gameState.gameOver,
      gameState.nextPlayTime,
      gameState.currentGuess,
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
      const isInputFocused =
        activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement;

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

  // Auth still resolving — keep a puzzle-shaped shell (no spinner page)
  if (authLoading || isCreatingGuest) {
    return <PuzzleSkeleton />;
  }

  return (
    <>
      {/* Main content area - keyboard-aware layout */}
      <KeyboardAwareLayout>
        {({ isKeyboardVisible }) => (
          <div className="flex flex-col h-full">
            {/* Puzzle area - collapses when keyboard is visible, centers content */}
            <main className="flex-1 overflow-hidden transition-all duration-300 puzzle-area flex flex-col">
              {isKeyboardVisible ? (
                /* COLLAPSED VIEW - minimal puzzle hint when keyboard is open */
                <div className="flex flex-col items-center pt-2">
                  <PuzzleMinimal
                    puzzle={puzzleDisplay}
                    puzzleType={puzzleType}
                    className="w-full max-w-2xl"
                  />
                  {/* Show last guess attempt in collapsed view */}
                  {gameState.guessHistory.length > 0 && (
                    <div className="mt-1.5 font-mono text-[11px] text-subtle uppercase tracking-[0.08em]">
                      Last: {gameState.guessHistory[gameState.guessHistory.length - 1]?.text}
                    </div>
                  )}
                </div>
              ) : (
                /* EXPANDED VIEW — focused play stage */
                <div className="play-stage flex-1 flex flex-col items-center justify-center px-4 py-[clamp(0.5rem,2vh,1rem)] md:px-6 overflow-hidden">
                  <div className="mb-[clamp(0.75rem,2.5vh,1.25rem)] flex w-full max-w-2xl items-start justify-between gap-3">
                    <DifficultyBadge
                      difficulty={currentEventPuzzle?.difficulty}
                      showDescription
                      className="play-fade-in"
                    />
                    {gameData.hints && gameData.hints.length > 0 && !gameState.gameOver && (
                      <HintBadge
                        hints={gameData.hints}
                        gameId={gameData.id}
                        onHintReveal={(hintIndex) => {
                          dispatch({ type: "REVEAL_HINT" });
                          trackEvent(analyticsEvents.HINT_USED, {
                            puzzleId: gameData.id || "unknown",
                            hintIndex,
                          });
                        }}
                      />
                    )}
                  </div>

                  <section
                    aria-label="Puzzle"
                    className="play-puzzle-panel w-full max-w-2xl text-center"
                  >
                    <PuzzleContainer>
                      <PuzzleDisplay
                        puzzle={puzzleDisplay}
                        puzzleType={puzzleType}
                        size={
                          puzzleType === "riddle" ||
                          puzzleType === "trivia" ||
                          puzzleType === "logic-grid" ||
                          puzzleType === "cryptic-crossword"
                            ? "small"
                            : "large"
                        }
                      />
                    </PuzzleContainer>
                    <PuzzleQuestion puzzleType={puzzleType} />
                  </section>

                  <GuessTrail
                    attempts={gameState.guessHistory}
                    className="mt-[clamp(0.75rem,2.5vh,1.5rem)] max-h-[clamp(72px,14vh,120px)] overflow-y-auto"
                  />
                </div>
              )}
            </main>

            {gameState.feedbackMessage && (
              <div
                aria-live="polite"
                className="mx-4 mb-2 flex justify-center slide-in-from-bottom-2 fade-in-up animate-in duration-300 motion-reduce:animate-none"
                role="status"
              >
                <div
                  className={`rounded-full border px-3.5 py-1.5 backdrop-blur-md ${
                    gameState.feedbackMessage === "Checking..."
                      ? "border-border bg-card text-muted-foreground"
                      : gameState.feedbackMessage.startsWith("So close")
                        ? "border-warning/30 bg-warning/10 text-foreground"
                        : "border-destructive/25 bg-destructive/10 text-destructive"
                  }`}
                >
                  <p className="font-medium text-sm">{gameState.feedbackMessage}</p>
                </div>
              </div>
            )}

            {/* Error display - positioned above input area */}
            {error && (
              <div
                className="mx-4 mb-2 flex justify-center slide-in-from-bottom-2 fade-in-up animate-in duration-300 motion-reduce:animate-none"
                role="alert"
              >
                <div className="rounded-lg border border-destructive/25 bg-card p-4 text-center shadow-lg">
                  <p className="font-medium text-destructive text-sm">{error.message}</p>
                  {error.details && (
                    <p className="mt-1.5 text-muted-foreground text-xs">{error.details}</p>
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
              </div>
            )}

            <section
              aria-label="Answer input"
              className="play-dock shrink-0 z-30 px-4 pt-3 pb-safe-lg md:px-6 input-area input-area-keyboard-transition"
            >
              <div className="mx-auto max-w-2xl">
                <SmartAnswerInput
                  puzzleId={gameData.id}
                  difficulty={currentEventPuzzle?.difficulty || 5}
                  disabled={
                    gameState.gameOver ||
                    gameState.isSubmitting ||
                    (!userId && isCreatingGuest)
                  }
                  isSubmitting={gameState.isSubmitting || isCreatingGuest}
                  onSubmit={handleGuess}
                  puzzle={currentEventPuzzle?.puzzle || ""}
                  puzzleType={currentEventPuzzle?.puzzleType || "rebus"}
                />
              </div>
            </section>
          </div>
        )}
      </KeyboardAwareLayout>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        isVisible={gameState.showCelebration}
        score={gameState.celebrationScore}
        streak={userStats.streak}
        attempts={gameState.finalAttempts}
        maxAttempts={gameSettings.maxAttempts}
        timeTaken={Math.floor((Date.now() - gameState.startTime) / 1000)}
        achievements={determineAchievements(
          gameState.finalAttempts,
          gameSettings.maxAttempts,
          Math.floor((Date.now() - gameState.startTime) / 1000),
          userStats.streak,
          gameState.hintsUsed === 0 // "Pure Skill" achievement when no hints used
        )}
        isLuckySolve={gameState.isLuckySolve}
        dailyBonusMultiplier={gameState.dailyBonusMultiplier}
        onComplete={() => {
          dispatch({ type: "SET_SHOW_CELEBRATION", payload: false });
          // Store game completion data in localStorage for success page
          const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
          const completionData = {
            guessHistory: gameState.guessHistory,
            timeTaken,
            usedHints: gameState.hintsUsed,
            streak: userStats.streak,
            score: gameState.celebrationScore,
          };
          localStorage.setItem("lastGameCompletion", JSON.stringify(completionData));
          router.push(
            `/game-over?success=true&guess=${encodeURIComponent(gameState.finalGuess || "")}&attempts=${gameState.finalAttempts}&time=${timeTaken}`
          );
        }}
      />
    </>
  );
}
