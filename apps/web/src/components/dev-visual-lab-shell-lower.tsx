"use client";

/**
 * Dev Mode Visual Lab — generate and preview every visual generation path.
 * Preview only; never publishes today's puzzle.
 */

import { FlaskConical, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { AppLink as Link } from "@/components/AppLink";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PuzzleContainer, PuzzleDisplay } from "@/components/PuzzleDisplay";
import { Button } from "@/components/ui/button";
import { isDevModeEnabled } from "@/lib/dev-mode";
import type { PuzzleVisual } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";
import { fail } from "@/lib/fail";

type ModeMeta = {
  id: string;
  label: string;
  description: string;
  usesAi: boolean;
  estimatedCost: string;
};

type LabResult = {
  mode: string;
  meta: {
    label: string;
    description: string;
    durationMs: number;
    usesAi: boolean;
    estimatedCost: string;
    engine?: string;
  };
  seed?: {
    concept: string;
    answer: string;
    difficulty: number;
  };
  visual?: PuzzleVisual;
  pictogram?: {
    ok: boolean;
    concept: string;
    svg: string | null;
    emojiFallback: string;
    clarityScore?: number;
    clarityReasons?: string[];
    pixelIntegrity?: {
      ok: boolean;
      reasons: string[];
      profiles: Array<{
        tileSize: number;
        foregroundRatio: number;
        boundsWidthRatio: number;
        boundsHeightRatio: number;
      }>;
    };
    seenAs?: string;
    recognitionConfidence?: number;
    attempts?: number;
    error?: string;
  };
  image?: {
    ok: boolean;
    alt: string;
    src?: string;
    model?: string;
    error?: string;
  };
  puzzle?: {
    rebusPuzzle: string;
    answer: string;
    difficulty: number;
    difficultyLevel: string;
    explanation: string;
    category: string;
    hints: string[];
    techniqueId?: string;
    visual?: PuzzleVisual;
    qualityScore?: number;
    funScore?: number;
    thinkingSummary?: string;
  };
  compose?: {
    funScore: number;
    totalParts: number;
    withinBudget: boolean;
    issues: string[];
    tips: string[];
    generated: {
      pictograms: number;
      images: number;
      failedPictograms: number;
      failedImages: number;
    };
  };
};

type QualityVote = "like" | "dislike";

const FALLBACK_MODES: ModeMeta[] = [
  {
    id: "pictogram",
    label: "Custom pictogram",
    description: "Generate one Ink Pictogram v1 SVG (our branded emoji).",
    usesAi: true,
    estimatedCost: "low",
  },
  {
    id: "text",
    label: "Text devices",
    description: "Styled text layers — large, strike, stacked, tiny (no AI).",
    usesAi: false,
    estimatedCost: "free",
  },
  {
    id: "unicode",
    label: "Unicode emoji",
    description: "Stock emoji + operators board (legacy unicode path, no AI).",
    usesAi: false,
    estimatedCost: "free",
  },
  {
    id: "image",
    label: "Image tile",
    description: "Single AI-illustrated square tile via image models.",
    usesAi: true,
    estimatedCost: "medium",
  },
  {
    id: "hybrid",
    label: "Hybrid board",
    description: "Pictogram + text + optional image tile together.",
    usesAi: true,
    estimatedCost: "high",
  },
  {
    id: "composed",
    label: "Composed rebus",
    description: "Multi-layer Ink Pictogram rebus with operators (no image).",
    usesAi: true,
    estimatedCost: "medium",
  },
  {
    id: "full-puzzle",
    label: "Full Eve puzzle",
    description: "Run the full ToolLoopAgent once — preview only, not published.",
    usesAi: true,
    estimatedCost: "high",
  },
  {
    id: "apex-tournament",
    label: "Apex tournament",
    description: "Multi-candidate generation with critique, player sim, and rubric — preview only.",
    usesAi: true,
    estimatedCost: "high",
  },
];


export function DevVisualLabShellLower(props: Record<string, any>) {
  const {
    allowed,
    busy,
    data,
    devOn,
    errBody,
    error,
    generate,
    handler,
    loadModes,
    mode,
    modes,
    puzzleId,
    res,
    result,
    selected,
    setAllowed,
    setBusy,
    setError,
    setMode,
    setModes,
    setPuzzleId,
    setResult,
    setVote,
    setVoteSaving,
    submitVote,
    vote,
    voteSaving
  } = props;
  return (
    <>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {modes.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={busy || allowed === false}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{m.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-subtle">
                  {m.estimatedCost}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground text-xs leading-snug">{m.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Button
          disabled={busy || allowed === false}
          onClick={() => void generate()}
          className="gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-end" /> : <Sparkles className="h-4 w-4" data-icon="inline-end" />}
          Generate {modes.find((m) => m.id === mode)?.label ?? mode}
        </Button>
        <Button asChild variant="outline" disabled={busy}>
          <Link href="/">Back to game</Link>
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-medium text-sm">Board preview</h2>
            <PuzzleContainer>
              <PuzzleDisplay
                puzzle={previewFallback}
                puzzleType="rebus"
                visual={previewVisual}
                size="large"
              />
            </PuzzleContainer>
          </section>

          {revealedAnswer ? (
            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-5 text-center">
              <p className="mb-2 font-medium text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Answer
              </p>
              <p className="font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
                {revealedAnswer}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                {revealedConcept ? <span>Concept: {revealedConcept}</span> : null}
                {revealedDifficulty != null ? (
                  <span>Difficulty {revealedDifficulty}/10</span>
                ) : null}
                {puzzleId ? (
                  <span className="font-mono text-[10px] text-subtle">
                    saved · {puzzleId.slice(0, 8)}
                  </span>
                ) : (
                  <span className="text-subtle">not saved</span>
                )}
              </div>
              {result.puzzle?.explanation ? (
                <p className="mx-auto mt-3 max-w-md text-muted-foreground text-sm leading-6">
                  {result.puzzle.explanation}
                </p>
              ) : null}
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!puzzleId || voteSaving}
                  onClick={() => void submitVote("like")}
                  className={cn(
                    "gap-2",
                    vote === "like" && "border-success/50 bg-success/10 text-success"
                  )}
                >
                  <ThumbsUp className="h-4 w-4" data-icon="inline-start" />
                  Like
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!puzzleId || voteSaving}
                  onClick={() => void submitVote("dislike")}
                  className={cn(
                    "gap-2",
                    vote === "dislike" && "border-destructive/50 bg-destructive/10 text-destructive"
                  )}
                >
                  <ThumbsDown className="h-4 w-4" data-icon="inline-start" />
                  Dislike
                </Button>
              </div>
              {!puzzleId ? (
                <p className="mt-2 text-muted-foreground text-xs">
                  Persist failed — regenerate to enable votes.
                </p>
              ) : vote ? (
                <p className="mt-2 text-muted-foreground text-xs">
                  Saved — votes tune future generation.
                </p>
              ) : (
                <p className="mt-2 text-muted-foreground text-xs">
                  Rate this board so Eve can learn what works.
                </p>
              )}
            </section>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 text-xs">
            <MetaCard
              title="Run"
              lines={[
                `${result.meta.label} · ${result.meta.durationMs}ms`,
                `AI: ${result.meta.usesAi ? "yes" : "no"} · cost ${result.meta.estimatedCost}`,
                result.visual
                  ? `visual.mode=${result.visual.mode} · layout=${result.visual.layout}`
                  : "no composed visual",
              ]}
            />
            {result.compose && (
              <MetaCard
                title="Compose score"
                lines={[
                  `funScore ${result.compose.funScore} · parts ${result.compose.totalParts}`,
                  `budget ${result.compose.withinBudget ? "ok" : "off"}`,
                  `pictograms ${result.compose.generated.pictograms} · images ${result.compose.generated.images}`,
                  ...(result.compose.issues.length
                    ? [`issues: ${result.compose.issues.join("; ")}`]
                    : []),
                ]}
              />
            )}
            {result.pictogram && (
              <MetaCard
                title="Pictogram"
                lines={
                  [
                    `${result.pictogram.ok ? "ok" : "failed"} · ${result.pictogram.concept}`,
                    typeof result.pictogram.clarityScore === "number"
                      ? `clarity ${result.pictogram.clarityScore}${
                          result.pictogram.attempts ? ` · tries ${result.pictogram.attempts}` : ""
                        }`
                      : "clarity n/a",
                    result.pictogram.seenAs
                      ? `seen as “${result.pictogram.seenAs}”${
                          typeof result.pictogram.recognitionConfidence === "number"
                            ? ` (${Math.round(result.pictogram.recognitionConfidence * 100)}%)`
                            : ""
                        }`
                      : null,
                    result.pictogram.pixelIntegrity
                      ? `pixels ${result.pictogram.pixelIntegrity.ok ? "ok" : "failed"} · ${result.pictogram.pixelIntegrity.profiles
                          .map(
                            (profile) =>
                              `${profile.tileSize}px ${Math.round(profile.foregroundRatio * 100)}% ink, ${Math.round(profile.boundsWidthRatio * 100)}×${Math.round(profile.boundsHeightRatio * 100)}% bounds`
                          )
                          .join(" · ")}`
                      : "pixels n/a",
                    result.pictogram.clarityReasons?.length
                      ? `reasons: ${result.pictogram.clarityReasons.join(", ")}`
                      : `fallback ${result.pictogram.emojiFallback}`,
                    result.pictogram.error || (result.pictogram.svg ? "svg ready" : "no svg"),
                  ].filter(Boolean) as string[]
                }
              />
            )}
            {result.image && (
              <MetaCard
                title="Image tile"
                lines={[
                  `${result.image.ok ? "ok" : "failed"} · ${result.image.alt}`,
                  result.image.model || "no model",
                  result.image.error || (result.image.src ? "src ready" : "no src"),
                ]}
              />
            )}
            {result.puzzle && (
              <MetaCard
                title="Eve puzzle (preview)"
                lines={[
                  `answer: ${result.puzzle.answer}`,
                  `${result.puzzle.difficultyLevel} · d=${result.puzzle.difficulty}`,
                  `q=${result.puzzle.qualityScore ?? "—"} · fun=${result.puzzle.funScore ?? "—"}`,
                  result.puzzle.techniqueId || "no technique",
                  result.puzzle.rebusPuzzle,
                ]}
              />
            )}
          </section>

          {result.puzzle?.hints?.length ? (
            <section className="rounded-lg border border-border bg-inset p-4 text-sm">
              <p className="mb-1 font-medium text-xs uppercase tracking-wide text-subtle">Hints</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-xs">
                {result.puzzle.hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <details className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Raw JSON</summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>    </>
  );
}
