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


export function SolveResultCardShellB(props: Record<string, any>) {
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
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            success ? "bg-success text-background" : "bg-muted text-muted-foreground"
          )}
        >
          {success ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Lock className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-base tracking-tight">
            {success ? "Solved" : "Out of guesses"}
          </p>
          <p
            className={cn(
              "mt-0.5 text-muted-foreground text-sm transition-opacity duration-200",
              scoreDone ? "opacity-100" : "opacity-0"
            )}
          >
            {streakTease}
          </p>
          {unlockedAchievementName && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[11px] text-subtle uppercase tracking-[0.08em] ">
              Unlocked · {unlockedAchievementName}
            </p>
          ) : null}
        </div>
      </div>

      {showAnswer ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">Answer</p>
            {typeof closestSimilarity === "number" && closestSimilarity > 0 ? (
              <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                Closest · {closestSimilarity}%
              </p>
            ) : null}
          </div>
          <p className="mt-1 font-semibold text-foreground text-lg tracking-tight">{answer}</p>
          <Button asChild className="mt-2.5" size="sm" variant="link">
            <Link className="h-auto px-0" href={resultsHref}>
              Explain more
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background/60">
        <div className="grid grid-cols-3 divide-x divide-border/80 py-3 text-center">
          <div>
            <p className="font-semibold text-foreground text-xl tabular-nums tracking-tight">
              {attempts}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              {attempts === 1 ? "Guess" : "Guesses"}
            </p>
            {cleanSolve && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[10px] text-success uppercase tracking-[0.08em] ">
                {noHintStreak > 1 ? `No hints · ${noHintStreak}` : "No hints"}
              </p>
            ) : null}
            {clutchSolve && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[10px] text-warning uppercase tracking-[0.08em] ">
                Clutch
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-semibold text-foreground text-xl tabular-nums tracking-tight">
              {displayScore}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              Points
            </p>
            {isLucky && scoreDone ? (
              <p className="mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                ×2
              </p>
            ) : null}
            {!isLucky && dayBonusMultiplier && dayBonusMultiplier > 1 && scoreDone ? (
              <p className="mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                ×{dayBonusMultiplier}
              </p>
            ) : null}
            {success && typeof dayRank === "number" && dayRank > 0 && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em] ">
                Day · #{dayRank}
              </p>
            ) : null}
          </div>
          <div>
            <p
              className={cn(
                "flex items-center justify-center gap-1 font-semibold text-foreground text-xl tabular-nums tracking-tight",
                streakLocked && "streak-lock-in"
              )}
            >
              {streak > 0 ? (
                <>
                  <span className="text-warning">{streak}</span>
                  <Flame
                    className={cn(
                      "h-3.5 w-3.5 text-warning",
                      isMilestone && streakLocked && "opacity-100"
                    )}
                  />
                </>
              ) : (
                "0"
              )}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
              Streak
            </p>
            {showBestGhost ? (
              <p className="mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
                Best {maxStreak}
              </p>
            ) : null}
            {personalBest && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[10px] text-success uppercase tracking-[0.08em] ">
                {personalBest}
              </p>
            ) : null}
            {paceLabel && scoreDone ? (
 <p className="rb-enter mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em] ">
                {paceLabel}
              </p>
            ) : null}
          </div>
        </div>
        {showLevelRim ? (
          <div
            aria-hidden
            className="level-rim h-0.5 w-full bg-border/60"
            style={{ ["--level-progress" as string]: `${levelProgress}%` }}
          />
        ) : null}
      </div>

      {puzzleId ? (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
            How was it?
          </p>
          <div className="flex gap-1.5">
            {PERCEPTION_OPTIONS.map((option) => {
              const selected = perception === option.id;
              return (
                <button
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 font-medium text-xs transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                  )}
                  disabled={Boolean(perception) || perceptionSaving}
                  key={option.id}
                  onClick={() => void submitPerception(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {perception ? (
            <p className="mt-1.5 text-center text-[11px] text-subtle">Tunes tomorrow.</p>
          ) : null}
        </div>
      ) : null}
      <SolveResultCardShellLower {...props} />
    </>
    </>
  );
}
