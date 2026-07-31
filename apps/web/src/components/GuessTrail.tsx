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
    <ul
      aria-label="Guess history"
      className={cn("flex w-full max-w-2xl flex-wrap items-center justify-center gap-2", className)}
    >
      {attempts.map((attempt) => {
        const allCorrect = attempt.wordResults.every((w) => w.correct);
        const close = attempt.wordResults.some((w) => (w.similarity ?? 0) >= 70);
        return (
          <li
            key={`${attempt.attemptNumber}-${attempt.text}`}
            className={cn(
              "guess-chip inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
              "fade-in-50 zoom-in-95 animate-in motion-reduce:animate-none",
              allCorrect
                ? "border-success/30 bg-success/10 text-success"
                : close
                  ? "border-warning/30 bg-warning/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
            )}
          >
            <span className="font-mono text-[10px] text-subtle tabular-nums">
              {attempt.attemptNumber}
            </span>
            <span className="font-medium">{attempt.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
