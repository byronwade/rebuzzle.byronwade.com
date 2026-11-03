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
