# Daily Quality Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect optional one-tap player ratings of the revealed daily puzzle and expose privacy-bounded aggregate evidence for editorial tuning.

**Architecture:** Add a compact native result card and a closed Swift event payload. Extend the existing authenticated native analytics endpoint and Mongo event collection to keep only the latest rating per account/local puzzle day, then expose four aggregate counts through the existing admin funnel. Update privacy and measurement documentation alongside the implementation.

**Tech Stack:** SwiftUI, XCTest/XCUITest, Next.js route handlers, TypeScript, MongoDB aggregation, Jest, Biome.

**Spec:** `docs/superpowers/specs/2026-10-27-daily-quality-pulse-design.md`

## Global Constraints

- Show the prompt only after a daily result is revealed; never interrupt a guess or gate a reward.
- Allow only `too_easy`, `just_right`, `tough_but_fair`, or `unclear` as player ratings.
- The server derives account identity, local puzzle day, and event time.
- Store one current rating per account and local puzzle day; later selections replace it.
- Never send or store puzzle IDs, answers, guesses, free text, client timestamps, or arbitrary metadata for this feature.
- Keep event writes best-effort and the dashboard aggregate-only.
- Treat player responses as optional and self-selected; do not present them as objective difficulty or outcome evidence.
- Preserve existing reminder, scoring, streak, purchase, and answer-reveal behavior.

## Review Focus

- Unknown rating values or extra client fields must be rejected — route tests cover invalid enum, `userId`, and extra metadata.
- Repeated selections on one local day must replace one row — database tests cover same account/day with a different rating.
- UTC midnight must use the stable account timezone for the local puzzle day — route test asserts a Los Angeles day derived from server time.
- Missing or expired authentication must never store feedback — route test covers unauthenticated requests.
- Large accessibility text and either terminal game result must retain reachable feedback choices — UI tests cover solved and revealed states at standard and accessibility sizes.

---

### Task 1: Native result feedback

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Test: `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Produces `DailyQualityRating` with raw values `too_easy`, `just_right`, `tough_but_fair`, `unclear`.
- Produces `GrowthEvent.dailyQualityFeedback(DailyQualityRating)` with only `eventType` and `rating` in its payload.
- The result card calls the existing `AppModel.recordGrowthEvent(_:)` and owns only ephemeral selection state.

- [x] **Step 1: Add the failing payload test** `testQualityFeedbackSendsOnlyRatingAndEventType`; assert the exact body is `{"eventType":"daily_quality_feedback","rating":"tough_but_fair"}` and has no identity or puzzle fields.
- [x] **Step 2: Run it red** with the iOS `Rebuzzle` unit-test scheme; expect a compile/test failure because the rating event does not exist.
- [x] **Step 3: Add the rating type and event payload** in `APIClient.swift`; keep the existing best-effort send path.
- [x] **Step 4: Run the payload test green** and the existing `NativeGrowthReportingTests`.
- [x] **Step 5: Add UI tests** for the optional feedback prompt on solved and attempt-exhausted results, including one accessibility-size result; verify a choice shows acknowledgement and does not change the completed game or hide its existing reward/share actions.
- [x] **Step 6: Add the compact result card** in `TodayView.swift`; use existing Theme colors, minimum 44-point hit targets, VoiceOver labels, and no motion-dependent feedback.
- [x] **Step 7: Run the targeted UI tests** on the iPhone 17 simulator and inspect the result screen at default and accessibility text sizes.

### Task 2: Authenticated event and aggregate storage

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/db/analytics-ops.ts`
- Modify: `apps/web/src/app/api/native/analytics/route.ts`
- Test: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`

**Interfaces:**
- Adds `NativeGrowthQualityRating` and the `daily_quality_feedback` union case.
- Adds `qualityFeedback: Record<NativeGrowthQualityRating, number>` to `NativeGrowthSummary`.
- The route accepts only `{ eventType: "daily_quality_feedback", rating: NativeGrowthQualityRating }` from the client.
- A new `recordDailyQualityFeedback(event)` operation upserts by `(userId, eventType, dayKey)`, replacing the prior rating and server occurrence time.

- [x] **Step 1: Add route tests** for each valid rating, invalid rating, extra fields, client-supplied identity/day/time, and unauthenticated feedback; assert identity/day/time are server-derived.
- [x] **Step 2: Run the route tests red** and confirm they fail because the event is unsupported.
- [x] **Step 3: Add the type and strict route branch**; reuse stable timezone, local puzzle-date derivation, and existing rate limiting.
- [x] **Step 4: Run the route tests green**.
- [x] **Step 5: Add database tests** proving a second rating updates the existing account/day row, not a second row, and summary output returns literal counts for all four rating values with zero defaults.
- [x] **Step 6: Implement the event upsert and summary `$facet` in `analytics-ops.ts`; tests verify replacement and aggregate defaults.**
- [x] **Step 7: Run the database tests green** plus existing native growth route and deletion tests.

### Task 3: Admin visibility and privacy documentation

**Files:**
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Modify: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`
- Modify: `apps/web/src/app/privacy/page.tsx`
- Modify: `apps/ios/Release/Privacy.md`
- Modify: `docs/product/native-growth-scorecard.md`

- [x] **Step 1: Extend the admin route fixture** with four rating counts and assert the response remains aggregate-only.
- [x] **Step 2: Render the rating distribution** with plain-language labels, response count, and a visible self-selected/directional caveat; retain the unavailable state and do not relabel views as purchases.
- [x] **Step 3: Update the privacy policy and release notes** to list the rating as account-linked Product Interaction data with server-derived day/time, no puzzle or answer data, 90-day source-configured TTL, and production verification caveat.
- [x] **Step 4: Update the product scorecard** to call the measurement a self-selected feedback signal and leave retention/enjoyment/revenue outcomes unproven.
- [x] **Step 5: Run relevant Jest tests, `pnpm typecheck`, changed-file Biome checks, native simulator tests, and `git diff --check`; inspect the complete diff to ensure unrelated user edits remain untouched.**
