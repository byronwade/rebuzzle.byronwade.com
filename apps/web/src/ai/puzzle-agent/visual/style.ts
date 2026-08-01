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

/** Tiny few-shot: a readable key. */
export const INK_PICTOGRAM_EXAMPLE_KEY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="20" cy="32" r="10" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25"/><circle cx="20" cy="32" r="3.5" fill="none" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2"/><path d="M30 32h22" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.5" stroke-linecap="round"/><path d="M46 32v6M52 32v8" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linecap="round"/></svg>`;

/** Tiny few-shot: a readable umbrella. */
export const INK_PICTOGRAM_EXAMPLE_UMBRELLA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><path d="M10 34c0-14 10-22 22-22s22 8 22 22H10z" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linejoin="round"/><path d="M32 34v14c0 4 6 4 6 0" fill="none" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linecap="round"/><path d="M18 34c4-6 9-8 14-8s10 2 14 8" fill="none" stroke="${INK_PICTOGRAM_PALETTE.mist}" stroke-width="1.75"/></svg>`;

/** Tiny few-shot: a readable clock. */
export const INK_PICTOGRAM_EXAMPLE_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="34" r="18" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25"/><circle cx="32" cy="34" r="2" fill="${INK_PICTOGRAM_PALETTE.ink}"/><path d="M32 34V22M32 34l10 6" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2.25" stroke-linecap="round"/><path d="M32 14v4M32 50v4M14 34h4M46 34h4" stroke="${INK_PICTOGRAM_PALETTE.mist}" stroke-width="2" stroke-linecap="round"/></svg>`;

/** System prompt fragment injected into pictogram generators. */
export const INK_PICTOGRAM_STYLE_GUIDE = `
You are a senior icon designer drawing Rebuzzle Ink Pictogram v1 tiles for rebus puzzles.

GOAL: Instant recognition at 48–64px. If a stranger cannot name the object in one second, you failed.
Research rule: the brain reads silhouette first — exaggerate the outer shape, then add 2–4 identifying marks.

LOCKED STYLE (non-negotiable):
- Flat, crisp, editorial pictograms — modern rebus board icons, not clipart or doodles
- ViewBox 0 0 64 64, single SVG root, no external fonts or images
- Stroke-first: 2.25–2.75px rounded strokes (stroke-linecap/linejoin=round) in ${INK_PICTOGRAM_PALETTE.ink}
- Optional soft fill ${INK_PICTOGRAM_PALETTE.canvas}; accent ${INK_PICTOGRAM_PALETTE.accent} only for ONE focal detail
- No gradients, filters, drop shadows, 3D, photorealism, purple, glow, or noise textures
- Centered subject, ~6–8px padding from edges; subject fills most of the safe area
- Family-friendly; no letters inside the SVG unless the concept IS a letter
- Prefer 3–8 primitive shapes (circle/ellipse/rect/path) — cap complexity; ≤12 absolute max
- Prefer native shapes over dense path spaghetti; round coordinates

CRAFT RULES (silhouette-first):
- Draw ONE concrete object (or one classic symbol like a heart / lightbulb) — single focal element
- Exaggerate the distinguishing feature (key teeth, bee stripes, umbrella J-handle) — clarity is controlled emphasis
- Keep geometry chunky — no hairline strokes under 2px; details that vanish at 48px must be removed
- Canonical views: animals side/¾; tools ¾ with handle; clocks face-on; containers with opening visible
- Never substitute a related object (honeycomb for bee) unless the rebus role requires that exact noun
- Do not draw abstract blobs, random squiggles, decorative swirls, or multi-scene collages

RECOGNITION TEST (before finishing):
1) Squint test: would the outer silhouette alone suggest the object?
2) Name test: would a stranger say the exact noun in one second?
If either fails, enlarge the silhouette and strengthen identifying marks — do not add decoration.

GOOD EXAMPLE (bee — stripes + wings + antennae):
${INK_PICTOGRAM_EXAMPLE_BEE}

GOOD EXAMPLE (eye — lid almond + iris + pupil):
${INK_PICTOGRAM_EXAMPLE_EYE}

GOOD EXAMPLE (key — bow + shaft + teeth):
${INK_PICTOGRAM_EXAMPLE_KEY}

GOOD EXAMPLE (umbrella — canopy + shaft + J handle):
${INK_PICTOGRAM_EXAMPLE_UMBRELLA}

GOOD EXAMPLE (clock — face + hands + ticks):
${INK_PICTOGRAM_EXAMPLE_CLOCK}
`.trim();

export const IMAGE_TILE_STYLE_GUIDE = `
Rebuzzle hybrid image tile style:
- Soft ink illustration on paper-like canvas (${INK_PICTOGRAM_PALETTE.canvas}), muted teal accent only (${INK_PICTOGRAM_PALETTE.accent})
- ONE clear, instantly recognizable real-world subject — bold silhouette, high contrast
- Not abstract, not collage, no watermark, no text overlays, no purple glow
- Square composition, centered, generous padding
- Looks like a premium rebus icon a human could sketch from memory
- Prefer the most iconic camera angle (side bee, face-on clock, side key)
`.trim();

export type PictogramConcept = {
  /** Stable id, e.g. "bee", "clock-broken" */
  id: string;
  /** What to draw */
  concept: string;
  /** Optional mood / role in the rebus */
  role?: string;
};
