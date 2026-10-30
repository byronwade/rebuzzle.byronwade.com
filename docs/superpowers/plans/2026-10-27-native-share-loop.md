# Native Share Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the spoiler-safe daily result share into a measurable, attributable route back to today's puzzle.

**Architecture:** The native share sheet emits closed best-effort share events. The server remains the source of identity, local day, and time; its existing aggregate funnel counts share activity and `daily_opened(source: share)`. An HTTPS root URL falls back to the web game and is associated with the iOS app through a generated AASA response and Associated Domains entitlement.

**Tech Stack:** Swift 6, SwiftUI, UIKit activity controller, Next.js route handlers, MongoDB, Jest, XCTest/XCUITest, Associated Domains.

**Spec:** `docs/superpowers/specs/2026-10-27-native-share-loop-design.md`

## Global Constraints

- Preserve daily play, scoring, spoiler safety, streak rules, guest/account isolation, and the `rebuzzle://play` scheme.
- Do not collect recipients, social platform, answers, guesses, puzzle identifiers, share contents, client time, or arbitrary event properties.
- Growth reporting must remain best-effort; it never blocks the share sheet, link routing, or game session restoration.
- Admin analytics remain aggregate-only. Share events are idempotent per account/event/local day.
- Do not claim successful delivery or retention lift based only on a button tap, OS activity completion, or source-attributed open.
- Do not change user-owned untracked files or submit a TestFlight build as part of this feature.

## Review Focus

- A stale or unfinished daily result must never be shared — current result summary matching tests.
- Dismissing the activity sheet, choosing an activity, and analytics failure must not change gameplay — UIKit callback/runtime tests.
- HTTPS links with a wrong host, scheme, path, port, user info, malformed query, or non-share source must not be claimed by the app — router tests.
- Daily-open attribution must occur only after session restore succeeds and must preserve drafts — runtime tests.
- Forged event types/fields, repeated submissions, TTL/index behavior, and account deletion must retain current privacy guarantees — route/database tests.
- AASA misconfiguration must fail explicitly and must not serve a malformed file or redirect — route tests.

---

### Task 1: Native share intent and Universal Link routing

**Files:**
- Modify: `apps/ios/Core/Sources/RebuzzleCore/DailyShareSummary.swift`
- Test: `apps/ios/Core/Tests/RebuzzleCoreTests/DailyShareSummaryTests.swift`
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/Features/DailyResultShareCard.swift`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/Rebuzzle/Services/ReturnRouter.swift`
- Test: `apps/ios/RebuzzleTests/NativeGrowthReportingTests.swift`
- Test: `apps/ios/RebuzzleTests/ReturnTests.swift`
- Test: `apps/ios/RebuzzleUITests/GameplayUITests.swift`

**Interfaces:**
- Add `DailyEntrySource.share` and closed `GrowthEvent.dailyShareStarted` / `.dailyShareCompleted` payloads.
- Replace the non-observable `ShareLink` action with an accessible native activity sheet that shares the existing image and spoiler-safe text. Record start on action and completion only when UIKit reports completion.
- Expose one canonical `DailyShareSummary.shareURL` equal to `https://rebuzzle.byronwade.com/?source=share`; both card and text use it.
- Accept only `https://rebuzzle.byronwade.com/?source=share` as a Universal Link; preserve the existing custom scheme and unknown-URL rejection.

- [x] Add failing share-text URL, event-payload, completion outcome, activity-sheet, and strict URL-routing tests.
- [x] Run focused tests and confirm expected failures.
- [x] Implement the native activity controller wrapper, best-effort events, attributed URL, `.share` entry source, and strict router support.
- [x] Run focused native reporting/routing and share-card visual tests, plus gameplay UI test on iOS 18.2 and 26.3 simulators; verify share sheet presentation from the result viewport. Device-level dismissal/draft-preservation behavior remains a physical beta check.

### Task 2: AASA delivery and Apple app association

**Files:**
- Create: `apps/web/src/app/.well-known/apple-app-site-association/route.ts`
- Modify: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`
- Create: `apps/ios/Rebuzzle/Rebuzzle.entitlements`
- Test: `apps/web/src/app/.well-known/apple-app-site-association/__tests__/route.test.ts`
- Modify: `apps/ios/Release/Privacy.md` only if the privacy manifest needs a tracking disclosure change (expected: no additional data category beyond existing Product Interaction).

**Interfaces:**
- Generate the AASA app identifier from `APPLE_APP_ID_PREFIX` plus `com.byronwade.rebuzzle`; do not assume it matches the Team ID.
- Return direct `application/json` with no redirect and a supported-path rule; when `APPLE_APP_ID_PREFIX` is absent, return an explicit unavailable response.
- Add `applinks:rebuzzle.byronwade.com` to the app's Associated Domains entitlement, retaining the existing custom scheme.

- [x] Add failing AASA tests for configured JSON, exact app identifier, content type/no redirect, and missing configuration.
- [x] Run focused web route tests and confirm expected failures.
- [x] Implement the environment-driven AASA response and project entitlement. If the Apple App ID prefix is unavailable, keep the route disabled until configured rather than guessing.
- [x] Run the AASA tests and simulator build. Signed build, Apple capability/profile setup, production AASA response, and physical device association remain release gates because the App ID Prefix and signing profile are unavailable here.

### Task 3: Closed share events and aggregate growth funnel

**Files:**
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/app/api/native/analytics/route.ts`
- Modify: `apps/web/src/db/analytics-ops.ts`
- Modify: `apps/web/src/app/api/admin/native-funnel/route.ts`
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Test: `apps/web/src/app/api/native/analytics/__tests__/route.test.ts`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`
- Test: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`
- Modify: `apps/ios/Release/Privacy.md`, `apps/web/src/app/privacy/page.tsx`, and `docs/product/native-growth-scorecard.md`.

**Interfaces:**
- Accept only `{ eventType: "daily_share_started" }` and `{ eventType: "daily_share_completed" }` from authenticated native clients.
- Add `share` to the closed `daily_opened.source` set. Identity, day key, and event time remain server-derived.
- Aggregate unique share-started and share-completed accounts for the date range. Add share-source account-days to entry-source summary. Never return identifiers or raw events.

- [x] Add failing route/database/admin tests for strict payloads, server derivation, idempotence, share source counts, and aggregate-only responses.
- [x] Run focused tests and confirm expected failures.
- [x] Implement the event model, route validation, database aggregation, admin display, and accurate privacy/measurement notes.
- [x] Run final changed-file Biome, native growth reporting tests, and `git diff --check`; targeted web tests and `pnpm typecheck` pass. Inspect the full diff for unrelated files.

### Task 4: Integration and release evidence

- [x] Convert pushed app screens to typed navigation routes so Universal Link returns and account changes can clear every active stack; scope Journal and archive detail destinations to the identity that opened them.
- [x] Add UI regressions for share-link return and identity change from pushed Journal. They reproduced the failure before the destination registrations were moved inside each `NavigationStack`, then passed on iOS 18.2.
- [x] Rebuild the simulator app and Release configuration; run five focused gameplay UI tests on iOS 18.2, 22 native reporting/routing/visual tests, and all 50 Core tests. The share UI test also passed earlier on iOS 26.3. Release signing is unavailable without an Apple development team/provisioning profile.
- [ ] Verify the production AASA HTTP response and cold/warm Universal Link association on a physical device; local route tests pass, but the actual App ID Prefix is still required.
- [x] Update `docs/product/native-growth-scorecard.md` with implemented counters and explicit caveats; do not claim retention, installs, or revenue uplift before production cohorts exist.
- [x] Preserve unrelated worktree changes and add operator setup steps to `apps/ios/Release/Checklist.md`. Production Universal Links still require the actual Apple App ID Prefix, capability/profile provisioning, and physical-device verification.
- [x] Independent code review found no remaining navigation issues.

### Task 5: Use one privacy-safe share URL across web and iOS

**Files:**
- Modify: `apps/web/src/lib/game/share-challenge.ts`
- Modify: `apps/web/src/components/EnhancedShareButton.tsx`
- Modify: `apps/web/src/components/GameBoard.tsx`
- Modify: `apps/ios/Rebuzzle/Services/ReturnRouter.swift`
- Test: `apps/web/src/lib/game/__tests__/share-challenge.test.ts`
- Test: `apps/ios/RebuzzleTests/ReturnTests.swift`

**Interfaces:**
- `buildBeatMeUrl(origin: string)` always returns the origin root with exactly `source=share` and never accepts or serializes an account ID.
- `parseBeatMeChallenge(search): { fromShare: boolean }` accepts canonical `source=share` and the legacy `from=share` marker; it never returns a challenger identity.
- Keep the existing `DailyShareSummary.shareURL` unchanged; it is already the canonical URL.
- Route legacy web links containing `beat` plus `from=share` into the app while ignoring the `beat` value.

- [x] Write failing tests for canonical URL generation, absence of account IDs, canonical/legacy parsing, and legacy iOS universal-link acceptance.
- [x] Run the focused web and iOS routing tests and confirm the expected failures.
- [x] Update web link generation, source parsing, address-bar cleanup, and iOS legacy-link routing.
- [x] Run focused tests and inspect that new URLs contain no user identifier and legacy links do not retain it in app state or the browser address.

### Task 6: Measure share opens that become play

**Files:**
- Modify: `apps/web/src/components/GameBoard.tsx`
- Modify: `apps/web/src/app/api/puzzles/guess/route.ts`
- Modify: `apps/web/src/db/models.ts`
- Modify: `apps/web/src/db/analytics-ops.ts`
- Modify: `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`
- Modify: `apps/web/src/app/privacy/page.tsx`
- Modify: `apps/ios/Release/Privacy.md`
- Modify: `docs/product/native-growth-scorecard.md`
- Test: `apps/web/src/db/__tests__/native-growth-events.test.ts`
- Test: `apps/web/src/app/api/puzzles/guess/__tests__/extended-solve.test.ts`
- Test: `apps/web/src/app/api/puzzles/guess/__tests__/native-growth-events.test.ts`
- Test: `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`

**Interfaces:**
- Record `daily_started` only on the first successfully persisted official daily guess; clients cannot submit this event.
- Web share arrivals post the existing closed `daily_opened` event only after successful session restoration and when the share source and account are known. A best-effort same-tab marker bridges first-guess guest creation; analytics failure never blocks play.
- Add aggregate `shareOpenWithStartDays` and `shareOpenWithFinishDays`, deduplicated by `{userId, dayKey}` inside Mongo and returned without identifiers.
- Admin labels explain that the measurements are account-days and cannot prove a distinct recipient opened a share.

- [x] Add failing route/database/admin assertions for first-guess-only start events and share-open → start/finish account-day aggregation.
- [x] Run focused tests and confirm missing server events/summary fields fail.
- [x] Add server-authored starts, best-effort web open reporting, and the aggregate-only dashboard metrics with privacy wording.
- [x] Run the full web test suite (222 suites, 1,374 tests), typecheck, focused Biome check, iOS ReturnRouter tests (8), and `git diff --check`.
