# Weekly Trail Reward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Make the existing three-day Weekly Trail deliver a repeatable, server-authoritative 50 XP reward while counting every valid terminal daily finish.

**Architecture:** The `/api/user/progress` route derives weekly awards from unique daily-progress puzzle dates, adds each earned award to lifetime XP, and returns a current-week reward object. The Swift model decodes that object and extended-play entries compatibly; the native Journey card presents the offer and earned reward.

**Tech Stack:** Next.js route handlers, TypeScript, Jest, MongoDB projections; Swift Package Manager, SwiftUI, XCTest.

**Spec:** `docs/superpowers/specs/2026-10-29-weekly-trail-reward-design.md`

## Global Constraints

- Weeks follow the player’s stable Journey time zone and run Monday through Sunday.
- Three distinct official daily puzzle dates earn 50 XP for that calendar week.
- Valid solves and completed failures count; archives and practice do not.
- The server owns XP, levels, weekly completion, and reward state.
- Incomplete backfill exposes no partial summary or weekly reward.
- The weekly reward stays free and does not alter the existing Plus product.
- New iOS payload fields remain optional when reading an older server response.

## Review Focus

1. Duplicate projections or repeated requests must count one puzzle date and one weekly reward; pin with a duplicate-date route test.
2. Extended solves or revealed failures after three guesses must count when marked `playMode: "extended"`; pin with server and Swift decoding tests, and reject the same attempt counts in normal mode.
3. A current week with two completions must offer the reward without marking it earned; pin in the API and UI tests.
4. Stable local puzzle dates around Monday boundaries must group into the right historical week; pin with a route test that has a qualifying prior week and a 2-day current week.
5. Older payloads without the new reward/play-mode fields still decode, and incomplete backfills still withhold reward state; pin with Core and route tests.

---

### Task 1: Count valid terminal finishes and derive weekly XP on the server

**Files:**
- Modify: `apps/web/src/app/api/user/progress/route.ts`
- Test: `apps/web/src/app/api/user/progress/__tests__/route.test.ts`

**Interfaces:**
- The route continues returning `summary.completedThisWeek` and `summary.totalXP`.
- Add top-level `weeklyTrailReward: { weekStart: string; bonusXP: 50; earned: boolean } | null`.
- Include `playMode: "extended"` in a response entry only when its stored DailyProgress row is extended.

- [ ] **Step 1: Add failing route tests**

Add tests that prove:
- Three unique finished puzzle dates in one week earn 50 XP, and duplicate rows for one date do not add another finish or another reward.
- Each qualifying historical week contributes one 50 XP bonus to `summary.totalXP`; a current two-day week returns `earned: false` and the next week has no earned reward.
- Solved or failed extended-mode rows with more than three attempts count as finishes; the same attempt count without the extended marker remains invalid.
- An incomplete backfill returns `weeklyTrailReward: null` and no partial summary.

- [ ] **Step 2: Run the route test and confirm the new assertions fail for the missing behavior**

Run: `pnpm --dir apps/web exec jest src/app/api/user/progress/__tests__/route.test.ts --runInBand`

Expected: existing route tests pass; new assertions fail because extended rows are excluded and the weekly reward is absent.

- [ ] **Step 3: Implement server-owned weekly aggregation**

In `route.ts`, accept attempts beyond three only when the row is marked `playMode: "extended"`; keep ordinary solved attempts limited to 1–3 and ordinary failed attempts at exactly 3. Group the deduplicated `allEntries` by `weekBounds(entry.puzzleDate).start`, award 50 XP once to each group with at least three distinct dates, and include the current week’s `weekStart`, `bonusXP`, and `earned` state. Return a null reward when backfill is incomplete.

- [ ] **Step 4: Re-run the route test and confirm all assertions pass**

Run: `pnpm --dir apps/web exec jest src/app/api/user/progress/__tests__/route.test.ts --runInBand`

Expected: all route tests pass, including existing backfill, timezone, and authorization coverage.

- [ ] **Step 5: Commit the server behavior**

Run: `git add apps/web/src/app/api/user/progress/route.ts apps/web/src/app/api/user/progress/__tests__/route.test.ts && git commit -m 'feat: award weekly trail XP'`

Expected: one commit contains the server aggregation and its regression tests.

---

### Task 2: Decode the expanded Journey contract in Core

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/JourneyProgressSnapshot.swift`
- Modify: `apps/ios/Core/Sources/RebuzzleCore/JourneyProgress.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/JourneyProgressTests.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/JourneyProgressSnapshotTests.swift`

**Interfaces:**
- Add `JourneyWeeklyTrailReward` with `weekStart: String`, `bonusXP: Int`, and `earned: Bool`.
- Add optional `JourneyProgressSnapshot.weeklyTrailReward`; when present, its week start must match `currentWeekStart` and its bonus must be 50.
- Add optional `JourneyProgressPlayMode.extended` to `JourneyProgressEntry`.

- [ ] **Step 1: Add failing Core tests**

Prove that a current-week reward decodes, a mismatched `weekStart` or non-50 XP amount is rejected, extended terminal entries with more than three attempts decode, normal-mode attempts over three are rejected, and older snapshots without either new field still decode.

- [ ] **Step 2: Run Core tests and confirm the new contract cases fail**

Run: `swift test --package-path apps/ios/Core`

Expected: existing Core tests pass; the new reward and extended-entry tests fail until the model accepts those fields.

- [ ] **Step 3: Add the compatible reward and play-mode models**

Decode both new fields with `decodeIfPresent`. Validate the weekly reward against the snapshot’s server week start. For entries, allow 1–3 attempts for ordinary solves, exactly three for ordinary failures, and positive attempt counts for `extended` solves or failures.

- [ ] **Step 4: Re-run the Core suite**

Run: `swift test --package-path apps/ios/Core`

Expected: the complete Core suite passes, including legacy payload compatibility.

- [ ] **Step 5: Commit the Core contract**

Run: `git add apps/ios/Core/Sources/RebuzzleCore/JourneyProgressSnapshot.swift apps/ios/Core/Sources/RebuzzleCore/JourneyProgress.swift apps/ios/Core/Tests/RebuzzleCoreTests/JourneyProgressTests.swift apps/ios/Core/Tests/RebuzzleCoreTests/JourneyProgressSnapshotTests.swift && git commit -m 'feat: decode weekly trail rewards'`

Expected: one commit contains the compatible Journey contract and Core tests.

---

### Task 3: Present and verify the free weekly reward in Journey

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/ProgressScreen.swift`
- Modify: `apps/ios/Rebuzzle/App/PreviewData.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- UI reads the current reward from `model.journeySnapshot?.weeklyTrailReward`; it does not award XP locally.
- Add the UI fixture argument `--ui-journey-days-2` to start with two previously completed days and 50 baseline XP.

- [ ] **Step 1: Add a failing UI test for the 2/3-to-3/3 journey**

Launch with `--ui-journey-days-2`, verify the 2/3 offer says “Finish 3 puzzle days this week to earn +50 XP.”, complete today’s puzzle, open Journey, and verify 3/3, “+50 XP earned this week”, and 250 total XP.

- [ ] **Step 2: Build the app and run the focused UI test to confirm the reward assertion fails**

Run: `xcodebuild -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/RebuzzleDerivedData -only-testing:RebuzzleUITests/GameplayUITests/testWeeklyTrailRewardIsEarnedOnTheThirdFinishedDay test`

Expected: the fixture and app launch; the reward offer/assertion fails before implementation.

- [ ] **Step 3: Add reward presentation and the two-day fixture**

In `ProgressScreen.swift`, show the 50 XP offer before completion and the earned state at 3/3, using the server object and the existing Journey card style. Include reward state in the card’s accessibility label. In `PreviewData.swift`, make the new fixture start at 2/3 with 50 XP, then add today’s server-computed puzzle XP and 50 weekly XP only after the third distinct finish.

- [ ] **Step 4: Run the focused UI test**

Use the same `xcodebuild ... -only-testing:RebuzzleUITests/GameplayUITests/testWeeklyTrailRewardIsEarnedOnTheThirdFinishedDay test` command.

Expected: the test passes and the Journey card shows the same server-derived XP as the summary.

- [ ] **Step 5: Commit the native experience**

Run: `git add apps/ios/Rebuzzle/Features/ProgressScreen.swift apps/ios/Rebuzzle/App/PreviewData.swift apps/ios/RebuzzleUITests/GameplayUITests.swift && git commit -m 'feat: celebrate weekly trail completion'`

Expected: one commit contains the reward presentation and its native regression test.

---

### Task 4: Verify the feature across project checks

**Files:** all files above.

- [ ] Run `pnpm --dir apps/web exec jest src/app/api/user/progress/__tests__/route.test.ts --runInBand`.
- [ ] Run `pnpm --dir apps/web typecheck`.
- [ ] Run `swift test --package-path apps/ios/Core`.
- [ ] Run the focused native UI test from Task 3, then the full native suite if the simulator runner completes.
- [ ] Run `git diff --check` and review the entire diff for compatibility, unintended paid gates, and consistent XP calculations.
- [ ] Commit the feature on `feat/weekly-trail-reward`; integrate it into the existing PR branch only after all available checks pass.
