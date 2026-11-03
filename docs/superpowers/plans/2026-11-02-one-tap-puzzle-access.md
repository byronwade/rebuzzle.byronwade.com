# One-tap puzzle access — implementation plan

**Goal:** Keep the current daily puzzle one tap away while the player reads feedback lower in the conversation.
**Spec:** `docs/superpowers/specs/2026-11-02-one-tap-puzzle-access.md`

## Tasks

1. **Add the regression test first.** In the wrong-guess UI path, assert that the toolbar’s `viewPuzzleFromToolbar` action is reachable after Eve’s feedback, opens the existing “Study puzzle” screen, and returns to the same feedback and guess state. Run it before implementation and confirm the missing action fails.
2. **Wire the native toolbar action.** Reuse TodayView’s `study` state and current daily puzzle to present `PuzzleStudyView`. Give it a clear accessibility label; leave the help and keyboard toolbars intact.
3. **Verify.** Run the new focused UI test plus the existing study-preservation and accessibility-size coverage. Inspect the diff and report simulator versus physical-device evidence accurately.

## Review focus

- The active answer draft and prior guesses survive opening and closing the study view.
- The toolbar action and help action remain separately reachable at standard and accessibility text sizes.
