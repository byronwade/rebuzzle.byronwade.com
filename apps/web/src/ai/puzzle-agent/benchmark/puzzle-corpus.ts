import type { PuzzleVisual, VisualLayer } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import type { PuzzleSolveBenchmarkCase } from "./types";

function pictogram(concept: string, emojiFallback: string): VisualLayer {
  const asset = resolveCuratedPictogram(concept);
  if (!asset) throw new Error(`Missing benchmark pictogram: ${concept}`);
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
  unicodeFallback: string,
  layers: VisualLayer[]
): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout,
    unicodeFallback,
    layers,
  };
}

/** Frozen editorial set spanning literal, phonetic, positional, and typographic rebuses. */
export function buildPuzzleSolveBenchmarkCorpus(): PuzzleSolveBenchmarkCase[] {
  return [
    {
      id: "literal:sunflower",
      answer: "sunflower",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "☀️ + 🌸", [pictogram("sun", "☀️"), plus(), pictogram("flower", "🌸")]),
      critical: true,
    },
    {
      id: "literal:moonlight",
      answer: "moonlight",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🌙 + 💡", [
        pictogram("moon", "🌙"),
        plus(),
        pictogram("lightbulb", "💡"),
      ]),
      critical: true,
    },
    {
      id: "literal:bookmark",
      answer: "bookmark",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "📖 + MARK", [pictogram("book", "📖"), plus(), text("MARK")]),
      critical: false,
    },
    {
      id: "literal:keyboard",
      answer: "keyboard",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🔑 + BOARD", [pictogram("key", "🔑"), plus(), text("BOARD")]),
      critical: true,
    },
    {
      id: "literal:starfish",
      answer: "starfish",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "⭐ + 🐟", [pictogram("star", "⭐"), plus(), pictogram("fish", "🐟")]),
      critical: false,
    },
    {
      id: "literal:houseboat",
      answer: "houseboat",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🏠 + ⛵", [pictogram("house", "🏠"), plus(), pictogram("boat", "⛵")]),
      critical: false,
    },
    {
      id: "literal:raindrop",
      answer: "raindrop",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🌧️ + 💧", [pictogram("rain", "🌧️"), plus(), pictogram("water", "💧")]),
      critical: false,
    },
    {
      id: "literal:firework",
      answer: "firework",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🔥 + WORK", [pictogram("fire", "🔥"), plus(), text("WORK")]),
      critical: false,
    },
    {
      id: "literal:heartbreak",
      answer: "heartbreak",
      techniqueId: "simple_compound",
      tierLabel: "Difficult",
      visual: visual("row", "❤️ + BREAK", [pictogram("heart", "❤️"), plus(), text("BREAK")]),
      critical: false,
    },
    {
      id: "literal:eye-contact",
      answer: "eye contact",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "👁️ + CONTACT", [pictogram("eye", "👁️"), plus(), text("CONTACT")]),
      critical: true,
    },
    {
      id: "literal:time-bomb",
      answer: "time bomb",
      techniqueId: "simple_compound",
      tierLabel: "Hard",
      visual: visual("row", "🕐 + BOMB", [pictogram("clock", "🕐"), plus(), text("BOMB")]),
      critical: false,
    },
    {
      id: "phonetic:ice-cream",
      answer: "ice cream",
      techniqueId: "single_homophone",
      tierLabel: "Difficult",
      visual: visual("row", "👁️ + SCREAM", [pictogram("eye", "👁️"), plus(), text("SCREAM")]),
      critical: true,
    },
    {
      id: "phonetic:season",
      answer: "season",
      techniqueId: "nested_homophone",
      tierLabel: "Difficult",
      visual: visual("row", "SEA + ☀️", [text("SEA"), plus(), pictogram("sun", "☀️")]),
      critical: false,
    },
    {
      id: "phonetic:before",
      answer: "before",
      techniqueId: "single_homophone",
      tierLabel: "Difficult",
      visual: visual("row", "B + 4", [text("B"), plus(), text("4")]),
      critical: true,
    },
    {
      id: "phonetic:belief",
      answer: "belief",
      techniqueId: "multi_layer_phonetic",
      tierLabel: "Difficult",
      visual: visual("row", "B + 🍃", [text("B"), plus(), pictogram("leaf", "🍃")]),
      critical: false,
    },
    {
      id: "position:mind-over-matter",
      answer: "mind over matter",
      techniqueId: "positional_phrase",
      tierLabel: "Difficult",
      visual: visual("stack", "MIND\nMATTER", [text("MIND"), text("MATTER")]),
      critical: true,
    },
    {
      id: "position:head-over-heels",
      answer: "head over heels",
      techniqueId: "positional_phrase",
      tierLabel: "Difficult",
      visual: visual("stack", "HEAD\nHEELS", [text("HEAD"), text("HEELS")]),
      critical: true,
    },
    {
      id: "position:reading-between-lines",
      answer: "reading between the lines",
      techniqueId: "spatial_preposition_play",
      tierLabel: "Evil",
      visual: visual("stack", "LINE\nREAD\nLINE", [text("LINE"), text("READ"), text("LINE")]),
      critical: true,
    },
    {
      id: "position:man-overboard",
      answer: "man overboard",
      techniqueId: "positional_phrase",
      tierLabel: "Difficult",
      visual: visual("stack", "MAN\nBOARD", [text("MAN"), text("BOARD")]),
      critical: false,
    },
    {
      id: "typography:big-deal",
      answer: "big deal",
      techniqueId: "size_or_case_semantics",
      tierLabel: "Hard",
      visual: visual("row", "DEAL", [text("DEAL", "large")]),
      critical: true,
    },
    {
      id: "typography:small-talk",
      answer: "small talk",
      techniqueId: "size_or_case_semantics",
      tierLabel: "Hard",
      visual: visual("row", "TALK", [text("TALK", "small")]),
      critical: false,
    },
    {
      id: "typography:broken-promise",
      answer: "broken promise",
      techniqueId: "size_or_case_semantics",
      tierLabel: "Difficult",
      visual: visual("row", "PROMISE", [text("PROMISE", "strike")]),
      critical: false,
    },
    {
      id: "position:crossroads",
      answer: "crossroads",
      techniqueId: "basic_positional",
      tierLabel: "Difficult",
      visual: visual("overlay", "ROAD ROAD", [text("ROAD"), text("ROAD")]),
      critical: false,
    },
    {
      id: "typography:long-time-no-see",
      answer: "long time no see",
      techniqueId: "size_or_case_semantics",
      tierLabel: "Evil",
      visual: visual("row", "TIME        SEE", [text("TIME"), text("SEE")]),
      critical: false,
    },
  ];
}
