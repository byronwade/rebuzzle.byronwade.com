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

import { SolveResultCardShellLower } from "./solve-result-card-shell-lower";

import { SolveResultCardShellB } from "./solve-result-card-shell-b";

export function SolveResultCardShell(props: Record<string, any>) {
  const {
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
  } = props;
    return (
    <>

    <div
      aria-live="polite"
      className={cn(
        "solve-result-card w-full rounded-2xl border px-4 py-4",
        success ? "border-success/30 bg-success/[0.06]" : "border-border bg-card",
        className
      )}
      role="status"
    >
      <SolveResultCardShellB {...props} />
  );
}
