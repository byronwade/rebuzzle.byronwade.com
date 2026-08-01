/**
 * Targeted visual polish — regenerate weak pictograms using critique notes.
 */

import { evaluateVisualForPublish } from "../quality";
import {
  buildUnicodeFallback,
  type PuzzleVisual,
  type VisualLayer,
} from "../visual/composition";
import { generatePictogram } from "../visual/generate-pictogram";
import { scorePictogramClarity } from "../visual/pictogram-clarity";
import { candidateNeedsVisualPolish } from "./polish-gates";
import type { ApexCandidate } from "./types";

export { candidateNeedsVisualPolish };

function resolveMode(layers: VisualLayer[]): PuzzleVisual["mode"] {
  if (layers.some((l) => l.kind === "image" && "src" in l && l.src)) return "hybrid";
  if (layers.some((l) => l.kind === "pictogram" && l.svg)) return "composed";
  return "unicode";
}

function layerNeedsRedraw(
  layer: Extract<VisualLayer, { kind: "pictogram" }>,
  reviseNotes: string[],
  forceWeakRedraw: boolean
): boolean {
  if (!layer.svg) return true;
  if (layer.recognitionOk === false) return true;
  const clarity = scorePictogramClarity(layer.svg);
  if (!clarity.ok || clarity.score < 62) return true;
  // Only force redraw of mediocre icons when critique asked for revise / low icons
  if (forceWeakRedraw && clarity.score < 72) return true;
  if (reviseNotes.length === 0) return false;
  const haystack = `${layer.concept ?? ""} ${reviseNotes.join(" ")}`.toLowerCase();
  const concept = (layer.concept ?? "").toLowerCase();
  return Boolean(concept && haystack.includes(concept));
}

/** Conservative icon score — never inflate past recognition failures. */
function estimateIconScore(layers: VisualLayer[]): number {
  const scores = layers.flatMap((layer) => {
    if (layer.kind !== "pictogram") return [];
    if (!layer.svg) return [28];
    if (layer.recognitionOk === false) return [32];
    const clarity = scorePictogramClarity(layer.svg).score;
    if (layer.recognitionOk === true) return [Math.min(88, clarity + 8)];
    return [Math.min(70, clarity)];
  });
  if (!scores.length) return 55;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Re-draw pictogram layers that are missing SVGs or fail clarity,
 * optionally guided by critique revise instructions.
 */
export async function polishCandidateVisuals(
  candidate: ApexCandidate,
  reviseNotes: string[] = []
): Promise<ApexCandidate> {
  const notes = reviseNotes.filter(Boolean).slice(0, 3);
  const noteBlob = notes.join(" | ").slice(0, 180);
  const forceWeakRedraw =
    notes.length > 0 || (candidate.critique?.iconRecognizability ?? 100) < 55;

  let changed = false;
  const nextLayers: VisualLayer[] = [];

  for (const layer of candidate.visual.layers) {
    if (layer.kind !== "pictogram") {
      nextLayers.push(layer);
      continue;
    }

    if (!layerNeedsRedraw(layer, notes, forceWeakRedraw)) {
      nextLayers.push(layer);
      continue;
    }

    const pic = await generatePictogram({
      concept: layer.concept,
      role: [layer.role, noteBlob].filter(Boolean).join(" · ").slice(0, 200) || undefined,
      emojiFallback: layer.emojiFallback,
      maxRetries: 2,
    });

    if (pic.svg && pic.ok) {
      nextLayers.push({
        ...layer,
        svg: pic.svg,
        emojiFallback: pic.emojiFallback || layer.emojiFallback,
        recognitionOk: true,
        seenAs: pic.seenAs,
      });
      changed = true;
    } else if (pic.svg && (pic.clarityScore ?? 0) >= 62) {
      nextLayers.push({
        ...layer,
        svg: pic.svg,
        emojiFallback: pic.emojiFallback || layer.emojiFallback,
        recognitionOk: false,
        seenAs: pic.seenAs ?? "unclear",
      });
      changed = true;
    } else {
      nextLayers.push(layer);
    }
  }

  if (!changed) return candidate;

  const unicodeFallback =
    buildUnicodeFallback(nextLayers) || candidate.visual.unicodeFallback || "◆";
  const mode = resolveMode(nextLayers);
  const visualCheck = evaluateVisualForPublish({
    mode,
    layers: nextLayers,
    unicodeFallback,
  });
  const iconScore = estimateIconScore(nextLayers);

  const clearedIconReasons = candidate.rejectReasons.filter(
    (reason) => !/unrecognizable|missing svg|emoji fallback|Icons look/i.test(reason)
  );
  const hardReject =
    candidate.critique?.verdict === "reject" ||
    candidate.rejectReasons.some((reason) =>
      /Critique reject|Overused trope/i.test(reason)
    );

  return {
    ...candidate,
    rebusPuzzle: unicodeFallback,
    visual: {
      ...candidate.visual,
      layers: nextLayers,
      unicodeFallback,
      mode,
    },
    publishable: visualCheck.ok
      ? hardReject
        ? false
        : candidate.publishable || iconScore >= 60
      : false,
    rejectReasons: visualCheck.ok
      ? clearedIconReasons
      : [
          ...clearedIconReasons,
          visualCheck.reason ?? "Visual still fails publish after polish",
        ],
    critique: candidate.critique
      ? {
          ...candidate.critique,
          iconRecognizability: Math.max(
            candidate.critique.iconRecognizability ?? 0,
            iconScore
          ),
        }
      : candidate.critique,
  };
}
