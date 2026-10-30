# Plus Journal Study Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Plus players revisit a saved daily puzzle clue-first with progressive hints and an explicit answer reveal, without changing the one-scored-puzzle-per-day loop.

**Architecture:** Persist the daily puzzle's ordered hints in the existing local `JournalEntry`, defaulting the new field when decoding old JSON. Present an ephemeral local study state in the existing Journal detail screen; no backend endpoint, new StoreKit product, or growth event is added.

**Tech Stack:** SwiftUI, Swift Codable, XCTest, XCUITest, existing StoreKitTest fixture.

**Spec:** `docs/superpowers/specs/2026-10-27-journal-study-mode-design.md`

## Global Constraints

- Historical study is Plus-only and does not create a second scored daily puzzle.
- Daily play, guesses, hints, explanations, sharing, and today's streak remain free.
- Study state is temporary; the local journal stores only the ordered source hints and the existing entry data.
- Decode older journal entries that lack `hints` as an empty list without dropping the entry.
- Do not send study interactions to the server or analytics.
- Preserve current Plus ownership, Restore, note editing, accessibility, and Reduce Motion behavior.

## Review Focus

- An old version-one journal payload with no `hints` key must still load — core decoding test.
- Empty or missing hints must not strand the player without an answer — UI test.
- The answer must not leak through labels or accessibility before explicit reveal — UI test.
- A study session must never submit a guess or change daily rewards — UI test plus source path inspection.
- Large Dynamic Type must keep the hint and reveal controls reachable — accessibility-size UI test.

---

### Task 1: Preserve source hints in local journal entries

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/Journal.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/JournalTests.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Test: `apps/ios/RebuzzleTests/RuntimeTests.swift`

**Interfaces:**
- `JournalEntry` adds `hints: [String]` with a default empty list in its initializer and a backwards-compatible decoder.
- `AppModel.recordCompletion()` copies `daily.puzzle.hints` into the entry after the authoritative daily result is complete.

- [x] Add a core test for decoding existing version-one entry JSON without `hints`; assert the puzzle identity, answer, note, and empty hint list survive.
- [x] Add a core test for encoding/decoding an entry with three ordered hints; assert exact ordering and content.
- [x] Run the core Journal tests and observe the missing-field decode failure before implementation.
- [x] Implement the optional-compatible persisted field and ordered capture in `recordCompletion()`.
- [x] Run the Journal core tests and relevant Runtime tests; verify old and current entries both round-trip.

### Task 2: Add the clue-first, unscored study experience

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JournalView.swift`
- Modify: `apps/ios/Rebuzzle/Features/PlusView.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`
- Modify: `docs/product/plus-journal-release.md`

**Interfaces:**
- `JournalDetail` owns ephemeral revealed-hint count and answer-revealed state.
- Journal rows omit the answer; selecting an entry navigates to the spoiler-free study view.
- Study UI uses the saved board and progressively reveals hints, then the original answer/explanation and existing note field.

- [x] Add UI tests for a real StoreKitTest Plus purchase, saved hint order, hidden answer/explanation, sequential hints, explicit solution reveal, and no scoring control or reward mutation.
- [x] Add an accessibility-size UI test for reachable 44-point study controls and the no-hints fallback path.
- [x] Run the new UI tests before implementation and confirm that the existing Journal exposed the answer in its row.
- [x] Implement the study controls in the existing SwiftUI navigation style; keep all copy explicit that study is unscored and does not affect today's streak.
- [x] Update Plus copy to describe available hints without overpromising for legacy entries; retain the device-local data disclosure.
- [x] Filter blank saved hints before display and numbering, and identify puzzle type in spoiler-free Journal rows.
- [x] Run the targeted UI, Plus/restore, note editing, and full native test suites; inspect standard and accessibility-size captures.

### Task 3: Release evidence and review

**Files:**
- Modify: `docs/product/plus-journal-release.md`

- [x] Record implementation and verification results, clearly stating that outcomes and paid conversion remain unmeasured.
- [x] Run `git diff --check` and inspect the complete scoped diff.
- [x] Obtain independent review of the full branch diff's scope and complete Journal feature diff; resolve the minor hint, row-label, and Plus-copy findings with regression coverage.
- [x] Document the unrelated `testTabNavigation` test-order failure and the focused rerun results before finalizing verification.
- [x] Commit and push the verified change to the existing native daily PR; do not create a replacement TestFlight link.
