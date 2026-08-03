"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
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
import { isComebackVisit, recordPlayDay, shouldPromptGuestSave } from "@/lib/game/play-days";
import type { GuessReaction, ReactionTier } from "@/lib/game/reactions";
import { parseBeatMeChallenge } from "@/lib/game/share-challenge";
import type { GameData } from "@/lib/gameSettings";
import {
  calculateGamePoints,
  checkStreakGracePeriod,
  engagementConfig,
  gameSettings,
  getDailyBonusMultiplier,
  rollLuckySolve,
} from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { useLazyGuest } from "@/lib/hooks/useLazyGuest";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { isReturningUser } from "@/lib/session-tracker";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { ChatClosingDock } from "./ChatClosingDock";
import { ChatLockedDock } from "./ChatLockedDock";
import { DifficultyBadge } from "./DifficultyBadge";
import { useGameContext } from "./GameContext";
import { GuessThread, type ThreadTurn } from "./GuessThread";
import { HintBadge } from "./HintBadge";
import { KeyboardAwareLayout } from "./KeyboardAwareLayout";
import { getPuzzleQuestion } from "@/lib/puzzle-questions";
import { PuzzleStage } from "./PuzzleStage";
import { SmartAnswerInput } from "./SmartAnswerInput";
import { SolveResultCard } from "./SolveResultCard";
import { fail } from "@/lib/fail";

interface UserStats {
  points: number;
  streak: number;
  maxStreak: number;
  totalGames: number;
  wins: number;
  achievements: string[];
  level: number;
  lastPlayDate: string | null;
  dailyChallengeStreak: number;
  noHintStreak: number;
  fastestSolveSeconds: number | null;
  streakFreezes: number;
  guessDistribution: number[];
  recentPlayDates: string[];
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

const createInitialGameState = (): GameState => ({
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
});

const emptySubscribe = () => () => {};


export function GameBoardShell(props: Record<string, any>) {
  const {
    attemptNumber,
    attempts,
    awaitingClosingQuip,
    base,
    cancelled,
    chatLocked,
    cleanWin,
    closestSimilarity,
    completionData,
    consecutiveColdRef,
    controller,
    created,
    currentEventPuzzle,
    dailyBonus,
    data,
    dayBonusMultiplier,
    dayRank,
    decoder,
    difficultyLevel,
    dismissKeyboard,
    dispatch,
    earnedPoints,
    elapsed,
    error,
    fromChallenge,
    gameState,
    guess,
    guessToCheck,
    guestReady,
    hadNearMiss,
    handleGuess,
    handleIncorrectGuess,
    hasThread,
    isComeback,
    isLuckySolve,
    isReturner,
    lastTurn,
    loadUserStats,
    luckyResult,
    newAttemptsLeft,
    newStats,
    next,
    overallSimilarity,
    p,
    paceLabel,
    patchTurn,
    pendingCelebrationRef,
    persistQuip,
    previousAttemptsLeft,
    previousBest,
    previousBestSeconds,
    previousLastSubmittedGuess,
    puzzleDisplay,
    puzzleType,
    reaction,
    reader,
    resolvedTier,
    response,
    result,
    resultCard,
    resultsHref,
    revealedAnswer,
    score,
    serverScore,
    serverStreak,
    setClosestSimilarity,
    setCompletionState,
    setDayBonusMultiplier,
    setDayRank,
    setError,
    setHadNearMiss,
    setIsLuckySolve,
    setPaceLabel,
    setPreviousBestSeconds,
    setRevealedAnswer,
    setShowGuestSave,
    setStreakFrozen,
    setTurns,
    setUnlockedAchievementName,
    setUserStats,
    showGuestSave,
    showStageChrome,
    stageCaption,
    streakFrozen,
    streamQuip,
    text,
    timeTaken,
    timeTakenSeconds,
    timeoutId,
    tomorrow,
    turnId,
    turnSeq,
    turns,
    unlockedAchievementName,
    url,
    userStats,
    wasChatLockedRef,
    winningHistory,
    wordResults
  } = props;

  return (
    <>
      {/* Main content area - keyboard-aware layout */}
      <KeyboardAwareLayout>
        {({ isKeyboardVisible }) => {
          // After lock, keep the full thread — don't collapse for the keyboard.
          const keyboardOpen = isKeyboardVisible && !gameState.gameOver;
          const stageState = keyboardOpen ? "compact" : hasThread ? "docked" : "hero";

          return (
            <div className="flex h-full min-h-0 flex-col">
              <main className="puzzle-area flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    "play-stage flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 md:px-6",
                    keyboardOpen
                      ? "justify-start gap-1.5 pt-0 pb-1"
                      : hasThread
                        ? "justify-start py-[clamp(0.5rem,2vh,1rem)]"
                        : "justify-center py-[clamp(0.5rem,2vh,1rem)]"
                  )}
                >
                  {showStageChrome && !keyboardOpen ? (
                    <div className="mb-[clamp(0.5rem,2vh,1rem)] flex w-full max-w-2xl items-start justify-between gap-3">
                      {!hasThread ? (
                        <DifficultyBadge
                          className="play-fade-in"
                          difficulty={currentEventPuzzle?.difficulty}
                          showDescription
                        />
                      ) : (
                        <span />
                      )}
                      {gameData.hints && gameData.hints.length > 0 ? (
                        <HintBadge
                          hints={gameData.hints}
                          gameId={gameData.id}
                          onHintReveal={(hintIndex) => {
                            dispatch({ type: "REVEAL_HINT" });
                            void playInterfaceSound("hint");
                            trackEvent(analyticsEvents.HINT_USED, {
                              puzzleId: gameData.id || "unknown",
                              hintIndex,
                            });
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex w-full max-w-2xl shrink-0 flex-col items-center">
                    <section aria-label="Puzzle" className="w-full shrink-0">
                      <PuzzleStage
                        puzzle={puzzleDisplay}
                        puzzleType={puzzleType}
                        question={keyboardOpen ? undefined : stageCaption}
                        state={stageState}
                        visual={gameData.visual}
                      />
                    </section>

                    {keyboardOpen && lastTurn ? (
                      <p
                        className={cn(
                          "mt-1.5 w-full truncate text-center text-xs leading-5",
                          lastTurn.tier === "close" || lastTurn.tier === "warm"
                            ? "text-warning"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                          {lastTurn.text}
                        </span>
                        <span className="mx-1.5 text-border-strong">·</span>
                        Eve · {lastTurn.line}
                      </p>
                    ) : null}
                  </div>

                  {hasThread && !keyboardOpen ? (
                    <GuessThread
                      className="mt-[clamp(0.75rem,2.5vh,1.25rem)] max-w-2xl"
                      footer={resultCard}
                      turns={turns}
                    />
                  ) : null}

                  {!hasThread && resultCard && !keyboardOpen ? (
                    <div className="mt-[clamp(0.75rem,2.5vh,1.25rem)] w-full max-w-2xl px-0.5 pb-2">
                      {resultCard}
                    </div>
                  ) : null}
                </div>
              </main>

              {/* Error display - positioned above input area */}
              {error && (
                <div
                  className="rb-enter mx-4 mb-2 flex justify-center"
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
                aria-label={
                  chatLocked ? "Day locked" : awaitingClosingQuip ? "Eve finishing" : "Answer input"
                }
                className={cn(
                  "input-area play-dock z-30 shrink-0 px-4 md:px-6",
                  keyboardOpen ? "pt-2 pb-2" : "pt-5 pb-safe-lg"
                )}
              >
                <div className="mx-auto max-w-2xl">
                  {chatLocked ? (
                    <ChatLockedDock
                      success={gameState.wasSuccessful}
                      nextPlayTime={gameState.nextPlayTime}
                    />
                  ) : awaitingClosingQuip ? (
                    <ChatClosingDock success={gameState.wasSuccessful} />
                  ) : (
                    <div className="play-dock-panel">
                      <SmartAnswerInput
                        disabled={
                          gameState.gameOver ||
                          gameState.isSubmitting ||
                          (!userId && isCreatingGuest)
                        }
                        isSubmitting={gameState.isSubmitting || isCreatingGuest}
                        onSubmit={handleGuess}
                      />
                    </div>
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
