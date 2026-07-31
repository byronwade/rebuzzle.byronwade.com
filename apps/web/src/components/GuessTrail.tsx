"use client";

import { cn } from "@/lib/utils";

export interface GuessTrailAttempt {
  text: string;
  attemptNumber: number;
  wordResults: Array<{ correct: boolean; similarity?: number }>;
}

interface GuessTrailProps {
  attempts: GuessTrailAttempt[];
  className?: string;
}

/**
 * Compact chip trail of prior guesses — reads like a game affordance, not a chat log.
 */
export function GuessTrail({ attempts, className }: GuessTrailProps) {
  if (attempts.length === 0) return null;

  return (
    <div
      aria-label="Guess history"
      className={cn(
        "flex w-full max-w-2xl flex-wrap items-center justify-center gap-2",
        className
      )}
    >
      {attempts.map((attempt) => {
        const allCorrect = attempt.wordResults.every((w) => w.correct);
        const close = attempt.wordResults.some((w) => (w.similarity ?? 0) >= 70);
        return (
          <div
            key={`${attempt.attemptNumber}-${attempt.text}`}
            className={cn(
              "guess-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-transform duration-200",
              "animate-in fade-in-50 zoom-in-95 motion-reduce:animate-none",
              allCorrect
                ? "border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                : close
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                  : "border-border/80 bg-background/70 text-foreground/80 backdrop-blur-sm"
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
              {attempt.attemptNumber}
            </span>
            <span className="font-medium">{attempt.text}</span>
          </div>
        );
      })}
    </div>
  );
}
