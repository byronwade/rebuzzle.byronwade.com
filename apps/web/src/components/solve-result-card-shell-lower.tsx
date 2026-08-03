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

export function SolveResultCardShellLower(props: Record<string, any>) {
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

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
        <p className="min-w-0 truncate text-muted-foreground text-xs">Next puzzle</p>
        <Timer
          className="shrink-0 font-mono text-foreground text-xs tabular-nums"
          compact
          nextPlayTime={nextPlayTime}
        />
      </div>

      {scoreDone && (guessDistribution || played > 0) ? (
        <div className="mt-3">
          <button
            className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em] underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setShowStats((open) => !open)}
            type="button"
          >
            {showStats ? "Hide stats" : "Stats"}
          </button>
          {showStats ? (
            <div className="mt-2 rounded-xl border border-border/50 bg-background/40 px-3 py-3">
              <WordleStatsPanel
                compact
                stats={{
                  played,
                  winRate,
                  currentStreak: streak,
                  maxStreak: Math.max(maxStreak, streak),
                  guessDistribution: guessDistribution ?? [0, 0, 0],
                  recentPlayDates,
                  streakFreezes,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <EnhancedShareButton
          className="flex-1"
          success={success}
          attempts={attempts}
          maxAttempts={maxAttempts}
          streak={streak}
          nearMiss={nearMiss}
        />
        <Button
          asChild
          className="flex-1"
          size="sm"
          variant={success || showAnswer ? "outline" : "default"}
        >
          <Link href={resultsHref}>
            {success || showAnswer ? "Full results" : "See the answer"}
          </Link>
        </Button>
      </div>

      {showGuestSave && (isGuest || !userId) && success ? (
        <div className="mt-3 rounded-xl border border-border/70 bg-background/50 px-3 py-3">
          <p className="flex items-center gap-1.5 font-medium text-foreground text-sm">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
            Keep your streak
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Create a free account so today’s win and streak stick around.
          </p>
          <Button asChild className="mt-2.5 w-full" size="sm" variant="secondary">
            <Link href="/signup">Create a free account</Link>
          </Button>
        </div>
      ) : null}
    </div>    </>
  );
}
