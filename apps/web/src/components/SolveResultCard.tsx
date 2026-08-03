"use client";

import { Check, Flame, Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import { Timer } from "@/components/Timer";
import { Button } from "@/components/ui/button";
import { getStreakTease } from "@/lib/game/streak-tease";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface SolveResultCardProps {
  success: boolean;
  score: number;
  streak: number;
  attempts: number;
  maxAttempts: number;
  resultsHref: string;
  /** Revealed on loss (and optionally win) once the day is locked. */
  answer?: string | null;
  nextPlayTime?: Date | null;
  /** Brushed a close miss during the day. */
  nearMiss?: boolean;
  /** Variable-reward lucky solve echo. */
  isLucky?: boolean;
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
  className,
}: SolveResultCardProps) {
  const { isGuest, userId } = useAuth();
  const { value: displayScore, done: scoreDone } = useCountUp(
    success ? score : 0,
    success && score > 0
  );
  const streakTease = getStreakTease(streak, success);
  const showAnswer = Boolean(answer) && !success;
  const [streakLocked, setStreakLocked] = useState(false);
  const isMilestone = success && [3, 7, 14, 30, 100].includes(streak);

  // Streak lock-in + tease land after the numbers settle.
  useEffect(() => {
    if (!scoreDone) return;
    if (success && streak > 0) {
      setStreakLocked(true);
      haptics.tap();
    }
  }, [scoreDone, success, streak]);

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
        </div>
      </div>

      {showAnswer ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">Answer</p>
          <p className="mt-1 font-semibold text-foreground text-lg tracking-tight">{answer}</p>
          <Button asChild className="mt-2.5" size="sm" variant="link">
            <Link className="h-auto px-0" href={resultsHref}>
              Explain more
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 divide-x divide-border/80 overflow-hidden rounded-xl border border-border/70 bg-background/60 py-3 text-center">
        <div>
          <p className="font-semibold text-foreground text-xl tabular-nums tracking-tight">
            {attempts}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
            {attempts === 1 ? "Guess" : "Guesses"}
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground text-xl tabular-nums tracking-tight">
            {displayScore}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
            Points
          </p>
          {isLucky && scoreDone ? (
            <p className="mt-1 font-mono text-[10px] text-warning uppercase tracking-[0.08em] animate-in fade-in duration-300">
              ×2 lucky
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
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
        <p className="min-w-0 truncate text-muted-foreground text-xs">Next puzzle</p>
        <Timer
          className="shrink-0 font-mono text-foreground text-xs tabular-nums"
          compact
          nextPlayTime={nextPlayTime}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <EnhancedShareButton
          className="flex-1"
          success={success}
          attempts={attempts}
          maxAttempts={maxAttempts}
          streak={streak}
          nearMiss={nearMiss}
        />
        {success ? (
          <Button asChild className="flex-1" size="sm" variant="outline">
            <Link href={resultsHref}>Full results</Link>
          </Button>
        ) : showAnswer ? (
          <Button asChild className="flex-1" size="sm" variant="outline">
            <Link href={resultsHref}>Full results</Link>
          </Button>
        ) : (
          <Button asChild className="flex-1" size="sm" variant="default">
            <Link href={resultsHref}>See the answer</Link>
          </Button>
        )}
      </div>

      {(isGuest || !userId) && success ? (
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
