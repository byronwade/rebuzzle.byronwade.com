# Native Daily Community Solve Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, privacy-preserving community solve mix to the native daily result so players can see guess-count patterns without speed pressure.

**Architecture:** A rate-limited Next.js route verifies an official published puzzle, groups final successful attempts by server-owned player identity in MongoDB, and returns only a thresholded, rounded four-bucket distribution. Swift Core decodes the response, the native result view fetches it only after expansion, and the existing growth funnel records aggregate opt-in views.

**Tech Stack:** Next.js Route Handlers, TypeScript, MongoDB aggregation, SwiftUI, Swift Package Manager, Jest, XCTest, XCUITest.

**Spec:** `docs/superpowers/specs/2026-10-28-native-daily-community-solve-pulse-design.md`

## Global Constraints

- Keep the feature free, optional, spoiler-safe, and never rank solve speed.
- Use the four guess buckets `1`, `2`, `3`, and `4+`; continuation solves after the score lock belong in `4+`.
- Do not expose a distribution before at least 20 unique successful solvers.
- When available, return four integer percentages in 5-point increments summing to 100; do not return the exact sample size.
- Do not return user IDs, usernames, answers, raw guesses, notes, or solve times.
- Accept only official published puzzles; reject user-submitted community puzzles.
- Report `daily_solve_pulse_viewed` only after expansion and attach no puzzle or answer fields to that event.
- Preserve the existing 90-day growth-event retention and account-deletion behavior.
- Do not change scoring, reminders, sharing, Plus access, pricing, or purchase handling.

## Review Focus

1. **Low sample boundary:** 19 unique solvers stays unavailable and 20 becomes available; route tests pin both values.
2. **Duplicate player rows:** one player contributes one solve even if duplicate final rows exist; aggregation tests verify server-side deduplication.
3. **Malformed attempt counts:** missing, non-integer, zero, and negative counts do not enter the distribution; helper and route tests cover them.
4. **Continuation and finalization:** valid fourth-or-later solves enter `4+`, while reveal/expiry finalization rows are excluded; route tests cover both.
5. **Unsupported puzzle IDs:** unknown, unpublished, and community puzzles return no data; request tests verify the route fails closed.
6. **Optional native fetch:** no request occurs before expansion; network failure leaves the result usable and retryable; UI tests cover the flow.

---

### Task 1: Aggregate official daily solve counts safely

**Files:**
- Create: `apps/web/src/lib/game/daily-solve-distribution.ts`
- Create: `apps/web/src/lib/game/__tests__/daily-solve-distribution.test.ts`
- Create: `apps/web/src/app/api/puzzles/solve-distribution/route.ts`
- Create: `apps/web/src/app/api/puzzles/solve-distribution/__tests__/route.test.ts`

**Interfaces:**
- Produces `DailySolveDistributionPayload`: `available`, `minimumSolves`, `oneGuessPercent`, `twoGuessesPercent`, `threeGuessesPercent`, and `fourPlusPercent`.
- Produces `bucketForAttemptNumber(attemptNumber)`, mapping 1, 2, and 3 directly and all valid larger values to `fourPlus`; produces `buildDailySolveDistribution(counts)`, which withholds fewer than 20 unique solvers and otherwise returns 5-point percentages summing to 100.
- Route accepts only `GET /api/puzzles/solve-distribution?puzzleId=<id>` and returns no identity or puzzle content.

- [x] **Step 1: Write failing helper tests** for the 19/20 sample boundary, 1/2/3/4+ bucket mapping, integer percentages summing to 100, and malformed counts.
- [x] **Step 2: Run** `pnpm --filter @rebuzzle/web test -- src/lib/game/__tests__/daily-solve-distribution.test.ts --runInBand` and confirm the missing helper causes the expected failure.
- [x] **Step 3: Implement** the pure distribution helper with a deterministic largest-remainder 5-point rounding rule.
- [x] **Step 4: Run the helper tests** and confirm they pass.
- [x] **Step 5: Write failing route tests** for malformed IDs, non-official puzzles, low sample, duplicate user rows, continuation solves, finalization exclusion, and aggregate-only output.
- [x] **Step 6: Run** `pnpm --filter @rebuzzle/web test -- src/app/api/puzzles/solve-distribution/__tests__/route.test.ts --runInBand` and confirm the expected route failures.
- [x] **Step 7: Implement** the rate-limited route, official-puzzle check, indexed Mongo match/group, and private no-store response.
- [x] **Step 8: Run both backend test files** and confirm all assertions pass.
- [x] **Step 9: Commit** as `feat: add private daily solve distribution API`.

### Task 2: Add the typed iOS distribution client

**Files:**
- Create: `apps/ios/Core/Sources/RebuzzleCore/DailySolveDistribution.swift`
- Create: `apps/ios/Core/Tests/RebuzzleCoreTests/DailySolveDistributionTests.swift`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Create: `apps/ios/RebuzzleTests/DailySolveDistributionAPITests.swift`

**Interfaces:**
- `DailySolveDistribution` is `Codable`, `Equatable`, and `Sendable`, and mirrors the Task 1 response fields.
- `APIClient.fetchDailySolveDistribution(puzzleID: String) async throws -> DailySolveDistribution` URL-encodes the puzzle ID and calls the Task 1 route.

- [ ] **Step 1: Write failing Core decode/bucket tests** for available and unavailable payloads and the player's 1/2/3/4+ bucket.
- [ ] **Step 2: Run** `swift test --package-path apps/ios/Core --filter DailySolveDistributionTests` and confirm the missing type fails as expected.
- [ ] **Step 3: Implement** the Core response type and bucket selection helper.
- [ ] **Step 4: Run the focused Core tests** and confirm they pass.
- [ ] **Step 5: Write failing APIClient tests** for encoded puzzle IDs, response decoding, and server errors.
- [ ] **Step 6: Run** `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleTests/DailySolveDistributionAPITests` and confirm the missing API method fails as expected.
- [ ] **Step 7: Implement** `fetchDailySolveDistribution(puzzleID:)` through the existing request client.
- [ ] **Step 8: Run the focused APIClient test** and confirm it passes.
- [ ] **Step 9: Commit** as `feat: add native daily solve distribution client`.

### Task 3: Track the optional view in the existing native funnel

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/web/src/app/api/native/analytics/route.ts`
- Modify: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/admin/native-funnel/route.ts`
- Modify: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Modify: `apps/web/src/components/admin/tabs/__tests__/native-growth-card.test.ts`
- Modify: `docs/product/native-growth-scorecard.md`

**Interfaces:**
- Produces `GrowthEvent.dailySolvePulseViewed` with payload exactly `{ eventType: "daily_solve_pulse_viewed" }`.
- Admin funnel exposes unique account-day views only; it does not include puzzle IDs or raw events.

- [ ] **Step 1: Write failing growth-route and admin-summary tests** asserting the allowlisted event is accepted, account identity remains server-derived, the payload has no extra fields, and the summary returns aggregate account-day viewers.
- [ ] **Step 2: Run** `pnpm --filter @rebuzzle/web test -- src/app/api/native/analytics/__tests__/route.test.ts src/app/api/admin/native-funnel/__tests__/route.test.ts src/components/admin/tabs/__tests__/native-growth-card.test.ts --runInBand` and confirm the expected missing-event failures.
- [ ] **Step 3: Implement** the event allowlist and aggregate-only summary/card field using the existing 90-day event store.
- [ ] **Step 4: Add** the Swift event case with the exact payload above.
- [ ] **Step 5: Run the focused server tests and** `swift test --package-path apps/ios/Core` to verify the event contract and existing Core behavior.
- [ ] **Step 6: Update** the scorecard with implementation status and the planned adoption/next-day-return measures, without claiming an outcome.
- [ ] **Step 7: Commit** as `feat: measure daily solve pulse views`.

### Task 4: Add the opt-in native result debrief

**Files:**
- Create: `apps/ios/Rebuzzle/Features/DailySolvePulseCard.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Create: `apps/ios/RebuzzleUITests/DailySolvePulseUITests.swift`

**Interfaces:**
- `DailySolvePulseCard` receives the current puzzle ID, solved attempt count, solved status, API client, and a view callback.
- It fetches only after expansion, emits the Task 3 callback once per expansion, and supports unavailable, loading, loaded, and retry states.

- [ ] **Step 1: Write failing UI tests** for collapsed/no-fetch, explicit expansion, 20+ distribution rendering, 4+ highlighting, low-sample copy, and retry after a failed request.
- [ ] **Step 2: Run** `xcodebuild test -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:RebuzzleUITests/DailySolvePulseUITests` and confirm the missing card fails as expected.
- [ ] **Step 3: Implement** the accessible collapsed card and async states without blocking the result view.
- [ ] **Step 4: Run the focused UI tests** and confirm they pass.
- [ ] **Step 5: Run** `swift test --package-path apps/ios/Core` and the full `Rebuzzle` Xcode scheme test on an iPhone simulator.
- [ ] **Step 6: Run** focused web tests, web typecheck, and `git diff --check`.
- [ ] **Step 7: Commit** as `feat: add daily community solve pulse to results`.

## Final Verification

- Run the full Web Jest suite and Web TypeScript check.
- Run all Core Swift tests and the full `Rebuzzle` Xcode simulator test scheme.
- Confirm the route returns no users, answer text, raw guess text, or times by parsing the response in its test.
- Check the deployed beta preview after the branch update; report runtime status separately from code/test status.
- Do not report TestFlight availability unless a signed archive is uploaded and the updated build is visible in the existing Family group.
