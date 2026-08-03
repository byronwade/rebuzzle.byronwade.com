"use client";

/**
 * Lightweight web celebration beat (inspired by @rebuzzle/ui CelebrationOverlay)
 * without requiring the PlatformProvider graph.
 */

import { Check, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type WinCelebrationOverlayProps = {
  isVisible: boolean;
  score: number;
  streak: number;
  attempts: number;
  maxAttempts: number;
  isLucky?: boolean;
  dailyBonusMultiplier?: number;
  achievementName?: string | null;
  onComplete?: () => void;
  className?: string;
};

export function WinCelebrationOverlay({
  isVisible,
  score,
  streak,
  attempts,
  maxAttempts,
  isLucky = false,
  dailyBonusMultiplier,
  achievementName,
  onComplete,
  className,
}: WinCelebrationOverlayProps) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setPhase("hidden");
      setDisplayScore(0);
      return;
    }

    haptics.celebration();
    setPhase("in");

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setDisplayScore(score);
      const done = window.setTimeout(() => {
        setPhase("out");
        onComplete?.();
      }, 900);
      return () => window.clearTimeout(done);
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 700);
      setDisplayScore(Math.round(score * (1 - (1 - t) ** 3)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    const hide = window.setTimeout(() => {
      setPhase("out");
      onComplete?.();
    }, 2200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hide);
    };
  }, [isVisible, score, onComplete]);

  if (phase === "hidden") return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-0 z-[80] flex items-end justify-center bg-background/55 px-4 pb-[max(5.5rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] transition-opacity duration-300 sm:items-center sm:pb-0",
        phase === "out" ? "opacity-0" : "opacity-100",
        className
      )}
    >
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 rounded-2xl border border-border bg-card p-5 shadow-lg duration-300">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm tracking-tight">Solved</p>
            <p className="text-muted-foreground text-xs">
              {attempts}/{maxAttempts} · keep the chain
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-muted-foreground text-[11px] uppercase tracking-[0.08em]">
              Score
            </p>
            <p className="font-semibold text-3xl text-foreground tabular-nums tracking-tight">
              {displayScore}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 font-medium text-warning text-xs">
                <Flame className="h-3.5 w-3.5" />
                {streak}
              </span>
            )}
            {isLucky && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary text-xs">
                <Zap className="h-3.5 w-3.5" />
                Lucky ×2
              </span>
            )}
            {dailyBonusMultiplier && dailyBonusMultiplier > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Day ×{dailyBonusMultiplier}
              </span>
            )}
          </div>
        </div>

        {achievementName && (
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="truncate text-foreground text-xs">
              Unlocked <span className="font-medium">{achievementName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
