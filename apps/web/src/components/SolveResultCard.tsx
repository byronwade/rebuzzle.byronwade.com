"use client";

import { Check, Flame, Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { EnhancedShareButton } from "@/components/EnhancedShareButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SolveResultCardProps {
  success: boolean;
  score: number;
  streak: number;
  attempts: number;
  maxAttempts: number;
  resultsHref: string;
  className?: string;
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
  className,
}: SolveResultCardProps) {
  const { isGuest, userId } = useAuth();

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
          <p className="mt-0.5 text-muted-foreground text-sm">
            {success
              ? "Today’s puzzle is done. Chat is locked until tomorrow."
              : "That’s the day — chat is locked. See the answer on the results page."}
          </p>
        </div>
      </div>

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
            {success ? score : 0}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">
            Points
          </p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 font-semibold text-foreground text-xl tabular-nums tracking-tight">
            {streak > 0 ? (
              <>
                <span className="text-warning">{streak}</span>
                <Flame className="h-3.5 w-3.5 text-warning" />
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {success ? (
          <EnhancedShareButton
            className="flex-1"
            success
            attempts={attempts}
            maxAttempts={maxAttempts}
            streak={streak}
          />
        ) : null}
        <Button asChild className="flex-1" size="sm" variant={success ? "outline" : "default"}>
          <Link href={resultsHref}>{success ? "Full results" : "See the answer"}</Link>
        </Button>
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
