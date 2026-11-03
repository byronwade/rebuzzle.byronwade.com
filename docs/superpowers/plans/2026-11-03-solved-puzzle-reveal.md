# Solved puzzle reveal implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the completed puzzle visible directly after its answer and explanation on the successful Daily result screen.

**Architecture:** Use the existing `PuzzleBoard` in `ResultView`, gated by a successful outcome and matching puzzle ID/date. Keep canonical rendering unchanged and retain the existing collapsed board disclosure for non-solve terminal results.

**Tech Stack:** SwiftUI, `RebuzzleCore.Puzzle`, existing `PuzzleBoard`, `Theme`.

**Spec:** `docs/superpowers/specs/2026-11-03-solved-puzzle-reveal-design.md`

## Global Constraints

- iOS 18 minimum; use native SwiftUI patterns.
- Do not change canonical image pixels, board geometry, clue meaning, or answer logic.
- Show the solve-only presentation only for a successful game and exact puzzle/date match.
- Reuse existing `Theme` and `PuzzleBoard`; no new dependency, animation, haptic, or reward.
- Preserve Dynamic Type, accessibility labels, answer-reveal/expiry states, and existing primary actions.
- No automated tests are added or run for this turn; implementation evidence is a fresh build and native fixture inspection.

## Review Focus

1. An answer-reveal or expiry also has `gameOver == true`; the inline solved board must require `game.wasSuccessful == true`.
2. The current daily can roll over while an old result remains; puzzle ID and date must both match before its board is used.
3. The board must not appear twice in the result.
4. Accessibility text growth must not clip the board or push the primary action into a fixed-height container.
5. Canonical assets and result presentation must not gain duplicate motion or haptic feedback.

---

### Task 1: Pair the solved board with its result

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift` (`ResultView`)

**Interfaces:**
- Consumes: `model.daily.puzzle`, `model.daily.puzzleDate`, `game.puzzleId`, `game.puzzleDate`, `game.wasSuccessful`, and `PuzzleBoard(puzzle:)`.
- Produces: a `solvedPuzzleReveal` region directly after the result hero and one remaining collapsed disclosure for non-solve terminal outcomes.

- [x] Resolve a matching current puzzle in `ResultView`; require both puzzle ID and date to match the completed `GameSession`.
- [x] Show the matching `PuzzleBoard` immediately after the result hero and before streak/reward cards only when `game.wasSuccessful == true`, using the active gameplay board's panel treatment.
- [x] Suppress the bottom “See the puzzle” disclosure when that same solved puzzle is already shown; retain it for answer-reveal/expiry results and never substitute a mismatched current puzzle.
- [x] Add a stable accessibility identifier without replacing `PuzzleBoard`’s existing accessibility label.
- [x] Run `git diff --check` and build the iOS Simulator target.
- [x] Inspect success, reveal, and accessibility-size result states on the iPhone simulator.
- [x] Commit the focused change (`b83700a`).
