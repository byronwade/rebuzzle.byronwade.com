# Plus Purchase Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure the existing one-time Plus offer's purchase funnel and show aggregate conversion outcomes without changing daily access or purchase terms.

**Architecture:** The iOS StoreKit layer emits a closed `GrowthEvent` callback for each real purchase or restore lifecycle outcome. The existing authenticated native analytics route validates the event type and assigns account/day/time; Mongo stores one event per account, event type, and puzzle-local day. The existing admin summary returns only aggregates and adds a same-day viewer-to-verified-purchaser rate.

**Tech Stack:** Swift 6, SwiftUI, StoreKit 2 / StoreKitTest, Next.js Route Handlers, TypeScript, Jest, MongoDB aggregation.

**Spec:** `docs/superpowers/specs/2026-10-27-plus-purchase-funnel-design.md`

## Global Constraints

- The daily puzzle, hints, sharing, and scoring remain free.
- Plus remains the existing one-time StoreKit product; do not change price, product type, or entitlements.
- Growth events contain no transaction ID/JWS, product metadata, price, email, answer, or raw error.
- Server-owned account identity, puzzle-local day, and timestamp remain authoritative.
- The admin endpoint returns aggregates only; account identifiers never leave the database.
- Revenue, refunds, taxes, and current storefront price remain App Store Connect metrics.

## Review Focus

- StoreKit update events must not count a restore as a new purchase.
- Ask to Buy approval must count as a verified purchase after it completes.
- Server validation must reject extra fields and client-owned identity/time.
- Same-day conversion must match accounts with both events on one `dayKey`, then divide by unique offer-viewing accounts.
- Purchase telemetry failures must not affect StoreKit access or the free daily puzzle.

## File Map

- `apps/ios/Rebuzzle/Services/APIClient.swift`: closed native purchase/restore event cases and payloads.
- `apps/ios/Rebuzzle/Services/PurchaseStore.swift`: event callback at StoreKit lifecycle boundaries, including async approval and restore classification.
- `apps/ios/Rebuzzle/App/AppModel.swift`: connect StoreKit events to the existing authenticated best-effort reporter.
- `apps/ios/RebuzzleTests/DirectPurchaseTests.swift` and `PurchaseTests.swift`: StoreKitTest lifecycle regression coverage.
- `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`: AppModel forwarding to authenticated, closed-schema analytics.
- `apps/web/src/db/models.ts`: closed server event union.
- `apps/web/src/app/api/native/analytics/route.ts`: accept supported exact-shape event types.
- `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`: accepted and rejected event payload coverage.
- `apps/web/src/db/analytics-ops.ts`: unique-account counts and same-day conversion aggregation.
- `apps/web/src/db/__tests__/native-growth-events.test.ts`: aggregate pipeline, conversion, and privacy assertions.
- `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`: aggregate response contract.
- `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`: purchase funnel metrics and honest labels.

## Tasks

### Task 1: Specify purchase lifecycle events in StoreKit tests

**Produces:** StoreKitTest assertions for the lifecycle event sequences that the app must emit.
**Consumed by:** Task 2's `PurchaseStore` callback and `GrowthEvent` payload cases.

- [x] Add callback assertions for start plus verified success, cancellation, pending approval followed by verification, unverified purchase, purchase failure, restore success, restore empty, and restore failure.
- [x] Run the focused StoreKit tests and confirm they fail because `PurchaseStore` does not emit the expected lifecycle events yet.

### Task 2: Emit native purchase lifecycle events

**Consumes:** Task 1's expected purchase/restore event sequences.
**Produces:** Closed Swift event payloads that the native analytics API accepts in Task 3.

- [x] Add closed `GrowthEvent` cases and payload mappings in `APIClient.swift`.
- [x] Add a `PurchaseStore` event callback and emit each lifecycle event at the corresponding StoreKit branch.
- [x] Attribute transaction updates only when a persisted Ask to Buy approval is pending; report explicit restore outcomes separately.
- [x] Connect the callback in `AppModel.init` to `recordGrowthEvent` using weak capture.
- [x] Persist pending Ask to Buy attribution across store recreation and retry verified-event delivery after an authenticated app account is restored.
- [x] Run the focused StoreKit tests and verify the lifecycle assertions pass without changing entitlement behavior.

### Task 3: Validate the expanded event contract on the server

**Consumes:** Event type names produced by Task 2.
**Produces:** Authenticated exact-shape events represented by the `NativeGrowthEvent` union and accepted by the route; Task 4 aggregates these records.

- [x] Add the purchase and restore outcome types to `NativeGrowthEvent`.
- [x] Extend the route's exact-key validator to accept these event types with no client metadata.
- [x] Add route tests for every accepted type and for rejected price, product ID, account ID, timestamp, transaction ID, and arbitrary metadata fields.
- [x] Run the native analytics route tests.

### Task 4: Aggregate a useful, privacy-safe purchase funnel

**Consumes:** Task 3's event union and persisted event rows.
**Produces:** The `NativeGrowthSummary` response fields consumed by Task 5's admin card.

- [x] Extend `NativeGrowthSummary` with unique-account counts for purchase starts, verified purchases, pending, cancelled, unverified, failed, and restore outcomes.
- [x] Add a same-day conversion facet matching an offer-viewed event and verified-purchase event on the same account and puzzle-local day, then count unique converting accounts.
- [x] Compute a zero-safe same-day rate against unique offer viewers; keep restore events out of the numerator.
- [x] Add tests for aggregation output, same-day matching, distinct-account counting, restore exclusion, empty data, and aggregate-only output.
- [x] Run native growth database tests and admin route contract tests.

### Task 5: Show the purchase funnel in the admin card

**Consumes:** Task 4's aggregate response fields.
**Produces:** A labeled admin purchase funnel backed by the extended summary contract.

- [x] Add clear account-count labels for offer viewers, starts, verified purchases, pending/cancelled/failure outcomes, and restore outcomes.
- [x] Show same-day offer-to-purchase rate with a one-time purchase definition and a note that proceeds remain in App Store Connect.
- [x] Run web typecheck and the focused native admin tests.

### Task 6: Verify the complete change

**Consumes:** The completed event, API, aggregation, and admin behavior from Tasks 1–5.
**Produces:** Fresh verification evidence for the full purchase funnel change.

- [x] Run `xcodebuild test` for `DirectPurchaseTests`, `PurchaseTests`, and `NativeGrowthReportingTests` on the available iOS simulator (29 passed, 0 failed on iPhone 16 Pro with iOS 18.2).
- [x] Run the focused native analytics Jest suites and web typecheck.
- [x] Run `git diff --check` and review the final diff for unrelated edits or sensitive data.
