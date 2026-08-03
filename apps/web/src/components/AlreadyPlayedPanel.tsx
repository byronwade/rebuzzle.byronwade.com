"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Timer } from "@/components/Timer";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import { getStreakTease } from "@/lib/game/streak-tease";
import { cn } from "@/lib/utils";

interface AlreadyPlayedPanelProps {
  wasSuccessful: boolean;
}

interface StoredCompletion {
  streak?: number;
  score?: number;
}

interface StoredSolution {
  answer?: string;
}

/**
 * Soft revisit landing after today's attempt — echoes the in-thread result
 * language instead of a hard-cut status page.
 */
export function AlreadyPlayedPanel({ wasSuccessful }: AlreadyPlayedPanelProps) {
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [eveLine, setEveLine] = useState<string | null>(null);
  const [nextPlayTime] = useState(() => getNextUtcMidnight());

  useEffect(() => {
    try {
      const completionRaw = localStorage.getItem("lastGameCompletion");
      if (completionRaw) {
        const completion = JSON.parse(completionRaw) as StoredCompletion;
        if (typeof completion.streak === "number") {
          setStreak(completion.streak);
        }
      }
      const solutionRaw = localStorage.getItem("lastGameSolution");
      if (solutionRaw) {
        const solution = JSON.parse(solutionRaw) as StoredSolution;
        if (typeof solution.answer === "string" && solution.answer.trim()) {
          setAnswer(solution.answer.trim());
        }
      }
      const eveRaw = localStorage.getItem("lastEveClosingLine");
      if (typeof eveRaw === "string" && eveRaw.trim()) {
        setEveLine(eveRaw.trim());
      }
    } catch {
      // Ignore corrupt local storage — panel still works without extras.
    }
  }, []);

  const tease = getStreakTease(wasSuccessful ? streak : 0, wasSuccessful);
  const resultsHref = wasSuccessful ? "/game-over?success=true" : "/game-over?success=false";

  return (
    <div className="mx-auto flex max-w-page items-center justify-center px-4 py-16 md:px-6 md:py-24">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border p-6 text-left shadow-lg sm:p-8",
          wasSuccessful ? "border-success/30 bg-success/[0.06]" : "border-border bg-card"
        )}
        role="status"
      >
        <p className="eyebrow">{wasSuccessful ? "Solved" : "Day locked"}</p>
        <h1
          className="mt-3 text-balance font-semibold text-2xl text-foreground tracking-[-0.04em]"
          id="puzzle-attempted-title"
        >
          {wasSuccessful ? "You already solved today." : "You've used today's attempt."}
        </h1>
        <p className="mt-3 text-balance text-muted-foreground text-sm leading-6">{tease}</p>

        {eveLine ? (
          <p className="mt-4 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 text-muted-foreground text-sm leading-6">
            <span className="font-medium text-foreground">Eve · </span>
            {eveLine}
          </p>
        ) : null}

        {!wasSuccessful && answer ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.08em]">Answer</p>
            <p className="mt-1 font-semibold text-foreground text-lg tracking-tight">{answer}</p>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
          <p className="text-muted-foreground text-xs">Next puzzle</p>
          <Timer
            className="font-mono text-foreground text-xs tabular-nums"
            compact
            nextPlayTime={nextPlayTime}
          />
        </div>

        <div className="mt-7 flex flex-col items-stretch gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 font-medium text-background text-sm transition-opacity hover:opacity-90"
            href={resultsHref}
          >
            {wasSuccessful ? "View results" : "Full results"}
          </Link>
          <Link
            className="text-center text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/leaderboard"
          >
            Check the leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
