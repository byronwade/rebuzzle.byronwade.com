/**
 * Dev Visual Lab runner — exercises generative visual paths without publishing.
 */

import { generateMasterPuzzle } from "@/ai/services/master-puzzle-orchestrator";
import { composePuzzleVisual } from "./compose-visual";
import { buildUnicodeFallback, type PuzzleVisual, type VisualLayer } from "./composition";
import { generateImageTile } from "./generate-image-tile";
import { generatePictogram } from "./generate-pictogram";
import {
  buildLabLayers,
  guessEmoji,
  VISUAL_LAB_MODE_META,
  type VisualLabMode,
} from "./lab-recipes";
import { INK_PICTOGRAM_STYLE_ID } from "./style";

export type RunVisualLabInput = {
  mode: VisualLabMode;
  concept?: string;
  answer?: string;
  difficulty?: number;
  /** Override: skip AI images even in hybrid/image modes */
  renderImages?: boolean;
};

export type RunVisualLabResult = {
  mode: VisualLabMode;
  meta: {
    label: string;
    description: string;
    durationMs: number;
    usesAi: boolean;
    estimatedCost: string;
    engine?: "apex" | "eve";
  };
  /** Composed board when applicable */
  visual?: PuzzleVisual;
  /** Single pictogram probe */
  pictogram?: {
    ok: boolean;
    concept: string;
    svg: string | null;
    emojiFallback: string;
    error?: string;
  };
  /** Single image tile probe */
  image?: {
    ok: boolean;
    alt: string;
    src?: string;
    model?: string;
    error?: string;
  };
  /** Full Eve / Apex puzzle preview (not persisted) */
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
    engine?: "apex" | "eve";
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

function unicodeOnlyVisual(layers: VisualLayer[], caption?: string): PuzzleVisual {
  const withFallback = layers.map((layer) => {
    if (layer.kind === "pictogram") {
      return {
        ...layer,
        svg: undefined,
        emojiFallback: layer.emojiFallback || guessEmoji(layer.concept),
      };
    }
    return layer;
  });
  return {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "unicode",
    layout: "row",
    layers: withFallback,
    unicodeFallback: buildUnicodeFallback(withFallback),
    caption,
  };
}

export async function runVisualLab(input: RunVisualLabInput): Promise<RunVisualLabResult> {
  const start = Date.now();
  const mode = input.mode;
  const modeMeta = VISUAL_LAB_MODE_META[mode];
  const concept = (input.concept || "bee").trim().slice(0, 48) || "bee";
  const answer = (input.answer || "before").trim().slice(0, 64) || "before";
  const difficulty = Math.max(4, Math.min(9, input.difficulty ?? 5));
  const renderImages = input.renderImages !== false;

  const baseMeta = {
    label: modeMeta.label,
    description: modeMeta.description,
    usesAi: modeMeta.usesAi,
    estimatedCost: modeMeta.estimatedCost,
  };

  if (mode === "pictogram") {
    const pictogram = await generatePictogram({
      concept,
      role: "dev-lab",
      emojiFallback: guessEmoji(concept),
    });
    const layers: VisualLayer[] = [
      {
        kind: "pictogram",
        concept: pictogram.concept,
        role: "dev-lab",
        svg: pictogram.svg ?? undefined,
        emojiFallback: pictogram.emojiFallback,
      },
    ];
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      pictogram: {
        ok: pictogram.ok,
        concept: pictogram.concept,
        svg: pictogram.svg,
        emojiFallback: pictogram.emojiFallback,
        error: pictogram.error,
      },
      visual: {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: pictogram.svg ? "composed" : "unicode",
        layout: "row",
        layers,
        unicodeFallback: pictogram.emojiFallback,
        caption: `Pictogram probe: ${concept}`,
      },
    };
  }

  if (mode === "image") {
    const image = await generateImageTile({
      prompt: `A single clear ${concept} as a soft ink illustration for a rebus puzzle tile`,
      alt: `${concept} illustration`,
    });
    const layers: VisualLayer[] =
      image.ok && image.src
        ? [
            {
              kind: "image",
              prompt: `illustration of ${concept}`,
              alt: image.alt,
              src: image.src,
            },
          ]
        : [
            {
              kind: "text",
              content: image.error || "image failed",
              emphasis: "small",
            },
          ];
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      image: {
        ok: image.ok,
        alt: image.alt,
        src: image.src,
        model: image.model,
        error: image.error,
      },
      visual: {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: image.ok ? "hybrid" : "unicode",
        layout: "row",
        layers,
        unicodeFallback: image.ok ? "🖼️" : "◆",
        caption: `Image tile probe: ${concept}`,
      },
    };
  }

  if (mode === "unicode") {
    const plan = buildLabLayers("unicode", { concept, answer });
    const visual = unicodeOnlyVisual(plan.layers, plan.caption);
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      visual,
      compose: {
        funScore: 55,
        totalParts: visual.layers.filter((l) => l.kind !== "operator").length,
        withinBudget: true,
        issues: [],
        tips: ["Unicode path skips AI — emojiFallback only"],
        generated: {
          pictograms: 0,
          images: 0,
          failedPictograms: 0,
          failedImages: 0,
        },
      },
    };
  }

  if (mode === "text") {
    const plan = buildLabLayers("text", { concept, answer });
    const composed = await composePuzzleVisual({
      answer,
      targetDifficulty: difficulty,
      techniqueId: "size_or_case_semantics",
      layout: plan.layout,
      layers: plan.layers,
      caption: plan.caption,
      renderImages: false,
    });
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      visual: composed.visual,
      compose: {
        funScore: composed.funScore,
        totalParts: composed.totalParts,
        withinBudget: composed.withinBudget,
        issues: composed.issues,
        tips: composed.tips,
        generated: composed.generated,
      },
    };
  }

  if (mode === "composed" || mode === "hybrid") {
    const plan = buildLabLayers(mode, { concept, answer });
    const composed = await composePuzzleVisual({
      answer,
      targetDifficulty: difficulty,
      techniqueId: mode === "hybrid" ? "multi_emoji_compound" : "single_homophone",
      layout: plan.layout,
      layers: plan.layers,
      caption: plan.caption,
      renderImages: mode === "hybrid" ? renderImages : false,
    });
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      visual: composed.visual,
      compose: {
        funScore: composed.funScore,
        totalParts: composed.totalParts,
        withinBudget: composed.withinBudget,
        issues: composed.issues,
        tips: composed.tips,
        generated: composed.generated,
      },
    };
  }

  // full-puzzle / apex-tournament — Eve / Apex, preview only
  const result = await generateMasterPuzzle({
    targetDifficulty: difficulty,
    puzzleType: "rebus",
    theme: concept,
    category: "visual_wordplay",
    requireNovelty: false,
    maxAttempts: mode === "apex-tournament" ? 2 : 1,
    qualityThreshold: mode === "apex-tournament" ? 70 : 60,
    candidateCount: mode === "apex-tournament" ? undefined : 1,
    useLearningFeedback: mode === "apex-tournament",
  });

  return {
    mode,
    meta: {
      ...baseMeta,
      durationMs: Date.now() - start,
      engine: result.metadata.engine,
    },
    visual: result.puzzle.visual,
    puzzle: {
      rebusPuzzle: result.puzzle.rebusPuzzle,
      answer: result.puzzle.answer,
      difficulty: result.puzzle.difficulty,
      difficultyLevel: result.puzzle.difficultyLevel,
      explanation: result.puzzle.explanation,
      category: result.puzzle.category,
      hints: result.puzzle.hints,
      techniqueId: result.puzzle.techniqueId,
      visual: result.puzzle.visual,
      qualityScore: result.metadata.qualityMetrics.scores.overall,
      funScore: result.metadata.qualityMetrics.scores.fun,
      engine: result.metadata.engine,
      thinkingSummary: result.metadata.aiThinking.summary,
    },
  };
}
