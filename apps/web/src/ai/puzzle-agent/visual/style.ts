/**
 * Rebuzzle Ink Pictogram v1 — locked visual language for generative puzzle art.
 *
 * Every custom emoji / pictogram must follow this style so the daily board
 * feels like one designed product, not a random emoji salad.
 */

export const INK_PICTOGRAM_STYLE_ID = "ink-pictogram-v1" as const;

export const INK_PICTOGRAM_PALETTE = {
  /** Primary ink — matches app foreground */
  ink: "#1a1f1c",
  /** Soft canvas fill */
  canvas: "#f4f6f3",
  /** Muted secondary stroke */
  mist: "#6b756f",
  /** Accent (sparingly — never purple) */
  accent: "#2f6f5e",
  /** Danger / strike emphasis */
  strike: "#b23a2d",
} as const;

/** System prompt fragment injected into pictogram + image generators. */
export const INK_PICTOGRAM_STYLE_GUIDE = `
You are designing Rebuzzle Ink Pictogram v1 tiles.

LOCKED STYLE (non-negotiable):
- Flat, crisp, editorial pictograms — like a modern rebus board, not clipart
- ViewBox 0 0 64 64, single SVG root, no external fonts or images
- Stroke-first: 2.25px rounded strokes in ${INK_PICTOGRAM_PALETTE.ink}
- Optional soft fill ${INK_PICTOGRAM_PALETTE.canvas}; accent ${INK_PICTOGRAM_PALETTE.accent} only for one focal detail
- No gradients, no drop shadows, no 3D, no photorealism, no purple, no glow
- Centered subject, generous padding (~6px), readable at 48–96px
- Family-friendly; no text letters inside the SVG unless the concept IS a letter
- Prefer simple silhouettes that read instantly in a rebus
`.trim();

export const IMAGE_TILE_STYLE_GUIDE = `
Rebuzzle hybrid image tile style:
- Soft ink illustration on paper-like canvas, muted teal accent only
- Single clear subject, no collage, no watermark, no text overlays
- Square composition, centered, high contrast silhouettes
- Matches flat pictogram language — not photoreal stock photography
`.trim();

export type PictogramConcept = {
  /** Stable id, e.g. "bee", "clock-broken" */
  id: string;
  /** What to draw */
  concept: string;
  /** Optional mood / role in the rebus */
  role?: string;
};
