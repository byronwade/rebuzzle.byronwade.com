# Daily Puzzle Feedback by Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show voluntary native-app daily quality ratings beside all-platform puzzle outcomes by local puzzle date.

**Architecture:** Extend the existing admin-only daily quality aggregate with a bounded aggregate of `daily_quality_feedback`, grouped by server-derived `dayKey`, then merge date-only counts into active puzzle dates. Add a separate accessible ratings table to the existing admin card and document its sample limitations in the product scorecard.

**Tech Stack:** TypeScript, MongoDB aggregation pipelines, Next.js, React, Jest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-28-native-daily-quality-feedback-design.md`

## Global Constraints

- Ratings are optional, self-selected native-app responses and a different sample from all-platform gameplay counts.
- Return date-level aggregates only; do not return account IDs, raw feedback events, answers, guesses, notes, or device identifiers.
- Use the same one-day local `dayKey` buffer as gameplay and the existing `occurredAt` index; make its UTC time bounds wide enough to cover those full local dates. Add no index, migration, telemetry, or player prompt.
- Include the result's server-provided puzzle date in the existing rating request only for server validation; do not persist a new event field or trust a client-owned `dayKey`.
- Preserve admin authorization and `Cache-Control: private, no-store`.
- Add no production deployment, database migration, or TestFlight upload.
- Keep Rebuzzle's visual identity; use only applicable Thorbis interaction guidance.

## Review Focus

- UTC boundary versus local puzzle date — assert `dayKey` uses the same date buffer as attempts and `occurredAt` spans the complete UTC interval of those local dates.
- Stale result after rollover — hide the rating control when the result no longer matches the active daily response or has passed its server-provided deadline, and reject mismatched dates at the API.
- Active puzzle date without feedback — return all rating buckets and total as zero.
- Date with feedback but no active gameplay row — do not create a ratings-only date row.
- Ratings and gameplay samples have different populations — render separate sections, labels, caveat, and independent empty state.

---

### Task 1: Aggregate Daily Ratings by Puzzle Date

**Files:**
- Modify: `apps/web/src/db/analytics-ops.ts`
- Test: `apps/web/src/db/__tests__/analytics-ops.test.ts`

**Interfaces:**
- Consumes: existing `nativeGrowthEventOps.getDailyPuzzleQuality(start: Date, end: Date)` and `NativeGrowthQualityRating` event variants.
- Produces: `DailyPuzzleQualitySummary.nativeRatings: { total: number; too_easy: number; just_right: number; tough_but_fair: number; unclear: number }`; each active puzzle date includes zero-filled counts if no rating rows exist.

- [x] **Step 1: Write failing tests** for joining rating counts by `dayKey`, zero-filling dates with no ratings, excluding feedback-only dates, applying the one-day date-key buffer and timezone-safe UTC time bounds, counting all four rating values, and returning only date/count aggregates.
- [x] **Step 2: Run the focused DB test and verify the new assertions fail** because `nativeRatings` is not yet returned.

  Run: `pnpm --dir apps/web test -- --runInBand src/db/__tests__/analytics-ops.test.ts`

  Expected: FAIL on the missing `nativeRatings` contract; existing daily-play-pattern assertions remain valid.
- [x] **Step 3: Implement the bounded rating aggregate and merge** in `analytics-ops.ts`. Query `nativeGrowthEvents` for `eventType: "daily_quality_feedback"`, group by `dayKey`, sum each closed rating plus total, project only date/count values, and merge counts onto the existing latest 30 active attempt dates. Bound the indexed `occurredAt` prefilter to the full UTC interval covering the buffered local date keys. Do not create a new date row for ratings without attempts.
- [x] **Step 4: Run the focused DB test and verify all assertions pass.**

  Run: `pnpm --dir apps/web test -- --runInBand src/db/__tests__/analytics-ops.test.ts`

  Expected: PASS; results contain only active puzzle dates and aggregate rating counts, including zeros.

### Task 2: Present Ratings Separately in the Admin Dashboard

**Files:**
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Test: `apps/web/src/components/admin/tabs/__tests__/native-growth-card.test.ts`
- Test: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`
- Modify: `docs/product/native-growth-scorecard.md`

**Interfaces:**
- Consumes: `DailyPuzzleQualitySummary.nativeRatings` from Task 1.
- Produces: a keyboard-scrollable “Player ratings by puzzle date” table with response total and all four rating counts, accompanied by a distinct optional/self-selected native-app sample explanation and its own zero-response state.

- [x] **Step 1: Write failing SSR and route tests** for date-aligned rating display, four bucket labels/counts, distinct population caveat, keyboard-scrollable accessible table, and passing `nativeRatings` through the admin API response.
- [x] **Step 2: Run focused component and route tests.** The new component assertions must fail because ratings are not yet rendered. The route pass-through assertion is a regression guard and may already pass because the existing API forwards the aggregate object unchanged; no route implementation change is needed.

  Run: `pnpm --dir apps/web test -- --runInBand src/components/admin/tabs/__tests__/native-growth-card.test.ts src/app/api/admin/native-funnel/__tests__/route.test.ts`

  Expected: component test FAIL on missing ratings presentation; route test PASS with the nested aggregate fixture; existing admin authorization and gameplay-table assertions remain valid.
- [x] **Step 3: Implement a separate accessible ratings table and update the scorecard.** Keep the all-platform outcomes table intact. Use locale-aware dates, tabular counts, a horizontally scrollable `role="region"` with keyboard focus, and an explicit no-ratings state. State that responses are optional, self-selected native-app ratings and are not matched to all-platform outcomes. Record source capability and limitations without claiming improved enjoyment or retention.
- [x] **Step 4: Run the focused component and route tests and verify they pass.**

  Run: `pnpm --dir apps/web test -- --runInBand src/components/admin/tabs/__tests__/native-growth-card.test.ts src/app/api/admin/native-funnel/__tests__/route.test.ts`

  Expected: PASS; admin auth, no-store headers, aggregate-only response, both tables, and separate sample labels remain covered.
- [x] **Step 5: Run the complete web Jest suite, TypeScript check, targeted Biome check, and `git diff --check`.**

  Run from `apps/web`: `pnpm test -- --runInBand`, `pnpm typecheck`, and `pnpm exec biome check src/db/analytics-ops.ts src/db/__tests__/analytics-ops.test.ts src/components/admin/tabs/NativeGrowthCard.tsx src/components/admin/tabs/__tests__/native-growth-card.test.ts src/app/api/admin/native-funnel/__tests__/route.test.ts`.

  Expected: all checks pass; report any unrelated pre-existing failures by name.

### Task 3: Keep Feedback Attributed to the Rated Puzzle

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/DailyQualityFeedbackEligibility.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/DailyQualityFeedbackEligibilityTests.swift`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`
- Modify: `apps/ios/RebuzzleUITests/GameplayUITests.swift`
- Modify: `apps/web/src/app/api/native/analytics/route.ts`
- Test: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `GameSession.puzzleDate`, `DailyResponse.puzzleDate`, and `DailyResponse.nextPuzzleTime`.
- Produces: `DailyQualityFeedbackEligibility.canRate(resultPuzzleDate:dailyPuzzleDate:nextPuzzleTime:now:) -> Bool`; the existing `daily_quality_feedback` request adds `puzzleDate`, which the API requires to equal its server-derived stable local `dayKey` before recording.

- [x] **Step 1: Write failing tests** for current-result eligibility, mismatched puzzle dates, expired/invalid deadlines, no rating control on a stale result, the iOS request payload including puzzle date, API acceptance of the current server-derived local date, and rejection of missing, malformed, or stale dates without storing feedback.
- [x] **Step 2: Run focused Core, native-reporting, and API route checks and verify they fail on the missing eligibility/validation behavior.**

  Run: `swift test --package-path apps/ios/Core --filter DailyQualityFeedbackEligibilityTests`; `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleTests/NativeGrowthReportingTests/testQualityFeedbackIncludesPuzzleDateForServerValidation`; `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleUITests/GameplayUITests/testExpiredResultCanRefreshIntoTheNewDailyPuzzle`; `pnpm --dir apps/web test -- --runInBand src/app/api/native/analytics/__tests__/route.test.ts`.

  Expected: the new Core tests fail because the eligibility API is absent, the API route accepts ratings without a puzzle date, and the reporting payload omits that date.
- [x] **Step 3: Implement the eligibility helper, result-view gate, request field, and API validation.** Re-evaluate the control as the server deadline passes. Keep `dayKey` server-owned and preserve the existing stored event shape and upsert/index behavior.
- [x] **Step 4: Run focused Core, native-reporting, and API route checks and verify they pass.**

  Expected: current-daily results can rate before rollover; stale or mismatched results cannot show or submit the rating; the server records only a date matching its stable local puzzle day.

  Run: `swift test --package-path apps/ios/Core --filter DailyQualityFeedbackEligibilityTests`; `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleTests/NativeGrowthReportingTests/testQualityFeedbackIncludesPuzzleDateForServerValidation`; run the same `xcodebuild test` with `-only-testing:RebuzzleUITests/GameplayUITests/testQualityFeedbackIsOptionalAfterSolve -only-testing:RebuzzleUITests/GameplayUITests/testExpiredResultCanRefreshIntoTheNewDailyPuzzle`; `pnpm --dir apps/web test -- --runInBand src/app/api/native/analytics/__tests__/route.test.ts`.
- [x] **Step 5: Re-run the full web Jest suite, web TypeScript check, targeted Biome check, Core test suite, native reporting XCTest, and `git diff --check`.**

  Expected: all available checks pass; report any unavailable simulator target or unrelated existing failure by name.

  Run: `pnpm test -- --runInBand`, `pnpm typecheck`, and targeted `pnpm exec biome check ...` from `apps/web`; `swift test --package-path apps/ios/Core`; `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleTests/NativeGrowthReportingTests -only-testing:RebuzzleUITests/GameplayUITests/testQualityFeedbackIsOptionalAfterSolve -only-testing:RebuzzleUITests/GameplayUITests/testExpiredResultCanRefreshIntoTheNewDailyPuzzle`; plus `git diff --check` from the repository root.
