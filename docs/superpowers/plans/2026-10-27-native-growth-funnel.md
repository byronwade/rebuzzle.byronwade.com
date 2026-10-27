# Native growth funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a privacy-bounded, authenticated iOS usage funnel and an admin summary for daily play, return paths, Plus interest, and reminder activation.

**Architecture:** Store closed-schema events in a dedicated MongoDB collection. The native client can submit only three allowlisted events using its bearer token; the guess endpoint writes daily completion from its accepted attempt. Admins receive aggregate counts only, while the iOS reporter silently drops failures.

**Tech Stack:** SwiftUI / Swift concurrency, Next.js route handlers, TypeScript, MongoDB, Jest, XCTest.

**Spec:** `docs/superpowers/specs/2026-10-27-native-growth-funnel-design.md`

## Global Constraints

- Persist only `userId`, `eventType`, `dayKey`, `occurredAt`, and event-specific `source` or `outcome`.
- Derive identity, local puzzle day, and event time on the server.
- Never collect puzzle IDs, answers, submitted guesses, explanations, emails, device IDs, reminder text, journal notes, timestamps from clients, or arbitrary metadata in native growth events.
- Client events are allowlisted; `daily_finished` is server-only.
- Event submission never blocks gameplay, reminder scheduling, or Plus access.
- Keep the native daily game, hints, reminders, and scoring free; report Plus offer views separately from App Store Connect purchase totals.
- Keep user-authored worktree modifications intact; do not stage or revert unrelated files.

## Review Focus

- A forged `userId`, extra payload field, client timestamp, unknown source, or server-owned `daily_finished` must never be persisted — route tests.
- Repeated requests for one source and parallel writes must preserve one account/event/day/source record, while separate entry sources remain independently observable — repository tests.
- Archive finishes, nonterminal guesses, failed attempt writes, and duplicate attempts must not create daily finish events — guess-route tests.
- A notification/widget/shortcut open must retain its source through routing, while ordinary launch defaults to `app` — native reporter and router tests.
- Mongo/index/query or network failures must not block a correct guess, puzzle loading, reminder save, or Plus screen — service and route tests.

---

### Task 1: Closed-schema event storage

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/db/indexes.ts`
- Modify: `apps/web/src/db/analytics-ops.ts`
- Modify: `apps/web/src/app/api/user/account/route.ts`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`
- Test: `apps/web/src/app/api/user/account/__tests__/route.test.ts`

**Interfaces:**
- Produces `NativeGrowthEventType`, `NativeGrowthEventSource`, `NativeGrowthEvent`, and `nativeGrowthEventOps.recordOnce(event)`.
- `recordOnce` performs an upsert keyed by `userId`, `eventType`, and `dayKey`, plus `source` for `daily_opened`, with event fields written only under `$setOnInsert`.
- The event collection creates a unique `(userId, eventType, dayKey, source)` index and a 90-day TTL index on `occurredAt` before its first write.

- [x] **Step 1: Write failing storage tests** named `recordOnceCreatesIndexesBeforeUpsertingAndIsIdempotent` and `accountDeletionRemovesNativeGrowthEvents`; assert the exact unique/TTL index options, same-source upsert filter, `$setOnInsert` payload, and deletion list.
- [x] **Step 2: Run the focused tests and confirm they fail** because the model, operations, and deletion coverage are missing.
- [x] **Step 3: Implement the typed event model and idempotent repository**; ensure indexes once per process before upsert, then add `nativeGrowthEvents` to the account deletion transaction.
- [x] **Step 4: Run the focused database and account deletion tests** and confirm they pass.

### Task 2: Authenticated client event endpoint

**Files:**
- Create: `apps/web/src/app/api/native/analytics/route.ts`
- Test: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`
- Modify if needed: `apps/web/src/lib/journey-timezone.ts` or existing date helpers only if an exposed helper is required.

**Interfaces:**
- Consumes Task 1 event types and `nativeGrowthEventOps.recordOnce`.
- Accepts exactly `{ eventType: "daily_opened", source: NativeGrowthEventSource }`, `{ eventType: "plus_offer_viewed" }`, or `{ eventType: "reminder_enabled" }`.
- Derives the account from `getAuthenticatedUser`, time from the server clock, and day key from the stable journey timezone.

- [x] **Step 1: Add failing tests** named `requiresAuthentication`, `rejectsUnknownEventAndClientOwnedFinish`, `rejectsExtraFieldsAndInvalidSource`, and `derivesIdentityDayAndTimeFromServer`; assert a valid daily-open body stores only server-owned fields and repeat posts keep the first event.
- [x] **Step 2: Run the route tests and confirm the expected failures.**
- [x] **Step 3: Implement the rate-limited authenticated route** with strict JSON shape validation and the event-specific allowlist.
- [x] **Step 4: Run the route tests** and verify no submitted identity, metadata, or timestamp reaches storage.

### Task 3: Authoritative daily finish event

**Files:**
- Modify: `apps/web/src/app/api/puzzles/guess/route.ts`
- Test: `apps/web/src/app/api/puzzles/guess/__tests__/native-growth-events.test.ts`

**Interfaces:**
- Consumes Task 1 `nativeGrowthEventOps.recordOnce`.
- Records `daily_finished` with server-derived `userId`, `dayKey`, and `occurredAt`; `outcome` is only `solved` or `ran_out`.

- [x] **Step 1: Add failing route tests** named `recordsDailyFinishAfterAcceptedTerminalAttempt`, `doesNotRecordArchiveOrNonterminalAttempts`, and `doesNotRecordWhenAttemptWriteFailsOrDuplicates`; assert the stored event contains no puzzle or answer fields.
- [x] **Step 2: Run tests and verify they fail because no completion event is recorded.**
- [x] **Step 3: Add best-effort completion recording to the post-response work** only after `createAtomicDailyAttempt` succeeds for a daily final attempt; catch and log the failure without changing the guess response.
- [x] **Step 4: Run the targeted guess-route tests** and verify response behavior and event conditions.

### Task 4: Native entry, offer, and reminder reporting

**Files:**
- Modify: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/App/AppModel.swift`
- Modify: `apps/ios/Rebuzzle/App/RebuzzleApp.swift`
- Modify: `apps/ios/Rebuzzle/Services/ReturnRouter.swift`
- Modify: `apps/ios/RebuzzleWidgets/DailyPuzzleWidget.swift`
- Modify: `apps/ios/Rebuzzle/Features/PlusView.swift`
- Modify: `apps/ios/Rebuzzle/Features/SettingsView.swift`
- Test: `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`
- Test: `apps/ios/RebuzzleTests/ReturnTests.swift`

**Interfaces:**
- The API client has closed `GrowthEvent` and `DailyEntrySource` enums; it can send only the three Task 2 event types.
- `AppModel.load(entrySource:)` defaults to `.app` and sends one best-effort `daily_opened` after daily session restoration succeeds.
- `ReturnRouter` retains sources for notification, widget deep link, and App Shortcut actions.

- [x] **Step 1: Add failing reporter tests** named `sendsOnlyClosedEventFields`, `preservesEntrySource`, and `dropsTelemetryFailures`; assert the exact JSON key set, no identity/puzzle/freeform data, and that a simulated network error does not throw to gameplay.
- [x] **Step 2: Run the iOS tests and confirm the missing reporter behavior.**
- [x] **Step 3: Implement the asynchronous best-effort reporter and source-aware entry routing**; send `plus_offer_viewed` only after product loading confirms the account has no Plus entitlement; send `reminder_enabled` only after scheduling succeeds.
- [x] **Step 4: Run `swift test --package-path apps/ios/Core` and the focused Xcode tests** for native growth reporting and reminder behavior.

### Task 5: Aggregate-only admin funnel

**Files:**
- Modify: `apps/web/src/db/analytics-ops.ts`
- Create: `apps/web/src/app/api/admin/native-funnel/route.ts`
- Create: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Modify: `apps/web/src/components/admin/tabs/StatsTab.tsx`
- Test: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`

**Interfaces:**
- `nativeGrowthEventOps.getSummary(start, end)` returns aggregate counts for opened account-days, finished account-days, finish/open ratio, source counts, multi-day returners, offer viewers, and reminder-enable accounts.
- GET `/api/admin/native-funnel` requires `verifyAdminAccess` and returns the last-30-day summary without user IDs or raw events.

- [x] **Step 1: Add failing API tests** named `requiresAdmin`, `returnsAggregateOnlyThirtyDaySummary`, and `reportsUnavailableWhenAggregationFails`; assert that the payload contains no account IDs or raw events.
- [x] **Step 2: Run tests and confirm the endpoint is absent.**
- [x] **Step 3: Implement aggregate queries and a small Native Daily Funnel card** that labels the rolling finish ratio, reminder scheduling confirmations, Plus views, and the separate App Store Connect sales source.
- [x] **Step 4: Run route tests, web typecheck, and admin UI lint/type validation.**

### Task 6: Privacy and product evidence records

**Files:**
- Modify: `apps/ios/Release/Privacy.md`
- Modify: `apps/web/src/app/privacy/page.tsx`
- Modify: `docs/product/native-growth-scorecard.md`

- [x] **Step 1: Update privacy materials** to enumerate account-linked native event fields and exclusions, 90-day code-level TTL with production verification caveat, and account-deletion behavior.
- [x] **Step 2: Update the scorecard** to document the implemented measurement baseline while explicitly stating it has no measured retention, enjoyment, conversion, or profit result yet.
- [x] **Step 3: Run the full relevant verification** (web route/database tests, typecheck, lint, native tests, `git diff --check`) and inspect the final diff for untouched user-owned changes.
