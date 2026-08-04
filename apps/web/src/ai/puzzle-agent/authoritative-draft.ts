import { normalizeAnswerKey } from "./quality";
import type { PuzzleAgentResult } from "./schemas";
import type { PuzzleVisual, VisualLayer } from "./visual/composition";
import { resolveCuratedPictogram } from "./visual/curated-pictograms";

export type CapturedPuzzleComposition = {
  answer: string;
  visual: PuzzleVisual;
};

function normalizeCueText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Structural identity for a layer — ignores generated SVG / recognition evidence. */
export function structuralLayerKey(layer: VisualLayer): string {
  if (layer.kind === "pictogram") {
    const concept =
      resolveCuratedPictogram(layer.concept)?.canonicalConcept ?? normalizeCueText(layer.concept);
    return `pictogram:${concept}`;
  }
  if (layer.kind === "text") {
    return `text:${normalizeCueText(layer.content)}:${layer.emphasis ?? "normal"}`;
  }
  if (layer.kind === "operator") {
    return `operator:${layer.symbol.trim()}`;
  }
  return `image:${normalizeCueText(layer.concept ?? layer.alt)}`;
}

/**
 * Fail-closed check that the published board kept the host rule-graph structure.
 */
export function answerSeedStructureIssues(
  preflight: PuzzleVisual,
  published: PuzzleVisual
): string[] {
  const issues: string[] = [];
  if (preflight.layout !== published.layout) {
    issues.push(
      `Layout drifted from rule-graph preflight (${preflight.layout} → ${published.layout})`
    );
  }
  if (preflight.layers.length !== published.layers.length) {
    issues.push(
      `Layer count drifted from rule-graph preflight (${preflight.layers.length} → ${published.layers.length})`
    );
    return issues;
  }
  for (let i = 0; i < preflight.layers.length; i++) {
    const expected = structuralLayerKey(preflight.layers[i]!);
    const actual = structuralLayerKey(published.layers[i]!);
    if (expected !== actual) {
      issues.push(`Layer ${i} drifted from rule-graph preflight (${expected} → ${actual})`);
    }
  }
  return issues;
}

/**
 * Keep host layout/layer structure; copy invent asset fills onto matching layers.
 */
export function mergeInventAssetsOntoPreflight(
  preflight: CapturedPuzzleComposition,
  invent: CapturedPuzzleComposition | null
): CapturedPuzzleComposition {
  if (!invent) return preflight;
  if (normalizeAnswerKey(invent.answer) !== normalizeAnswerKey(preflight.answer)) {
    return preflight;
  }
  if (answerSeedStructureIssues(preflight.visual, invent.visual).length) {
    // Invent restructured the board — discard its visual and keep host structure.
    return preflight;
  }

  const layers = preflight.visual.layers.map((layer, index) => {
    const filled = invent.visual.layers[index];
    if (!filled || filled.kind !== layer.kind) return layer;

    if (layer.kind === "pictogram" && filled.kind === "pictogram") {
      return {
        ...layer,
        svg: filled.svg ?? layer.svg,
        assetId: filled.assetId ?? layer.assetId,
        source: filled.source ?? layer.source,
        seenAs: filled.seenAs ?? layer.seenAs,
        recognitionConfidence: filled.recognitionConfidence ?? layer.recognitionConfidence,
        recognitionProfiles: filled.recognitionProfiles ?? layer.recognitionProfiles,
        emojiFallback: filled.emojiFallback || layer.emojiFallback,
      };
    }
    if (layer.kind === "image" && filled.kind === "image") {
      return {
        ...layer,
        src: filled.src ?? layer.src,
        prompt: filled.prompt || layer.prompt,
        alt: filled.alt || layer.alt,
      };
    }
    return layer;
  });

  return {
    answer: preflight.answer,
    visual: {
      ...preflight.visual,
      layers,
      unicodeFallback: invent.visual.unicodeFallback || preflight.visual.unicodeFallback,
    },
  };
}

/** Adopt the exact tool-produced board; never trust a model-authored SVG/provenance copy. */
export function applyAuthoritativeComposition(
  puzzle: PuzzleAgentResult["puzzle"],
  composition: CapturedPuzzleComposition
): PuzzleAgentResult["puzzle"] {
  if (normalizeAnswerKey(puzzle.answer) !== normalizeAnswerKey(composition.answer)) {
    throw new Error(
      "Final answer changed after compose_puzzle_visual; compose the final answer again"
    );
  }

  return {
    ...puzzle,
    rebusPuzzle: composition.visual.unicodeFallback,
    visual: composition.visual,
  };
}
