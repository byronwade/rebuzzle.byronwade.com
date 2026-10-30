# Daily Puzzle Elapsed-to-Solve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an aggregate wall-clock measure from the first verified session restore to a correct daily solve so Rebuzzle can calibrate puzzle difficulty from real play.

**Architecture:** Record one server-owned `daily_session_restored` event from the authenticated daily session route, keyed by user and the verified puzzle date. Join it to the existing successful `daily_finished` event, calculate the per-date median in the admin aggregation, and suppress values with fewer than five qualifying solves.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, MongoDB aggregation, Jest, React.

**Spec:** `docs/superpowers/specs/2026-10-28-daily-solve-elapsed-design.md`

## Global Constraints

- Event identity and puzzle date come from server authentication and the verified daily session; client values are not accepted.
- `daily_session_restored` is server-only and is not accepted by the public analytics route.
- Report only a puzzle-date median of solved sessions; suppress medians when fewer than five qualifying solves exist.
- The measurement is wall-clock elapsed time, includes idle/background time, and is never labeled active or thinking time.
- Store no guesses, answers, notes, notification contents, or user-level durations; use the existing 90-day event TTL.
- Analytics write failures must not block daily puzzle delivery.
- Retry a failed write on later restores; label the interval from the first recorded restore, since a retry can shorten it.
- Do not deploy, migrate production, upload TestFlight, stage, or commit during this work.

## Review Focus

- Repeated session restores must preserve the earliest timestamp; test idempotence by user and puzzle date.
- An archive, old-day, unauthenticated, or unverified session must not create a timing start; cover each through the session route test.
- A finish before the first recorded restore is not a valid interval; filter nonpositive intervals in the aggregation test.
- Reveals, expiry, and other non-solved outcomes must not contribute; cover `outcome: "solved"` only in the aggregation contract.
- Low sample dates must not expose a duration; test four qualifying solves versus five.
- A client must not forge the server-only event; reject it in the public analytics route test.

## File Map

- `apps/web/src/db/models.ts`: closed event-type union.
- `apps/web/src/app/api/puzzle/session/route.ts`: server-verified session event.
- `apps/web/src/db/analytics-ops.ts`: matching and per-date duration aggregation.
- `apps/web/src/app/api/admin/native-funnel/route.ts`: aggregate response shape.
- `apps/web/src/components/admin/tabs/NativeGrowthCard.tsx`: clear metric label and low-sample state.
- `apps/web/src/app/privacy/page.tsx` and `apps/ios/Release/Privacy.md`: timing disclosure.
- `apps/web/src/app/api/puzzle/session/__tests__/route.test.ts`, `apps/web/src/db/__tests__/native-growth-events.test.ts`, `apps/web/src/app/api/admin/native-funnel/__tests__/route.test.ts`, `apps/web/src/components/admin/tabs/__tests__/native-growth-card.test.ts`, and the native analytics route tests: regression coverage.
- `docs/product/native-growth-scorecard.md` and the existing daily-quality analytics spec: evidence limits and source-only status.

## Ruling

- Ruling: Retry a failed start-event write on later verified session restores, and define the interval from the first successful record. This preserves puzzle availability and avoids implying that a failed event was stored; it may understate elapsed wall-clock time after an analytics outage.

## Task 1: Record the first verified daily session restore

**Interfaces:** Add `daily_session_restored` to the database event union. Record it through the existing idempotent event store with authenticated `userId`, server-derived `dayKey`, and server `occurredAt`; keep it out of client-submittable event types.

- [x] Add route tests for authenticated current daily, repeated restores, archive/old-day/unauthenticated requests, and telemetry failure that does not block the session response.
- [x] Run the focused session and analytics route tests; confirm the new cases fail for missing event behavior or client rejection.
- [x] Implement server-only event recording after current-daily verification; preserve the original timestamp on repeat requests.
- [ ] Run the focused tests and confirm only verified daily sessions write the event.

## Task 2: Aggregate solved wall-clock intervals

**Interfaces:** Extend the daily puzzle quality result with nullable `medianWallClockHoursToSolve`; populate it only from matching `daily_session_restored` and `daily_finished` records where outcome is solved and interval is nonnegative. Do not return identity or per-player timing rows.

- [ ] Add database aggregation tests for matching by user/day, solved-only outcomes, nonnegative intervals, median calculation, and the five-solve suppression threshold.
- [ ] Run the focused analytics-ops tests and confirm the new aggregate contract fails first.
- [ ] Implement the server aggregation and extend the admin API response type.
- [ ] Run analytics-ops and admin route tests; confirm existing attempt counts/outcomes remain unchanged.

## Task 3: Explain the metric and disclose the collection

- [ ] Add UI tests for the explicit wall-clock label, idle-time caveat, and suppressed low-sample state.
- [ ] Implement the metric in the daily-quality admin table; leave existing rows and labels intact.
- [ ] Update the public privacy policy, internal privacy draft, daily-quality spec, and product scorecard.
- [ ] Run focused admin-card tests, the full web test suite, TypeScript typecheck, scoped Biome checks, and `git diff --check`.
- [ ] Request a read-only code review; preserve all pre-existing dirty changes and leave the work uncommitted and undeployed.
