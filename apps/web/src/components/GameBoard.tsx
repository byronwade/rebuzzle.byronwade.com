"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  analyticsEvents,
  trackEvent,
  trackPuzzleAbandon,
  trackPuzzleCompletion,
  trackPuzzleStart,
} from "@/lib/analytics";
import { fireConfetti } from "@/lib/confetti";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import { buildGameOverHref, markJustSolvedInSession } from "@/lib/game/game-over-href";
import type { GuessReaction, ReactionTier } from "@/lib/game/reactions";
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
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { ChatLockedDock } from "./ChatLockedDock";
import { DifficultyBadge } from "./DifficultyBadge";
import { useGameContext } from "./GameContext";
import { GuessThread, type ThreadTurn } from "./GuessThread";
import { HintBadge } from "./HintBadge";
import { KeyboardAwareLayout } from "./KeyboardAwareLayout";
import { getPuzzleQuestion } from "./PuzzleDisplay";
import { PuzzleMinimal } from "./PuzzleMinimal";
import { PuzzleStage } from "./PuzzleStage";
import { SmartAnswerInput } from "./SmartAnswerInput";
import { SolveResultCard } from "./SolveResultCard";

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

interface GameState {
  gameOver: boolean;
  nextPlayTime: Date | null;
  attemptsLeft: number;
  lastSubmittedGuess: string | null;
  finalGuess: string | null;
  wasSuccessful: boolean;
  finalAttempts: number;
  finalScore: number;
  timeTakenSeconds: number;
  isSubmitting: boolean;
  guessHistory: GuessAttempt[];
  startTime: number;
  hintsUsed: number;
  currentHintIndex: number;
}

type GameAction =
  | { type: "SET_ATTEMPTS_LEFT"; payload: number }
  | { type: "SET_LAST_SUBMITTED_GUESS"; payload: string | null }
  | {
      type: "SET_COMPLETION";
      payload: {
        finalGuess: string;
        wasSuccessful: boolean;
        attempts: number;
        nextPlayTime: Date;
        score: number;
        timeTakenSeconds: number;
      };
    }
  | { type: "SET_IS_SUBMITTING"; payload: boolean }
  | { type: "ADD_GUESS_HISTORY"; payload: GuessAttempt }
  | { type: "REVEAL_HINT" };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "SET_ATTEMPTS_LEFT":
      return { ...state, attemptsLeft: action.payload };
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
        finalScore: action.payload.score,
        timeTakenSeconds: action.payload.timeTakenSeconds,
      };
    case "SET_IS_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "ADD_GUESS_HISTORY":
      return {
        ...state,
        guessHistory: [...state.guessHistory, action.payload],
      };
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
  gameOver: false,
  nextPlayTime: null,
  attemptsLeft: gameSettings.maxAttempts,
  lastSubmittedGuess: null,
  finalGuess: null,
  wasSuccessful: false,
  finalAttempts: 0,
  finalScore: 0,
  timeTakenSeconds: 0,
  isSubmitting: false,
  guessHistory: [],
  startTime: Date.now(),
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

  /**
   * The conversation. Kept out of the reducer because it's presentation only —
   * the persisted `guessHistory` still drives scoring and the game-over page.
   */
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const turnSeq = useRef(0);
  const hasThread = turns.length > 0;

  const patchTurn = useCallback((id: number, patch: Partial<ThreadTurn>) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }, []);

  /**
   * Ask Eve for a riff on a guess and type it into a second bubble.
   *
   * Never blocks feedback: the instant line is already on screen by the time
   * this is called, and if the stream fails the riff bubble simply never
   * appears. The route is not given the answer, so it can't leak one.
   */
  const streamQuip = useCallback(
    async (id: number, guess: string, tier: ReactionTier) => {
      // Never spend credits after the day is locked, or on the winning turn.
      if (tier === "correct" || tier === "out") return;

      patchTurn(id, { quipPending: true });
      try {
        const response = await fetch("/api/puzzles/quip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ puzzleId: gameData.id, guess, tier }),
        });

        if (!(response.ok && response.body)) {
          patchTurn(id, { quipPending: false });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          if (text.trim()) {
            patchTurn(id, { quip: text.trim(), quipPending: false });
          }
        }

        if (!text.trim()) {
          patchTurn(id, { quipPending: false });
        }
      } catch (_error) {
        // A missing riff is not worth surfacing — the instant line stands.
        patchTurn(id, { quipPending: false });
      }
    },
    [gameData.id, patchTurn]
  );
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

  // Server already marked today complete (e.g. revisit) — lock the board in place
  useEffect(() => {
    if (!gameData.isCompleted || gameState.gameOver) return;
    dispatch({
      type: "SET_COMPLETION",
      payload: {
        finalGuess: "",
        wasSuccessful: false,
        attempts: gameSettings.maxAttempts,
        nextPlayTime: getNextUtcMidnight(),
        score: 0,
        timeTakenSeconds: 0,
      },
    });
    endGame();
  }, [gameData.isCompleted, gameState.gameOver, endGame]);

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

  const dismissKeyboard = useCallback(() => {
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, []);

  const setCompletionState = useCallback(
    (success: boolean, finalGuess: string, attempts: number, serverScore?: number) => {
      const tomorrow = getNextUtcMidnight();
      const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - gameState.startTime) / 1000));
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

      // Prefer authoritative server points; fall back to local estimate for UX only
      let score =
        typeof serverScore === "number" && serverScore > 0
          ? serverScore
          : success
            ? calculateGamePoints(
                attempts,
                timeTakenSeconds,
                userStats.streak,
                difficultyLevel,
                gameState.hintsUsed
              )
            : 0;

      if (success && !(typeof serverScore === "number" && serverScore > 0)) {
        const luckyResult = rollLuckySolve();
        const dailyBonus = getDailyBonusMultiplier();
        if (luckyResult.isLucky) {
          score = Math.round(score * luckyResult.multiplier);
        } else if (dailyBonus.hasBonus) {
          score = Math.round(score * dailyBonus.multiplier);
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
          timeTakenSeconds,
        },
      });

      dismissKeyboard();
      if (success) {
        haptics.celebration();
        markJustSolvedInSession();
        void fireConfetti();
      } else {
        haptics.error();
      }
    },
    [
      dismissKeyboard,
      gameState.startTime,
      gameState.hintsUsed,
      userStats.streak,
      gameData.difficulty,
    ]
  );

  const handleIncorrectGuess = useCallback((_attemptsLeft: number, similarity?: number) => {
    const isNearMiss = similarity !== undefined && similarity >= engagementConfig.nearMissThreshold;
    if (isNearMiss) {
      haptics.warning();
    } else {
      haptics.error();
    }
  }, []);

  const handleGuess = useCallback(
    async (guessValue?: string) => {
      const guess = guessValue?.trim() ?? "";

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
            description:
              "Couldn't start your guest session. Check your connection, then refresh and try again.",
            variant: "destructive",
          });
          return;
        }
      }

      dispatch({ type: "SET_IS_SUBMITTING", payload: true });
      const previousAttemptsLeft = gameState.attemptsLeft;
      const previousLastSubmittedGuess = gameState.lastSubmittedGuess;
      const guessToCheck = guess;
      const timeTaken = Math.floor((Date.now() - gameState.startTime) / 1000);
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;

      try {
        const response = await fetch("/api/puzzles/guess", {
          method: "POST",
          credentials: "include",
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
          reaction?: GuessReaction;
          error?: string;
        };

        // Already locked / replay blocked — stay in-thread, don't hard-cut away
        if (response.status === 409 || result.locked) {
          setCompletionState(Boolean(result.wasSuccessful), guessToCheck, gameSettings.maxAttempts);
          toast({
            title: result.wasSuccessful ? "Already solved today" : "Day already locked",
            description: "Chat is locked. Open full results anytime from the dock.",
          });
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to process guess");
        }

        const wordResults: WordResult[] = result.wordResults || [];
        const attemptNumber =
          result.attemptNumber ?? gameSettings.maxAttempts - previousAttemptsLeft + 1;

        // Post the turn the moment the server answers. The reaction is derived
        // from the similarity score server-side, so this is instant.
        const reaction = result.reaction;
        const turnId = ++turnSeq.current;
        if (reaction) {
          setTurns((prev) => [
            ...prev,
            {
              id: turnId,
              text: guessToCheck,
              attemptNumber,
              tier: reaction.tier,
              line: reaction.line,
            },
          ]);
        }

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

          // Stay in the thread — chat stays locked.
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

        // Eve's riff arrives behind the instant line, in its own bubble.
        // Never request a quip after the day locks — that burns AI credits.
        if (reaction) {
          void streamQuip(turnId, guessToCheck, reaction.tier);
        }
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
      handleIncorrectGuess,
      streamQuip,
    ]
  );

  const resultsHref = useMemo(() => {
    if (!gameState.gameOver) return "/game-over";
    return buildGameOverHref({
      success: gameState.wasSuccessful,
      guess: gameState.finalGuess || "",
      attempts: gameState.wasSuccessful ? gameState.finalAttempts : gameSettings.maxAttempts,
      timeTakenSeconds: gameState.timeTakenSeconds,
    });
  }, [
    gameState.gameOver,
    gameState.wasSuccessful,
    gameState.finalGuess,
    gameState.finalAttempts,
    gameState.timeTakenSeconds,
  ]);

  const resultCard = gameState.gameOver ? (
    <SolveResultCard
      success={gameState.wasSuccessful}
      score={gameState.finalScore}
      streak={userStats.streak}
      attempts={gameState.finalAttempts}
      maxAttempts={gameSettings.maxAttempts}
      resultsHref={resultsHref}
    />
  ) : null;

  // Puzzle data is already on the server-rendered board — never blank it for
  // auth/guest warm-up. Guest creation only disables submit (below).
  return (
    <>
      {/* Main content area - keyboard-aware layout */}
      <KeyboardAwareLayout>
        {({ isKeyboardVisible }) => {
          // After lock, always show the full thread + result — never the collapsed keyboard view.
          const collapsed = isKeyboardVisible && !gameState.gameOver;
          return (
            <div className="flex flex-col h-full">
              {/* Puzzle area - collapses when keyboard is visible, centers content */}
              <main className="flex-1 overflow-hidden transition-all duration-300 puzzle-area flex flex-col">
                {collapsed ? (
                  /* COLLAPSED VIEW - minimal puzzle hint when keyboard is open */
                  <div className="flex flex-col items-center pt-2">
                    <PuzzleMinimal
                      puzzle={puzzleDisplay}
                      puzzleType={puzzleType}
                      visual={gameData.visual}
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
                  <div
                    className={cn(
                      "play-stage flex flex-1 flex-col items-center overflow-hidden px-4 py-[clamp(0.5rem,2vh,1rem)] md:px-6",
                      hasThread ? "justify-start" : "justify-center"
                    )}
                  >
                    <div className="mb-[clamp(0.5rem,2vh,1rem)] flex w-full max-w-2xl items-start justify-between gap-3">
                      <DifficultyBadge
                        className="play-fade-in"
                        difficulty={currentEventPuzzle?.difficulty}
                        showDescription={!hasThread}
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

                    <section aria-label="Puzzle" className="w-full max-w-2xl">
                      <PuzzleStage
                        puzzle={puzzleDisplay}
                        puzzleType={puzzleType}
                        question={getPuzzleQuestion(puzzleType)}
                        state={hasThread ? "docked" : "hero"}
                        visual={gameData.visual}
                      />
                    </section>

                    {hasThread ? (
                      <GuessThread
                        className="mt-[clamp(0.75rem,2.5vh,1.25rem)] max-w-2xl flex-1 px-0.5 pb-2"
                        footer={resultCard}
                        turns={turns}
                      />
                    ) : resultCard ? (
                      <div className="mt-[clamp(0.75rem,2.5vh,1.25rem)] w-full max-w-2xl px-0.5 pb-2">
                        {resultCard}
                      </div>
                    ) : null}
                  </div>
                )}
              </main>

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
                aria-label={gameState.gameOver ? "Day locked" : "Answer input"}
                className="input-area input-area-keyboard-transition play-dock z-30 shrink-0 px-4 pt-5 pb-safe-lg md:px-6"
              >
                <div className="mx-auto max-w-2xl">
                  {gameState.gameOver ? (
                    <ChatLockedDock success={gameState.wasSuccessful} resultsHref={resultsHref} />
                  ) : (
                    <SmartAnswerInput
                      disabled={gameState.isSubmitting || (!userId && isCreatingGuest)}
                      isSubmitting={gameState.isSubmitting || isCreatingGuest}
                      onSubmit={handleGuess}
                    />
                  )}
                </div>
              </section>
            </div>
          );
        }}
      </KeyboardAwareLayout>
    </>
  );
}
