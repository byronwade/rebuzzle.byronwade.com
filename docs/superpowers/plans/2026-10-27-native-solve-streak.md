# Native Solve Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show players a warm, accurate daily-streak experience on completed puzzles and in Journey, using only server-owned streak values.

**Architecture:** Add a pure presentation model to RebuzzleCore for milestone selection and safe loading/error states. AppModel will explicitly track the `/api/user/stats` refresh associated with a completed puzzle, then one reusable SwiftUI card will render that presentation in the result and Journey screens.

**Tech Stack:** Swift 6, SwiftUI, Observation, RebuzzleCore, XCTest, Swift Testing.

**Spec:** `docs/superpowers/specs/2026-10-27-native-solve-streak-design.md`

## Global Constraints

- `PlayerStats.streak` and `PlayerStats.maxStreak` from `GET /api/user/stats` are the only streak source of truth.
- Do not compute daily continuity or streak protection on-device, and do not change backend streak rules.
- Do not add paid streak protection, XP, push warnings, guilt copy, or gameplay advantages.
- A result must hide old streak counts while its completion refresh is pending or failed; other screens may retain the last server stats.
- Preserve Dynamic Type, VoiceOver, light/dark themes, and Reduce Motion support.
- The native SwiftUI product under `apps/ios` is in scope; `apps/mobile` is not.

## Review Focus

- A failed post-completion stats request must not show stale counts on the result; test the failure state with pre-existing stats.
- A restored already-completed puzzle must refresh counts without replaying a milestone celebration; test the initial-load path.
- Missing or partial stats must not create a fake zero or fake best; test absent `streak` and `maxStreak` fields.
- Only a newly completed win that lands exactly on 3, 7, 14, or 30 celebrates; test each boundary and a held streak.
- An account or puzzle change must not apply an older request to the current result; test that a delayed prior-puzzle refresh is discarded.

---

### Task 1: Model streak presentation and milestone rules

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/DailyStreakPresentation.swift`
- Create: `apps/ios/Core/Tests/RebuzzleCoreTests/DailyStreakPresentationTests.swift`
- Read-only dependency: `apps/ios/Core/Sources/RebuzzleCore/Models.swift` (`PlayerStats`)

**Interfaces:**
- Produce `DailyStreakFreshness: Equatable, Sendable` with `.syncing`, `.fresh`, and `.unavailable`.
- Produce `DailyStreakMessage: Equatable, Sendable` with `.syncing`, `.unavailable`, `.firstStep`, `.solved`, `.held`, and `.milestone(Int)`.
- Produce `DailyStreakPresentation` with optional `current`, `best`, and `nextMilestone`, plus `message`.
- Expose `DailyStreakPresentation.result(wasSolved:stats:freshness:celebratesMilestone:)` and `.journey(stats:)` factories.
- Milestones are exactly 3, 7, 14, and 30. A 30-day count has no next milestone. Milestone copy is eligible only for a fresh result explicitly marked as a new completion.

- [x] **Step 1: Write failing Core tests** for missing/partial stats, zero-streak first-step, held streak, solved streak, 3/7/14/30 milestone boundaries, non-celebrating restored results, and no next milestone after 30.
- [x] **Step 2: Run** `swift test --package-path apps/ios/Core --filter DailyStreakPresentationTests`; expect compile/test failure because the presentation API does not exist.
- [x] **Step 3: Implement** the pure presentation value and factories in `DailyStreakPresentation.swift`; syncing/unavailable presentations contain no counts, missing current streak is unavailable, and best is exposed only when server data is valid.
- [x] **Step 4: Re-run** the focused Core test command; expect every new test to pass.

### Task 2: Make completed-result streak refresh explicit

**Files:**
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/RebuzzleTests/RuntimeTests.swift`

**Interfaces:**
- Add an internal completed-streak refresh state with `.idle`, `.refreshing(puzzleID:celebrates:)`, `.fresh(puzzleID:celebrates:)`, and `.failed(puzzleID:)` cases.
- Add an AppModel presentation accessor for a `GameSession`; it must use stats only when the matching puzzle state is `.fresh`, and hide counts while refreshing or failed.
- Use one stats-fetch helper for initial load and completion. A newly terminal guess marks refresh pending before applying the visible result; initial restoration refreshes without milestone eligibility.
- Preserve existing stats after a failed request for Journey, while recording the matching result as unavailable. Ignore responses after identity, generation, or puzzle changes.

- [x] **Step 1: Write failing runtime tests** for terminal-win freshness and milestone eligibility, post-completion stats failure with previously loaded values, restoration of a completed game without celebration, and discarding a delayed response for a prior puzzle.
- [x] **Step 2: Run** `xcodebuild -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" -derivedDataPath "$REBUZZLE_BUILD_ROOT/DerivedData" CODE_SIGN_IDENTITY=- -only-testing:RebuzzleTests/RuntimeTests test`; expect failure because AppModel exposes no completion refresh state.
- [x] **Step 3: Implement** the refresh state and helper in AppModel, resetting completion state when the daily puzzle or identity changes.
- [x] **Step 4: Re-run** focused runtime tests; expect the server-returned streak to become fresh only for the matching completion, stale values to remain hidden from that result on failure, and restored results not to celebrate again.
- [x] **Step 5: Cover account switching and retry** — the account-switch test first failed because the newly signed-in account received no stats request and its restored result remained syncing. Refresh stats after sign-in restores the puzzle, disable repeat milestone celebration, and refresh streak stats from Journey pull-to-refresh. Runtime tests verify the new account’s streak and recovery after a transient stats failure.

### Task 3: Add the reusable streak card to Result and Journey

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/Features/ProgressScreen.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Add `DailyStreakCard(presentation:context:)` in `JourneyRewards.swift`, with `.result` and `.journey` contexts.
- Place the result card immediately after the solved-result panel and before `JourneyRewards`; place the Journey card before the level summary so the daily loop is visible when Journey opens, sourcing it from `model.stats`.
- Use the pure presentation message for copy, show server current/best only when available, and show progress to the next milestone only when one remains.
- Keep the card static under Reduce Motion, scalable under Dynamic Type, and combined into a clear VoiceOver summary.

- [x] **Step 1: Add UI assertions** for result visibility, explicit milestone progress, result/reward order, Journey accessibility, and Journey/reward order; update fixture stats to include both `streak` and `maxStreak`.
- [x] **Step 2: Run focused UI tests** and observe failures for missing milestone copy and incorrect card order before applying those changes.
- [x] **Step 3: Implement** `DailyStreakCard(presentation:context:)` in `JourneyRewards.swift` with the Rebuzzle ink/reward palette, compact day-count motif, best record, non-pressuring copy, and accessible summary. Keep it static under Reduce Motion and adapt to Dynamic Type.
- [x] **Step 4: Integrate** the card before the XP card on the result and as the first progress card on Journey. The result passes the AppModel’s puzzle-scoped presentation; Journey uses the last server stats.
- [x] **Step 5: Run** `swift test --package-path apps/ios/Core` and the full simulator suite. Core passed 34/34; the iPhone 17 Pro simulator passed 72/72 (56 unit tests + 16 UI tests), including accessibility XXXL and StoreKit purchase/restore coverage. Latest result bundle: `/tmp/rebuzzle-streak/DerivedData/Logs/Test/Test-Rebuzzle-2026.10.27_03-58-28--0400.xcresult`.

## Completion Notes

- Keep the feature uncommitted in the current isolated worktree because it contains unrelated pre-existing user changes; do not stage or include those changes.
- Review the implementation against the six acceptance criteria in the design spec before reporting completion.
- Screenshot review confirmed the result card is fully visible before XP on the normal solve screen; Journey opens with the streak first, and the accessibility XXXL layout keeps the content scrollable.
- Independent code review found no critical issues. The initial account-switch finding was fixed and re-reviewed with no new material concerns.
