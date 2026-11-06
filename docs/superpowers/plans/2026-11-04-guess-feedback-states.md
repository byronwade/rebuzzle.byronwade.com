# Guess Feedback States Implementation Plan

> **For agentic workers:** Execute inline in the existing isolated `feat/native-daily-redesign` worktree. This is a small single-file task; do not create another worktree.

**Goal:** Make each submitted guess outcome immediately legible in the attempt rail and in a playful, chat-style response while keeping the next guess obvious.

**Architecture:** Define one local presentation mapping for the server’s reaction tiers and reuse it in the attempt markers and Eve feedback card. Keep server scoring, guess count, copy, and haptics unchanged.

**Tech Stack:** SwiftUI, existing `Theme` colors and SF Symbols.

**Spec:** `docs/product/native-daily-game-design.md` — fairness, one clear daily game, and rewarding feedback without punishment.

## Global Constraints

- The active guess stays visually distinct in `Theme.accent`.
- `correct` uses the existing success color; `close` and `warm` use distinct restrained treatments; `cold`, `out`, and unknown tiers remain calm and non-punitive.
- Keep text labels so status never depends on color or icon alone.
- Do not reveal the answer before the existing result flow.
- Preserve Dynamic Type layout, existing keyboard behavior, and current haptics.
- Do not add or run automated tests in this task; verify with a Release/Debug build and visual inspection.

## Review Focus

- Missing or future server tiers remain readable and neutral.
- A final failed attempt is described as a reveal, not a penalty.
- VoiceOver can distinguish submitted outcomes from the active and unused guesses.
- Accessibility text sizes retain the same reading order and visible next action.

---

### Task 1: Connect attempt markers and Eve replies to reaction tiers

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Consumes `Guess.reaction?.tier` (`correct`, `close`, `warm`, `cold`, `out`) and the existing `Theme` palette.
- Produces one private presentation mapping used by both `attemptHeader` and `GuessTurnView`.

- [x] Add a private tier presentation with symbol, tint, and accessible label; unknown values fall back to neutral.
- [x] Use that presentation for submitted attempt markers while retaining the numbered blue active step and neutral unused steps.
- [x] Present the tier as a compact verdict chip, then separate the server nudge from Eve’s reply bubble.
- [x] Give each marker an accessible label for its submitted outcome, next-guess state, or unused state.
- [x] Add a restrained new-turn entrance and honor Reduce Motion.
- [ ] Recheck the revised verdict chip at accessibility text sizes.

### Task 2: Give each feedback tier a distinct, encouraging voice

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/Design/Theme.swift`

- [x] Replace repeated generic advice headlines with short tier labels such as “CHILLY,” “WARMING UP,” and “SO CLOSE.”
- [x] Give the cold tier a low-key icy tint while keeping it non-punitive and readable without color.
- [x] Keep answer evaluation, server-authored reaction copy, Eve’s response, and attempt limits unchanged.
- [x] Build the final source in Debug Simulator; the standard-size two-guess conversation was visually reviewed before the final copy/tint adjustment.
- [ ] Finish a Release Simulator build; Xcode stalled in project-file type detection for the existing `Rebuzzle.storekit` reference before compilation.
- [ ] Capture a standard-size screenshot after the final copy/tint adjustment and recheck accessibility text sizes.

## Execution Ledger

No automated tests will be added or run because the higher-priority session instruction forbids running tests unless requested. The build and simulator review are the verification evidence for this UI-only slice.

## Execution Ledger

- Implemented in `apps/ios/Rebuzzle/Features/TodayView.swift`; `git diff --check` passed for the file.
- Debug simulator build succeeded from `/private/tmp`; standard gameplay screenshot `/private/tmp/rebuzzle-feedback-warm-later.png` shows the warm marker aligned with Eve’s matching feedback.
- Accessibility-size screenshot `/private/tmp/rebuzzle-feedback-accessibility.png` confirms enlarged layout and scrolling. The markers are below the initial viewport in this capture.
- Independent review found no issues. Release build 25 compiled this file and was uploaded to TestFlight on 2026-11-04; Apple reports it is processing.
- No automated tests were run.
- Follow-up polish: feedback now uses compact tier chips, distinct nudge and Eve reply treatments, and a Reduce Motion-aware turn entrance. `Theme.chill` colors the cold tier. The final Debug Simulator build succeeded. The previous Release iteration built, but the final Release attempt stalled in Xcode project-file type detection for `Rebuzzle.storekit` before Swift compilation and was interrupted. The conversation layout was visually inspected before the final copy/tint adjustment; final screenshot and accessibility-size recheck remain open. No automated tests were run.
