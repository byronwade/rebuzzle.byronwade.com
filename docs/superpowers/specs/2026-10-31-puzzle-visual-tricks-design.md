# Rebus visual tricks and a trusted iOS board

Date: 2026-10-31
Status: approved in conversation, awaiting written-spec review

## Why

Players asked for better puzzles and more kinds of visual puzzle. Every daily is a rebus, and the visual tricks it can use are few: size (`large`, `small`, `tiny`), `strike`, `stacked`, position and containment. That makes the boards feel samey across a week.

There is also a trust gap. The checked board image (`canonicalBoard`) is compiled only for player-made puzzles (`lib/ugc/eve-review.ts:495`). AI and reserve dailies ship without one. iOS then falls back to `VisualBoard`, a rough layout that no gate looked at. For overlay and free layouts it uses a fixed 220pt canvas with 30% × 72pt tiles. Players on iPhone can see a different board from the one that passed the blind-solve and recognition checks.

## Scope

Two pull requests:

- **PR A, the trusted board.** Compile a canonical board for every daily candidate and reserve. iOS already prefers it.
- **PR B, the visual tricks.** Add a `transform` to board layers, render it everywhere, teach the generator to use it, gate it, and add reserve examples.

Out of scope: new puzzle genres (the nine registered non-rebus types stay unused), changes to difficulty or the playtest floors, Rush and Endless (a separate spec), and AI player profiles.

## PR A: every daily ships its checked board

### Changes
- **Compile at queue time.** When a candidate enters the blind-playtest queue, compile `canonicalBoard` with `compileCanonicalBoard(visual)` (`ai/puzzle-agent/visual/canonical-board.ts:22`) and store it on the candidate. Playtesters and players then see the same pixels. If compiling throws, the candidate is rejected with the reason `canonical-board-failed` and the existing retry or reserve path takes over.
- **Compile for reserves.** `persistReservePuzzle` compiles a board too. Reserves that fail to compile are logged and skipped, not published.
- **Verify on publish.** `publish-reviewed-daily-puzzle.ts` checks that a valid board is present with `validateCanonicalBoard`. If one is missing (an older candidate), it compiles one before publishing.
- **Backfill.** A one-off script, `scripts/backfill-canonical-boards.ts`, compiles boards for published and queued puzzles that have composed visuals and no board. It is idempotent, has a `--dry-run` flag, and reports failures without changing those puzzles.
- **Solve checks see the board players see.** The rendered blind-solve (`player-sim.ts`) judges the compiled canonical images, one per profile, rather than a separate render. Where it already uses `renderPuzzleVisualProfile`, the two must produce identical bytes, and a test asserts this.

### iOS
- No behavior change when a board is present (`TodayView.swift:701`).
- Add a `caption` decode to `PuzzleVisual` in `Models.swift`, because the web shows it and iOS drops it. It is shown under the board in secondary text.

### Tests
- Jest: a candidate gets a board at queue time; a compile failure rejects the candidate; publish compiles a missing board; the backfill skips puzzles that already have a board and reports failures.
- Jest: the board images match the solve-check renders byte for byte for the six control puzzles.
- iOS Core: decoding a puzzle with a canonical board and a caption.

## PR B: visual tricks

### Data
Add an optional `transform` to every layer kind in `composition.ts`:

```ts
const LayerTransformSchema = z.object({
  rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270), z.literal(-15), z.literal(15)]).optional(),
  mirror: z.enum(["horizontal", "vertical"]).optional(),
  tint: z.enum(["red", "blue", "green", "yellow", "black", "white", "gold", "pink"]).optional(),
  crop: z.enum(["left-half", "right-half", "top-half", "bottom-half"]).optional(),
  fade: z.enum(["ghost", "fading"]).optional(),   // ghost = 25% opacity; fading = gradient to 0
  repeat: z.object({ count: z.number().int().min(2).max(12), arrange: z.enum(["row", "grid", "circle"]) }).optional(),
}).strict();
```

The rules:
- **Fixed values only.** Tints are a fixed named palette tuned for both themes and colorblind-safe pairs. No free hex values, no arbitrary angles.
- **Limits on combining.** A layer can use at most two transform properties. A board can use at most three transformed layers.
- **No combined color tricks.** `tint` cannot combine with `fade`.
- **Repeats count once.** `repeat` expands to `count` copies in layout, and those copies count as one layer toward the 12-layer limit.
- **Overlapping pieces use what exists.** They use the existing `overlay` and `free` layouts with x/y positions. Free layouts gain a z-order rule: later layers draw on top.
- **Plain-text fallback.** `unicodeFallback` must still describe the board in text. For example, `"HEAD (upside down)"`.

### Rendering
The same transform is drawn in three places, and each place is covered by tests:
- `render-board.ts` (server SVG, which produces the canonical board and the solve-check images). It uses SVG `transform`, `fill`, a `clipPath` for `crop`, opacity or a `linearGradient` mask for `fade`, and expanded copies for `repeat`.
- `PuzzleVisualBoard.tsx` and `layout-plan.ts` (web). The equivalent CSS transforms, color tokens, `clip-path` and `mask-image`. The layout plan accounts for the rotated bounding box (a 90° rotation swaps width and height) and for repeat expansion.
- iOS `VisualBoard.swift`, used only as the fallback when no canonical board exists. It applies `rotationEffect`, `scaleEffect(x: -1)` or `scaleEffect(y: -1)`, `foregroundStyle` for tints, a `mask` for crop and fade, and `ForEach` for repeats. iOS Core models decode `transform`. An unknown transform value decodes as nil, so a newer server never breaks an older app.

A Playwright screenshot test renders one fixture per transform on the web board at 320, 375 and 768 widths. It compares them with the canonical PNG and allows a small pixel-difference tolerance.

### Trick catalog
Add these techniques next to `containment`, `reversal`, `size`, `position`, `count`, `classification` and `homophone`. Each has a definition, two worked examples and a set of disallowed cases for the generator prompt.

| techniqueId | Uses | Example |
| --- | --- | --- |
| `rotation` | `rotate` | "HEAD" at 180° → "head over heels" |
| `mirror` | `mirror` | mirrored "IMAGE" → "mirror image" |
| `color` | `tint` | blue "MOON" → "blue moon"; red pictogram fish → "red herring" |
| `partial` | `crop` | the right half of a heart → "half-hearted" |
| `fade` | `fade` | "AWAY" fading → "fade away"; ghost "LINES" between two lines → "read between the lines" |
| `multiplication` | `repeat` | 10 × "CENT" → "ten cents"; "ROUND" × 4 in a circle → "all year round" |
| `overlap` | `overlay` or free z-order | "WORLD" with "ON" above it → "on top of the world" |

`techniqueId` is already part of the novelty signature (`novelty.ts:150`). Each transform property is added to the `mechanismFamily` key, so a week can't repeat the same trick in a different layout.

### Generation
- `agent/skills/generate-daily-puzzle.md` and `agent/instructions.md` get the new trick catalog and the transform schema. A trick should carry part of the answer's meaning; a decorative transform is rejected (see the gates below). The outdated "Hard 4–5" text in `instructions.md` is corrected to match the real floor of 7.
- `curriculum.ts` gets a weekly mix rule. Each 7-day window uses at least two techniques from the new catalog and never the same `techniqueId` on consecutive days. The brief picks the technique before the answer when the window needs one.
- The curated phrase bank is extended with answers that fit each new technique, around 15 per technique, checked by the existing answer registry for duplicates.

### Gates
These are added to `evaluatePublishGates` (`quality.ts:377`) and the rendered blind-solve:
- **Trick consensus.** When a board uses a transform, at least two vision judges must name what the trick means without being told it (for example, "upside down" for a 180° rotation). This reuses the blind-solve judge calls with one extra question, and the blocker sits in `blind-solve-consensus.ts`.
- **No decorative transforms.** Each transformed layer must be cited in `reasoningEvidence` as a solving step. Otherwise the board is blocked with the reason `decorative-transform`.
- **No answer on the board.** If the answer phrase, ignoring case and spaces, can be read directly from the board's text layers, the board is blocked. This tightens the existing plain "A + B" check.
- **Contrast.** Every tinted text layer must meet WCAG AA contrast against the board background in both themes. This is checked in `render-board.ts` before compiling.

### Reserves
Add 12 hand-made reserve puzzles to `demanding-reserve-puzzles.ts`, at least one per new technique. Each passes the static render audit and the PR A board compile. Regenerate `artifacts/puzzle-generator/static-audit.json`.

### Tests
- Jest unit tests:
  - the schema: limits, strictness, and tint-plus-fade rejected
  - the layout plan: rotated bounds and repeat expansion
  - `render-board` output for each transform: snapshot of the SVG structure
  - the novelty `mechanismFamily` includes the transforms
  - the curriculum mix rule
  - each new gate, passing and failing
  - the reserve audit
- Playwright screenshot parity test, as described under Rendering.
- iOS Core: transform decoding, including an unknown value decoding as nil.
- iOS UI: a fixture puzzle with no canonical board and a rotated and tinted layer renders, with a screenshot attached to the test run.

## Rollout
1. Merge and deploy PR A, then run the backfill with `--dry-run`, then for real.
2. In PR B, the new tricks are generator-side only at first. Reserves and AI candidates using them still go through the human playtest queue, so nothing ships without a real-player solve rate above the floor.
3. Watch the playtest pass rate per technique in the existing playtest data. A technique below the floor for two weeks is removed from the curriculum mix until its prompt is fixed.
