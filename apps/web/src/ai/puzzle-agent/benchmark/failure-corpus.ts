import type { PuzzleVisual, VisualLayer } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import { buildPuzzleSolveBenchmarkCorpus } from "./puzzle-corpus";
import type { PuzzleEditorialBenchmarkCase } from "./types";

function pictogram(concept: string, emojiFallback: string): VisualLayer {
  const asset = resolveCuratedPictogram(concept);
  if (!asset) throw new Error(`Missing failure-benchmark pictogram: ${concept}`);
  return {
    kind: "pictogram",
    concept,
    emojiFallback,
    svg: asset.svg,
    assetId: asset.assetId,
    source: "catalog",
  };
}

function text(
  content: string,
  emphasis: Extract<VisualLayer, { kind: "text" }>["emphasis"] = "normal"
): VisualLayer {
  return { kind: "text", content, emphasis };
}

function plus(): VisualLayer {
  return { kind: "operator", symbol: "+" };
}

function visual(
  layout: PuzzleVisual["layout"],
  layers: VisualLayer[],
  options?: { caption?: string }
): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout,
    layers,
    unicodeFallback: layers
      .map((layer) => {
        if (layer.kind === "pictogram") return layer.emojiFallback;
        if (layer.kind === "text") return layer.content;
        if (layer.kind === "operator") return layer.symbol;
        return "image";
      })
      .join(" "),
    caption: options?.caption,
  };
}

/**
 * Deliberately broken boards. These fixtures are never generation seeds; they
 * exist only to prove that an evaluator rejects known failure modes.
 */
export function buildPuzzleFailureBenchmarkCorpus(): PuzzleEditorialBenchmarkCase[] {
  return [
    {
      id: "failure:wrong-object:car-key-shows-fish",
      answer: "car key",
      techniqueId: "simple_compound",
      visual: visual("row", [pictogram("fish", "🐟"), plus(), pictogram("key", "🔑")]),
      expected: "reject",
      failureKinds: ["wrong_object"],
      critical: true,
    },
    {
      id: "failure:wrong-object:sunflower-shows-moon",
      answer: "sunflower",
      techniqueId: "simple_compound",
      visual: visual("row", [pictogram("moon", "🌙"), plus(), pictogram("flower", "🌸")]),
      expected: "reject",
      failureKinds: ["wrong_object"],
      critical: true,
    },
    {
      id: "failure:answer-leak:break-the-ice",
      answer: "break the ice",
      techniqueId: "idiom_as_picture",
      visual: visual("row", [text("BREAK THE ICE", "large")]),
      expected: "reject",
      failureKinds: ["answer_leak"],
      critical: true,
    },
    {
      id: "failure:answer-leak:caption",
      answer: "mind over matter",
      techniqueId: "positional_phrase",
      visual: visual("stack", [text("MIND"), text("MATTER")], {
        caption: "Answer: mind over matter",
      }),
      expected: "reject",
      failureKinds: ["answer_leak"],
      critical: true,
    },
    {
      id: "failure:missing-cue:mind-over-matter-row",
      answer: "mind over matter",
      techniqueId: "positional_phrase",
      visual: visual("row", [text("MIND"), text("MATTER")]),
      expected: "reject",
      failureKinds: ["missing_cue"],
      critical: true,
    },
    {
      id: "failure:missing-cue:small-talk-normal-size",
      answer: "small talk",
      techniqueId: "size_or_case_semantics",
      visual: visual("row", [text("TALK")]),
      expected: "reject",
      failureKinds: ["missing_cue"],
      critical: true,
    },
    {
      id: "failure:ambiguous:read-above-lines",
      answer: "reading between the lines",
      techniqueId: "spatial_preposition_play",
      visual: visual("stack", [text("READ"), text("LINE"), text("LINE")]),
      expected: "reject",
      failureKinds: ["ambiguous"],
      critical: true,
    },
    {
      id: "failure:ambiguous:house-over-fire",
      answer: "house on fire",
      techniqueId: "spatial_preposition_play",
      visual: visual("stack", [pictogram("house", "🏠"), pictogram("fire", "🔥")]),
      expected: "reject",
      failureKinds: ["ambiguous"],
      critical: true,
    },
    {
      id: "failure:broken-layout:overlap-pile",
      answer: "mixed messages",
      techniqueId: "triple_layer_composition",
      visual: visual("overlay", [
        text("MIXED"),
        text("MESSAGES"),
        text("WORDS"),
        text("CROSSED"),
        text("TOGETHER"),
        text("AGAIN"),
      ]),
      expected: "reject",
      failureKinds: ["broken_layout"],
      critical: true,
    },
    {
      id: "failure:broken-layout:wrapping-operator-chain",
      answer: "before",
      techniqueId: "single_homophone",
      visual: visual("row", [
        text("B"),
        plus(),
        text("4"),
        plus(),
        text("EXTRA"),
        plus(),
        text("DECOY"),
        plus(),
        text("WORDS"),
      ]),
      expected: "reject",
      failureKinds: ["broken_layout"],
      critical: true,
    },
    {
      id: "failure:unreadable:clipped-long-word",
      answer: "supercalifragilisticexpialidocious",
      techniqueId: "size_or_case_semantics",
      visual: visual("row", [text("SUPERCALIFRAGILISTICEXPIALIDOCIOUS", "tiny")]),
      expected: "reject",
      failureKinds: ["unreadable"],
      critical: true,
    },
    {
      id: "failure:unreadable:dense-unspaced-phrase",
      answer: "reading between the lines",
      techniqueId: "size_or_case_semantics",
      visual: visual("row", [text("READINGBETWEENTHELINESWITHOUTSPACES", "tiny")]),
      expected: "reject",
      failureKinds: ["unreadable"],
      critical: true,
    },
  ];
}

/** Paired good/bad corpus prevents an evaluator from passing by rejecting everything. */
export function buildPuzzleEditorialBenchmarkCorpus(): PuzzleEditorialBenchmarkCase[] {
  const positives = buildPuzzleSolveBenchmarkCorpus().map(
    (entry): PuzzleEditorialBenchmarkCase => ({
      id: `editorial:${entry.id}`,
      answer: entry.answer,
      techniqueId: entry.techniqueId,
      visual: entry.visual,
      expected: "publish",
      failureKinds: [],
      critical: entry.critical,
    })
  );
  return [...positives, ...buildPuzzleFailureBenchmarkCorpus()];
}
