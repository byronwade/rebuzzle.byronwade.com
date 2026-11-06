# Eve Hint Turns Implementation Plan

> **For agentic workers:** Implement inline in the current `feat/native-daily-redesign` worktree. Preserve all staged, unstaged, and untracked work.

**Goal:** Put every daily hint into Eve's transcript at the point it was revealed and restore that order when the player returns.

**Architecture:** Persist a compact account-and-puzzle-scoped record containing the revealed count and each hint's index/attempt boundary. Build one ordered transcript from confirmed guesses and hint positions, then use it during active play and the postgame debrief.

**Tech Stack:** Swift 6, SwiftUI, iOS 18+, existing `AppModel`, `LocalStore`, `GuessConversationView`, and Rebuzzle theme.

**Spec:** `docs/superpowers/specs/2026-11-04-eve-hint-turns-design.md`

## Global Constraints

- Keep authored hint copy sourced from `daily.puzzle.hints`; persist only hint index and attempt boundary.
- Preserve account and puzzle isolation through existing `LocalStore` key scoping.
- Keep hint availability, API payloads, scoring, XP, guesses, and answer privacy unchanged.
- Preserve the keyboard hide control and current focus behavior after non-terminal guesses.
- Do not add or run automated tests. Verify with an iOS Simulator build and available manual UI inspection.

## Review Focus

- A hint between two guesses must sort between those guesses, including after relaunch.
- Multiple hints at one attempt boundary must remain in hint-number order.
- Legacy count-only hints must remain visible after restored guesses without duplicating saved positions.
- Changing account or puzzle must not show another session's hint positions.
- VoiceOver and Dynamic Type must preserve readable, chronological hint content.

---

### Task 1: Persist hint positions with legacy migration

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`

**Interfaces:**
- Add `DailyHintReveal(hintIndex: Int, afterAttemptCount: Int)`, `Codable`, `Equatable`, and stable `Identifiable` by `hintIndex`.
- Add `DailyHintProgressRecord(revealedCount: Int, reveals: [DailyHintReveal])`, `Codable` and `Equatable`.
- Expose `AppModel.hintReveals: [DailyHintReveal]` for transcript rendering.
- Save the record at `hint-progress:<accountID>:<puzzleID>` and continue mirroring the legacy integer at `hints:<accountID>:<puzzleID>`.

- [x] On `revealHint()`, record the next hint index and the current confirmed attempt count; persist the new record.
- [x] On `restore()`, merge the server count, legacy integer, record count, and valid record indices; clamp to the puzzle's available hint count.
- [x] Preserve valid positions, clamp positions to restored attempts, and append missing/legacy indices after restored attempts in stable hint order.
- [x] Reset in-memory hint positions when the account or daily puzzle changes.

### Task 2: Render one chronological Eve conversation

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Extend `GuessConversationView` with `hintTexts: [String]` and `hintReveals: [DailyHintReveal]`.
- Build timeline rows with hints ordered at boundary `afterAttemptCount * 2` and guess N ordered at `(attemptNumber - 1) * 2 + 1`; tie-break hints by hint index.
- Add `EveHintTurn(hintIndex: Int, text: String)` with stable ID `hint-<index>` and a chronological VoiceOver label.

- [x] Pass puzzle hints and positions to the active conversation and postgame debrief.
- [x] Show the conversation when it contains either guesses or hints, including a Nudge before guess one.
- [x] Remove the separate hint list that currently follows the entire transcript.
- [x] Scroll to `hint-<index>` when a new hint is revealed; retain existing scrolling to newly submitted guesses.
- [x] Keep the hint bubble readable at accessibility text sizes and static/understandable with Reduce Motion.

### Task 3: Build and inspect the round flow

**Files:**
- No additional source files.

- [x] Build the Debug iOS Simulator target and confirm `BUILD SUCCEEDED`.
- [ ] Inspect the visible daily conversation and hint bubble in the iOS Simulator; inspect the console/screenshot for clipping or runtime errors.
- [x] Review ordering for pre-guess, between-guess, repeated-boundary, restored-legacy, and postgame states from the final implementation.
- [ ] Run `git diff --check` and review only the scoped source/doc changes without staging or reverting unrelated work.

