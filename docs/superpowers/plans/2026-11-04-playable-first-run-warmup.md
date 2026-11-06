# Playable First-Run Warm-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach new Rebuzzle players the clue, attempt, hint, and Eve-feedback loop with a short interactive demo that never touches the daily round.

**Architecture:** A dedicated SwiftUI tutorial view owns a tiny local sample game. `TodayView` presents it after the daily puzzle loads, persists completion/skip with `@AppStorage`, and exposes replay from How to Play. The real `AppModel` and network services remain untouched.

**Tech Stack:** Swift 6, SwiftUI, iOS 18, existing Rebuzzle `Theme`, `GuessComposer`, and haptics.

**Spec:** `docs/superpowers/specs/2026-11-04-playable-first-run-warmup.md`

## Global Constraints

- Do not change daily attempts, puzzle state, XP, streaks, stats, or backend data from the tutorial.
- Preserve fixture behavior by bypassing the automatic presentation when `--ui-fixture` is present.
- Honor Dynamic Type, VoiceOver, Reduce Motion, and the existing haptics preference.
- No new dependencies or network calls.
- Automated tests are not to be added or run under the active workspace instruction; verify with an Xcode Release archive and a simulator visual check.

## Review Focus

- Fixture launches must still reach `checkAnswer` without a tutorial modal.
- Repeated appearance of `TodayView` must not present the automatic tutorial multiple times in one session.
- Skip and replay transitions must not stack or race sheets.
- Empty, whitespace-only, differently cased, and space-separated answers must be handled sensibly.
- Accessibility text sizes and Reduce Motion must keep controls visible and feedback understandable.

---

### Task 1: Build the self-contained practice round

**Files:**
- Create: `apps/ios/Rebuzzle/Features/FirstRunTutorialView.swift`

**Interfaces:**
- Consumes: `Theme`, `FieldStyle`, `GuessComposer`.
- Produces: `FirstRunTutorialView(onFinish: () -> Void)`.

- [x] Add the LIGHT-over-HOUSE sample board and concise instructions.
- [x] Put the no-daily-attempt reassurance before the answer field.
- [x] Add local draft, attempt count, hint, feedback, and solved/revealed state; normalize answers for case, spaces, and punctuation.
- [x] Show progressive sample Eve feedback, a free hint, success feedback, and reveal after three misses.
- [x] Add Skip and Continue actions, accessibility identifiers/labels, Reduce Motion-aware transitions, and haptics gated by the existing preference.
- [x] Confirm no AppModel, API, scoring, or analytics mutation is introduced.

### Task 2: Present once and make replay discoverable

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Consumes: `FirstRunTutorialView(onFinish:)`.
- Produces: one-time first-use presentation, fixture bypass, and a How to Play replay action.

- [x] Add a persisted completion/skip flag and presentation state.
- [x] Present after the daily puzzle becomes available; bypass when launch arguments contain `--ui-fixture`.
- [x] Add a replay entry to `HelpView`; sequence dismissal/presentation so the tutorial never stacks with the help sheet.
- [x] Ensure any close, skip, solve, or reveal completion returns to the existing daily game.

### Task 3: Release verification

**Files:**
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Release/Checklist.md`

- [x] Increment the TestFlight build number.
- [x] Generate the Xcode project and build/archive Release for `com.byronwade.rebuzzle`.
- [x] Inspect the simulator's first-run screen and correct-answer state without running the automated test suite. Skip/relaunch was not visually confirmed after the simulator session changed devices.
- [x] Upload the archive to TestFlight and record the build, processing state, and existing invite link.
