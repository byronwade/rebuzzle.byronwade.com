"use client";

import { useState } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

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
      <div className="mt-8 rounded-xl border border-teal-900/10 bg-white/80 p-5 text-sm leading-6 text-teal-900/80">
        <Link className="font-medium text-teal-900 underline-offset-4 hover:underline" href="/login">
          Log in
        </Link>{" "}
        to guess. Technique: {techniqueLabel}.
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-teal-900/10 bg-white/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-teal-900/60">
          Technique · {techniqueLabel}
        </p>
        {attemptsLeft !== null ? (
          <p className="text-xs text-teal-900/55">{attemptsLeft} attempts left</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Your answer"
          className="flex-1 rounded-lg border border-teal-900/15 px-3 py-2.5"
          disabled={solved || busy}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitGuess();
          }}
          placeholder="Type your answer"
          value={guess}
        />
        <Button disabled={busy || solved || !guess.trim()} onClick={() => void submitGuess()} type="button">
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
        <ul className="space-y-1.5 text-sm text-teal-900/80">
          {hints.slice(0, hintsUsed).map((hint, index) => (
            <li key={`${index}-${hint}`}>
              <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-teal-900/45">
                Hint {index + 1}
              </span>
              {hint}
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p className={`text-sm ${solved ? "text-teal-900" : "text-teal-950"}`}>{message}</p>
      ) : null}
    </div>
  );
}
