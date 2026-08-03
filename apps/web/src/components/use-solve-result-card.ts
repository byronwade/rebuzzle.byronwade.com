"use client";

import { Check, Flame, Lock, Trophy } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import { Timer } from "@/components/Timer";
import { Button } from "@/components/ui/button";
import { WordleStatsPanel } from "@/components/WordleStatsPanel";
import { getStreakTease } from "@/lib/game/streak-tease";
import { getLevelProgress } from "@/lib/gameSettings";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type PerceptionChoice = "too_easy" | "just_right" | "too_hard";

const PERCEPTION_OPTIONS: { id: PerceptionChoice; label: string }[] = [
  { id: "too_easy", label: "Too easy" },
  { id: "just_right", label: "Just right" },
  { id: "too_hard", label: "Brutal" },
];

export interface SolveResultCardProps {
  success: boolean;
  score: number;
  streak: number;
  attempts: number;
  maxAttempts: number;
  resultsHref: string;
  answer?: string | null;
  nextPlayTime?: Date | null;
  nearMiss?: boolean;
  isLucky?: boolean;
  dayBonusMultiplier?: number | null;
  unlockedAchievementName?: string | null;
  closestSimilarity?: number | null;
  maxStreak?: number;
  dayRank?: number | null;
  hintsUsed?: number;
  noHintStreak?: number;
  puzzleId?: string;
  timeTakenSeconds?: number;
  /** Previous best solve time in seconds (before this win). */
  previousBestSeconds?: number | null;
  /** Pace label from today's percentiles. */
  paceLabel?: string | null;
  /** Total points for level-rim (after this solve). */
  totalPoints?: number;
  showGuestSave?: boolean;
  streakFrozen?: boolean;
  streakFreezes?: number;
  guessDistribution?: number[];
  recentPlayDates?: string[];
  totalGames?: number;
  wins?: number;
  className?: string;
}

function useCountUp(
  target: number,
  enabled: boolean,
  durationMs = 700
): { value: number; done: boolean } {
  const [value, setValue] = useState(enabled ? 0 : target);
  const [done, setDone] = useState(!enabled || target <= 0);

  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target);
      setDone(true);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setValue(target);
      setDone(true);
      return;
    }

    setDone(false);
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, enabled, durationMs]);

  return { value, done };
}

function pbLabel(
  success: boolean,
  timeTakenSeconds: number,
  previousBestSeconds: number | null | undefined
): string | null {
  if (!success || timeTakenSeconds <= 0) return null;
  if (previousBestSeconds == null || previousBestSeconds <= 0) return "PB";
  if (timeTakenSeconds < previousBestSeconds) {
    const delta = previousBestSeconds - timeTakenSeconds;
    return `−${delta}s vs best`;
  }
  if (timeTakenSeconds === previousBestSeconds) return "PB tied";
  return null;
}

/**
 * In-thread result panel after the day locks — keeps the win/loss moment
 * inside the chat instead of hard-cutting to a separate page.
 */

export function useSolveResultCard(props: any = {}) {

  success,
  score,
  streak,
  attempts,
  maxAttempts,
  resultsHref,
  answer = null,
  nextPlayTime = null,
  nearMiss = false,
  isLucky = false,
  dayBonusMultiplier = null,
  unlockedAchievementName = null,
  closestSimilarity = null,
  maxStreak = 0,
  dayRank = null,
  hintsUsed = 0,
  noHintStreak = 0,
  puzzleId,
  timeTakenSeconds = 0,
  previousBestSeconds = null,
  paceLabel = null,
  totalPoints = 0,
  showGuestSave = false,
  streakFrozen = false,
  streakFreezes = 0,
  guessDistribution,
  recentPlayDates,
  totalGames = 0,
  wins = 0,
  className,
}: SolveResultCardProps) {
  const { isGuest, userId } = useAuth();
  const { value: displayScore, done: scoreDone } = useCountUp(
    success ? score : 0,
    success && score > 0
  );
  const streakTease = getStreakTease(streak, success, {
    streakFrozen,
    freezesLeft: streakFreezes,
  });
  const played = Math.max(totalGames, 0);
  const winCount = Math.max(wins, 0);
  const winRate = played > 0 ? Math.round((winCount / played) * 100) : 0;
  const showAnswer = Boolean(answer) && !success;
  const [showStats, setShowStats] = useState(false);
  const [perceptionOverride, setPerceptionOverride] = useState<PerceptionChoice | null>(null);
  const [perceptionSaving, setPerceptionSaving] = useState(false);
  const storedPerception = useSyncExternalStore(
    () => () => {},
    () => {
      if (!puzzleId) return null;
      try {
        const stored = localStorage.getItem(`difficultyPerception:${puzzleId}`);
        if (stored === "too_easy" || stored === "just_right" || stored === "too_hard") {
          return stored as PerceptionChoice;
        }
      } catch {}
      return null;
    },
    () => null
  );
  const perception = perceptionOverride ?? storedPerception;
  const streakLocked = Boolean(scoreDone && success && streak > 0);
  const isMilestone = success && [3, 7, 14, 30, 100].includes(streak);
  const cleanSolve = success && hintsUsed === 0;
  const clutchSolve = success && attempts >= maxAttempts;
  const showBestGhost = !success && maxStreak > 0;
  const personalBest = pbLabel(success, timeTakenSeconds, previousBestSeconds);
  const levelProgress = success && totalPoints > 0 ? getLevelProgress(totalPoints) : 0;
  const showLevelRim = success && scoreDone && levelProgress >= 85;

  useEffect(() => {
    if (!scoreDone) return;
    if (success && streak > 0) {
      haptics.tap();
    }
  }, [scoreDone, success, streak]);

  async function submitPerception(choice: PerceptionChoice) {
    if (!puzzleId || perceptionSaving || perception) return;
    setPerceptionSaving(true);
    setPerceptionOverride(choice);
    haptics.tap();
    try {
      localStorage.setItem(`difficultyPerception:${puzzleId}`, choice);
      await fetch("/api/puzzles/difficulty-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          puzzleId,
          perception: choice,
          solved: success,
          timeSpentSeconds: timeTakenSeconds,
          hintsUsed,
          attemptNumber: attempts,
        }),
      });
    } catch {
      // Non-blocking — local selection still stands
    }
    setPerceptionSaving(false);

  }


  return {
    cleanSolve,
    clutchSolve,
    isMilestone,
    levelProgress,
    perception,
    perceptionOverride,
    perceptionSaving,
    personalBest,
    played,
    setPerceptionOverride,
    setPerceptionSaving,
    setShowStats,
    showAnswer,
    showBestGhost,
    showLevelRim,
    showStats,
    stored,
    storedPerception,
    streakLocked,
    streakTease,
    submitPerception,
    winCount,
    winRate
  };
}
