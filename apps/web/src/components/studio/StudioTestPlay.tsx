"use client";

import { Check, Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { Button } from "@/components/ui/button";
import { normalizeStudioGuess } from "@/lib/ugc/studio-draft";
import { cn } from "@/lib/utils";

type StudioTestPlayProps = {
  visual: PuzzleVisual;
  answer: string;
  hints: string[];
  explanation: string;
  cleared: boolean;
  onCleared: () => void;
  onContinue: () => void;
  onBackToMake: () => void;
};

/**
 * Test play: solve your own board exactly as a player will see it, like a
 * level editor's play button. Nothing is sent anywhere; it only checks
 * that the board, answer and hints hang together before Eve looks.
 */
export function StudioTestPlay({
  visual,
  answer,
  hints,
  explanation,
  cleared,
  onCleared,
  onContinue,
  onBackToMake,
}: StudioTestPlayProps) {
  const [guess, setGuess] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [miss, setMiss] = useState<string | null>(null);
  const filledHints = hints.filter((h) => h.trim());

  const submit = () => {
    if (!guess.trim()) return;
    if (normalizeStudioGuess(guess) === normalizeStudioGuess(answer)) {
      setMiss(null);
      onCleared();
    } else {
      setMiss(`“${guess.trim()}” isn’t it. Your answer is “${answer.trim()}”.`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-10 md:py-14">
        <PuzzleVisualBoard fallback={visual.unicodeFallback} size="large" visual={visual} />
      </div>

      {cleared ? (
        <div className="rb-enter w-full rounded-xl border border-success/40 bg-success/10 p-4 text-center">
          <p className="inline-flex items-center gap-2 font-semibold">
            <Check aria-hidden className="size-4 text-success" />
            Cleared
          </p>
          {explanation.trim() ? (
            <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
              {explanation.trim()}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={onBackToMake} type="button" variant="outline">
              Keep editing
            </Button>
            <Button onClick={onContinue} type="button" variant="brand">
              Send to Eve
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="answer-bar flex items-center gap-1.5 rounded-xl border border-border bg-card p-1.5">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Your guess</span>
              <input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="h-11 w-full bg-transparent px-3 text-base outline-none"
                onChange={(e) => {
                  setGuess(e.target.value);
                  setMiss(null);
                }}
                placeholder="Solve it like a player…"
                spellCheck={false}
                value={guess}
              />
            </label>
            <Button disabled={!guess.trim()} type="submit" variant="brand">
              Guess
            </Button>
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-center text-muted-foreground text-xs">
            {miss}
          </p>
        </form>
      )}

      {filledHints.length ? (
        <div className="w-full">
          <ol className="space-y-1.5">
            {filledHints.slice(0, hintsShown).map((hint, index) => (
              <li
                className="rb-enter flex gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                key={`shown-${index}`}
              >
                <span className="font-mono text-subtle text-xs tabular-nums leading-5">
                  {index + 1}
                </span>
                {hint}
              </li>
            ))}
          </ol>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {hintsShown < filledHints.length ? (
              <Button
                onClick={() => setHintsShown((n) => n + 1)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Lightbulb aria-hidden />
                Show hint {hintsShown + 1} of {filledHints.length}
              </Button>
            ) : null}
            {hintsShown > 0 || cleared ? (
              <Button
                onClick={() => {
                  setHintsShown(0);
                  setGuess("");
                  setMiss(null);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RotateCcw aria-hidden />
                Reset run
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className={cn("text-center text-muted-foreground text-xs")}>
          No hints yet. Add them on the clue card so stuck players get a nudge.
        </p>
      )}
    </div>
  );
}
