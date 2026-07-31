/**
 * Fixed recipes for the Dev Mode Visual Lab.
 * Lets us exercise every generative visual path without publishing today's puzzle.
 */

import type { VisualLayer } from "./composition";

export const VISUAL_LAB_MODES = [
  "pictogram",
  "text",
  "unicode",
  "image",
  "hybrid",
  "composed",
  "full-puzzle",
] as const;

export type VisualLabMode = (typeof VISUAL_LAB_MODES)[number];

export type VisualLabModeMeta = {
  id: VisualLabMode;
  label: string;
  description: string;
  /** Hits AI Gateway for SVG / image / full Eve agent */
  usesAi: boolean;
  estimatedCost: "free" | "low" | "medium" | "high";
};

export const VISUAL_LAB_MODE_META: Record<VisualLabMode, VisualLabModeMeta> = {
  pictogram: {
    id: "pictogram",
    label: "Custom pictogram",
    description: "Generate one Ink Pictogram v1 SVG (our branded emoji).",
    usesAi: true,
    estimatedCost: "low",
  },
  text: {
    id: "text",
    label: "Text devices",
    description: "Styled text layers — large, strike, stacked, tiny (no AI).",
    usesAi: false,
    estimatedCost: "free",
  },
  unicode: {
    id: "unicode",
    label: "Unicode emoji",
    description: "Stock emoji + operators board (legacy unicode path, no AI).",
    usesAi: false,
    estimatedCost: "free",
  },
  image: {
    id: "image",
    label: "Image tile",
    description: "Single AI-illustrated square tile via image models.",
    usesAi: true,
    estimatedCost: "medium",
  },
  hybrid: {
    id: "hybrid",
    label: "Hybrid board",
    description: "Pictogram + text + optional image tile together.",
    usesAi: true,
    estimatedCost: "high",
  },
  composed: {
    id: "composed",
    label: "Composed rebus",
    description: "Multi-layer Ink Pictogram rebus with operators (no image).",
    usesAi: true,
    estimatedCost: "medium",
  },
  "full-puzzle": {
    id: "full-puzzle",
    label: "Full Eve puzzle",
    description: "Run the full ToolLoopAgent once — preview only, not published.",
    usesAi: true,
    estimatedCost: "high",
  },
};

export function isVisualLabMode(value: unknown): value is VisualLabMode {
  return typeof value === "string" && (VISUAL_LAB_MODES as readonly string[]).includes(value);
}

/** Build layer plans for compose_puzzle_visual-style modes. */
export function buildLabLayers(
  mode: Exclude<VisualLabMode, "full-puzzle" | "pictogram" | "image">,
  opts: { concept: string; answer: string }
): { layers: VisualLayer[]; layout: "row" | "stack" | "grid"; caption?: string } {
  const concept = opts.concept.trim() || "bee";
  const answer = opts.answer.trim() || "before";

  if (mode === "text") {
    return {
      layout: "row",
      caption: "Text-device rebus (size / strike / stack)",
      layers: [
        { kind: "text", content: "HEAD", emphasis: "large" },
        { kind: "operator", symbol: "+" },
        { kind: "text", content: answer.slice(0, 4).toUpperCase() || "LINE", emphasis: "strike" },
        { kind: "operator", symbol: "/" },
        { kind: "text", content: "OVER", emphasis: "stacked" },
      ],
    };
  }

  if (mode === "unicode") {
    return {
      layout: "row",
      caption: "Unicode emoji fallback board",
      layers: [
        {
          kind: "pictogram",
          concept,
          role: "unicode-only",
          emojiFallback: guessEmoji(concept),
          // Pre-set empty svg skip: compose will try AI — we handle unicode in runner
        },
        { kind: "operator", symbol: "+" },
        { kind: "text", content: "4", emphasis: "large" },
      ],
    };
  }

  if (mode === "hybrid") {
    return {
      layout: "row",
      caption: "Hybrid: pictogram + text + image",
      layers: [
        {
          kind: "pictogram",
          concept,
          role: "primary",
          emojiFallback: guessEmoji(concept),
        },
        { kind: "operator", symbol: "+" },
        { kind: "text", content: "TIME", emphasis: "small" },
        { kind: "operator", symbol: "→" },
        {
          kind: "image",
          prompt: `A single clear ${concept} as a soft ink illustration for a rebus puzzle`,
          alt: `${concept} illustration`,
        },
      ],
    };
  }

  // composed
  return {
    layout: "row",
    caption: "Composed Ink Pictogram rebus",
    layers: [
      {
        kind: "pictogram",
        concept,
        role: "homophone-or-icon",
        emojiFallback: guessEmoji(concept),
      },
      { kind: "operator", symbol: "+" },
      {
        kind: "pictogram",
        concept: "clock",
        role: "secondary",
        emojiFallback: "🕐",
      },
      { kind: "operator", symbol: "/" },
      { kind: "text", content: answer.slice(0, 6).toUpperCase() || "WORD", emphasis: "tiny" },
    ],
  };
}

export function guessEmoji(concept: string): string {
  const c = concept.toLowerCase();
  const map: Record<string, string> = {
    bee: "🐝",
    eye: "👁️",
    clock: "🕐",
    sun: "☀️",
    moon: "🌙",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    water: "💧",
    tree: "🌳",
    fish: "🐟",
    bird: "🐦",
    book: "📖",
    key: "🔑",
    house: "🏠",
    light: "💡",
    puzzle: "🧩",
    brain: "🧠",
    rocket: "🚀",
  };
  for (const [k, v] of Object.entries(map)) {
    if (c.includes(k)) return v;
  }
  return "◆";
}
