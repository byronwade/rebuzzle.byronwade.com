# Private Daily Thought Scratchpad Plan

> **For agentic workers:** Use `superpowers:executing-plans` and complete this plan task by task.

**Goal:** Help players return to a difficult daily puzzle with their own reasoning intact.

**Design:** Add a secondary “Save a thought” action to the active daily solve, after the attempt/conversation content and before the progressive hint control. It opens a small editor sheet, closed by default. The note is saved locally by account ID and puzzle ID, restored while that puzzle is still active, and cleared when that puzzle is completed or expires. The note is never sent to the API, Eve, guesses, analytics, or sharing.

**Tech:** SwiftUI, `AppModel`, `LocalStore`, XCTest, XCUITest.

## Requirements

- The note editor is available only while the official daily is active and unsolved.
- The editor is separate from the answer draft and cannot submit or change guesses, hints, score, streak, or rewards.
- Notes are private to the current account and puzzle on this device. Account deletion removes them through the existing account-scoped `LocalStore` directory.
- Reopening the editor restores the saved note. A new account or puzzle never sees another note.
- Completing or expiring a puzzle clears its scratchpad. The next daily starts empty.
- The editor is accessible at Dynamic Type sizes and has an explicit keyboard-dismiss action.
- No new analytics event, network payload, Plus gate, reminder, or AI call is introduced.

## Tasks

### Task 1: Add isolated local persistence and lifecycle handling

1. Add failing `RuntimeTests` for per-account/per-puzzle persistence and account deletion.
2. Run the targeted tests and confirm they fail because daily-thought storage is absent.
3. Add `LocalStore` helpers and an `AppModel` property/save/load/clear path, scoped by `player.id` and `daily.puzzle.id`.
4. Load after session restoration; clear on confirmed completion, reveal, or puzzle rollover.
5. Run the focused runtime tests.

### Task 2: Add the unobtrusive in-progress editor

1. Add a labeled, accessible action after attempts/Eve feedback and before progressive hints.
2. Present a focused sheet with concise privacy copy, a bounded text editor, automatic local save, and a keyboard Done action.
3. Keep the sheet optional and separate from answer submission and the Plus journal.
4. Add a UI test that saves a thought, closes and reopens the sheet, and confirms the answer draft and attempt count are unchanged.

### Task 3: Verify product behavior and review

1. Run storage/AppModel tests, the focused gameplay UI test, and relevant keyboard/Dynamic Type tests.
2. Inspect standard and accessibility-size screenshots.
3. Run the iOS Core suite, focused app/UI suites, Release simulator build, and `git diff --check`.
4. Request independent review, resolve findings, and commit the finished change.

## Acceptance checks

- A player can record a private thought without opening a guess or sending anything to Eve.
- The same account can reopen the note for the same active puzzle after leaving the sheet or relaunching the app.
- Other accounts, other puzzle dates, completed puzzles, and expired puzzles cannot see that note.
- Controls remain readable and dismissible with the software keyboard open and at accessibility text sizes.
- Tests prove the relevant storage boundaries and gameplay state remains unchanged.
