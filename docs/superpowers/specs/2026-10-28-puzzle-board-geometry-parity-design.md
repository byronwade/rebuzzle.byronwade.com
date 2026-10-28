# Puzzle Board Geometry Parity

## Goal

Make the Studio preview, browser player fallback, canonical PNG, and visual review use one deterministic layout calculation so the clue positions and piece bounds creators see are the ones the player receives.

## Design

- Keep `layoutLayersLocked` as the geometry calculation and add a profile-driven entry point: `layoutPuzzleBoard(visual, profileId, options?) -> LockedLayoutPlan`. Options support size, measured `viewportWidth`, adaptive `padding`, row indexes, and free-canvas height. The server renderer and canonical compiler already use this same layout plan.
- `profileId` is one of `compact-320`, `mobile-375`, `mobile-375-medium`, or `desktop-768`. An optional `size` override is one of `small`, `medium`, or `large`; omitting it preserves the selected profile's current size. The added mobile-medium profile matches the medium-sized gameplay board while retaining the large mobile review profile.
- Use `layoutPuzzleBoard` from the browser fallback renderer and Studio preview. The same visual, profile, and size must produce identical board dimensions and per-layer pixel bounds as the server renderer and canonical compiler.
- Large browser boards use `ResizeObserver` and the shared planner to fit the measured container width. At widths of 320 pixels and above, pieces stay at 72 CSS pixels and padding changes smoothly between mobile and desktop widths. Below 320 pixels, the player switches to 52-pixel medium pieces, then 44-pixel compact pieces below 184 pixels, while preserving row membership planned with large pieces at a virtual 320-pixel width. Below 158 pixels, it shows the Unicode fallback instead of clipped layer geometry.
- Canonical PNGs include compact, medium-mobile, large-mobile, and desktop rasters. The public player uses a canonical raster at exact profile widths and the shared DOM renderer at intermediate widths. Server review selects the raster matching each recognition profile. Older canonical boards without a needed raster use the shared renderer instead of shrinking the desktop PNG.
- Scale artwork and type against the board container so each visible clue occupies its planned frame at any rendered width. Browser and SVG text share the Arial font stack and letter spacing, and both clip text to its planned frame. Stacked text line advance matches the planner and SVG renderer.
- Preserve saved layer `x`/`y` values as normalized centers on the free canvas, preserve existing layout names, and retain the canonical PNG as the preferred public-player rendering.
- Studio keeps selection and drag controls as overlays on the computed board. Dragging continues to save snapped normalized centers and switch the visual to free layout. When dragging from a locked layout, map every layer center against the destination frame and persist an optional expanded free-canvas height when a tall board needs it. Draft saves, Eve reviews, and submission saves carry the height end to end. The schema supports a 20,160-pixel canvas, enough for the largest legal 12-layer, 40-character stacked composition. Taller drafts stay editable, while review and publication clearly require a board height of 2,000 pixels or less.
- The profile set intentionally includes `mobile-375-medium` because medium gameplay renders 52-pixel pieces while mobile review renders 72-pixel pieces. Recognition gates use all four explicit profiles.
- Studio supports arrow-key movement in addition to pointer dragging. Focused pieces expose their current percentage position, keyboard shortcuts, and polite movement announcements. Cancelled pointer gestures do not save a position.
- Preserve current surface colors, layer artwork, typography treatment, captions, accessible labels, and compact/medium/large affordances.

## Acceptance criteria

1. `layoutPuzzleBoard` is the shared geometry source for each recognition profile and responsive width override. Row membership is planned once with 72-pixel tiles at a virtual 320-pixel width, then reused at compact, mobile, and desktop widths. Large player containers from 158 to 319 pixels use medium or compact tile geometry while preserving those locked rows and keeping all layer bounds inside the measured width; narrower containers show the Unicode fallback.
2. Medium gameplay uses `mobile-375-medium` server-rendered evidence at 52-pixel tile geometry; the existing large mobile profile remains available for 72-pixel mobile review. All four profile IDs are part of the design contract.
3. Browser layer frames and their rendered artwork/text share the same responsive geometry. Browser and SVG text use matching font stack, letter spacing, and clipping. Stacked line-height matches the server baseline advance.
4. Studio's visible layer buttons use the same large `desktop-768` bounds as the player/review plan; selection rings do not shift or resize the clue. A locked-to-free switch preserves every layer center, including tall stack boards.
5. A drag of 10 CSS pixels on a 500-pixel content area changes the saved normalized center by 2 percentage points before the existing grid snap, regardless of outer profile padding. Arrow keys move the focused piece one grid step, and cancelled pointer gestures do not persist.
6. Canonical rasters are compiled for each player/review profile and selected consistently. Existing canonical PNGs without variants and older serialized puzzle visuals remain compatible; missing canonical variants use shared geometry. `freeCanvasHeight` is optional, persists through save and review, and is limited to 20,160 pixels for drafts; review and publication reject boards over 2,000 pixels tall with a clear message.

## Constraints

- No database migration; the optional visual height field is backwards-compatible with existing stored puzzles.
- No new runtime dependency.
- Keep deterministic server rendering and current profile values.
- Do not expose answers or edit controls in the public player.
