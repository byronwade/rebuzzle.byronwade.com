# Plus Surface Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attribute the existing optional one-time Plus funnel to its five current entry surfaces and expose privacy-bounded source aggregates in the admin dashboard.

**Architecture:** Keep the daily game, Plus offer, and StoreKit entitlement flow unchanged. Add a closed source value to existing native growth events, preserve it with pending purchase state, validate it at the server, use the existing MongoDB source-inclusive unique index, and add source-level aggregates to the existing admin response and card.

**Tech Stack:** Swift 6, SwiftUI, StoreKit, TypeScript, Next.js route handlers, MongoDB aggregation, Jest, XCTest.

**Spec:** `docs/superpowers/specs/2026-10-28-plus-surface-attribution-design.md`

## Global Constraints

- The closed source values are `archive`, `settings`, `journey_insights`, `journal`, and `free_sample`.
- Preserve the current daily puzzle, hints, scoring, reminders, streaks, free archive sample, Plus price, product type, entitlement rules, and purchase copy.
- Keep one-time Plus optional; daily gameplay, hints, and sharing remain free.
- StoreKit verification remains authoritative. Analytics failure never affects access, purchase, restore, or gameplay.
- Restore outcomes remain source-free and never count as new purchases.
- Accept source-free legacy Plus events; never infer a missing source from the currently visible screen.
- Keep account IDs inside MongoDB; return source aggregates only.
- Suppress source counts of one to four accounts and source conversion rates unless both source viewers and same-day verified purchasers are at least five; show zero as zero.

## Review Focus

- A source value is attached only to Plus offer views and non-restore purchase lifecycle events; test that unknown values and source fields on unrelated/restore events are rejected.
- Two different sources on the same account, event type, and local day remain distinct while retries for the same source remain idempotent; test both filters against `recordOnce`.
- Conversion matches the same account, source, and server-owned local day; test that cross-source and later-day verified purchases do not count.
- Low counts are hidden independently from zero counts and conversion rates; test values at 0, 1, 4, and 5 for both viewers and verified purchasers.
- Ask to Buy approval after app recreation retains the initiating source, while legacy pending state and restore remain unattributed; cover both paths in StoreKit tests.

---

### Task 1: Add the Plus source contract to native event storage

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/app/api/native/analytics/route.ts`
- Modify: `apps/web/src/db/analytics-ops.ts`
- Test: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`

**Interfaces:**
- Produce `NativeGrowthPlusOfferSource = "archive" | "settings" | "journey_insights" | "journal" | "free_sample"`.
- Produce `NativeGrowthEvent` variants that allow optional `source?: NativeGrowthPlusOfferSource` on `plus_offer_viewed` and the six `plus_purchase_*` lifecycle events. Keep `plus_restore_*` variants source-free.
- The route accepts legacy source-free events. If source is present, it must be one of the five values and the event must be a source-eligible Plus event.

- [x] **Step 1: Write failing API and repository tests**

Add API tests asserting all five allowed source values are accepted on Plus offer/purchase events, legacy source-free events remain accepted, unknown sources are rejected, and source is rejected for restore, daily, reminder, and share events. Add a `recordOnce` test asserting identical source retries share one filter while distinct source values produce distinct filters. Preserve source-free event filter behavior.

- [x] **Step 2: Run only the targeted tests and verify failure**

Run from repository root:

```bash
pnpm --filter @rebuzzle/web exec jest --runInBand src/app/api/native/analytics/__tests__/route.test.ts src/db/__tests__/native-growth-events.test.ts
```

Expected: the new source acceptance and source-aware idempotency assertions fail.

- [x] **Step 3: Implement the closed source union, route validation, and source-aware filter**

Add the exact five-value source union and event variants in `models.ts`. In the route, validate optional Plus source fields separately from the source-free restore events. In `recordOnce`, include `source` in the upsert filter for `daily_opened` and whenever a Plus event carries a source; omit it for legacy source-free events. The existing unique index already includes `(userId, eventType, dayKey, source)`, so do not add a new index.

- [x] **Step 4: Run the targeted tests and verify success**

Run the command from Step 2. Expected: all source contract, legacy, and idempotency tests pass.

- [x] **Step 5: Commit the server event contract**

```bash
git add apps/web/src/db/models.ts apps/web/src/app/api/native/analytics/route.ts apps/web/src/db/analytics-ops.ts apps/web/src/app/api/native/analytics/__tests__/route.test.ts apps/web/src/db/__tests__/native-growth-events.test.ts
git commit -m "feat(analytics): attribute Plus events to offer surface"
```

### Task 2: Aggregate source-level Plus funnel evidence

**Files:**
- Modify: `apps/web/src/db/analytics-ops.ts`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`

**Interfaces:**
- Add `plusOffersBySource: Record<NativeGrowthPlusOfferSource, NativeGrowthPlusSourceSummary>` to `NativeGrowthSummary`.
- Each source summary contains viewer, purchase starter, verified purchaser, pending, cancelled, unverified, failed, same-day verified purchaser account counts, and `sameDayConversionRate`. Counts and rate use `number | null`; `null` means suppressed.

- [x] **Step 1: Write failing aggregation tests**

Extend `nativeGrowthEventOps.getSummary` coverage to assert: event counts are distinct accounts per source; one account may appear in multiple source rows; same-day conversion requires the same account, source, and `dayKey`; delayed/cross-day verification remains in the verified outcome count but is excluded from the same-day rate; zero is returned as zero; counts 1–4 are null; and a rate is null unless both source viewer and same-day verified-purchaser counts are at least five. Assert no user IDs or raw event rows appear in the summary.

- [x] **Step 2: Run the aggregation test and verify failure**

```bash
pnpm --filter @rebuzzle/web exec jest --runInBand src/db/__tests__/native-growth-events.test.ts
```

Expected: the new source summary shape and suppression assertions fail.

- [x] **Step 3: Implement source and same-day source facets**

Add source-level distinct-account facets for each eligible Plus event. Add a same-day facet grouped by `(userId, source, dayKey)` requiring both `plus_offer_viewed` and `plus_purchase_verified`, then count distinct accounts per source. Apply suppression in the returned summary: preserve zero, convert counts 1–4 to `null`, and calculate the rate only when viewers and same-day verified purchasers are both at least five. Preserve all existing aggregate fields and their current definitions.

- [x] **Step 4: Run the aggregation test and verify success**

Run the command from Step 2. Expected: existing total-funnel behavior and all new source tests pass.

- [x] **Step 5: Commit the source aggregate**

```bash
git add apps/web/src/db/analytics-ops.ts apps/web/src/db/__tests__/native-growth-events.test.ts
git commit -m "feat(analytics): summarize Plus funnel by source"
```

### Task 3: Show source aggregates in the admin funnel

**Files:**
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Test: `apps/web/src/components/admin/tabs/__tests__/native-growth-card.test.ts`
- Test: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`

**Interfaces:**
- The admin response continues to expose `NativeGrowthSummary`, including the new `plusOffersBySource` aggregate; it must not expose event rows or account identifiers.
- The card shows five labeled source rows with account counts and a same-day conversion rate where eligible. Render suppressed values as `Hidden (<5)` and zeros as `0`.

- [x] **Step 1: Write failing admin response and rendering tests**

Add a route test proving source aggregates are passed through while the response contains no account identities or event rows. Add card tests for all five visible labels, account-count wording, visible zeros, suppressed 1–4 counts, and suppressed rates below either threshold.

- [x] **Step 2: Run the targeted tests and verify failure**

```bash
pnpm --filter @rebuzzle/web exec jest --runInBand src/components/admin/tabs/__tests__/native-growth-card.test.ts src/app/api/admin/native-funnel/__tests__/route.test.ts
```

Expected: source rows and the new privacy-state rendering assertions fail.

- [x] **Step 3: Implement the source breakdown in the existing funnel card**

Add the five-value source summary type to the card’s response type and render a compact source breakdown within the existing Plus funnel section. Label the values as unique account counts. Display `Hidden (<5)` for `null`; keep source rows non-additive because one account may appear in more than one source.

- [x] **Step 4: Run the targeted tests and verify success**

Run the command from Step 2. Expected: route and component tests pass, with existing daily growth metrics unchanged.

- [x] **Step 5: Commit the admin breakdown**

```bash
git add apps/web/src/components/admin/tabs/NativeGrowthCard.tsx apps/web/src/components/admin/tabs/__tests__/native-growth-card.test.ts apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts
git commit -m "feat(admin): show Plus conversion by offer surface"
```

### Task 4: Carry offer source through iOS navigation and StoreKit

**Files:**
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/Services/PurchaseStore.swift`
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift`
- Modify: `apps/ios/Rebuzzle/Features/PlusView.swift`
- Modify: `apps/ios/Rebuzzle/Features/ArchiveView.swift`
- Modify: `apps/ios/Rebuzzle/Features/SettingsView.swift`
- Modify: `apps/ios/Rebuzzle/Features/ProgressScreen.swift`
- Modify: `apps/ios/Rebuzzle/Features/JournalView.swift`
- Modify: `apps/ios/Rebuzzle/Features/PracticeGameView.swift`
- Test: `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`
- Test: `apps/ios/RebuzzleTests/PurchaseTests.swift`
- Test: `apps/ios/RebuzzleTests/DirectPurchaseTests.swift`

**Interfaces:**
- Produce `PlusOfferSource: String, Hashable, Sendable` with the five exact wire values.
- Change the route to `RebuzzleRoute.plus(source: PlusOfferSource)` and initialize `PlusView(source:)` from that route.
- Change `PurchaseStore.purchase()` to `purchase(source: PlusOfferSource)`; new direct starts and outcomes carry that source.
- Keep `GrowthEvent` source optional only for Plus offer/purchase events so old pending StoreKit updates can be reported without guessed attribution. Restore events remain source-free.

- [x] **Step 1: Write failing payload, route, and StoreKit attribution tests**

Update payload tests to assert the five exact wire values and closed payload fields. Update direct purchase tests to assert source consistency for started, verified, pending, cancellation, unverified, and failed outcomes. Extend Ask to Buy recreation and verified-attribution retry tests to prove the original source survives app recreation and authenticated retry. Add a legacy pending case proving a missing stored source stays absent. Assert restore payloads remain source-free.

- [x] **Step 2: Run targeted native tests and verify failure**

From `apps/ios` run:

```bash
swift test --package-path Core
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,id=64CF5E11-E271-459E-9B0D-89FDDD48E04E' -derivedDataPath /tmp/rebuzzle-plus-attribution-derived CODE_SIGN_IDENTITY=- test
```

Expected: XCTest compilation fails on the new source API and attribution assertions.

- [x] **Step 3: Implement source-aware event payloads and explicit routes**

Add `PlusOfferSource` with raw values `archive`, `settings`, `journey_insights`, `journal`, and `free_sample`. Give every existing Plus entry point its matching source, make every route explicit, initialize `PlusView(source:)`, and report its offer view with that source. The inline completed free-sample offer records and navigates with `.freeSample`.

- [x] **Step 4: Persist source with pending purchase state**

Pass the source into `PurchaseStore.purchase(source:)` and add versioned UserDefaults keys alongside the existing Ask to Buy account ID and verified-attribution account ID. Preserve the source across Ask to Buy approval, app recreation, and authenticated verification retry. If a pre-change pending record has no source, send the legacy source-free outcome; do not clear valid access or infer a source. Keep explicit restore handling unchanged and source-free.

- [ ] **Step 5: Run native tests and verify success**

Run `swift test --package-path Core`, then from `apps/ios` run the iOS simulator test command used by CI:

```bash
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination 'platform=iOS Simulator,id=64CF5E11-E271-459E-9B0D-89FDDD48E04E' -derivedDataPath /tmp/rebuzzle-plus-attribution-derived CODE_SIGN_IDENTITY=- test
```

The UUID is the iPhone 17 Pro Max on iOS 26.0. The generic iOS app and XCTest target build and the 65-test Core suite pass locally. Simulator XCTest remained blocked before runner startup because CoreSimulator stopped responding; require the GitHub iOS runtime job to pass before merge.

- [x] **Step 6: Commit the native attribution flow**

```bash
git add apps/ios/Rebuzzle/Services/APIClient.swift apps/ios/Rebuzzle/Services/PurchaseStore.swift apps/ios/Rebuzzle/App/RebuzzleApp.swift apps/ios/Rebuzzle/Features/PlusView.swift apps/ios/Rebuzzle/Features/ArchiveView.swift apps/ios/Rebuzzle/Features/SettingsView.swift apps/ios/Rebuzzle/Features/ProgressScreen.swift apps/ios/Rebuzzle/Features/JournalView.swift apps/ios/Rebuzzle/Features/PracticeGameView.swift apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift apps/ios/RebuzzleTests/PurchaseTests.swift apps/ios/RebuzzleTests/DirectPurchaseTests.swift
git commit -m "feat(ios): retain Plus offer source through purchase"
```
### Final verification

- [x] Run the full web Jest suite serially (1,523 tests passed).
- [x] Run `pnpm --filter @rebuzzle/web typecheck` and `pnpm --filter @rebuzzle/web lint`.
- [x] Run `swift test --package-path apps/ios/Core` from repository root (65 tests passed).
- [ ] Run the iOS simulator build and runtime/UI test workflow from `.github/workflows/ios.yml`.
- [x] Review the complete diff for preserved free play and restore behavior, exact route sources, no source leakage, and no changes to pricing or offer frequency.
- [ ] Push the implementation commits to the existing `feat/native-daily-redesign` branch and verify the PR checks before reporting.

