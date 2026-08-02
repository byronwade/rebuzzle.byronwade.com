/**
 * Dev Visual Lab runner — exercises generative visual paths without publishing.
 */

import { resolveAdaptiveDifficultyForDate } from "@/ai/learning";
import { generateMasterPuzzle } from "@/ai/services/master-puzzle-orchestrator";
import { composePuzzleVisual } from "./compose-visual";
import { buildUnicodeFallback, type PuzzleVisual, type VisualLayer } from "./composition";
import { generateImageTile } from "./generate-image-tile";
import { generatePictogram } from "./generate-pictogram";
import { inventLabBrief } from "./invent-lab-brief";
import {
  buildLabLayers,
  guessEmoji,
  VISUAL_LAB_MODE_META,
  type VisualLabMode,
} from "./lab-recipes";
import type { PictogramPixelIntegrityResult } from "./pictogram-pixel-integrity";
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
    clarityScore?: number;
    clarityReasons?: string[];
    pixelIntegrity?: PictogramPixelIntegrityResult;
    seenAs?: string;
    recognitionConfidence?: number;
    attempts?: number;
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
  /** Invented or AI-chosen seed (shown in Dev Lab) */
  seed?: {
    concept: string;
    answer: string;
    difficulty: number;
  };
  /** Full Eve / Apex puzzle preview — API may persist as inactive lab row */
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
    fingerprint?: string;
    uniquenessScore?: number;
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
  const renderImages = input.renderImages !== false;

  // Full Eve / Apex: AI invents concept + answer; only difficulty may be adapted.
  if (mode === "full-puzzle" || mode === "apex-tournament") {
    const adaptive = await resolveAdaptiveDifficultyForDate(new Date());
    const difficulty = Math.max(4, Math.min(9, input.difficulty ?? adaptive.target));
    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      puzzleType: "rebus",
      // Intentionally omit theme — Eve/Apex chooses concept + answer
      requireNovelty: true,
      maxAttempts: mode === "apex-tournament" ? 2 : 1,
      qualityThreshold: mode === "apex-tournament" ? 70 : 60,
      candidateCount: mode === "apex-tournament" ? undefined : 1,
      useLearningFeedback: mode === "apex-tournament",
    });

    return {
      mode,
      meta: {
        label: modeMeta.label,
        description: modeMeta.description,
        usesAi: modeMeta.usesAi,
        estimatedCost: modeMeta.estimatedCost,
        durationMs: Date.now() - start,
        engine: result.metadata.engine,
      },
      seed: {
        concept: result.puzzle.category || "rebus",
        answer: result.puzzle.answer,
        difficulty: result.puzzle.difficulty,
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
        fingerprint: result.metadata.fingerprint,
        uniquenessScore: result.metadata.uniquenessScore,
      },
    };
  }

  // Probe modes: invent concept/answer/difficulty when the UI omits them
  const brief = await inventLabBrief({
    concept: input.concept,
    answer: input.answer,
    difficulty: input.difficulty,
  });
  const concept = brief.concept;
  const answer = brief.answer;
  const difficulty = brief.difficulty;

  const baseMeta = {
    label: modeMeta.label,
    description: modeMeta.description,
    usesAi: modeMeta.usesAi,
    estimatedCost: modeMeta.estimatedCost,
  };
  const seed = { concept, answer, difficulty };

  if (mode === "pictogram") {
    const pictogram = await generatePictogram({
      concept,
      role: "dev-lab",
      emojiFallback: guessEmoji(concept),
      usage: "review",
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
      seed,
      pictogram: {
        ok: pictogram.ok,
        concept: pictogram.concept,
        svg: pictogram.svg,
        emojiFallback: pictogram.emojiFallback,
        clarityScore: pictogram.clarityScore,
        clarityReasons: pictogram.clarityReasons,
        pixelIntegrity: pictogram.pixelIntegrity,
        seenAs: pictogram.seenAs,
        recognitionConfidence: pictogram.recognitionConfidence,
        attempts: pictogram.attempts,
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
      concept,
      prompt: `A single clear ${concept} as a soft ink illustration for a rebus puzzle tile`,
      alt: `${concept} illustration`,
    });
    const layers: VisualLayer[] =
      image.ok && image.src
        ? [
            {
              kind: "image",
              concept,
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
      seed,
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
      seed,
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
      seed,
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
      assetUsage: "review",
    });
    return {
      mode,
      meta: { ...baseMeta, durationMs: Date.now() - start },
      seed,
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

  throw new Error(`Unsupported visual lab mode: ${mode}`);
}
