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


import { DevVisualLabShellLower } from "./dev-visual-lab-shell-lower";

export function DevVisualLabShell(props: Record<string, any>) {
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
  if (!devOn) {
      return (
    <>

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
  const previewFallback = result?.puzzle?.rebusPuzzle || result?.visual?.unicodeFallback || "◆";
  const revealedAnswer = result?.puzzle?.answer || result?.seed?.answer || "";
  const revealedDifficulty = result?.puzzle?.difficulty ?? result?.seed?.difficulty ?? null;
  const revealedConcept = result?.seed?.concept || result?.pictogram?.concept || "";

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
          tiles, hybrid boards, composed rebuses, or a full Eve / Apex puzzle. The AI picks concept,
          answer, and difficulty. Nothing here replaces today&apos;s published puzzle.
        </p>
      </div>

      {allowed === false && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm">
          Sign in as guest or account to run generation.
        </p>
      )}
      <DevVisualLabShellLower {...props} />
    </>
  );
}
