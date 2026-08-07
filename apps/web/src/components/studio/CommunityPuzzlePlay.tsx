"use client";

import { useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityPuzzlePlay({
  puzzleId,
  hints,
  techniqueLabel,
}: {
  puzzleId: string;
  hints: string[];
  techniqueLabel: string;
}) {
  const { isAuthenticated, isGuest } = useAuth();
  const [guess, setGuess] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  async function submitGuess() {
    if (!guess.trim() || busy || solved) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/puzzles/guess", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          guess: guess.trim(),
          hintsUsed,
          timeSpentSeconds: 30,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        isCorrect?: boolean;
        explanation?: string;
        gameOver?: boolean;
        attemptsLeft?: number;
      };
      if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft);
      if (!response.ok) {
        setMessage(data.error || "Guess failed");
        return;
      }
      if (data.isCorrect) {
        setSolved(true);
        setMessage(data.explanation || "Solved — nice work.");
      } else if (data.gameOver) {
        setMessage(data.explanation || "Out of attempts on this board.");
      } else {
        setMessage("Not quite — try another angle.");
        setGuess("");
      }
    } catch {
      setMessage("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated || isGuest) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-card p-5 text-muted-foreground text-sm leading-6">
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Log in
        </Link>{" "}
        to guess. Technique: {techniqueLabel}.
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-subtle uppercase tracking-[0.14em]">
          Technique · {techniqueLabel}
        </p>
        {attemptsLeft !== null ? (
          <p className="font-mono text-[11px] text-subtle tabular-nums">
            {attemptsLeft} attempts left
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Your answer"
          className="flex-1 rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-border-strong"
          disabled={solved || busy}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitGuess();
          }}
          placeholder="Type your answer"
          value={guess}
        />
        <Button
          disabled={busy || solved || !guess.trim()}
          onClick={() => void submitGuess()}
          type="button"
        >
          Guess
        </Button>
        <Button
          disabled={hintsUsed >= hints.length || solved}
          onClick={() => setHintsUsed((n) => Math.min(hints.length, n + 1))}
          type="button"
          variant="outline"
        >
          Hint {hintsUsed < hints.length ? `(${hintsUsed}/${hints.length})` : ""}
        </Button>
      </div>
      {hintsUsed > 0 ? (
        <ul className="space-y-1.5 text-sm leading-6">
          {hints.slice(0, hintsUsed).map((hint, index) => (
            <li key={`${index}-${hint}`}>
              <span className="mr-2 font-mono text-[10px] text-subtle uppercase tracking-[0.14em]">
                Hint {index + 1}
              </span>
              {hint}
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p className={cn("text-sm leading-6", solved ? "font-medium text-success" : "")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
