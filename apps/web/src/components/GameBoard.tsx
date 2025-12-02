"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  analyticsEvents,
  trackEvent,
  trackPuzzleAbandon,
  trackPuzzleCompletion,
  trackPuzzleStart,
} from "@/lib/analytics";
import { getAchievementDifficultyCategory } from "@/lib/difficulty";
import { checkGuess } from "@/lib/gameLogic";
import type { GameData } from "@/lib/gameSettings";
import {
  calculateGamePoints,
  engagementConfig,
  gameSettings,
  getDailyBonusMultiplier,
  rollLuckySolve,
} from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { useAuth } from "./AuthProvider";
import { CelebrationOverlay, calculateScore, determineAchievements } from "./CelebrationOverlay";
import { useGameContext } from "./GameContext";
import { PersonalizedGreeting } from "./PersonalizedGreeting";
import { PuzzleContainer, PuzzleDisplay, PuzzleQuestion } from "./PuzzleDisplay";
import { SmartAnswerInput } from "./SmartAnswerInput";
import { SolveCounter } from "./SolveCounter";

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

// Note: calculatePoints has been replaced by calculateGamePoints from gameSettings
// which includes all 4 scoring factors: Speed, Accuracy, Streak, and Difficulty

// Simple Levenshtein distance for similarity calculation
const calculateSimilarity = (a: string, b: string): number => {
  if (a === b) return 100;
  if (!a || !b) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]?.[j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]?.[j - 1]! + 1,
          matrix[i]?.[j - 1]! + 1,
          matrix[i - 1]?.[j]! + 1
        );
      }
    }
  }
  const distance = matrix[b.length]?.[a.length]!;
  const maxLength = Math.max(a.length, b.length);
  return Math.round((1 - distance / maxLength) * 100);
};

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
  | { type: "SET_SHOW_CELEBRATION"; payload: boolean };

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
  const { userId } = useAuth();
  const { startGame, recordAttempt, endGame, setGameState: setContextGameState } = useGameContext();

  // Load actual user stats from database on mount
  // This ensures the local state reflects real stats for correct scoring
  useEffect(() => {
    if (!userId) return;

    const loadUserStats = async () => {
      try {
        const response = await fetch(`/api/user/stats?userId=${userId}`);
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
  }, [gameData.id, gameData.difficulty, puzzleType]);

  const setCompletionState = useCallback(
    (success: boolean, finalGuess: string, attempts: number) => {
      // Calculate next play time
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Calculate time taken
      const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);

      // Get difficulty level (default to 5)
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

      // Calculate base score for celebration using unified scoring:
      // - Speed Bonus: faster = more points
      // - Accuracy: fewer attempts = higher score
      // - Streak Multiplier: consecutive days = bonus
      // - Difficulty Bonus: harder puzzles = bigger rewards
      let score = success
        ? calculateScore(attempts, timeTaken, userStats.streak, difficultyLevel)
        : 0;

      // Variable rewards - psychology: unpredictable rewards create stronger habits
      let isLucky = false;
      let dailyMultiplier = 1;

      if (success) {
        // Check for lucky solve (5% chance of 2x points)
        const luckyResult = rollLuckySolve();
        isLucky = luckyResult.isLucky;

        // Check for daily bonus multiplier
        const dailyBonus = getDailyBonusMultiplier();
        dailyMultiplier = dailyBonus.multiplier;

        // Apply multipliers (lucky takes precedence, they don't stack)
        if (isLucky) {
          score = Math.round(score * luckyResult.multiplier);
        } else if (dailyBonus.hasBonus) {
          score = Math.round(score * dailyMultiplier);
        }
      }

      // Dispatch completion action (batches all state updates)
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

      // Trigger haptic feedback
      if (success) {
        haptics.celebration();
      } else {
        haptics.error();
      }
    },
    [gameState.startTime, userStats.streak, gameData.difficulty]
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

      try {
        const result = await checkGuess(guessToCheck, currentEventPuzzle.answer);
        dispatch({ type: "SET_FEEDBACK_MESSAGE", payload: "" });

        if (result.correct) {
          // Optimistically update UI for correct guess
          const attempts = gameSettings.maxAttempts - previousAttemptsLeft + 1;
          setCompletionState(true, guessToCheck, attempts);

          // Puzzle completion will be tracked in database
          console.log("✅ Puzzle completed successfully!");

          // Calculate time taken and difficulty for scoring
          const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
          const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

          // Update stats using unified scoring system
          const newStats = { ...userStats };
          newStats.totalGames += 1;
          newStats.wins += 1;
          newStats.streak += 1;

          // Use unified scoring function with all 4 factors:
          // Speed Bonus, Accuracy, Streak Multiplier, Difficulty Bonus
          const earnedPoints = calculateGamePoints(
            attempts,
            timeTaken,
            newStats.streak,
            difficultyLevel
          );
          newStats.points += earnedPoints;

          // Simple level calculation
          newStats.level = Math.floor(newStats.points / 1000) + 1;

          // Simple achievements check
          const newAchievements: string[] = [];
          if (newStats.streak === 5) newAchievements.push("5-day streak");
          if (newStats.wins === 10) newAchievements.push("10 wins");
          newStats.achievements = [...newStats.achievements, ...newAchievements];

          newStats.lastPlayDate = new Date().toISOString();

          setUserStats(newStats);

          // Update stats in database with time and difficulty for proper scoring
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
                    timeSpent: timeTaken,
                    difficulty: difficultyLevel,
                  },
                }),
              });

              if (!response.ok) {
                console.error("Failed to update user stats in database");
                // Show subtle error notification - user's progress is saved locally but not synced
                toast.error("Progress saved locally", {
                  description: "Your stats will sync when connection is restored.",
                  duration: 3000,
                });
              }
            } catch (error) {
              console.error("Error updating user stats:", error);
              // Show subtle error notification - user's progress is saved locally but not synced
              toast.error("Progress saved locally", {
                description: "Your stats will sync when connection is restored.",
                duration: 3000,
              });
            }
          }

          // Track puzzle completion
          trackPuzzleCompletion({
            puzzleId: gameData.id || "unknown",
            puzzleType,
            difficulty:
              typeof gameData.difficulty === "number"
                ? gameData.difficulty.toString()
                : gameData.difficulty || "medium",
            attempts,
            hintsUsed: 0,
            completionTime: timeTaken * 1000,
            score: earnedPoints,
          });
          trackEvent(analyticsEvents.GAME_COMPLETE, {
            puzzleId: gameData.id,
            puzzleType,
            attempts,
            hintsUsed: 0,
            score: earnedPoints,
          });

          // Check and award achievements (fire and forget - don't block UI)
          if (userId) {
            fetch("/api/user/achievements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameContext: {
                  puzzleId: gameData.id,
                  attempts,
                  maxAttempts: gameSettings.maxAttempts,
                  timeTaken,
                  hintsUsed: 0,
                  difficulty: getAchievementDifficultyCategory(difficultyLevel),
                  isCorrect: true,
                  score: earnedPoints,
                },
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.newlyUnlocked?.length > 0) {
                  console.log("New achievements unlocked:", data.newlyUnlocked);
                }
              })
              .catch((err) => console.error("Error checking achievements:", err));
          }

          // Record successful puzzle attempt (for puzzle locking)
          fetch("/api/puzzles/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleId: gameData.id,
              attemptedAnswer: guessToCheck,
              isCorrect: true,
              abandoned: false,
              attemptNumber: attempts,
              maxAttempts: gameSettings.maxAttempts,
              timeSpentSeconds: timeTaken,
              difficulty: getAchievementDifficultyCategory(difficultyLevel),
              hintsUsed: 0,
            }),
          }).catch((err) => console.error("Error recording puzzle attempt:", err));

          // Celebration overlay will handle the redirect via onComplete callback
          // No need for setTimeout here as the overlay handles timing
          return; // Exit early - don't run incorrect guess logic
        }

        // Handle incorrect guess
        const newAttemptsLeft = previousAttemptsLeft - 1;
        dispatch({ type: "SET_ATTEMPTS_LEFT", payload: newAttemptsLeft });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: guessToCheck });

        // Add to guess history
        const guessWords = guessToCheck.trim().toUpperCase().split(/\s+/);
        const answerWords = currentEventPuzzle.answer.toUpperCase().split(/\s+/);
        const wordResults: WordResult[] = guessWords.map((word, index) => {
          const correctWord = answerWords[index]?.toUpperCase() || "";
          const correct = word === correctWord;
          // Calculate similarity for close guesses
          const similarity = correct ? 100 : calculateSimilarity(word, correctWord);
          return { word, correct, similarity };
        });

        dispatch({
          type: "ADD_GUESS_HISTORY",
          payload: {
            text: guessToCheck,
            timestamp: new Date(),
            wordResults,
            attemptNumber: gameSettings.maxAttempts - newAttemptsLeft,
          },
        });

        if (newAttemptsLeft <= 0) {
          setCompletionState(false, guessToCheck, gameSettings.maxAttempts);

          // Puzzle failure will be tracked in database
          console.log("❌ Puzzle failed - stats updated in database");

          // Calculate time taken and difficulty for consistency
          const failureTimeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
          const failureDifficulty =
            typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

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
                    timeSpent: failureTimeTaken,
                    difficulty: failureDifficulty,
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
            hintsUsed: 0,
          });
          trackEvent(analyticsEvents.PUZZLE_ABANDON, {
            puzzleId: gameData.id,
            puzzleType,
            attempts: gameSettings.maxAttempts,
            hintsUsed: 0,
          });

          // Record failed puzzle attempt (for puzzle locking)
          fetch("/api/puzzles/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleId: gameData.id,
              attemptedAnswer: guessToCheck,
              isCorrect: false,
              abandoned: true,
              attemptNumber: gameSettings.maxAttempts,
              maxAttempts: gameSettings.maxAttempts,
              timeSpentSeconds: failureTimeTaken,
              difficulty: getAchievementDifficultyCategory(failureDifficulty),
              hintsUsed: 0,
            }),
          }).catch((err) => console.error("Error recording puzzle attempt:", err));

          // Store game completion data in localStorage for failure page
          const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
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
            usedHints: 0,
            streak: 0,
            score: 0,
          };
          localStorage.setItem("lastGameCompletion", JSON.stringify(completionData));

          // Redirect to game-over page immediately (no delay)
          router.push(
            `/game-over?success=false&guess=${encodeURIComponent(guessToCheck)}&attempts=${gameSettings.maxAttempts}`
          );
          return; // Exit early - game is over
        }

        // Track guess submission (only for non-final incorrect guesses)
        trackEvent(analyticsEvents.GUESS_SUBMITTED, {
          puzzleId: gameData.id || "unknown",
          puzzleType,
          attemptNumber: gameSettings.maxAttempts - newAttemptsLeft,
          isCorrect: false,
        });

        // Calculate overall similarity for near-miss detection
        const overallSimilarity =
          wordResults.length > 0
            ? Math.round(
                wordResults.reduce((acc, w) => acc + (w.similarity ?? 0), 0) / wordResults.length
              )
            : 0;

        handleIncorrectGuess(newAttemptsLeft, overallSimilarity);

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
    },
    [
      gameState.gameOver,
      gameState.currentGuess,
      gameState.attemptsLeft,
      gameState.isSubmitting,
      gameState.lastSubmittedGuess,
      gameState.startTime,
      gameState.guessHistory,
      currentEventPuzzle,
      setCompletionState,
      userStats,
      gameData.id,
      puzzleType,
      gameData.difficulty,
      router,
      userId,
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

      if (key === "ENTER") {
        if (gameState.isGuessFilled) {
          handleGuess();
        }
      } else if (key === "BACKSPACE") {
        const newGuess = gameState.currentGuess.slice(0, -1);
        const isFilled =
          newGuess.length === currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length;
        dispatch({ type: "SET_CURRENT_GUESS", payload: newGuess });
        dispatch({ type: "SET_IS_GUESS_FILLED", payload: isFilled });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: null });
      } else if (/^[A-Z]$/.test(key)) {
        const newGuess =
          gameState.currentGuess.length < currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length
            ? gameState.currentGuess + key
            : gameState.currentGuess;
        const isFilled =
          newGuess.length === currentEventPuzzle.answer.replace(/[^a-zA-Z]/g, "").length;
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
      {/* Main content area - flex container to center puzzle */}
      <div className="flex min-h-[calc(100vh-180px)] flex-col">
        {/* Puzzle area - centered vertically */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 md:px-6">
          {/* Personalized greeting - psychology: personal recognition increases engagement */}
          <PersonalizedGreeting
            streak={userStats.streak}
            wins={userStats.wins}
            level={userStats.level}
            className="mb-4"
          />

          {/* Enhanced puzzle display - centered */}
          <section aria-label="Puzzle" className="w-full max-w-2xl text-center">
            <PuzzleContainer>
              <PuzzleDisplay
                puzzle={puzzleDisplay}
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
            {/* Live solve counter - social proof */}
            <SolveCounter puzzleId={gameData.id} className="mt-3" />
          </section>

          {/* Chat-style guess history - displays below puzzle */}
          {gameState.guessHistory.length > 0 && (
            <div className="w-full max-w-2xl mt-6 space-y-2 text-center">
              {gameState.guessHistory.map((attempt, index) => (
                <div
                  key={index}
                  className="text-muted-foreground text-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <span className="opacity-40 mr-2 text-xs">#{attempt.attemptNumber}</span>
                  <span
                    className={
                      attempt.wordResults.every((w) => w.correct)
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : attempt.wordResults.some((w) => (w.similarity ?? 0) >= 70)
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground/70"
                    }
                  >
                    {attempt.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced feedback - floating above input */}
          {gameState.feedbackMessage && (
            <div
              aria-live="polite"
              className={`fixed bottom-28 left-1/2 z-40 -translate-x-1/2 slide-in-from-bottom-2 fade-in-up animate-in rounded-full px-4 py-2 shadow-lg duration-300 motion-reduce:animate-none ${
                gameState.feedbackMessage === "Checking..."
                  ? "border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/90"
                  : gameState.feedbackMessage.startsWith("So close")
                    ? "border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/90"
                    : "border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/90"
              }`}
              role="status"
            >
              <p
                className={`font-medium text-sm ${
                  gameState.feedbackMessage === "Checking..."
                    ? "text-blue-700 dark:text-blue-300"
                    : gameState.feedbackMessage.startsWith("So close")
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-red-700 dark:text-red-300"
                }`}
              >
                {gameState.feedbackMessage}
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div
              className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 slide-in-from-bottom-2 fade-in-up animate-in rounded-2xl border border-red-400 bg-red-100 p-4 text-center shadow-lg duration-300 motion-reduce:animate-none dark:border-red-600 dark:bg-red-900/90"
              role="alert"
            >
              <p className="font-semibold text-red-800 text-sm dark:text-red-200">
                {error.message}
              </p>
              {error.details && (
                <p className="mt-2 text-red-700 text-xs dark:text-red-300">{error.details}</p>
              )}
              <Button className="mt-3" onClick={() => setError(null)} size="sm" variant="outline">
                Dismiss
              </Button>
            </div>
          )}
        </main>

        {/* Fixed bottom input - iOS chat style */}
        <section
          aria-label="Answer input"
          className="fixed bottom-0 left-0 right-0 z-30 bg-background px-4 pb-[max(env(safe-area-inset-bottom),32px)] pt-3 md:px-6"
        >
          <div className="mx-auto max-w-2xl">
            <SmartAnswerInput
              correctAnswer={currentEventPuzzle?.answer || ""}
              difficulty={currentEventPuzzle?.difficulty || 5}
              disabled={gameState.gameOver || gameState.isSubmitting}
              isSubmitting={gameState.isSubmitting}
              onSubmit={handleGuess}
              puzzle={currentEventPuzzle?.puzzle || ""}
              puzzleType={currentEventPuzzle?.puzzleType || "rebus"}
            />
          </div>
        </section>
      </div>

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
          true // No hints system - always true for "Pure Skill" achievement
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
            usedHints: 0,
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
