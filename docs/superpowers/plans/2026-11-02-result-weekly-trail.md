# Result Screen Weekly Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Show a trustworthy weekly trail milestone in the post-puzzle reward panel, based only on server progress that includes the finished puzzle.

**Architecture:** Add a pure freshness check to the Core snapshot model. Use it in `JourneyRewards` to show either a compact animated three-day trail or a syncing/unavailable status. Update the UI fixture to return a terminal entry for finished puzzles and test the stale-to-fresh transition.

**Tech Stack:** Swift, SwiftUI, Swift Package Manager, XCTest UI tests.

**Spec:** `docs/superpowers/specs/2026-11-02-result-weekly-trail-design.md`

## Global Constraints

- Server snapshots own weekly progress, XP, and reward state; the result view never awards XP locally.
- Fresh result progress requires a complete backfill and an exact recent puzzle ID/date match.
- Stale or unavailable snapshots never claim current progress or an earned reward.
- Keep existing Journey routing, weekly reward math, and paid access behavior unchanged. The result panel can show the same server-backed Journey progress to guest and member players.
- Respect Dynamic Type, VoiceOver, and Reduce Motion.

## Review Focus

1. A cached snapshot with today's date but no result row must not show current weekly progress; test the delayed post-solve refresh.
2. A row with the wrong puzzle ID or date must not qualify as fresh; test both mismatches in Core.
3. An incomplete backfill must never qualify as fresh; test it in Core.
4. An absent optional reward must not invent bonus copy; test the component/model path without a reward field.
5. Reduce Motion must skip the trail pop animation while preserving all progress and accessibility information; verify in implementation review and UI test configuration if practical.

---

### Task 1: Add a server-snapshot freshness predicate

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/JourneyProgressSnapshot.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/JourneyProgressSnapshotTests.swift`

**Interface:**
- Add `includesResult(forPuzzleID:puzzleDate:) -> Bool` to `JourneyProgressSnapshot`. It returns true only for a complete backfill, an `asOfPuzzleDate` on or after the result date, and an exact ID/date match in `recentEntries`.

- [x] Add `resultFreshnessRequiresTheExactCompletedPuzzleAndCompleteSnapshot` covering the matching row, older `asOfPuzzleDate`, wrong ID, wrong date, and incomplete backfill.
- [x] Run `swift test --package-path apps/ios/Core --filter JourneyProgressSnapshotTests`; confirm the new test fails because the predicate is missing.
- [x] Implement the predicate without changing decoding or server-owned reward rules.
- [x] Re-run the focused Core tests and confirm they pass.
- [x] Commit: `Add freshness check for result progress`.

### Task 2: Show the weekly trail in the result reward panel

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/JourneyRewards.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interface:**
- `JourneyRewards` renders a result trail only when `snapshot.includesResult(forPuzzleID:puzzleDate:)` is true. Otherwise, players see `resultWeeklyTrailStatus`; no stale count or reward is displayed.
- The fresh component exposes `resultWeeklyTrailProgress` as a combined accessibility element and uses `weeklyTrailReward` only when the server supplies it.

- [x] Extend `testWeeklyTrailPreviewAndEarnedBonusUpdateAfterTodaysPuzzle` to assert the result starts in the update state, does not show a stale earned reward, then shows the current 3/3 trail and +50 XP only after the delayed progress response includes today's entry.
- [x] Add fixture options for a delayed `/api/user/progress` response, an unavailable response, and an omitted optional reward; return a valid terminal `recentEntries` row only after the fixture game is complete.
- [x] Add offline recovery and missing-reward UI coverage; both avoid stale counts and invented bonus XP.
- [x] Run the focused UI tests and confirm they fail before the result trail exists and before the missing-reward copy is corrected.
- [x] Implement the compact progress/status views with the existing theme tokens and Reduce Motion handling.
- [x] Re-run the focused UI tests; delayed refresh, offline recovery, and the missing-reward state pass.
- [x] Commit: `Show weekly trail progress after a solve`.

### Task 3: Verify the focused feature and branch

**Files:** all files in Tasks 1–2.

- [x] Run `swift test --package-path apps/ios/Core` (72 tests passed).
- [x] Run the focused native weekly trail UI tests on an iPhone 17 Pro simulator (3 tests passed).
- [x] Run `git diff --check` and review the full diff for stale-reward claims, accessibility, and unintended XP changes.
- [ ] Commit the reviewed change and push the verified branch to PR #219.
