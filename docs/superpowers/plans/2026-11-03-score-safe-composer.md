# Score-safe composer status implementation plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the official score-lock state visible beside the answer field after a player continues solving.

**Architecture:** Reuse `continuedScoreLockedPuzzleID`, `model.game.scoreLocked`, and the existing pinned `answerComposer`. Add one small status line without changing game state or scoring.

**Tech Stack:** SwiftUI, XCTest UI tests, existing `Theme` and `GameplayUITests` fixture.

**Spec:** `docs/superpowers/specs/2026-11-03-score-safe-composer-design.md`

## Global Constraints

- Keep current score, hint, streak, and late-solve behavior unchanged.
- Show the status only for the same score-locked puzzle after the player taps “Keep solving.”
- Preserve the pinned composer, keyboard dismissal, Eve nudge, and field accessibility labels.
- Use existing theme typography and colors; add no motion, haptic, dependency, or persistent state.
- Apply Thorbis D-025 and HIG-008, HIG-009, HIG-015, HIG-021 as documented in the spec.

## Review Focus

1. Normal scored guesses must not show the status.
2. Before the player chooses “Keep solving,” the decision card must remain the only score-lock UI.
3. A status for an older puzzle must not survive puzzle rollover.
4. The status must remain reachable with the keyboard and at Accessibility XXXL.
5. A late solve must still replace the composer with the existing result.

---

### Task 1: Make score safety visible in open solve

**Files:**
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift` (`testScoreLockedDailyOffersContinueWithoutRevealingAnswer`)
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift` (`answerComposer`)

**Interfaces:**
- Consumes: `model.game.scoreLocked`, `model.game.puzzleId`, and `continuedScoreLockedPuzzleID`.
- Produces: `continuedSolveStatus` in the pinned composer while the same score-locked game remains open.

- [x] Add a UI assertion that `continuedSolveStatus` is absent before “Keep solving,” then visible after the action; assert it remains hittable with the keyboard open.
- [x] Run the focused UI test and confirm it fails because the status is not present.
- [x] Add a secondary-style `HStack` with a decorative clock symbol and status `Text` above the composer row only when the current game is score-locked and its ID equals `continuedScoreLockedPuzzleID`; add `accessibilityIdentifier("continuedSolveStatus")` to the text.
- [x] Verify the focused UI test passes, including the existing late-solve result assertions.
- [x] Add a separate Accessibility XXXL UI case and verify status wrapping and keyboard reachability.
- [ ] Run the iOS UI suite and simulator build; record exact results.
- [ ] Review the diff, run `git diff --check`, commit, and push to PR #219.
