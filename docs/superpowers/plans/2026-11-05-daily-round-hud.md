# Daily Round HUD Implementation Plan

> **For agentic workers:** This is a small follow-up to the existing native daily game plan; execute it in the current shared worktree and preserve all other local changes.

**Goal:** Keep Journey progress visible in the active daily round without taking a permanent row from the answer composer.

**Architecture:** Add a compact rendering mode to the existing `ActiveJourneyProgress` component and place it beside the date in Today’s status row. Keep its expanded accessibility-size form in the scroll content and remove the normal-size copy from the bottom safe-area inset.

**Tech Stack:** SwiftUI, current Rebuzzle `Theme`, existing server-confirmed `JourneyProgress`.

**Spec:** `docs/superpowers/specs/2026-11-05-daily-round-hud-design.md`

## Global Constraints

- Preserve current puzzle, scoring, hint, answer privacy, and server-confirmed progress rules.
- Use existing Rebuzzle tokens and SwiftUI; add no dependencies.
- Do not add or run automated tests in this pass.

## Tasks

### Task 1: Add a compact progress HUD

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`

- [ ] Add a `compact` option to `ActiveJourneyProgress`.
- [ ] Render level, a short progress bar, and XP-to-next in a single compact chip when requested.
- [ ] Keep the existing full progress description and VoiceOver value for the expanded form.
- [ ] Continue to respect Reduce Motion and animate only the existing server-confirmed XP value.

### Task 2: Put progress with the daily round

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [ ] At standard text sizes, show compact progress beside the date only when Journey backfill is complete and a summary exists.
- [ ] At accessibility text sizes, show the full progress view below the date in scroll content.
- [ ] Remove the always-pinned progress strip from the composer safe-area inset; retain the composer and new-feedback jump control.
- [ ] Keep the existing guess tracker, result screen, and game/session rules intact.

### Task 3: Verify the render

- [ ] Run `git diff --check`.
- [ ] Build the Debug iOS Simulator target; do not run automated tests.
- [ ] Install and capture Today at standard and accessibility text sizes, then inspect date/progress fit and composer clearance.
