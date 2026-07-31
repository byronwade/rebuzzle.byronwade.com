"use client";

/**
 * Dev Mode Visual Lab — generate and preview every visual generation path.
 * Preview only; never publishes today's puzzle.
 */

import { FlaskConical, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PuzzleContainer, PuzzleDisplay } from "@/components/PuzzleDisplay";
import { Button } from "@/components/ui/button";
import { isDevModeEnabled } from "@/lib/dev-mode";
import type { PuzzleVisual } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";

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
  };
  visual?: PuzzleVisual;
  pictogram?: {
    ok: boolean;
    concept: string;
    svg: string | null;
    emojiFallback: string;
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
    description:
      "Multi-candidate generation with critique, player sim, and rubric — preview only.",
    usesAi: true,
    estimatedCost: "high",
  },
];

export function DevVisualLab() {
  const [devOn, setDevOn] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [modes, setModes] = useState<ModeMeta[]>(FALLBACK_MODES);
  const [mode, setMode] = useState("pictogram");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LabResult | null>(null);

  useEffect(() => {
    setDevOn(isDevModeEnabled());
  }, []);

  const loadModes = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/visual-lab", { credentials: "include" });
      const data = (await res.json()) as {
        allowed?: boolean;
        modes?: ModeMeta[];
        error?: string;
      };
      if (!res.ok || !data.allowed) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      if (data.modes?.length) setModes(data.modes);
    } catch {
      setAllowed(false);
    }
  }, []);

  useEffect(() => {
    if (devOn) void loadModes();
  }, [devOn, loadModes]);

  const generate = async (nextMode?: string) => {
    const selected = nextMode || mode;
    setMode(selected);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/dev/visual-lab", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selected,
          // Concept, answer, and difficulty are invented by the AI / adaptive loop
          renderImages: true,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        result?: LabResult;
        error?: string;
      };
      if (!res.ok || !data.success || !data.result) {
        throw new Error(data.error || "Generation failed");
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  if (!devOn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <FlaskConical className="mx-auto mb-3 h-8 w-8 text-amber-600" />
        <h1 className="font-semibold text-lg">Visual Lab</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Turn on Dev Mode in Settings to use the generative visual playground.
        </p>
        <Button asChild className="mt-6" variant="secondary">
          <Link href="/settings">Open Settings</Link>
        </Button>
      </div>
    );
  }

  const previewVisual = result?.visual || result?.puzzle?.visual;
  const previewFallback =
    result?.puzzle?.rebusPuzzle || result?.visual?.unicodeFallback || "◆";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <h1 className="font-semibold text-base md:text-lg">Visual Lab</h1>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-[10px] text-amber-800 uppercase tracking-wide dark:text-amber-300">
            Dev · preview only
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Exercise every generative path — custom pictograms, text devices, unicode emoji, image
          tiles, hybrid boards, composed rebuses, or a full Eve / Apex puzzle. The AI picks
          concept, answer, and difficulty. Nothing here replaces today&apos;s published puzzle.
        </p>
      </div>

      {allowed === false && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm">
          Sign in as guest or account to run generation.
        </p>
      )}

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
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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
                lines={[
                  `${result.pictogram.ok ? "ok" : "failed"} · ${result.pictogram.concept}`,
                  `fallback ${result.pictogram.emojiFallback}`,
                  result.pictogram.error || (result.pictogram.svg ? "svg ready" : "no svg"),
                ]}
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

          {result.puzzle?.explanation && (
            <section className="rounded-lg border border-border bg-inset p-4 text-sm">
              <p className="mb-1 font-medium text-xs uppercase tracking-wide text-subtle">
                Explanation
              </p>
              <p>{result.puzzle.explanation}</p>
              {result.puzzle.hints?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground text-xs">
                  {result.puzzle.hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          )}

          <details className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Raw JSON</summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function MetaCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-1.5 font-medium text-[10px] uppercase tracking-wide text-subtle">{title}</p>
      <ul className="space-y-1 text-foreground/85">
        {lines.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
