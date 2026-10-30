# Puzzle Board Geometry Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use one deterministic geometry calculation for Studio, browser fallback rendering, canonical exports, and visual review.

**Architecture:** Add a profile-driven wrapper around the existing pure layout planner, then make browser player and Studio render the returned board dimensions and layer bounds. The server renderer and canonical compiler already use the same underlying layout planner. Studio retains its interaction layer, while the visible art uses the shared layer renderer.

**Tech Stack:** TypeScript, React 19, Next.js, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-puzzle-board-geometry-parity-design.md`

## Global Constraints

- Preserve existing serialized puzzle visuals and normalized free-layout `x`/`y` center semantics; persist the optional free-canvas height through draft save, Eve review, and submission save. Draft canvases support up to 20,160 pixels; review/publication require at most 2,000 pixels.
- Keep recognition profiles `compact-320`, `mobile-375`, `mobile-375-medium`, `desktop-768` and size tokens `small`, `medium`, `large`.
- Keep the canonical PNG path, visual accessibility labels, artwork/surface styling, and current layout names.
- Add no runtime dependency and no database/API migration.

## Review Focus

- Free-layout normalized centers with missing `x` or `y`: test defaults and explicit positions in the geometry planner.
- Empty and one-layer boards: test stable dimensions and nonzero bounds.
- Long and stacked text: test computed frames stay within the selected profile, browser/server use matching font and letter spacing, text is clipped to its frame, and line spacing agrees.
- Canonical profile variants: verify compact, medium, large-mobile, and desktop rasters are selected by the player and server review; old boards without the needed raster use the shared renderer.
- Fluid large-player widths: verify 375, 600, 767, and 768-pixel plans preserve 72-pixel pieces; verify 240, 200, 180, 160, and 158-pixel plans step down to medium or compact geometry while preserving locked row membership and fitting the measured width, and verify 157 pixels uses the Unicode fallback.
- Overlay, grid, stack, and row modes: test player and server consume the same bounds rather than separate DOM flow rules.
- Studio drag under outer profile padding: test movement is normalized against the inner content size, retains snapping, preserves centers across a layout switch, and does not clamp tall boards.
- Studio input and rendering: test responsive layer contents, arrow-key movement, current position labels, and cancelled drags.

---

### Task 1: Expose a profile-driven board geometry contract

**Files:**
- Modify: `apps/web/src/ai/puzzle-agent/visual/layout-plan.ts`
- Test: `apps/web/src/ai/puzzle-agent/visual/__tests__/layout-plan.test.ts`
- Test: `apps/web/src/ai/puzzle-agent/visual/__tests__/layout-plan-free.test.ts`

**Interfaces:**
- Produces: `layoutPuzzleBoard(visual: LayoutPlanVisual, profileId: PuzzleBoardRecognitionProfileId, options?: { size?: PuzzleBoardSize; viewportWidth?: number; padding?: number; rowIndexes?: number[][]; freeCanvasHeight?: number }): LockedLayoutPlan`.
- Keeps: `layoutLayersLocked(visual, profile, rowIndexes?)` as the existing geometry entry point for server rendering and other current callers.

- [x] **Step 1: Write failing planner tests** for every layout/profile and destination-frame transitions.
- [x] **Step 2: Run the focused Jest tests** and verify they fail before the planner contract and transition support exist.
- [x] **Step 3: Implement the typed profile-driven entry point**, text-fit scale, and optional expanded free-canvas height while preserving existing layout algorithms.
- [x] **Step 4: Re-run the focused tests** and verify geometry expectations pass.

### Task 2: Render browser player fallback from shared bounds

**Files:**
- Modify: `apps/web/src/components/PuzzleVisualBoard.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/src/components/__tests__/puzzle-board-geometry.test.ts`

**Interfaces:**
- Consumes: `layoutPuzzleBoard` from Task 1.
- Produces: browser fallback DOM layer frames with stable `data-board-layer-index` and `data-board-bounds` attributes for parity assertions.

- [x] **Step 1: Write a failing React server-render test** comparing browser layer bounds for mobile and desktop plans with the selected shared profiles.
- [x] **Step 2: Run the focused Jest test** and verify the independent placement branches fail the assertions.
- [x] **Step 3: Replace the independent free/overlay/flex placement branches** with shared bounds and responsive artwork/text sizing; switch large mobile/desktop profile variants at 768 pixels, select matching canonical profile rasters when available, and retain legacy canonical/Unicode fallbacks.
- [x] **Step 4: Re-run the component and planner tests** and verify the browser fallback markup passes.

### Task 3: Align Studio preview and editable handles

**Files:**
- Modify: `apps/web/src/components/PuzzleVisualBoard.tsx`
- Modify: `apps/web/src/components/studio/StudioArtboard.tsx`
- Modify: `apps/web/src/components/studio/PuzzleStudio.tsx`
- Modify: `apps/web/src/ai/puzzle-agent/visual/layer-position.ts`
- Test: `apps/web/src/components/__tests__/puzzle-board-geometry.test.ts`
- Test: `apps/web/src/ai/puzzle-agent/visual/__tests__/layer-position.test.ts`

**Interfaces:**
- Consumes: `layoutPuzzleBoard` from Task 1 and shared layer rendering from Task 2.
- Produces: `onMove(index, position, positions, freeCanvasHeight)` persists all normalized free-layout centers and the destination frame height so tall boards remain stable after editing.
- Keeps: `StudioArtboard({ visual, selectedIndex, onSelect, onMove, className })` and the existing pointer-capture/grid-snap interaction.

- [x] **Step 1: Add failing parity assertions** for Studio/player bounds, medium mobile profile, pointer deltas, position preservation, and keyboard access.
- [x] **Step 2: Run the focused Jest tests** and verify the new geometry and input assertions fail before implementation.
- [x] **Step 3: Render Studio's visible artboard from the shared large-profile plan**; size art within its frame and calculate deltas against the padded content area.
- [x] **Step 4: Persist displayed centers and an optional expanded frame height when a drag switches to free layout; add arrow-key movement, live position announcements, and cancel-without-commit behavior.**
- [x] **Step 5: Re-run the focused component and layer-position tests** and verify the parity and interaction assertions pass.

## Verification and Review

- Run focused Jest tests after each task.
- [x] Run the full web Jest suite and TypeScript typecheck after review fixes.
- [x] Run `pnpm --dir apps/web exec biome check <changed files>` after review fixes.
- [x] Direct whitespace scan found no trailing spaces; `git diff --check` could not run because the Git pack file is truncated.
- [x] Request an independent code review; address all reported geometry, sizing, text-fit, accessibility, and profile-size findings.
- [x] Request a final review of the fixes before considering the implementation complete; no remaining actionable issues.
