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

/** Tiny few-shot: a readable bee — striped body, wings, antennae. */
export const INK_PICTOGRAM_EXAMPLE_BEE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="36" rx="15" ry="11" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25"/><path d="M20 32h24M20 36h24M20 40h24" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linecap="round"/><path d="M18 28c-6-6-2-14 4-12" fill="none" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2" stroke-linecap="round"/><path d="M46 28c6-6 2-14-4-12" fill="none" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="33" r="1.6" fill="${INK_PICTOGRAM_PALETTE.ink}"/><line x1="27" y1="24" x2="24" y2="16" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2" stroke-linecap="round"/><line x1="37" y1="24" x2="40" y2="16" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2" stroke-linecap="round"/></svg>`;

/** Tiny few-shot: a readable eye. */
export const INK_PICTOGRAM_EXAMPLE_EYE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path d="M8 32c8-14 20-20 24-20s16 6 24 20c-8 14-20 20-24 20S16 46 8 32z" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linejoin="round"/><circle cx="32" cy="32" r="9" fill="none" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25"/><circle cx="32" cy="32" r="4" fill="${INK_PICTOGRAM_PALETTE.ink}"/></svg>`;

/** System prompt fragment injected into pictogram generators. */
export const INK_PICTOGRAM_STYLE_GUIDE = `
You are a senior icon designer drawing Rebuzzle Ink Pictogram v1 tiles for rebus puzzles.

GOAL: Instant recognition at 48–96px. If a player cannot name the object in one second, you failed.

LOCKED STYLE (non-negotiable):
- Flat, crisp, editorial pictograms — modern rebus board icons, not clipart or doodles
- ViewBox 0 0 64 64, single SVG root, no external fonts or images
- Stroke-first: 2.25px rounded strokes in ${INK_PICTOGRAM_PALETTE.ink}
- Optional soft fill ${INK_PICTOGRAM_PALETTE.canvas}; accent ${INK_PICTOGRAM_PALETTE.accent} only for ONE focal detail
- No gradients, filters, drop shadows, 3D, photorealism, purple, glow, or noise textures
- Centered subject, ~6–8px padding from edges
- Family-friendly; no letters inside the SVG unless the concept IS a letter
- Use 3–12 simple shapes/paths with a bold silhouette
- Prefer closed outlines + a few distinctive interior marks (stripes, pupil, handle, etc.)

CRAFT RULES:
- Draw ONE concrete object (or one classic symbol like a heart / lightbulb)
- Include the iconic features that make it unmistakable
- Keep geometry chunky — avoid hairline details that vanish at small size
- Do not draw abstract blobs, random squiggles, decorative swirls, or multi-scene collages
- Do not invent unreadable "vibes" — invent a readable object

GOOD EXAMPLE (bee — stripes + wings + antennae):
${INK_PICTOGRAM_EXAMPLE_BEE}

GOOD EXAMPLE (eye — lid almond + iris + pupil):
${INK_PICTOGRAM_EXAMPLE_EYE}
`.trim();

export const IMAGE_TILE_STYLE_GUIDE = `
Rebuzzle hybrid image tile style:
- Soft ink illustration on paper-like canvas (${INK_PICTOGRAM_PALETTE.canvas}), muted teal accent only (${INK_PICTOGRAM_PALETTE.accent})
- ONE clear, instantly recognizable real-world subject — bold silhouette, high contrast
- Not abstract, not collage, no watermark, no text overlays, no purple glow
- Square composition, centered, generous padding
- Looks like a premium rebus icon, not photoreal stock photography
- If the subject would be unclear, simplify to the most iconic view (side profile of a bee, front of a clock, etc.)
`.trim();

export type PictogramConcept = {
  /** Stable id, e.g. "bee", "clock-broken" */
  id: string;
  /** What to draw */
  concept: string;
  /** Optional mood / role in the rebus */
  role?: string;
};
