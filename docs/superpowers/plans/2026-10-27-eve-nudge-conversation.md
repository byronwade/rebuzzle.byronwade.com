# Eve’s Spoiler-Safe Nudge Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the daily puzzle’s authored hint ladder into the Eve conversation so players can ask for a useful, answer-safe nudge and resume the same clue sequence later.

**Architecture:** Add a small, pure Core timeline model that merges confirmed guesses and locally persisted nudge reveals. AppModel owns account-and-puzzle-scoped nudge positions and reconciles them with the existing server/local hint count. TodayView renders the timeline with a quiet nudge action; scoring, the quip endpoint, and hint content remain unchanged.

**Tech Stack:** Swift 6, SwiftUI, Swift Package Manager, XCTest/Testing, XCUITest.

**Spec:** `docs/superpowers/specs/2026-10-27-eve-nudge-conversation-design.md`

## Global Constraints

- Keep one daily puzzle as the primary play surface, with the existing three scored guesses and free score-locked continuation.
- Each activation reveals exactly the next prewritten puzzle hint, in its existing order, as an Eve message in the conversation. It does not call the AI service.
- Place the nudge in the transcript after the number of guesses already submitted when the player requested it. Multiple nudges at the same point remain in authored order.
- Restore already-revealed nudges with the conversation after app relaunch. Keep the existing account-and-puzzle-scoped hint count; save transcript placement locally with the same scope. When a previous build has a hint count but no placement history, show those known hints after the restored guesses rather than losing them.
- Hide the action when no authored hints remain and never show hint text before the player requests it.
- Preserve guess text, drafts, keyboard dismissal, session restoration, server scoring, streaks, and the current result/reveal rules.
- The current AI quip stays optional, answer-blind, and best-effort. Hints do not wait for AI or change how a guess is scored.
- Keep hints and all daily gameplay free. Do not add a model call, StoreKit gate, new dependency, or external telemetry event for this slice.
- Use the existing Rebuzzle art, colors, type, navigation, and board geometry. Apply platform-native controls, 44-point targets, Dynamic Type, and reduced-motion behavior.
- Do not claim improved retention, enjoyment, conversion, or profit without production-cohort evidence.
- Preserve the mixed dirty worktree; do not commit, push, submit, or upload a build as part of this implementation.

## Review Focus

- Empty, duplicate, negative, or out-of-range local nudge records must not show a hint twice, skip the next hint, or crash — Task 1 timeline normalization test.
- Restored attempt count must clamp transcript placement without changing the authored hint index — Task 1 ordering test.
- Existing hint counts from a previous build must display all already-seen hints and continue with the next one — Task 2 legacy-reconciliation test.
- Account or puzzle changes must never load another transcript — Task 2 account-and-puzzle storage test.
- A nudge before the first guess, between guesses, or during score-locked continuation must not reveal the answer or change scoring — Task 3 gameplay UI tests.
- Missing/empty hints, terminal results, keyboard focus, accessibility text size, and unavailable AI must keep the remaining screen usable — Task 3 UI tests and existing quip/keyboard regressions.
- Storage write failure must keep the current puzzle and newly revealed clue usable in memory while showing the existing storage warning — Task 2 storage-failure test.

---

### Task 1: Model deterministic nudge chronology in Core

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/DailyNudgeTimeline.swift`
- Create: `apps/ios/Core/Tests/RebuzzleCoreTests/DailyNudgeTimelineTests.swift`

**Interfaces:**
- `DailyNudgeReveal`: `Codable`, `Sendable`, `Equatable`, with `hintIndex: Int`, `afterAttemptCount: Int`, and stable `id: Int` derived from `hintIndex`.
- `DailyConversationEntry`: `Sendable`, `Identifiable`, with `.guess(Guess)` and `.nudge(DailyNudgeReveal)` cases and collision-free string IDs.
- `DailyConversationTimeline.reconcile(_:revealedHintCount:attemptCount:) -> [DailyNudgeReveal]`: retain the first valid record for each revealed hint index, clamp its position to the current attempt count, and append missing legacy indices after the restored guesses.
- `DailyConversationTimeline.entries(attempts:reveals:) -> [DailyConversationEntry]`: sort attempts by attempt number, then place each nudge after its recorded count of accepted attempts; nudges at the same point sort by hint index.

- [x] Add failing tests for guess/nudge ordering, multiple nudges between the same guesses, and legacy state with missing timeline records.
- [x] Add failing tests for duplicate, negative, and out-of-range indices/positions and zero hints.
- [x] Run `swift test --package-path apps/ios/Core --filter DailyNudgeTimelineTests` and confirm the new API is missing.
- [x] Implement the two value types and deterministic reconcile/merge functions in `DailyNudgeTimeline.swift`.
- [x] Run the focused test file and the full Core package suite.

### Task 2: Persist nudge positions with the existing hint state

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Test: `apps/ios/RebuzzleTests/RuntimeTests.swift`

**Interfaces:**
- AppModel exposes `private(set) var nudgeReveals: [DailyNudgeReveal]` for TodayView.
- Local key format: `nudge-turns:<accountID>:<puzzleID>`, matching the existing `hints:<accountID>:<puzzleID>` isolation.
- `revealHint()` records the current revealed hint index and current accepted-attempt count, then saves both the count and timeline.
- `restore()` loads the scoped timeline, reconciles it against `max(server hintsUsed, local hint count)` capped by `daily.puzzle.hints.count`, and preserves legacy count-only progress.
- A new account or daily puzzle resets the in-memory timeline before restoration; no server/API contract changes are made.

- [x] Add AppModel tests for reveal order before/after a submitted guess, relaunch restore, legacy count-only progress, account/puzzle isolation, storage-write failure, and authored-hint-count clamping. The first focused build failed at the missing `AppModel.nudgeReveals` API, as expected before implementation.
- [x] Run the focused RuntimeTests filter and confirm the timeline API is unavailable before implementation.
- [x] Implement scoped persistence and restoration through `DailyConversationTimeline.reconcile`.
- [x] Run the focused RuntimeTests and account/session restore regressions (5 passed on iPhone 17 simulator).

### Task 3: Render nudges as Eve messages in the daily conversation

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- `TodayView.conversation` renders `DailyConversationTimeline.entries` using existing `GuessTurnView` plus an `EveNudgeTurnView` that reads hint text from `daily.puzzle.hints[hintIndex]`.
- Add `askEveForNudge` as a secondary, 44-point action at the end of the conversation. It reveals one next hint, shows the remaining count only while hints remain, and is absent from terminal results.
- Remove the separate static hint block and old “A little nudge” row so each revealed hint appears once in its chat position.
- Keep hint delivery local and immediate; no AI request, network request, answer, or explanation enters the message.
- Provide VoiceOver text for the nudge number/content and preserve focus, Dynamic Type, and reduced-motion behavior.

- [x] Add UI coverage for hidden hints before activation, one-at-a-time hint reveal, sequence order before/after a guess, no duplicate static hint block, no action when hints are empty/exhausted or after a terminal result, and no answer disclosure.
- [x] Add UI coverage for a nudge during score-locked continuation and for unavailable Eve service.
- [x] Add accessibility-size and keyboard-focused UI checks for a reachable nudge control and preserved keyboard dismissal.
- [x] Run the focused UI tests and observe the chat-style nudge state. The first run exposed a scroll/focus race; after scrolling to the answer section, the Eve UI regressions passed.
- [x] Implement the timeline views and nudge control in TodayView without changing puzzle scoring or StoreKit behavior.
- [x] Run the focused gameplay tests, existing keyboard dismissal tests, existing Eve failure test, and DailyResult/share regressions (10 selected UI tests passed on iPhone 16 Pro / iOS 18.2).
- [x] Visually inspect the final standard daily screen in the iPhone simulator.
- [x] Visually inspect the accessibility-size daily screen in the iPhone simulator; the nudge copy, preserved answer draft, and answer controls remain visible at XXXL.

### Task 4: Verify the integrated daily experience

**Files:**
- Review: `apps/ios/Core/Sources/RebuzzleCore/DailyNudgeTimeline.swift`
- Review: `apps/ios/Rebuzzle/App/AppModel.swift`
- Review: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Review: `apps/ios/Core/Tests/RebuzzleCoreTests/DailyNudgeTimelineTests.swift`
- Review: `apps/ios/RebuzzleTests/RuntimeTests.swift`
- Review: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

- [x] Run the full Core package suite and compile the AppModel/runtime/gameplay UI test bundles.
- [x] Execute the focused AppModel RuntimeTests on an iPhone simulator (5 passed).
- [x] Execute the focused gameplay UI regressions on an iPhone simulator (10 passed, 0 failed on iPhone 16 Pro / iOS 18.2).
- [x] Build the iOS Release simulator configuration.
- [x] Verify nudge reveal is local and does not call `/api/puzzles/quip`; this slice does not touch scoring or StoreKit gates.
- [x] Run `git diff --check` and inspect only the files owned by this plan; preserve unrelated user changes.
- [x] Record test/build evidence and remaining physical-device checks. Do not report product-outcome lift from simulator evidence.
