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
import { getPuzzleQuestion } from "./PuzzleDisplay";
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
    maxStreak: 0,
    totalGames: 0,
    wins: 0,
    achievements: [],
    level: 1,
    lastPlayDate: null,
    dailyChallengeStreak: 0,
    noHintStreak: 0,
    fastestSolveSeconds: null,
    streakFreezes: 1,
    guessDistribution: [0, 0, 0],
    recentPlayDates: [],
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
  /** Answer revealed after a loss (and stored for revisit). */
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);
  /** Brushed a close miss — fuels share copy + Zeigarnik. */
  const [hadNearMiss, setHadNearMiss] = useState(false);
  /** Variable-reward lucky solve (client roll when server points absent). */
  const [isLuckySolve, setIsLuckySolve] = useState(false);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [fromChallenge, setFromChallenge] = useState(false);
  const [closestSimilarity, setClosestSimilarity] = useState(0);
  const [unlockedAchievementName, setUnlockedAchievementName] = useState<string | null>(null);
  const [dayRank, setDayRank] = useState<number | null>(null);
  const [showGuestSave, setShowGuestSave] = useState(false);
  const [dayBonusMultiplier, setDayBonusMultiplier] = useState<number | null>(null);
  const [paceLabel, setPaceLabel] = useState<string | null>(null);
  const [previousBestSeconds, setPreviousBestSeconds] = useState<number | null>(null);
  const consecutiveColdRef = useRef(0);
  const [isReturner, setIsReturner] = useState(false);
  const [isComeback, setIsComeback] = useState(false);
  /** Celebrate when the locked dock + result card land — not at guess submit. */
  const pendingCelebrationRef = useRef(false);
  const wasChatLockedRef = useRef(false);

  useEffect(() => {
    setIsReturner(isReturningUser());
    setIsComeback(isComebackVisit());
  }, []);

  const patchTurn = useCallback((id: number, patch: Partial<ThreadTurn>) => {
    setTurns((prev) =>
      prev.map((turn) => {
        if (turn.id !== id) return turn;
        const next = { ...turn, ...patch };
        // Persist Eve's closing line for the soft revisit landing.
        if (
          (next.tier === "correct" || next.tier === "out") &&
          typeof next.quip === "string" &&
          next.quip.trim()
        ) {
          try {
            localStorage.setItem("lastEveClosingLine", next.quip.trim());
          } catch {
            // Ignore quota / private mode.
          }
        }
        return next;
      })
    );
  }, []);

  /**
   * Ask Eve for a riff on a guess and type it into a second bubble.
   *
   * Never blocks feedback: the instant line is already on screen by the time
   * this is called, and if the stream fails the riff bubble simply never
   * appears. The route is not given the answer, so it can't leak one.
   *
   * Final win/loss tiers are allowed so Eve can still close the conversation
   * before the chat dock locks. A short timeout keeps a slow model from
   * holding the input open forever.
   */
  const streamQuip = useCallback(
    async (id: number, guess: string, tier: ReactionTier) => {
      patchTurn(id, { quipPending: true });
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch("/api/puzzles/quip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ puzzleId: gameData.id, guess, tier }),
          signal: controller.signal,
        });

        if (!(response.ok && response.body)) {
          patchTurn(id, { quipPending: false });
          window.clearTimeout(timeoutId);
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
      window.clearTimeout(timeoutId);

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
              maxStreak: data.stats.maxStreak || 0,
              totalGames: data.stats.totalGames || 0,
              wins: data.stats.wins || 0,
              achievements: [],
              level: data.stats.level || 1,
              lastPlayDate: data.stats.lastPlayDate || null,
              dailyChallengeStreak: data.stats.dailyChallengeStreak || 0,
              noHintStreak: data.stats.noHintStreak || 0,
              fastestSolveSeconds:
                typeof data.stats.fastestSolveSeconds === "number"
                  ? data.stats.fastestSolveSeconds
                  : null,
              streakFreezes:
                typeof data.stats.streakFreezes === "number" ? data.stats.streakFreezes : 1,
              guessDistribution: Array.isArray(data.stats.guessDistribution)
                ? data.stats.guessDistribution
                : [0, 0, 0],
              recentPlayDates: Array.isArray(data.stats.recentPlayDates)
                ? data.stats.recentPlayDates
                : [],
            });
          }
        }
      } catch (err) {
        console.error("Failed to load user stats:", err);
      }
    };

    loadUserStats();
  }, [userId]);

  // Sync game state with context for header display.
  // Stop (and don't restart) once the day is locked in-thread.
  useEffect(() => {
    if (!(gameData.isCompleted || gameState.gameOver)) {
      startGame(typeof gameData.difficulty === "number" ? gameData.difficulty : 5);
    }
    return () => {
      endGame();
    };
  }, [gameData.difficulty, gameData.isCompleted, gameState.gameOver, startGame, endGame]);

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
    (
      success: boolean,
      finalGuess: string,
      attempts: number,
      opts?: {
        serverScore?: number;
        celebrate?: boolean;
        isLucky?: boolean;
        dailyBonusMultiplier?: number;
      }
    ) => {
      const tomorrow = getNextUtcMidnight();
      const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - gameState.startTime) / 1000));
      const difficultyLevel = typeof gameData.difficulty === "number" ? gameData.difficulty : 5;
      const serverScore = opts?.serverScore;

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

      if (success) {
        if (typeof opts?.isLucky === "boolean" || typeof opts?.dailyBonusMultiplier === "number") {
          setIsLuckySolve(Boolean(opts.isLucky));
          if (opts.dailyBonusMultiplier && opts.dailyBonusMultiplier > 1) {
            setDayBonusMultiplier(opts.dailyBonusMultiplier);
          }
        } else if (!(typeof serverScore === "number" && serverScore > 0)) {
          // Offline / no server score only — never invent lucky when server authored points.
          const dailyBonus = getDailyBonusMultiplier();
          if (dailyBonus.hasBonus) {
            setDayBonusMultiplier(dailyBonus.multiplier);
          }
          const luckyResult = rollLuckySolve();
          if (luckyResult.isLucky) {
            score = Math.round(score * luckyResult.multiplier);
            setIsLuckySolve(true);
          } else if (dailyBonus.hasBonus) {
            score = Math.round(score * dailyBonus.multiplier);
          }
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

      // Clear header difficulty / attempts rail — stay-in-thread solve used to leave them up.
      endGame();
      dismissKeyboard();
      if (success && opts?.celebrate) {
        pendingCelebrationRef.current = true;
        markJustSolvedInSession();
      } else if (!success) {
        haptics.error();
      }
    },
    [
      dismissKeyboard,
      endGame,
      gameState.startTime,
      gameState.hintsUsed,
      userStats.streak,
      gameData.difficulty,
    ]
  );

  const handleIncorrectGuess = useCallback(
    (_attemptsLeft: number, similarity?: number, tier?: ReactionTier) => {
      const resolvedTier =
        tier ??
        (similarity !== undefined && similarity >= engagementConfig.nearMissThreshold
          ? "close"
          : similarity !== undefined && similarity >= 40
            ? "warm"
            : "cold");

      if (resolvedTier === "close") {
        haptics.warning();
        void playInterfaceSound("near-miss");
      } else if (resolvedTier === "warm") {
        haptics.warm();
        void playInterfaceSound("incorrect", { playbackRate: 1.02 });
      } else {
        haptics.error();
        void playInterfaceSound("incorrect", { playbackRate: 0.94 });
      }
    },
    []
  );

  const handleGuess = useCallback(
    async (guessValue?: string) => {
      const guess = guessValue?.trim() ?? "";

      if (gameState.gameOver || !currentEventPuzzle || !guess || gameState.isSubmitting) {
        return;
      }

      // Start audio while the browser still considers this a direct user gesture.
      void playInterfaceSound("submit");

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
          void playInterfaceSound("failure");
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
            consecutiveCold: consecutiveColdRef.current,
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
          unlockedAchievement?: { name?: string };
          isLucky?: boolean;
          hasDailyBonus?: boolean;
          dailyBonusMultiplier?: number;
          streak?: number;
          maxStreak?: number;
          streakFreezes?: number;
          streakFrozen?: boolean;
          guessDistribution?: number[];
          recentPlayDates?: string[];
          error?: string;
        };

        // Already locked / replay blocked — stay in-thread, don't hard-cut away
        if (response.status === 409 || result.locked) {
          void playInterfaceSound("notification");
          setCompletionState(
            Boolean(result.wasSuccessful),
            guessToCheck,
            gameSettings.maxAttempts,
            {
              celebrate: false,
            }
          );
          toast({
            title: result.wasSuccessful ? "Already solved today" : "Day already locked",
            description: "Chat is locked. Open full results from the card below.",
          });
          dispatch({ type: "SET_IS_SUBMITTING", payload: false });
          return;
        }

        if (!response.ok || !result.success) {
          fail(result.error || "Failed to process guess");
        }

        const wordResults: WordResult[] = result.wordResults || [];
        const attemptNumber =
          result.attemptNumber ?? gameSettings.maxAttempts - previousAttemptsLeft + 1;

        if (typeof result.similarity === "number") {
          setClosestSimilarity((prev) => Math.max(prev, result.similarity ?? 0));
        }

        // Post the turn the moment the server answers. The reaction is derived
        // from the similarity score server-side, so this is instant.
        const reaction = result.reaction;
        const turnId = ++turnSeq.current;
        if (reaction) {
          if (reaction.tier === "close") {
            setHadNearMiss(true);
          }
          if (reaction.tier === "cold") {
            consecutiveColdRef.current += 1;
          } else {
            consecutiveColdRef.current = 0;
          }
          setTurns((prev) => [
            ...prev,
            {
              id: turnId,
              text: guessToCheck,
              attemptNumber,
              tier: reaction.tier,
              line: reaction.line,
              wordResults: wordResults.map((w) => ({
                word: w.word,
                correct: w.correct,
                similarity: w.similarity ?? 0,
              })),
            },
          ]);
        }

        if (result.correct) {
          void playInterfaceSound("success");
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

          if (typeof result.answer === "string" && result.answer.trim()) {
            setRevealedAnswer(result.answer.trim());
          }
          if (result.unlockedAchievement?.name) {
            setUnlockedAchievementName(result.unlockedAchievement.name);
          }
          recordPlayDay();
          setShowGuestSave(shouldPromptGuestSave());

          // Start Eve's closing riff before lock UI so the dock waits on it.
          if (reaction) {
            try {
              localStorage.setItem("lastEveClosingLine", reaction.line);
            } catch {
              // Ignore quota / private mode.
            }
            void streamQuip(turnId, guessToCheck, reaction.tier);
          }

          const previousBest = userStats.fastestSolveSeconds;
          setPreviousBestSeconds(
            typeof previousBest === "number" && previousBest > 0 ? previousBest : null
          );

          setCompletionState(true, guessToCheck, attempts, {
            serverScore: earnedPoints,
            celebrate: true,
            isLucky: Boolean(result.isLucky),
            dailyBonusMultiplier:
              typeof result.dailyBonusMultiplier === "number"
                ? result.dailyBonusMultiplier
                : undefined,
          });

          const cleanWin = gameState.hintsUsed === 0;
          const serverStreak =
            typeof result.streak === "number" ? result.streak : userStats.streak + 1;
          const newStats = { ...userStats };
          newStats.totalGames += 1;
          newStats.wins += 1;
          newStats.streak = serverStreak;
          newStats.maxStreak = Math.max(
            newStats.maxStreak,
            typeof result.maxStreak === "number" ? result.maxStreak : serverStreak
          );
          newStats.points += earnedPoints;
          newStats.level = Math.floor(newStats.points / 1000) + 1;
          newStats.lastPlayDate = new Date().toISOString();
          newStats.noHintStreak = cleanWin ? (userStats.noHintStreak || 0) + 1 : 0;
          if (typeof result.streakFreezes === "number") {
            newStats.streakFreezes = result.streakFreezes;
          }
          if (Array.isArray(result.guessDistribution)) {
            newStats.guessDistribution = result.guessDistribution;
          }
          if (Array.isArray(result.recentPlayDates)) {
            newStats.recentPlayDates = result.recentPlayDates;
          }
          if (previousBest == null || previousBest <= 0 || timeTaken < previousBest) {
            newStats.fastestSolveSeconds = timeTaken;
          }
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
          void playInterfaceSound("failure");

          if (typeof result.answer === "string" && result.answer.trim()) {
            setRevealedAnswer(result.answer.trim());
          }
          recordPlayDay();
          setShowGuestSave(shouldPromptGuestSave());

          // Start Eve's closing riff before lock UI so the dock waits on it.
          if (reaction) {
            try {
              localStorage.setItem("lastEveClosingLine", reaction.line);
            } catch {
              // Ignore quota / private mode.
            }
            void streamQuip(turnId, guessToCheck, reaction.tier);
          }

          setCompletionState(false, guessToCheck, gameSettings.maxAttempts);
          setStreakFrozen(Boolean(result.streakFrozen));

          const newStats = { ...userStats };
          newStats.totalGames += 1;
          newStats.streak =
            typeof result.streak === "number"
              ? result.streak
              : result.streakFrozen
                ? userStats.streak
                : 0;
          newStats.maxStreak = Math.max(
            newStats.maxStreak,
            typeof result.maxStreak === "number" ? result.maxStreak : newStats.maxStreak
          );
          newStats.noHintStreak = 0;
          newStats.lastPlayDate = new Date().toISOString();
          if (typeof result.streakFreezes === "number") {
            newStats.streakFreezes = result.streakFreezes;
          }
          if (Array.isArray(result.guessDistribution)) {
            newStats.guessDistribution = result.guessDistribution;
          }
          if (Array.isArray(result.recentPlayDates)) {
            newStats.recentPlayDates = result.recentPlayDates;
          }
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

        handleIncorrectGuess(newAttemptsLeft, overallSimilarity, reaction?.tier);

        // Eve's riff arrives behind the instant line, in its own bubble.
        if (reaction) {
          void streamQuip(turnId, guessToCheck, reaction.tier);
        }
      } catch (error) {
        console.error("Error processing guess:", error);
        void playInterfaceSound("failure");
        dispatch({ type: "SET_ATTEMPTS_LEFT", payload: previousAttemptsLeft });
        dispatch({ type: "SET_LAST_SUBMITTED_GUESS", payload: previousLastSubmittedGuess });
        setError({
          message: "Failed to process your guess. Please try again.",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
      dispatch({ type: "SET_IS_SUBMITTING", payload: false });

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

  // Keep the answer bar open until Eve's closing riff settles.
  const awaitingClosingQuip = turns.some(
    (turn) => (turn.tier === "correct" || turn.tier === "out") && Boolean(turn.quipPending)
  );
  const chatLocked = gameState.gameOver && !awaitingClosingQuip;
  const lastTurn = turns.at(-1);

  // Quiet confetti only — no fullscreen celebration chrome.
  useEffect(() => {
    if (!chatLocked || !gameState.wasSuccessful || !pendingCelebrationRef.current) return;
    pendingCelebrationRef.current = false;
    haptics.celebration();
    window.requestAnimationFrame(() => {
      void fireConfetti();
    });
  }, [chatLocked, gameState.wasSuccessful]);

  // Share deep link → one quiet stage caption, not a banner.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { challengerId, fromShare } = parseBeatMeChallenge(window.location.search);
    if (!fromShare || !challengerId || challengerId === userId) return;
    setFromChallenge(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("beat");
      url.searchParams.delete("from");
      window.history.replaceState({}, "", url.pathname + url.search);
    } catch {
      // ignore
    }
  }, [userId]);

  // Soft lock click when the day closes — ritualizes "come back tomorrow".
  useEffect(() => {
    if (chatLocked && !wasChatLockedRef.current) {
      haptics.lock();
      void playInterfaceSound("notification");
    }
    wasChatLockedRef.current = chatLocked;
  }, [chatLocked]);

  // Quiet day-rank murmur after a win — social proof without leaving the thread.
  useEffect(() => {
    if (!(chatLocked && gameState.wasSuccessful)) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/user/stats?timeframe=today");
        if (!response.ok) return;
        const data = (await response.json()) as { rank?: number };
        if (!cancelled && typeof data.rank === "number" && data.rank > 0) {
          setDayRank(data.rank);
        }
      } catch {
        // Non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatLocked, gameState.wasSuccessful]);

  // Pace murmur from today's solve-time percentiles.
  useEffect(() => {
    if (!(chatLocked && gameState.wasSuccessful)) return;
    const elapsed = gameState.timeTakenSeconds;
    if (elapsed <= 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/puzzles/stats?puzzleId=${encodeURIComponent(gameData.id)}`,
          { credentials: "include" }
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          percentiles?: { p25?: number; p50?: number; p75?: number };
        };
        const p = data.percentiles;
        if (!p?.p50 || p.p50 <= 0 || cancelled) return;
        if (typeof p.p25 === "number" && elapsed <= p.p25) {
          setPaceLabel("Faster than most");
        } else if (elapsed <= p.p50) {
          setPaceLabel("Around the middle");
        } else if (typeof p.p75 === "number" && elapsed <= p.p75) {
          setPaceLabel("A bit slower today");
        } else {
          setPaceLabel("Took your time");
        }
      } catch {
        // optional murmur
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatLocked, gameState.wasSuccessful, gameState.timeTakenSeconds, gameData.id]);

  const stageCaption = useMemo(() => {
    const base = getPuzzleQuestion(puzzleType);
    if (hasThread || gameState.gameOver) return base;
    if (fromChallenge) return "Shared with you · one puzzle";
    if (isComeback) return "Welcome back · one puzzle";
    try {
      if (checkStreakGracePeriod().inGracePeriod && userStats.streak > 0) {
        return "Grace window · streak safe";
      }
    } catch {
      // ignore
    }
    if (isReturner && userStats.streak > 0) {
      return `Day ${userStats.streak} · one puzzle`;
    }
    return base;
  }, [
    puzzleType,
    hasThread,
    gameState.gameOver,
    userStats.streak,
    isReturner,
    isComeback,
    fromChallenge,
  ]);

  const resultCard = chatLocked ? (
    <SolveResultCard
      success={gameState.wasSuccessful}
      score={gameState.finalScore}
      streak={userStats.streak}
      attempts={gameState.finalAttempts}
      maxAttempts={gameSettings.maxAttempts}
      resultsHref={resultsHref}
      answer={revealedAnswer}
      nextPlayTime={gameState.nextPlayTime}
      nearMiss={hadNearMiss}
      isLucky={isLuckySolve}
      dayBonusMultiplier={dayBonusMultiplier}
      unlockedAchievementName={unlockedAchievementName}
      closestSimilarity={closestSimilarity > 0 ? closestSimilarity : null}
      maxStreak={userStats.maxStreak}
      dayRank={dayRank}
      hintsUsed={gameState.hintsUsed}
      noHintStreak={userStats.noHintStreak}
      puzzleId={gameData.id}
      timeTakenSeconds={gameState.timeTakenSeconds}
      previousBestSeconds={previousBestSeconds}
      paceLabel={paceLabel}
      totalPoints={userStats.points}
      showGuestSave={showGuestSave}
      streakFrozen={streakFrozen}
      streakFreezes={userStats.streakFreezes}
      guessDistribution={userStats.guessDistribution}
      recentPlayDates={userStats.recentPlayDates}
      totalGames={userStats.totalGames}
      wins={userStats.wins}
    />
  ) : null;

  const showStageChrome =
    !gameState.gameOver && (!hasThread || Boolean(gameData.hints && gameData.hints.length > 0));

  // Puzzle data is already on the server-rendered board — never blank it for
  // auth/guest warm-up. Guest creation only disables submit (below).
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
