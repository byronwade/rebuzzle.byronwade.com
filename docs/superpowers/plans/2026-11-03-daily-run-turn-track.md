# Daily Run Turn Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the daily puzzle’s scored turns feel like a connected, stateful game run.

**Architecture:** Keep game state in `AppModel`; derive the turn prompt and marker states inside `PuzzleArenaView`. UI tests verify the visible state transitions while the existing accessibility progress value stays unchanged.

**Tech Stack:** SwiftUI, XCTest UI tests, Xcode simulator.

**Spec:** `docs/superpowers/specs/2026-11-03-daily-run-turn-track-design.md`

## Global Constraints

- Preserve the existing daily attempt and score-lock behavior.
- Preserve `dailyGuessProgress`, its `Guess progress` label, and its remaining-guess value.
- Use existing `Theme` tokens and respect Dynamic Type and Reduce Motion.
- Add no network calls, stored state, scoring changes, or dependencies.

## Review Focus

- Zero attempts: test the opening prompt and three remaining guesses.
- One incorrect attempt: test that the prompt advances and two guesses remain.
- Score lock: test that the prompt becomes `Score banked` while continuing remains available.
- Accessibility size: retain the arena’s current reachability and countdown assertions.
- Solved state: retain the existing result, streak, and XP flow assertions.

---

### Task 1: State-driven daily turn track

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/PuzzleArenaView.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Consumes: `model.game?.attempts`, `attemptsLeft`, `maxAttempts`, and `scoreLocked`.
- Produces: an identified turn prompt and connected visual track; preserve the `dailyGuessProgress` accessibility contract.

- [x] **Step 1: Add the failing UI assertions**

Assert the opening prompt is `Make your move` and that after one incorrect guess it becomes `Try a new angle`, while the existing accessibility value changes from three guesses remaining to two.

- [x] **Step 2: Run the focused UI test and confirm it fails for the missing prompt**

Run: `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone Air' -only-testing:RebuzzleUITests/GameplayUITests/testWrongGuessThenWin -parallel-testing-enabled NO`

Expected: fail because `dailyTurnTitle` is not present yet.

- [x] **Step 3: Implement the connected track and state copy**

In `PuzzleArenaView.swift`, derive the prompt from the current game state, replace isolated squares with connected markers that reflect upcoming/active/missed/solved states, and retain the existing textual and accessibility progress values. Keep decorative markers hidden from accessibility.

- [x] **Step 4: Run focused state and accessibility UI tests**

Run the focused test above and `testDailyPuzzleArenaFitsAccessibilitySize` on the same simulator.

Expected: both pass, including existing score/reward assertions in the wrong-guess-then-win flow.

- [x] **Step 5: Verify the full iOS simulator build and inspect the rendered screen**

Run an iOS simulator build for scheme `Rebuzzle`; inspect the initial arena screenshot at the supported default text size. Use the focused UI tests to verify the post-miss prompt transition and score-locked state.

Result: simulator build succeeded; the rendered track is visibly connected. Focused UI tests verified the opening prompt, post-miss prompt, final attempt, score lock, accessibility size, and existing solve flow.
