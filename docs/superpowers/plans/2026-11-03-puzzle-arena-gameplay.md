# Puzzle Arena Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active daily puzzle read as one polished game arena with a tactile, accessible turn meter.

**Architecture:** Extract the live puzzle presentation into a focused `PuzzleArenaView`. Keep `TodayView` responsible for daily flow and preserve the canonical `PuzzleBoard` renderer as the only source of clue geometry. Move the existing guess-progress presentation into the arena and restyle it as three rounded square turn tiles.

**Tech Stack:** SwiftUI, Swift Observation, existing `Theme`, `PuzzleBoard`, and `DifficultyBadge`.

**Spec:** `docs/superpowers/specs/2026-11-03-puzzle-arena-gameplay-design.md`

## Global Constraints

- Do not change puzzle content, rules, scoring, hints, countdown, or rewards.
- Keep `PuzzleBoard` geometry and scaling unchanged.
- Keep the answer composer pinned and usable.
- Respect Dynamic Type, VoiceOver, Reduce Motion, and adaptive light/dark colors.
- Do not add dependencies.

## Review Focus

- **Canonical clue fidelity:** The arena must not resize or reconstruct puzzle elements; manually compare the clue before and after.
- **Turn state clarity:** Unplayed, active, incorrect, and correct turns must remain distinguishable and semantically accurate.
- **Keyboard layout:** The arena must remain readable above the pinned composer when the keyboard is open.
- **Accessibility size:** Header and turn tiles must reflow without clipping at Accessibility XXXL.
- **Dark appearance:** Paper/ink surfaces and semantic colors must remain legible when the simulator uses dark mode.

---

### Task 1: Build the focused daily puzzle arena

**Files:**
- Create: `apps/ios/Rebuzzle/Features/PuzzleArenaView.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- `PuzzleArenaView` consumes `puzzle: Puzzle` and `onStudy: () -> Void`; it reads the current `AppModel` game state from the existing environment.
- `PuzzleBoard` remains the existing canonical renderer and stays unchanged.
- The arena preserves the existing `dailyGuessProgress` accessibility identifier, label, and value.

- [x] Add `testDailyPuzzleArenaContainsGuessProgress` and assert that `dailyGuessProgress` is contained by `dailyPuzzleArena` while retaining the three-guesses accessibility value.
- [x] Run that UI test and confirm it fails because the arena container does not yet exist.
- [x] Extract the current puzzle metadata, study button, clue board, and attempt meter into `PuzzleArenaView`.
- [x] Replace the thin divider with spacing and a warm inset clue surface using existing theme tokens.
- [x] Restyle the three attempts as 44-point rounded square turn tiles with clear active, correct, incorrect, and remaining states.
- [x] Replace the current card-plus-separate-meter composition in `TodayView` with the arena.
- [x] Run the new UI test plus existing canonical-board, study-puzzle, keyboard, and Accessibility XXXL gameplay UI cases.
- [x] Build the iOS Simulator app and visually inspect the normal play screen, keyboard-visible state, dark appearance, and Accessibility XXXL layout; confirm clue geometry and the pinned composer remain intact.
- [x] Commit as `Build the Rebuzzle puzzle arena`.

### Task 2: Preserve clue scale and prove the large-type arena

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/PuzzleArenaView.swift`
- Modify: `apps/ios/Rebuzzle/Features/DailyPuzzleCountdown.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- The arena keeps a 16-point inset between the canonical board and the surrounding `Page` content, matching the Study puzzle surface.
- The accessibility tree exposes `dailyGuessProgress` as a descendant of `dailyPuzzleArena`.
- At accessibility text sizes, the compact daily countdown stacks its label and clock so the full time remains visible.

- [x] Extend the canonical-board UI check to confirm its displayed width matches the Study puzzle surface's 16-point inset.
- [x] Run the width check and confirm it fails because the arena adds a second horizontal inset.
- [x] Remove only the extra outer 12-point horizontal padding; keep the paper surface and its curved rim.
- [x] Query guess progress through `dailyPuzzleArena` and add an Accessibility XXXL test that captures the metadata row and the scrolled turn meter.
- [x] Keep the entire guess meter above the pinned composer at Accessibility XXXL, not merely partially hittable.
- [x] Stack the compact countdown label and clock at accessibility text sizes so the full timer remains visible.
- [x] Run the arena, canonical-board, Study puzzle, keyboard-visible, and Accessibility XXXL UI checks.
- [x] Build and visually inspect the Accessibility XXXL, countdown, and scrolled turn-meter states; confirm the canonical board scale is preserved.
- [x] Commit as `Preserve Rebuzzle puzzle board geometry`.
