/**
 * Game Context
 * Manages puzzle state, game logic, timer, hints, and AI validation
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import {
  cachePuzzle,
  getCachedPuzzle,
  queuePendingAttempt,
  saveOfflineGameState,
  getOfflineGameState,
  clearOfflineGameState,
} from '../lib/offline-storage';
import type { Puzzle, PuzzleAttempt, PuzzleStats, AIValidationResult, GameContext as GameContextType } from '../types';

// Import game logic from shared package
import { calculateScore, fuzzyMatch } from '@rebuzzle/game-logic';

interface GameContextInterface {
  /** Current puzzle */
  puzzle: Puzzle | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current attempt count */
  attempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** List of previous guesses */
  guesses: string[];
  /** Whether game is complete */
  isComplete: boolean;
  /** Whether player won */
  isCorrect: boolean;
  /** Game start timestamp */
  startTime: number;
  /** Elapsed time in seconds (live) */
  elapsedTime: number;
  /** Final score */
  score: number | null;
  /** Number of hints used */
  hintsUsed: number;
  /** Current hint index (how many are revealed) */
  currentHintIndex: number;
  /** Available hints from puzzle */
  availableHints: string[];
  /** Whether more hints can be shown */
  canShowHint: boolean;
  /** Whether to use AI validation */
  useAIValidation: boolean;
  /** AI feedback from last guess */
  aiFeedback: string | null;
  /** Puzzle statistics */
  puzzleStats: PuzzleStats | null;
  /** Whether playing offline */
  isOffline: boolean;
  /** Server time offset in milliseconds (serverTime - clientTime) */
  serverTimeOffset: number;
  /** Next puzzle availability time (ISO string) */
  nextPuzzleTime: string | null;
  /** Load today's puzzle */
  loadTodayPuzzle: () => Promise<void>;
  /** Submit a guess */
  submitGuess: (answer: string) => Promise<{
    correct: boolean;
    gameOver: boolean;
    feedback?: string;
  }>;
  /** Reset game state */
  resetGame: () => void;
  /** Show next hint */
  showNextHint: () => void;
  /** Toggle AI validation */
  setUseAIValidation: (value: boolean) => void;
  /** Get game context for achievement checking */
  getGameContext: () => GameContextType | null;
}

const GameContext = createContext<GameContextInterface | undefined>(undefined);

const MAX_ATTEMPTS = 3;

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const { user, stats, refreshStats } = useAuth();

  // Core game state
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [score, setScore] = useState<number | null>(null);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hints state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);

  // AI validation state
  const [useAIValidation, setUseAIValidation] = useState(true);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Stats and offline state
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Server time sync state (for accurate countdown across platforms)
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [nextPuzzleTime, setNextPuzzleTime] = useState<string | null>(null);

  // Computed values
  const availableHints = puzzle?.hints || [];
  const canShowHint = currentHintIndex < availableHints.length - 1 && !isComplete;

  /**
   * Start/stop timer based on game state
   */
  useEffect(() => {
    if (!isComplete && puzzle && startTime > 0) {
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isComplete, puzzle, startTime]);

  /**
   * Save game state for offline resume
   */
  useEffect(() => {
    if (puzzle && !isComplete && attempts > 0) {
      saveOfflineGameState({
        puzzleId: puzzle.id,
        attempts,
        guesses,
        startTime,
        hintsUsed,
      });
    }
  }, [puzzle, isComplete, attempts, guesses, startTime, hintsUsed]);

  /**
   * Load today's puzzle
   */
  const loadTodayPuzzle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      // Try to get from server first
      const { puzzle: puzzleData, serverTime, nextPuzzleTime: nextTime } = await api.getTodayPuzzle();

      // Capture server time offset for accurate timing across platforms
      if (serverTime && nextTime) {
        const offset = new Date(serverTime).getTime() - Date.now();
        setServerTimeOffset(offset);
        setNextPuzzleTime(nextTime);
      }

      if (puzzleData) {
        setPuzzle(puzzleData);
        setStartTime(Date.now());
        // Cache for offline use
        await cachePuzzle(puzzleData);

        // Check for saved game state
        const savedState = await getOfflineGameState();
        if (savedState && savedState.puzzleId === puzzleData.id) {
          // Resume saved game
          setAttempts(savedState.attempts);
          setGuesses(savedState.guesses);
          setStartTime(savedState.startTime);
          setHintsUsed(savedState.hintsUsed);
          setCurrentHintIndex(savedState.hintsUsed - 1);
        } else {
          // Fresh game
          setAttempts(0);
          setGuesses([]);
          setIsComplete(false);
          setIsCorrect(false);
          setScore(null);
          setHintsUsed(0);
          setCurrentHintIndex(-1);
          setAiFeedback(null);
          await clearOfflineGameState();
        }

        // Load puzzle stats
        const stats = await api.getPuzzleStats(puzzleData.id);
        if (stats) {
          setPuzzleStats(stats);
        }
      } else {
        // Try to load from cache
        const cached = await getCachedPuzzle();
        if (cached) {
          setPuzzle(cached);
          setStartTime(Date.now());
          setIsOffline(true);
          setAttempts(0);
          setGuesses([]);
          setIsComplete(false);
          setIsCorrect(false);
          setScore(null);
          setHintsUsed(0);
          setCurrentHintIndex(-1);
        } else {
          setError('Failed to load puzzle. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error loading puzzle:', err);

      // Try cache on error
      const cached = await getCachedPuzzle();
      if (cached) {
        setPuzzle(cached);
        setStartTime(Date.now());
        setIsOffline(true);
        setAttempts(0);
        setGuesses([]);
        setIsComplete(false);
        setIsCorrect(false);
        setScore(null);
      } else {
        setError('Failed to load puzzle. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Show next hint
   */
  const showNextHint = useCallback(() => {
    if (canShowHint) {
      setCurrentHintIndex((prev) => prev + 1);
      setHintsUsed((prev) => prev + 1);
    }
  }, [canShowHint]);

  /**
   * Submit a guess
   */
  const submitGuess = useCallback(
    async (
      answer: string
    ): Promise<{ correct: boolean; gameOver: boolean; feedback?: string }> => {
      if (!puzzle || isComplete) {
        return { correct: false, gameOver: true };
      }

      const normalizedAnswer = answer.trim().toLowerCase();
      const normalizedCorrect = puzzle.answer.toLowerCase();

      // Use fuzzy matching from game-logic package
      let correct = fuzzyMatch(normalizedAnswer, normalizedCorrect, 85);
      let feedback: string | undefined;

      // If not correct and AI validation is enabled, try AI
      if (!correct && useAIValidation) {
        const attemptsLeft = MAX_ATTEMPTS - attempts - 1;
        const aiResult = await api.validateAnswerWithAI({
          guess: normalizedAnswer,
          correctAnswer: normalizedCorrect,
          puzzleContext: puzzle.puzzle,
          explanation: puzzle.explanation,
          useAI: true,
          attemptsLeft,
        });

        if (aiResult?.result) {
          if (aiResult.result.isCorrect) {
            correct = true;
          }
          feedback = aiResult.result.feedback;
          setAiFeedback(feedback || null);
        }
      }

      const newAttempts = attempts + 1;
      const newGuesses = [...guesses, answer];

      setAttempts(newAttempts);
      setGuesses(newGuesses);

      const currentElapsedTime = Math.floor((Date.now() - startTime) / 1000);

      if (correct) {
        // Calculate score
        const difficulty =
          typeof puzzle.difficulty === 'number'
            ? puzzle.difficulty
            : puzzle.difficulty === 'hard'
              ? 8
              : puzzle.difficulty === 'medium'
                ? 5
                : 3;

        const calculatedScore = calculateScore({
          timeTakenSeconds: currentElapsedTime,
          wrongAttempts: newAttempts - 1,
          streakDays: stats?.streak || 0,
          difficultyLevel: difficulty,
        });

        setIsComplete(true);
        setIsCorrect(true);
        setScore(calculatedScore.totalScore);
        setElapsedTime(currentElapsedTime);
        await clearOfflineGameState();

        // Record the attempt to the server
        if (user) {
          const attemptData: PuzzleAttempt = {
            puzzleId: puzzle.id,
            attemptedAnswer: answer,
            isCorrect: true,
            attemptNumber: newAttempts,
            maxAttempts: MAX_ATTEMPTS,
            timeSpentSeconds: currentElapsedTime,
            difficulty: typeof puzzle.difficulty === 'string' ? puzzle.difficulty : undefined,
            hintsUsed,
          };

          if (isOffline) {
            // Queue for later sync
            await queuePendingAttempt(attemptData);
          } else {
            await api.recordAttempt(attemptData);
            await refreshStats();
          }
        }

        return { correct: true, gameOver: true, feedback };
      }

      // Check if game over (out of attempts)
      const gameOver = newAttempts >= MAX_ATTEMPTS;

      if (gameOver) {
        setIsComplete(true);
        setIsCorrect(false);
        setScore(0);
        setElapsedTime(currentElapsedTime);
        await clearOfflineGameState();

        // Record failed attempt
        if (user) {
          const attemptData: PuzzleAttempt = {
            puzzleId: puzzle.id,
            attemptedAnswer: answer,
            isCorrect: false,
            attemptNumber: newAttempts,
            maxAttempts: MAX_ATTEMPTS,
            timeSpentSeconds: currentElapsedTime,
            difficulty: typeof puzzle.difficulty === 'string' ? puzzle.difficulty : undefined,
            hintsUsed,
          };

          if (isOffline) {
            await queuePendingAttempt(attemptData);
          } else {
            await api.recordAttempt(attemptData);
            await refreshStats();
          }
        }
      }

      return { correct: false, gameOver, feedback };
    },
    [puzzle, isComplete, attempts, guesses, startTime, stats, user, refreshStats, useAIValidation, hintsUsed, isOffline]
  );

  /**
   * Reset game state
   */
  const resetGame = useCallback(() => {
    setAttempts(0);
    setGuesses([]);
    setIsComplete(false);
    setIsCorrect(false);
    setScore(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setHintsUsed(0);
    setCurrentHintIndex(-1);
    setAiFeedback(null);
    clearOfflineGameState();
  }, []);

  /**
   * Get game context for achievement checking
   */
  const getGameContext = useCallback((): GameContextType | null => {
    if (!puzzle) return null;

    return {
      puzzleId: puzzle.id,
      attempts,
      maxAttempts: MAX_ATTEMPTS,
      isCorrect,
      timeTaken: elapsedTime,
      hintsUsed,
      difficulty: typeof puzzle.difficulty === 'string' ? puzzle.difficulty : undefined,
      score: score || undefined,
    };
  }, [puzzle, attempts, isCorrect, elapsedTime, hintsUsed, score]);

  const value: GameContextInterface = {
    puzzle,
    isLoading,
    error,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    guesses,
    isComplete,
    isCorrect,
    startTime,
    elapsedTime,
    score,
    hintsUsed,
    currentHintIndex,
    availableHints,
    canShowHint,
    useAIValidation,
    aiFeedback,
    puzzleStats,
    isOffline,
    serverTimeOffset,
    nextPuzzleTime,
    loadTodayPuzzle,
    submitGuess,
    resetGame,
    showNextHint,
    setUseAIValidation,
    getGameContext,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * Hook to use game context
 */
export function useGame(): GameContextInterface {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
