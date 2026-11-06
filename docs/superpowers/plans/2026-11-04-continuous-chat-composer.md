# Continuous Chat Composer Implementation Plan

> **For agentic workers:** Execute inline in the current isolated `feat/native-daily-redesign` worktree. Keep all existing staged, unstaged, and untracked work. Do not create another worktree.

**Goal:** Keep the next answer action in reach while the player reads the Daily or Practice conversation with Eve.

**Architecture:** Extract one reusable bottom composer and attach it to the existing `Page` scroll container with `safeAreaInset`. Extend `Page` with an optional near-bottom signal, then use stable guess IDs and `ScrollViewReader` to follow newly submitted guesses and stream updates only while the player remains near the latest turn.

**Tech Stack:** Swift 6, SwiftUI, iOS 18+, existing Rebuzzle `Theme`, `Page`, and `EveReplyStore`.

**Spec:** `docs/superpowers/specs/2026-11-04-continuous-chat-composer-design.md`

## Global Constraints

- Keep server scoring, attempt limits, hints, AI responses, and reward logic unchanged.
- Preserve keyboard dismissal/submit controls and existing haptics.
- Do not reveal the answer before the current result flow.
- Respect safe areas, Dynamic Type, VoiceOver, Reduce Motion, and light/dark appearance.
- Do not add or run automated tests; verify through Release simulator build and manual UI inspection.

## Review Focus

- During Eve streaming, a player reading older turns must not be yanked back to the latest turn.
- A newly submitted guess must still become visible even if the content grows before the scroll geometry callback updates.
- Daily request ambiguity must keep the reconciliation action visible and prevent another guess until state refreshes.
- Practice request errors must keep the draft intact so the player can retry without retyping.
- Accessibility text sizes and the keyboard must not cover the field, send action, error, or latest feedback.

---

### Task 1: Create the shared docked composer

**Files:**
- Create: `apps/ios/Rebuzzle/Features/GuessComposer.swift`
- Modify: `apps/ios/Rebuzzle/Design/Theme.swift`

**Interfaces:**
- `GuessComposer` consumes a `Binding<String>`, a `FocusState<Bool>.Binding`, field and submit accessibility identifiers, an optional error, submit enabled/loading state, an optional recovery action, and submit/recovery closures.
- `Page` gains an optional `onNearBottomChange: ((Bool) -> Void)?` initializer input. It reports whether `contentSize.height - visibleRect.maxY <= 72` points from its internal vertical scroll view's bottom.

- [x] Build the compact composer with the existing field, palette, primary action treatment, inline error, and optional recovery action.
- [x] At accessibility text sizes, stack the field and submit action while preserving the same reading order and labels.
- [x] Add the optional near-bottom geometry callback to `Page` with no behavior change when the callback is omitted.

### Task 2: Dock the Daily composer and follow the newest feedback

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- The composer binds to `model.draft` and `$answerFocused`, submits with `submitAnswer()`, and reuses the current `answerField` and `checkAnswer` identifiers.
- Daily reconciliation uses the existing `Refresh progress` action and `model.load()` path.

- [x] Remove the answer field and primary action from the scroll content; keep hint text and hint reveal controls there.
- [x] Attach `GuessComposer` to `Page` with a bottom safe-area inset while a daily round is active.
- [x] Keep the keyboard toolbar actions and disabled/submitting/session-reconciliation behavior.
- [x] Scroll to the bottom of the new turn when an attempt count increases; when Eve's latest reply changes, scroll only if the player is already near the bottom.
- [x] Preserve the current solved/exhausted result flow with no active composer.

### Task 3: Dock the Practice composer and preserve retry state

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/PracticeGameView.swift`

**Interfaces:**
- The composer binds to `answerDraft` and `$answerFocused`, submits with the existing async `submit()`, and reuses `practiceAnswerField` and `checkPracticeAnswer` identifiers.
- Stable scroll IDs use `practiceTurn-<attemptNumber>`.

- [x] Move the field, check action, and request error into the shared bottom composer; keep the practice conversation and hints in the scroll area.
- [x] Wrap the page with `ScrollViewReader` and report near-bottom state through `Page`.
- [x] Scroll to the new practice turn after submission; follow Eve's reply updates only while the player remains near the latest turn.
- [x] Keep the draft after request failure and remove the composer for solved or exhausted rounds.
- [x] Preserve the existing keyboard hide/submit toolbar and Reduce Motion behavior.

### Task 4: Verify the playable states

**Files:**
- No additional source files.

- [x] Regenerate the project and run a Release iOS Simulator build; expected output is `BUILD SUCCEEDED`.
- [ ] Inspect Daily and Practice at standard text size: dock at rest, dock above the open keyboard, submit, Eve pending/streaming, and server error/recovery.
- [ ] Scroll up during a streamed reply and confirm auto-follow pauses; return near the latest turn and confirm following resumes.
- [ ] Inspect accessibility text sizing and dark appearance; confirm field, action, error, and latest reply remain reachable.
- [ ] Confirm solved/exhausted states show the existing result or solution without an answer composer.

### Upload evidence — November 4, 2026

- Generic iOS Release archive succeeded for version 1.0.0, build 26; archive retained at `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (26).xcarchive`.
- App Store Connect upload succeeded. Apple's delivery receipt showed `PROCESSING` with no errors at completion; assignment to the existing Family TestFlight group remains unverified until processing finishes.

### Task 5: Preserve keyboard context between guesses

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [x] Remember whether the keyboard was open before submission; preserve that state after a non-terminal guess.
- [x] Dismiss focus after solve/reveal or when the session needs reconciliation.
- [x] Keep the keyboard toolbar's explicit Hide keyboard action unchanged.
- [ ] Manually verify a wrong guess keeps the keyboard available, Hide keyboard still closes it, and a terminal answer dismisses it.
