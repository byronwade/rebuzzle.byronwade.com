"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { AppLink as Link } from "@/components/AppLink";

export function CommunityPuzzlePlay({
  puzzleId,
  hints,
  techniqueLabel,
}: {
  puzzleId: string;
  hints: string[];
  techniqueLabel: string;
}) {
  const { isAuthenticated } = useAuth();
  const [guess, setGuess] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [busy, setBusy] = useState(false);

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
      };
      if (!response.ok) {
        setMessage(data.error || "Guess failed");
        return;
      }
      if (data.isCorrect) {
        setSolved(true);
        setMessage(data.explanation || "Solved!");
      } else if (data.gameOver) {
        setMessage(data.explanation || "Out of attempts — try another board.");
      } else {
        setMessage("Not quite — keep going.");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-8 rounded-xl border border-teal-900/10 bg-white/80 p-5 text-sm">
        <p className="text-muted-foreground">
          <Link className="font-medium text-teal-900 underline-offset-4 hover:underline" href="/login">
            Log in
          </Link>{" "}
          to guess this community puzzle. Technique: {techniqueLabel}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-teal-900/10 bg-white/80 p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-teal-900/60">
        Technique · {techniqueLabel}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-teal-900/15 px-3 py-2"
          disabled={solved || busy}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitGuess();
          }}
          placeholder="Your answer"
          value={guess}
        />
        <Button disabled={busy || solved} onClick={() => void submitGuess()} type="button">
          Guess
        </Button>
        <Button
          disabled={hintsUsed >= hints.length || solved}
          onClick={() => setHintsUsed((n) => Math.min(hints.length, n + 1))}
          type="button"
          variant="outline"
        >
          Hint
        </Button>
      </div>
      {hintsUsed > 0 ? (
        <ul className="space-y-1 text-sm text-teal-900/80">
          {hints.slice(0, hintsUsed).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
      {message ? <p className="text-sm text-teal-950">{message}</p> : null}
    </div>
  );
}
