"use client";

import { useState } from "react";
import type { StudioPuzzleDraft } from "@/ai/puzzle-agent/studio-draft-contract";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { Button } from "@/components/ui/button";

type StudioAiQuota = { used: number; limit: number; remaining: number };

type GenerationResponse = {
  candidates?: StudioPuzzleDraft[];
  partial?: boolean;
  notice?: string;
  error?: string;
  used?: number;
  limit?: number;
  remaining?: number;
};

type StudioPuzzleGeneratorProps = {
  quota: StudioAiQuota;
  onQuotaChange: (quota: StudioAiQuota) => void;
  onUseDraft: (draft: StudioPuzzleDraft) => void;
};

function qualificationLabel(status: StudioPuzzleDraft["qualification"]["status"]) {
  if (status === "passed") return "Passed initial playability checks";
  if (status === "needs_review") return "Needs a closer look";
  return "Review pending";
}

function qualificationClass(status: StudioPuzzleDraft["qualification"]["status"]) {
  if (status === "passed") return "text-success";
  if (status === "needs_review") return "text-warning";
  return "text-muted-foreground";
}

export function StudioPuzzleGenerator({
  quota,
  onQuotaChange,
  onUseDraft,
}: StudioPuzzleGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<StudioPuzzleDraft[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizedAnswer = answer.trim();
  const canGenerate =
    prompt.trim().length >= 2 &&
    (normalizedAnswer.length === 0 || normalizedAnswer.length >= 2) &&
    quota.remaining > 0 &&
    !generating;

  async function generate() {
    if (!canGenerate) return;

    setGenerating(true);
    setError(null);
    setNotice(null);
    setStatus("Drafting two puzzle ideas. This can take a minute.");

    try {
      const response = await fetch("/api/studio/puzzles/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          answer: answer.trim() || undefined,
          difficulty,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as GenerationResponse;

      if (
        typeof data.used === "number" &&
        typeof data.limit === "number" &&
        typeof data.remaining === "number"
      ) {
        onQuotaChange({ used: data.used, limit: data.limit, remaining: data.remaining });
      }

      if (!response.ok) throw new Error(data.error || "The puzzle ideas could not be generated.");
      if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
        throw new Error("The generator returned no puzzle ideas. Try a clearer topic.");
      }

      setCandidates(data.candidates);
      setNotice(data.notice ?? null);
      setStatus(
        data.partial
          ? "One idea is ready. The second could not be completed."
          : `${data.candidates.length} puzzle ideas are ready to compare.`
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The puzzle ideas could not be generated.";
      setError(message);
      setStatus("The draft was not generated. Your topic and answer are still here.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section aria-label="Generate a full puzzle" className="mt-3 space-y-5">
      <p className="text-sm leading-5 text-muted-foreground">
        Credits are shared with image tiles. One credit drafts two ideas. {quota.remaining} of{" "}
        {quota.limit} left.
      </p>
      <p className="text-sm leading-5 text-muted-foreground">
        Generated boards stay editable. Choosing one loads it into Studio; nothing is saved until
        you choose.
      </p>

      <label className="block text-sm">
        <span className="font-medium text-foreground">Topic or brief</span>
        <textarea
          className="mt-1 min-h-20 w-full resize-y rounded-md border border-input bg-inset px-3 py-2 text-base text-foreground shadow-[var(--shadow-field)] focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm motion-reduce:transition-none"
          disabled={generating}
          minLength={2}
          maxLength={180}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="e.g. a clever puzzle about time"
          rows={3}
          required
          value={prompt}
        />
        <span className="mt-1 block text-xs text-muted-foreground">2–180 characters</span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-foreground">Fixed answer (optional)</span>
        <input
          className="mt-1 min-h-11 w-full rounded-md border border-input bg-inset px-3 py-2 text-base text-foreground shadow-[var(--shadow-field)] focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm motion-reduce:transition-none"
          disabled={generating}
          maxLength={80}
          minLength={2}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Lock the answer you want to build around"
          value={answer}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          2–80 characters. When set, the generator must keep this answer.
        </span>
      </label>

      <label className="block text-sm" htmlFor="studio-puzzle-difficulty">
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">Difficulty</span>
          <span className="font-mono text-sm text-muted-foreground">{difficulty} / 10</span>
        </span>
        <input
          className="mt-2 min-h-11 w-full cursor-pointer accent-foreground focus-ring"
          disabled={generating}
          id="studio-puzzle-difficulty"
          max={10}
          min={1}
          onChange={(event) => setDifficulty(Number(event.target.value))}
          type="range"
          value={difficulty}
        />
        <span className="flex justify-between text-xs text-muted-foreground">
          <span>Gentle</span>
          <span>Expert</span>
        </span>
      </label>

      <Button
        aria-busy={generating}
        className="min-h-11 w-full motion-reduce:transition-none motion-reduce:active:scale-100"
        disabled={!canGenerate}
        onClick={() => void generate()}
        size="lg"
        type="button"
        variant="brand"
      >
        Generate 2 ideas
      </Button>

      {quota.remaining <= 0 ? (
        <p className="-mt-3 text-xs text-muted-foreground" role="status">
          No AI credits left. Image tiles and full-puzzle drafts share this limit.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
        {status}
      </p>
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      {candidates.length > 0 ? (
        <ol aria-label="Generated puzzle ideas" className="space-y-8">
          {candidates.map((draft, index) => (
            <li key={draft.id}>
              <p className="mb-2 text-sm font-medium">Puzzle idea {index + 1}</p>
              <div className="rounded-md border border-border bg-card p-3">
                <PuzzleVisualBoard
                  className="min-h-28"
                  compact
                  fallback={draft.visual.unicodeFallback}
                  visual={draft.visual}
                />
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Answer:</span> {draft.answer}
                  <span className="text-muted-foreground"> · Difficulty {draft.difficulty}/10</span>
                </p>
                <p className="text-sm leading-5 text-muted-foreground">{draft.explanation}</p>
                <p
                  className={`text-sm font-medium ${qualificationClass(draft.qualification.status)}`}
                >
                  {qualificationLabel(draft.qualification.status)}
                </p>
                {draft.qualification.issues.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {draft.qualification.issues.map((issue, issueIndex) => (
                      <li key={`${draft.id}-issue-${issueIndex}`}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  className="mt-2 min-h-11 w-full motion-reduce:transition-none motion-reduce:active:scale-100"
                  onClick={() => onUseDraft(draft)}
                  size="lg"
                  type="button"
                  variant="outline"
                >
                  Use this draft
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
