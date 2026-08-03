"use client";

import { Check, Flame, Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
export function SolveResultCard({
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
  const [streakLocked, setStreakLocked] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [perception, setPerception] = useState<PerceptionChoice | null>(null);
  const [perceptionSaving, setPerceptionSaving] = useState(false);
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
      setStreakLocked(true);
      haptics.tap();
    }
  }, [scoreDone, success, streak]);

  useEffect(() => {
    if (!puzzleId) return;
    try {
      const stored = localStorage.getItem(`difficultyPerception:${puzzleId}`);
      if (stored === "too_easy" || stored === "just_right" || stored === "too_hard") {
        setPerception(stored);
      }
    } catch {
      // ignore
    }
  }, [puzzleId]);

  async function submitPerception(choice: PerceptionChoice) {
    if (!puzzleId || perceptionSaving || perception) return;
    setPerceptionSaving(true);
    setPerception(choice);
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
    } finally {
      setPerceptionSaving(false);
    }
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "solve-result-card w-full rounded-2xl border px-4 py-4",
        success ? "border-success/30 bg-success/[0.06]" : "border-border bg-card",
        className
      )}
      role="status"
    >
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
            <p className="mt-1 font-mono text-[11px] text-subtle uppercase tracking-[0.08em] animate-in fade-in duration-300">
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
              <p className="mt-1 font-mono text-[10px] text-success uppercase tracking-[0.08em] animate-in fade-in duration-300">
                {noHintStreak > 1 ? `No hints · ${noHintStreak}` : "No hints"}
              </p>
            ) : null}
            {clutchSolve && scoreDone ? (
              <p className="mt-1 font-mono text-[10px] text-warning uppercase tracking-[0.08em] animate-in fade-in duration-300">
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
              <p className="mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em] animate-in fade-in duration-300">
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
              <p className="mt-1 font-mono text-[10px] text-success uppercase tracking-[0.08em] animate-in fade-in duration-300">
                {personalBest}
              </p>
            ) : null}
            {paceLabel && scoreDone ? (
              <p className="mt-1 font-mono text-[10px] text-subtle uppercase tracking-[0.08em] animate-in fade-in duration-300">
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
    </div>
  );
}
