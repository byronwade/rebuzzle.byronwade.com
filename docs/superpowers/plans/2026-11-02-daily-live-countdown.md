# Daily Live Countdown Implementation Plan

> **For agentic workers:** Native implementation in this session. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the next daily puzzle visible during active play with a calm, live countdown that does not pressure players to finish the current puzzle before reset.

**Architecture:** Add one reusable SwiftUI countdown component driven by the server-provided `nextPuzzleTime` and `DailyReturnTiming`. Use a compact style in the active daily header and an expanded style in the existing result card so the timer and expiry behavior stay consistent.

**Tech Stack:** SwiftUI, `TimelineView`, existing `RebuzzleCore.DailyReturnTiming`, iOS 18.

**Spec:** `docs/superpowers/specs/2026-10-25-ios-design.md`; `docs/superpowers/specs/2026-10-26-native-daily-redesign.md`.

## Global Constraints

- Keep the current puzzle, three scored guesses, answer checking, and daily rollover server-authoritative.
- A countdown describes when a new daily arrives; it must not imply the current puzzle expires or require a solve before the timer ends.
- On expiry, offer an explicit refresh action instead of replacing an in-progress board automatically.
- Preserve Dynamic Type, VoiceOver labels, light/dark appearance, and existing reminder behavior.
- Do not add dependencies, analytics claims, or new tests for this UI slice.

## Review Focus

- Missing or malformed server deadline — keep the screen useful and show a quiet fallback.
- Deadline reaches zero during play — show that a fresh daily is ready and wait for the player to refresh.
- Accessibility text sizes — stack the header and keep the countdown label readable.
- Result screen — preserve the existing expanded countdown and reminder action without duplicate timers.
- Seconds change — use monospaced digits and a stable container to prevent layout jitter.

---

### Task 1: Create a shared countdown component

**Files:**
- Create: `apps/ios/Rebuzzle/Features/DailyPuzzleCountdown.swift`
- Modify: `apps/ios/Rebuzzle/Features/DailyReturnCard.swift`

- [x] Implement compact and expanded presentations backed by `DailyReturnTiming.deadline` and a one-second `TimelineView`.
- [x] Reuse the component in `DailyReturnCard`; preserve its reminder link and expired-deadline refresh action.

### Task 2: Put the next-daily cue into active play

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [x] Make the daily masthead more compact while keeping the “Make it click.” brand line and Eve avatar.
- [x] Show the formatted puzzle date and compact countdown while the current round is open; do not render a second timer after a result.
- [x] Keep the header adaptive for accessibility-size text.

### Task 3: Verify the integrated screen

- [x] Build the iOS app for the generic iOS Simulator target.
- [x] Run `git diff --check` and inspect the changed files for duplicate countdown behavior and accidental pressure copy.

## Execution Note

Automated simulator UI inspection is unavailable on the currently shared simulator session, which is displaying a separate Thorbis task. Do not change that session's app state; verify this slice by compilation and source-level state review.
