import { z } from "zod";
import { INK_PICTOGRAM_STYLE_ID } from "./style";

/** A custom pictogram ("our emoji") — SVG preferred, unicode fallback required. */
export const PictogramLayerSchema = z.object({
  kind: z.literal("pictogram"),
  /** Concept key used for generation / caching */
  concept: z.string().min(1).max(48),
  /** Role in the rebus, e.g. "homophone-bee" */
  role: z.string().optional(),
  /** Generated SVG markup (Ink Pictogram v1) */
  svg: z.string().optional(),
  /** Unicode emoji fallback for share text / older clients */
  emojiFallback: z.string().min(1).max(8),
  /** Blind recognition passed (set by compose) */
  recognitionOk: z.boolean().optional(),
  /** What a blind viewer named the icon */
  seenAs: z.string().max(48).optional(),
  /** Open icon pack id when SVG came from Lucide/Phosphor/Tabler/MDI/Iconify */
  libraryIconId: z.string().max(80).optional(),
});

/** Styled text used as a visual device (size, case, strike, stack). */
export const TextLayerSchema = z.object({
  kind: z.literal("text"),
  content: z.string().min(1).max(40),
  emphasis: z.enum(["normal", "large", "small", "strike", "stacked", "tiny"]).default("normal"),
});

/** Math / spatial operator between pieces. */
export const OperatorLayerSchema = z.object({
  kind: z.literal("operator"),
  symbol: z.string().min(1).max(4),
});

/** Optional AI-illustrated tile for techniques that need a scene. */
export const ImageLayerSchema = z.object({
  kind: z.literal("image"),
  /** Generation prompt (style guide is appended server-side) */
  prompt: z.string().min(8).max(400),
  alt: z.string().min(1).max(120),
  /** data:image/...;base64,... or https URL after persist */
  src: z.string().optional(),
});

export const VisualLayerSchema = z.discriminatedUnion("kind", [
  PictogramLayerSchema,
  TextLayerSchema,
  OperatorLayerSchema,
  ImageLayerSchema,
]);

export const PuzzleVisualSchema = z.object({
  styleId: z.literal(INK_PICTOGRAM_STYLE_ID).default(INK_PICTOGRAM_STYLE_ID),
  mode: z.enum(["composed", "unicode", "hybrid"]).default("composed"),
  layout: z.enum(["row", "stack", "grid", "overlay"]).default("row"),
  layers: z.array(VisualLayerSchema).min(1).max(12),
  /** Plain-text / emoji share string — always required */
  unicodeFallback: z.string().min(1).max(200),
  /** Optional caption under the board (never the answer) */
  caption: z.string().max(80).optional(),
});

export type PictogramLayer = z.infer<typeof PictogramLayerSchema>;
export type TextLayer = z.infer<typeof TextLayerSchema>;
export type OperatorLayer = z.infer<typeof OperatorLayerSchema>;
export type ImageLayer = z.infer<typeof ImageLayerSchema>;
export type VisualLayer = z.infer<typeof VisualLayerSchema>;
export type PuzzleVisual = z.infer<typeof PuzzleVisualSchema>;

/** Count "parts" for difficulty budgets (pictogram/text/image = 1, operators free). */
export function countVisualParts(visual: PuzzleVisual): number {
  return visual.layers.filter((l) => l.kind !== "operator").length;
}

/** Build a unicode/share string from layers when agent omits one. */
export function buildUnicodeFallback(layers: VisualLayer[]): string {
  const chunks: string[] = [];
  for (const layer of layers) {
    if (layer.kind === "pictogram") chunks.push(layer.emojiFallback);
    else if (layer.kind === "text") {
      if (layer.emphasis === "stacked") chunks.push(layer.content.split("").join("\n"));
      else chunks.push(layer.content);
    } else if (layer.kind === "operator") chunks.push(layer.symbol);
    else if (layer.kind === "image") chunks.push("🖼️");
  }
  // Collapse horizontal runs of spaces, but keep intentional stacked newlines
  return chunks
    .join(" ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}
