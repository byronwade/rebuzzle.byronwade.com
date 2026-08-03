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


export function useDevVisualLab(props: any = {}) {

  const devOn = useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => onStoreChange();
      window.addEventListener("rebuzzle:dev-mode", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("rebuzzle:dev-mode", handler);
        window.removeEventListener("storage", handler);
      };
    },
    isDevModeEnabled,
    () => false
  );
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [modes, setModes] = useState<ModeMeta[]>(FALLBACK_MODES);
  const [mode, setMode] = useState("pictogram");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LabResult | null>(null);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [vote, setVote] = useState<QualityVote | null>(null);
  const [voteSaving, setVoteSaving] = useState(false);

  const loadModes = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/visual-lab", { credentials: "include" });
      if (!res.ok) {
        setAllowed(false);
        return;
      }
      const data = (await res.json()) as {
        allowed?: boolean;
        modes?: ModeMeta[];
        error?: string;
      };
      if (!data.allowed) {
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
    setPuzzleId(null);
    setVote(null);
    try {
      const res = await fetch("/api/dev/visual-lab", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selected,
          // Concept, answer, and difficulty are invented by the AI / adaptive loop
          renderImages: true,
          persist: true,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        fail(errBody.error || "Generation failed");
      }
      const data = (await res.json()) as {
        success?: boolean;
        result?: LabResult;
        puzzleId?: string;
        persisted?: boolean;
        error?: string;
      };
      if (!data.success || !data.result) {
        fail(data.error || "Generation failed");
      }
      setResult(data.result);
      setPuzzleId(data.puzzleId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }
    setBusy(false);

  };

  const submitVote = async (next: QualityVote) => {
    if (!puzzleId || voteSaving) return;
    setVoteSaving(true);
    setVote(next);
    try {
      await fetch("/api/puzzles/rating", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId,
          vote: next,
          source: "dev_lab",
          solved: true,
        }),
      });
    } catch {
      // keep local selection
    }
    setVoteSaving(false);

  };


  return {
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
  };
}
